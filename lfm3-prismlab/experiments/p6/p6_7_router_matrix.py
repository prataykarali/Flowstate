"""PrismLab P6.7 — LIVE router probes using an existing llama.cpp CPU router on 8188.

Does not start, stop, or configure servers. Runs one request at a time.
Use: python experiments/p6/p6_7_router_matrix.py --models audio,omni,d1
"""
from __future__ import annotations

import argparse
import base64
import json
import time
from datetime import datetime, timezone
from pathlib import Path

import httpx

ROOT = Path.cwd()
BASE = "http://127.0.0.1:8188"
OUT = ROOT / "results/p6"
MODELS = ("audio", "omni", "d1", "d1-omni")
ALIASES = {
    "audio": "lfm3-audio", "omni": "lfm3-omni",
    "d1": "d1", "d1-omni": "d1-omni",
}
MIN_AVAILABLE_GIB = {"audio": 2.8, "omni": 3.0, "d1": 3.0, "d1-omni": 4.0}


def available_gib():
    for line in Path("/proc/meminfo").read_text().splitlines():
        if line.startswith("MemAvailable:"):
            return int(line.split()[1]) / 1024**2
    raise RuntimeError("Cannot determine available RAM")


def media(path: str, mime: str, max_mib=6):
    f = ROOT / path
    if not f.is_file():
        raise FileNotFoundError(f"Media file missing: {f}")
    if f.stat().st_size > max_mib * 1024**2:
        raise ValueError(f"Media file too big for test: {f}")
    return f"data:{mime};base64," + base64.b64encode(f.read_bytes()).decode("ascii")


def audio_media():
    candidates = (
        "data/p4/question.wav", "speech.wav", "data/p3/speech.wav",
        "experiments/p3/speech.wav", "data/p3/mic_fixed.wav",
    )
    for path in candidates:
        if (ROOT / path).is_file():
            print("Audio input:", path, flush=True)
            return media(path, "audio/wav")
    raise FileNotFoundError("No audio sample found in: " + ", ".join(candidates))


def chat(client, alias, messages):
    payload = {
        "model": alias,
        "messages": messages,
        "temperature": 0,
        "max_tokens": 192,
        "stream": True,
        "stream_options": {"include_usage": True},
        "chat_template_kwargs": {"enable_thinking": False},
    }
    start = time.perf_counter()
    first = None
    parts = []
    usage = {}
    reasoning_length = 0
    finish = None
    with client.stream("POST", BASE + "/v1/chat/completions", json=payload) as resp:
        if resp.status_code != 200:
            body = resp.read().decode("utf-8", "replace")[:900]
            raise RuntimeError(f"HTTP {resp.status_code}: {body}")
        for line in resp.iter_lines():
            if not line.startswith("data:"):
                continue
            raw = line[5:].strip()
            if not raw or raw == "[DONE]":
                continue
            obj = json.loads(raw)
            if obj.get("error"):
                raise RuntimeError(f"SSE error: {str(obj['error'])[:700]}")
            if isinstance(obj.get("usage"), dict):
                usage = obj["usage"]
            for choice in obj.get("choices", []):
                delta = choice.get("delta") or {}
                reasoning_length += len(str(delta.get("reasoning_content") or ""))
                if choice.get("finish_reason") is not None:
                    finish = choice["finish_reason"]
                token = delta.get("content")
                if isinstance(token, str) and token:
                    if first is None:
                        first = time.perf_counter()
                    parts.append(token)
    end = time.perf_counter()
    content = "".join(parts).strip()
    if not content:
        raise RuntimeError(f"Empty visible output; reasoning_chars={reasoning_length}; finish={finish}; usage={usage}")
    n = usage.get("completion_tokens")
    return {
        "output": content[:450],
        "total_latency_s": round(end - start, 3),
        "ttft_s": round(first - start, 3) if first is not None else None,
        "tokens_per_second": round(n / (end - first), 2) if n and first and end > first else None,
        "usage": usage,
        "finish_reason": finish,
    }


def decision(client, alias, state, questions, files=None):
    payload = {"model": alias, "state": state, "questions": questions}
    if files:
        payload["files"] = files
    start = time.perf_counter()
    resp = client.post(BASE + "/v1/systemone", json=payload)
    if resp.status_code != 200:
        raise RuntimeError(f"HTTP {resp.status_code}: {resp.text[:900]}")
    data = resp.json()
    if not isinstance(data.get("answers"), dict) or not data["answers"]:
        raise RuntimeError(f"Typed decision answers missing: {str(data)[:700]}")
    return {"answers": data["answers"], "total_latency_s": round(time.perf_counter() - start, 3),
            "ttft_s": None, "tokens_per_second": None, "usage": data.get("usage"),
            "note": "One-pass decision model; TTFT and generated tokens/s do not apply"}


def questions():
    return {
        "refund": {"type": "noul", "instructions": "Is the customer asking for a refund?"},
        "team": {"type": "choice", "instructions": "Which team should handle this?",
                 "criteria": {"billing": "Charges and refunds", "technical": "App malfunction"}},
    }


def run_probe(client, kind, probes):
    alias = ALIASES[kind]
    if kind in ("audio", "omni"):
        wav = audio_media()
        probes["asr"] = chat(client, alias, [
            {"role": "system", "content": "Perform ASR in English."},
            {"role": "user", "content": [{"type": "input_audio", "input_audio": {
                "data": wav.split(",", 1)[1], "format": "wav"}}]},
        ])
    if kind == "omni":
        image = media("data/p4/colors.png", "image/png")
        probes["vision"] = chat(client, alias, [
            {"role": "system", "content": "Respond in text."},
            {"role": "user", "content": [
                {"type": "text", "text": "Name the colors from left to right."},
                {"type": "image_url", "image_url": {"url": image}},
            ]},
        ])
    if kind in ("d1", "d1-omni"):
        probes["decision_text"] = decision(
            client, alias,
            "Customer: I was charged twice this month. Please refund the second charge.",
            questions(),
        )
    if kind == "d1-omni":
        wav = audio_media()
        probes["decision_audio"] = decision(
            client, alias, "A customer's short voice message.",
            {"kind": {"type": "choice", "instructions": "What does the speaker do?",
                       "criteria": {"question": "Ask a question", "request": "Make a request",
                                    "statement": "State a fact"}}},
            [wav],
        )
    return probes


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--models", default="audio,omni,d1,d1-omni")
    parser.add_argument("--timeout", type=int, default=420)
    args = parser.parse_args()
    selected = [s.strip() for s in args.models.split(",") if s.strip()]
    if not selected or any(s not in MODELS for s in selected):
        parser.error("--models must select from " + ",".join(MODELS))
    OUT.mkdir(parents=True, exist_ok=True)
    filename = OUT / ("p6_7_router_" + "_".join(selected) + ".json")
    report = {"utc": datetime.now(timezone.utc).isoformat(),
              "mode": "existing_router_cpu_live_acceptance", "endpoint": BASE,
              "note": "Endpoint smoke tests, NOT P6 orchestration/pipeline verification",
              "results": []}
    with httpx.Client(timeout=httpx.Timeout(args.timeout, connect=10)) as client:
        response = client.get(BASE + "/v1/models", timeout=10)
        response.raise_for_status()
        registered = {m.get("id") for m in response.json().get("data", [])}
        for kind in selected:
            alias = ALIASES[kind]
            row = {"model": kind, "alias": alias, "probes": {}, "status": "pending"}
            print(f"\n=== {kind.upper()} ===", flush=True)
            try:
                if alias not in registered:
                    raise RuntimeError(f"Model alias missing from router: {alias}")
                free = available_gib()
                row["mem_available_before_gib"] = round(free, 2)
                if free < MIN_AVAILABLE_GIB[kind]:
                    row["status"] = "skipped_memory"
                    row["reason"] = f"{free:.2f} GiB available; safety threshold {MIN_AVAILABLE_GIB[kind]:.1f} GiB"
                else:
                    run_probe(client, kind, row["probes"])
                    row["status"] = "passed"
            except Exception as exc:
                row["status"] = "failed"
                row["error"] = f"{type(exc).__name__}: {exc}"
            report["results"].append(row)
            filename.write_text(json.dumps(report, indent=2) + "\n")
            print("Status:", row["status"], flush=True)
            print("Available RAM before:", row.get("mem_available_before_gib"), "GiB", flush=True)
            for probe, result in row["probes"].items():
                print(f"{probe}: {str(result.get('output') or result.get('answers'))[:350]}", flush=True)
                print("Metrics:", {k: result.get(k) for k in ("total_latency_s", "ttft_s", "tokens_per_second")}, flush=True)
            if row.get("error") or row.get("reason"):
                print("Detail:", row.get("error") or row.get("reason"), flush=True)
    print("\nSaved:", filename)


if __name__ == "__main__":
    main()
