#!/usr/bin/env python3
"""PrismLab P4-D: frozen audiovisual robustness benchmark on local LFM3-Omni.

Reads the frozen manifest, validates image/audio SHA256 and WAV formats,
runs each case sequentially, and writes a timestamped JSON report.
Does not modify inputs, prompts, labels, or previous experiment results.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import re
import statistics
import time
import wave
from datetime import datetime, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "data/p4/robustness/manifest.json"
RESULT_DIR = ROOT / "results/p4"
SYSTEM_PROMPT = (
    "Listen to the spoken question and inspect the image. "
    "Answer with exactly one word. "
    "If the referenced object or relationship does not exist, "
    "answer UNKNOWN. Do not guess."
)


def checksum(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validated_path(relpath: str, expected_hash: str) -> Path:
    path = (ROOT / relpath).resolve(strict=True)
    if not path.is_relative_to(ROOT.resolve()):
        raise ValueError(f"Manifest path escapes project: {relpath}")
    observed = checksum(path)
    if observed != expected_hash:
        raise ValueError(f"Input SHA mismatch: {relpath}\nexpected={expected_hash}\nactual={observed}")
    return path


def verify_wav(path: Path) -> None:
    with wave.open(str(path), "rb") as wf:
        fmt = (wf.getframerate(), wf.getnchannels(), wf.getsampwidth())
        if fmt != (16000, 1, 2) or wf.getnframes() == 0:
            raise ValueError(f"Unsupported audio format: {path.name} -> {fmt}")


def prepare_cases(manifest: dict) -> list[dict]:
    if manifest.get("dataset") != "P4-D audiovisual robustness v1":
        raise ValueError("Unexpected dataset identifier")
    cases = manifest.get("cases")
    if not isinstance(cases, list) or len(cases) != 10:
        raise ValueError("Expected exactly ten frozen P4-D cases")
    if len({case["id"] for case in cases}) != len(cases):
        raise ValueError("Duplicate case IDs")
    prepared = []
    for case in cases:
        image = validated_path(case["image"], case["image_sha256"])
        wav = validated_path(case["audio"], case["audio_sha256"])
        if image.suffix.lower() != ".png":
            raise ValueError(f"Expected PNG: {image}")
        verify_wav(wav)
        prepared.append({**case, "_image_path": image, "_wav_path": wav})
    return prepared


def save_json(path: Path, report: dict) -> None:
    temporary = path.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    temporary.replace(path)


def normalize(value: str) -> str:
    # Case-insensitive exact-answer grading, not semantic grading.
    return re.sub(r"^[\s\W_]+|[\s\W_]+$", "", value.lower())


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://127.0.0.1:8083")
    parser.add_argument("--max-tokens", type=int, default=64)
    args = parser.parse_args()
    if args.max_tokens < 1:
        parser.error("--max-tokens must be positive")

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    cases = prepare_cases(manifest)  # validate all inputs before any model calls
    base = args.url.rstrip("/")
    model_response = requests.get(base + "/v1/models", timeout=10)
    model_response.raise_for_status()
    ids = [item.get("id") for item in model_response.json().get("data", [])]
    if "lfm3-omni" not in ids:
        raise RuntimeError(f"Expected lfm3-omni at {base}; available: {ids}")

    RESULT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S_%fZ")
    output = RESULT_DIR / f"robustness_native_{stamp}.json"
    report = {
        "experiment": "P4-D native Omni robustness v1",
        "created_utc": datetime.now(timezone.utc).isoformat(),
        "manifest_sha256": checksum(MANIFEST),
        "model": "lfm3-omni",
        "server_url": base,
        "system_prompt": SYSTEM_PROMPT,
        "temperature": 0,
        "max_tokens": args.max_tokens,
        "timing_type": "end_to_end_http_nonstreaming_inference_only",
        "cases": [],
    }

    for case in cases:
        image_data = base64.b64encode(case["_image_path"].read_bytes()).decode("ascii")
        audio_data = base64.b64encode(case["_wav_path"].read_bytes()).decode("ascii")
        payload = {
            "model": "lfm3-omni",
            "temperature": 0,
            "max_tokens": args.max_tokens,
            "stream": False,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": [
                    {"type": "image_url", "image_url": {"url": "data:image/png;base64," + image_data}},
                    {"type": "input_audio", "input_audio": {"data": audio_data, "format": "wav"}},
                ]},
            ],
        }
        start = time.perf_counter()
        row = {key: val for key, val in case.items() if not key.startswith("_")}
        try:
            response = requests.post(base + "/v1/chat/completions", json=payload, timeout=300)
            response.raise_for_status()
            data = response.json()
            choice = data["choices"][0]
            message = choice["message"]
            answer = message.get("content") or ""
            if not isinstance(answer, str):
                raise ValueError(f"Non-text model output: {type(answer).__name__}")
            row.update({
                "actual": answer.strip(),
                "strict_pass": normalize(answer) == normalize(case["expected"]),
                "finish_reason": choice.get("finish_reason"),
                "reasoning_chars": len(message.get("reasoning_content") or ""),
                "usage": data.get("usage", {}),
                "status": "ok",
            })
        except Exception as exc:
            row.update({"actual": None, "strict_pass": False,
                        "status": "error", "error": f"{type(exc).__name__}: {exc}"})
        row["latency_s"] = round(time.perf_counter() - start, 3)
        report["cases"].append(row)
        save_json(output, report)
        print(f"{case['id']} | expected={case['expected']} | actual={row['actual']!r} "
              f"| PASS={row['strict_pass']} | {row['latency_s']}s | status={row['status']}", flush=True)

    completed = [r for r in report["cases"] if r["status"] == "ok"]
    passed = sum(r["strict_pass"] for r in report["cases"])
    report["summary"] = {
        "strict_pass": passed,
        "total_cases": len(cases),
        "completed": len(completed),
        "errors": len(cases) - len(completed),
        "median_latency_s": round(statistics.median(r["latency_s"] for r in completed), 3)
                            if completed else None,
    }
    save_json(output, report)
    print(f"\nP4-D NATIVE: {passed}/{len(cases)} strict; "
          f"completed {len(completed)}/{len(cases)}; "
          f"median {report['summary']['median_latency_s']}s")
    print("Saved:", output)


if __name__ == "__main__":
    main()
