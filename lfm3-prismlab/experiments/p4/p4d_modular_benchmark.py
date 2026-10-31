#!/usr/bin/env python3
"""PrismLab P4-D: frozen, CPU-local Audio-2B ASR -> VL-2B vision benchmark.

Run --stage asr with the Audio server, stop it, then run --stage vision
with the VL server and --asr-file pointing to the saved ASR report.

No changes are made to the frozen manifest, audio, images, or native report.
Separate timestamped JSON files preserve incremental, per-case results.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import re
import statistics
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "data/p4/robustness/manifest.json"
RESULT_DIR = ROOT / "results/p4"
ASR_SYSTEM = "Perform ASR in English. Transcribe the speech; do not answer the question."
VISION_SYSTEM = (
    "Answer the spoken question's transcription using the image. "
    "Answer with exactly one word. "
    "If the referenced object or relationship does not exist, "
    "answer UNKNOWN. Do not guess."
)


def checksum(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def checked_file(relpath: str, digest: str) -> Path:
    path = (ROOT / relpath).resolve(strict=True)
    if not path.is_relative_to(ROOT.resolve()):
        raise ValueError(f"Path escapes project: {relpath}")
    if checksum(path) != digest:
        raise ValueError(f"Manifest SHA256 mismatch: {relpath}")
    return path


def get_cases() -> tuple[list[dict], str]:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if manifest.get("dataset") != "P4-D audiovisual robustness v1":
        raise ValueError("Wrong frozen dataset")
    cases = manifest["cases"]
    if len(cases) != 10 or {c["id"] for c in cases} != {f"D{i:02}" for i in range(1, 11)}:
        raise ValueError("Expected unique D01--D10 cases")
    checked = []
    for case in cases:
        wav = checked_file(case["audio"], case["audio_sha256"])
        png = checked_file(case["image"], case["image_sha256"])
        checked.append({**case, "_wav": wav, "_png": png})
    return checked, checksum(MANIFEST)


def api(base: str, payload: dict) -> tuple[dict, float]:
    start = time.perf_counter()
    response = requests.post(base.rstrip("/") + "/v1/chat/completions", json=payload, timeout=300)
    elapsed = round(time.perf_counter() - start, 3)
    response.raise_for_status()
    return response.json(), elapsed


def verify_model(base: str, expected: str) -> None:
    response = requests.get(base.rstrip("/") + "/v1/models", timeout=12)
    response.raise_for_status()
    ids = [d.get("id") for d in response.json().get("data", [])]
    if expected not in ids:
        raise RuntimeError(f"Expected {expected!r} from {base}, found {ids}")


def text_answer(data: dict) -> tuple[str, str | None, int, dict]:
    choice = data["choices"][0]
    message = choice["message"]
    content = message.get("content")
    if not isinstance(content, str):
        raise ValueError(f"Unexpected output type: {type(content).__name__}")
    return (content.strip(), choice.get("finish_reason"),
            len(message.get("reasoning_content") or ""), data.get("usage", {}))


def normalized(value: str) -> str:
    return re.sub(r"^[\s\W_]+|[\s\W_]+$", "", value.lower())


def write(path: Path, document: dict) -> None:
    temp = path.with_suffix(".json.tmp")
    temp.write_text(json.dumps(document, indent=2, ensure_ascii=False), encoding="utf-8")
    temp.replace(path)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--stage", choices=("asr", "vision"), required=True)
    parser.add_argument("--asr-file", type=Path, help="Required for --stage vision")
    parser.add_argument("--audio-url", default="http://127.0.0.1:8082")
    parser.add_argument("--vision-url", default="http://127.0.0.1:8180")
    parser.add_argument("--dry-run", action="store_true", help="Validate inputs without inference")
    args = parser.parse_args()

    cases, manifest_hash = get_cases()
    if args.dry_run:
        print(f"Verified 10 cases and input hashes; manifest={manifest_hash}")
        for c in cases:
            print(f"{c['id']} | {c['condition']} | expected={c['expected']}")
        return

    if args.stage == "vision" and not args.asr_file:
        parser.error("--stage vision requires --asr-file FILE")

    if args.stage == "asr":
        server = args.audio_url.rstrip("/")
        alias = "lfm3-audio"
    else:
        server = args.vision_url.rstrip("/")
        alias = "lfm3-vision"
    verify_model(server, alias)

    asr_rows = {}
    if args.stage == "vision":
        source = json.loads(args.asr_file.resolve(strict=True).read_text(encoding="utf-8"))
        if source.get("stage") != "asr" or source.get("manifest_sha256") != manifest_hash:
            raise ValueError("ASR report stage/dataset mismatch")
        asr_rows = {row["id"]: row for row in source.get("cases", [])}
        if set(asr_rows) != {c["id"] for c in cases}:
            raise ValueError("Incomplete ASR report: expected D01--D10")
        if any(row.get("status") != "ok" for row in asr_rows.values()):
            raise ValueError("ASR report contains errors; inspect before vision stage")
        for c in cases:
            if asr_rows[c["id"]].get("audio_sha256") != c["audio_sha256"]:
                raise ValueError(f"ASR file mismatch for {c['id']}")

    RESULT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S_%fZ")
    dest = RESULT_DIR / f"robustness_modular_{args.stage}_{stamp}.json"
    report = {
        "experiment": "PrismLab P4-D modular audio-vision v1",
        "stage": args.stage,
        "created_utc": datetime.now(timezone.utc).isoformat(),
        "manifest_sha256": manifest_hash,
        "model": alias,
        "server_url": server,
        "system_prompt": ASR_SYSTEM if args.stage == "asr" else VISION_SYSTEM,
        "temperature": 0,
        "max_tokens": 128,
        "timing_type": "sequential_warm_model_http_inference_only",
        **({"source_asr_report": str(args.asr_file.resolve())} if args.stage == "vision" else {}),
        "cases": [],
    }

    for case in cases:
        row = {k: v for k, v in case.items() if not k.startswith("_")}
        start = time.perf_counter()
        try:
            if args.stage == "asr":
                content = [{"type": "input_audio", "input_audio": {
                    "data": base64.b64encode(case["_wav"].read_bytes()).decode("ascii"),
                    "format": "wav"}}]
                payload = {
                    "model": alias, "temperature": 0, "max_tokens": 128, "stream": False,
                    "messages": [{"role": "system", "content": ASR_SYSTEM},
                                 {"role": "user", "content": content}],
                }
            else:
                transcript = asr_rows[case["id"]]["transcript"]
                row["transcript"] = transcript
                row["asr_latency_s"] = asr_rows[case["id"]]["latency_s"]
                content = [
                    {"type": "image_url", "image_url": {
                        "url": "data:image/png;base64," + base64.b64encode(
                            case["_png"].read_bytes()).decode("ascii")}},
                    {"type": "text", "text": transcript},
                ]
                payload = {
                    "model": alias, "temperature": 0, "max_tokens": 128, "stream": False,
                    "messages": [{"role": "system", "content": VISION_SYSTEM},
                                 {"role": "user", "content": content}],
                }

            data, elapsed = api(server, payload)
            answer, finish, reason_chars, usage = text_answer(data)
            row.update({"status": "ok", "latency_s": elapsed,
                        "finish_reason": finish, "reasoning_chars": reason_chars,
                        "usage": usage})
            if args.stage == "asr":
                row["transcript"] = answer
                row["transcript_exact_match"] = normalized(answer) == normalized(case["spoken_question"])
            else:
                row["answer"] = answer
                row["strict_pass"] = normalized(answer) == normalized(case["expected"])
                row["total_inference_s"] = round(row["asr_latency_s"] + elapsed, 3)
        except Exception as exc:
            row.update({"status": "error", "latency_s": round(time.perf_counter()-start, 3),
                        "error": f"{type(exc).__name__}: {exc}"})
            if args.stage == "vision":
                row["answer"] = None
                row["strict_pass"] = False
        report["cases"].append(row)
        write(dest, report)
        if args.stage == "asr":
            print(f"{case['id']} | ASR={row.get('transcript')!r} | "
                  f"{row['latency_s']}s | {row['status']}", flush=True)
        else:
            print(f"{case['id']} | expected={case['expected']} | actual={row.get('answer')!r} "
                  f"| PASS={row['strict_pass']} | total={row.get('total_inference_s')}s "
                  f"| {row['status']}", flush=True)

    completed = [r for r in report["cases"] if r["status"] == "ok"]
    summary = {"total": len(cases), "completed": len(completed),
               "errors": len(cases)-len(completed)}
    if args.stage == "vision":
        summary["strict_pass"] = sum(r["strict_pass"] for r in report["cases"])
        if completed:
            summary["median_total_inference_s"] = round(
                statistics.median(r["total_inference_s"] for r in completed), 3)
    else:
        summary["asr_exact_question_matches"] = sum(
            r.get("transcript_exact_match", False) for r in report["cases"])
    report["summary"] = summary
    write(dest, report)
    print("\nSUMMARY:", summary)
    print("Saved:", dest)


if __name__ == "__main__":
    main()
