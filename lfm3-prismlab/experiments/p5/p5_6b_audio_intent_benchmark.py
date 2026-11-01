#!/usr/bin/env python3
"""PrismLab P5.6b: d1-Omni direct audio vs. exact-transcript text reference.

Needs: running d1-Omni llama-server on 127.0.0.1:8086, espeak-ng (or
espeak), and ffmpeg. Uses only Python standard library. Audio labels are
known because this script generates the speech from fixed sentences.

Important: text reference is an *oracle transcript*, not a measured ASR
pipeline. Comparing these two conditions measures the combined difference
of modality and input representation, not transcription accuracy.
"""
import argparse
import base64
import hashlib
import json
import math
import shutil
import statistics
import subprocess
import time
import wave
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import URLError, HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / "assets" / "p5_6b"
RESULTS = ROOT / "results"
URL = "http://127.0.0.1:8086/v1/systemone"

# Speech utterances with externally specified main intent labels.
# Three examples per class. Deliberately short: avoid truncating speech.
CASES = [
    ("AB01", "billing", "I was charged twice. Please refund the extra payment."),
    ("AB02", "billing", "Could you send me an invoice for last month?"),
    ("AB03", "billing", "My subscription renewal charged the wrong amount."),
    ("AT01", "technical", "The app keeps crashing when I try to sign in."),
    ("AT02", "technical", "The checkout page freezes before I enter payment details."),
    ("AT03", "technical", "My account cannot sync my files anymore."),
    ("AS01", "shipping", "My parcel is late. Please check its delivery status."),
    ("AS02", "shipping", "Please change the address for my package delivery."),
    ("AS03", "shipping", "The delivered box was damaged. Arrange a replacement."),
    ("AO01", "other", "Could you explain the difference between your plans?"),
    ("AO02", "other", "I would like to schedule a product demonstration."),
    ("AO03", "other", "What are your customer support opening hours?"),
]

QUESTIONS = {
    "route": {
        "type": "choice",
        "instructions": "Which department should primarily handle this customer's request?",
        "criteria": {
            "billing": "Charges, invoices, subscription payments, and refunds",
            "technical": "Application bugs, sign-in failures, and software faults",
            "shipping": "Parcel delivery, tracking, and damaged shipments",
            "other": "General information, product plans, and sales enquiries",
        },
    },
}
LABELS = tuple(QUESTIONS["route"]["criteria"].keys())


def commands_or_raise():
    speech = shutil.which("espeak-ng") or shutil.which("espeak")
    ffmpeg = shutil.which("ffmpeg")
    missing = []
    if not speech:
        missing.append("espeak-ng (or espeak)")
    if not ffmpeg:
        missing.append("ffmpeg")
    if missing:
        raise SystemExit(
            "Missing required command(s): " + ", ".join(missing)
            + "\nOn Ubuntu, install with: sudo apt install espeak-ng ffmpeg"
        )
    return speech, ffmpeg


def make_wav(case_id, text, speech_exe, ffmpeg):
    source = ASSETS / f"{case_id}_source.wav"
    target = ASSETS / f"{case_id}_16k.wav"
    subprocess.run([speech_exe, "-s", "145", "-w", str(source), text], check=True,
                   capture_output=True, text=True)
    subprocess.run([
        ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(source),
        "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", str(target),
    ], check=True, capture_output=True, text=True)
    with wave.open(str(target), "rb") as wav:
        if (wav.getframerate(), wav.getnchannels(), wav.getsampwidth()) != (16000, 1, 2):
            raise ValueError(f"WAV normalization failed: {target}")
        duration = wav.getnframes() / wav.getframerate()
    if duration > 30:
        raise ValueError(f"Audio duration exceeds 30s: {duration:.2f}s")
    return target, duration


def call_model(text=None, wav=None, *, timeout=180):
    assert (text is None) != (wav is None), "Exactly one of text/wav is required"
    payload = {"state": text if wav is None else None, "questions": QUESTIONS}
    if wav is not None:
        payload["files"] = [
            "data:audio/wav;base64," + base64.b64encode(wav.read_bytes()).decode("ascii")
        ]
    request = Request(
        URL, data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}, method="POST"
    )
    start = time.perf_counter()
    try:
        with urlopen(request, timeout=timeout) as response:
            result = json.load(response)
    except HTTPError as exc:
        excerpt = exc.read(1500).decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code}: {excerpt}") from exc
    except URLError as exc:
        raise RuntimeError(f"Cannot connect to {URL}: {exc.reason}") from exc
    latency = time.perf_counter() - start
    route = result["answers"]["route"]
    predicted = route["choice"]
    probs = route["probabilities"]
    if predicted not in LABELS or set(probs) != set(LABELS):
        raise ValueError("Invalid decision class labels in model response")
    values = [float(probs[k]) for k in LABELS]
    if (not all(math.isfinite(v) and 0 <= v <= 1 for v in values)
            or abs(sum(values) - 1) > 0.02):
        raise ValueError("Invalid or non-normalized probabilities")
    return {
        "model": result.get("model"),
        "prediction": predicted,
        "confidence": float(probs[predicted]),
        "probabilities": probs,
        "latency_s": round(latency, 5),
        "usage": result.get("usage", {}),
        "ttft_s": None,  # Non-generative decision output
        "raw_response": result,
    }


def summarize(records):
    valid = [r for r in records if r.get("status") == "ok"]
    out = {"requested": len(records), "valid": len(valid),
           "errors": sum(r.get("status") == "error" for r in records)}
    for mode in ("audio", "text_oracle"):
        rows = [r for r in valid if r["mode"] == mode]
        if not rows:
            out[mode] = {"valid": 0}
            continue
        times = sorted(r["latency_s"] for r in rows)
        out[mode] = {
            "valid": len(rows),
            "correct": sum(r["correct"] for r in rows),
            "accuracy": sum(r["correct"] for r in rows) / len(rows),
            "median_latency_s": statistics.median(times),
            "p95_latency_s": times[math.ceil(0.95 * len(times))-1],
            "incorrect_case_ids": [r["id"] for r in rows if not r["correct"]],
        }
    paired = {}
    for row in valid:
        paired.setdefault(row["id"], {})[row["mode"]] = row
    both = [v for v in paired.values() if "audio" in v and "text_oracle" in v]
    out["fully_paired_cases"] = len(both)
    out["prediction_disagreements"] = [
        x["audio"]["id"] for x in both
        if x["audio"]["prediction"] != x["text_oracle"]["prediction"]
    ]
    return out


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=12,
                        help="Run the first N labeled utterances (default 12)")
    args = parser.parse_args()
    if args.limit < 1 or args.limit > len(CASES):
        parser.error(f"--limit must be 1..{len(CASES)}")
    speech_exe, ffmpeg = commands_or_raise()
    ASSETS.mkdir(parents=True, exist_ok=True)
    RESULTS.mkdir(parents=True, exist_ok=True)
    cases = CASES[:args.limit]
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    raw_path = RESULTS / f"p5_6b_audio_intent_{stamp}.jsonl"
    sum_path = RESULTS / f"p5_6b_audio_intent_{stamp}_summary.json"
    print("P5.6b — d1-Omni audio vs exact-transcript reference")
    print("12-case synthetic speech benchmark; NOT an ASR comparison.")
    print("Per-condition total latency measures warm local API requests only.")
    print(f"Class balance (selected cases): {dict(Counter(c[1] for c in cases))}")
    records = []
    with raw_path.open("w") as file:
        for i, (case_id, expected, text) in enumerate(cases, 1):
            wav, duration = make_wav(case_id, text, speech_exe, ffmpeg)
            digest = hashlib.sha256(wav.read_bytes()).hexdigest()
            # Same model/quantization and exact criteria; only input representation differs.
            for mode in ("text_oracle", "audio"):
                base = {
                    "id": case_id, "expected": expected, "reference_text": text,
                    "mode": mode, "duration_s": round(duration, 3),
                    "wav_path": str(wav), "wav_sha256": digest,
                }
                try:
                    result = call_model(text=text if mode == "text_oracle" else None,
                                        wav=wav if mode == "audio" else None)
                    row = {**base, **result, "correct": result["prediction"] == expected,
                           "status": "ok"}
                    label = "PASS" if row["correct"] else "FAIL"
                    print(f"[{i:02d}/{len(cases)}] {case_id} {mode:<11} {label} "
                          f"{row['prediction']:<10} p={row['confidence']:.3f} "
                          f"time={row['latency_s']:.3f}s", flush=True)
                except Exception as exc:
                    row = {**base, "status": "error", "error": str(exc)}
                    print(f"[{i:02d}/{len(cases)}] {case_id} {mode} ERROR: {exc}", flush=True)
                records.append(row)
                file.write(json.dumps(row) + "\n")
                file.flush()
    summary = summarize(records)
    summary.update({
        "suite": "P5.6b", "dataset_type": "eSpeak synthesized English commands",
        "model": "d1-Omni-2B-GGUF:Q8_0 (expected; see each raw result for actual)",
        "source_audio": "Generated locally by eSpeak and normalized via ffmpeg",
        "label_policy": "Expected primary intent manually specified before generation",
        "limitations": [
            "Synthetic speech and small sample; not a real-microphone accuracy estimate",
            "Text condition is exact transcript (oracle), NOT ASR -> d1",
            "Generated WAV time and normalization excluded from request latency",
            "Confidence scores have not been calibrated",
            "No decoding: TTFT and output-token generation speed are inapplicable",
        ],
        "raw_path": str(raw_path),
    })
    sum_path.write_text(json.dumps(summary, indent=2))
    print("\n=== P5.6b SUMMARY ===")
    print(json.dumps(summary, indent=2))
    print("Saved:", raw_path)
    print("Summary:", sum_path)


if __name__ == "__main__":
    main()
