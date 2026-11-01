#!/usr/bin/env python3
"""PrismLab P5.6c — real microphone pilot: d1-Omni audio vs exact-script text.

Save beside p5_6b_audio_intent_benchmark.py in experiments/p5.
From PrismLab repo root:
  python -u experiments/p5/p5_6c_real_mic.py --mode prompts
  python -u experiments/p5/p5_6c_real_mic.py --mode record
  python -u experiments/p5/p5_6c_real_mic.py --mode evaluate

For recording: Ubuntu PulseAudio/PipeWire microphone source, ffmpeg installed.
For evaluation: d1-Omni-2B at 127.0.0.1:8086 with /v1/systemone.
Only Python stdlib plus the already-working P5.6b client are used.
No speech transcription is performed. The written text is an *intended script*.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import shutil
import signal
import statistics
import subprocess
import sys
import time
import wave
from array import array
from datetime import datetime, timezone
from pathlib import Path

from p5_6b_audio_intent_benchmark import call_model

ROOT = Path(__file__).resolve().parent
AUDIO_DIR = ROOT / "assets" / "real_audio"
RESULTS = ROOT / "results"
THRESHOLD = 0.90  # Post-hoc exploratory threshold, NOT deployment calibrated.

# Locked intended utterances, including one explicitly two-intent request.
# Multi-intent R09 has no valid single-label target, so treat it separately.
CASES = [
    {"id": "R01", "label": "billing", "text": "I was charged twice for my subscription. Please reverse the extra payment."},
    {"id": "R02", "label": "billing", "text": "Could you send me the invoice for last month?"},
    {"id": "R03", "label": "technical", "text": "The application crashes whenever I try to sign in."},
    {"id": "R04", "label": "technical", "text": "The checkout page freezes before I enter my card details. Nothing was charged."},
    {"id": "R05", "label": "shipping", "text": "Tracking says my parcel was delivered, but I did not receive it."},
    {"id": "R06", "label": "shipping", "text": "Please change the delivery address for my package arriving tomorrow."},
    {"id": "R07", "label": "other", "text": "What features are included in the premium subscription plan?"},
    {"id": "R08", "label": "other", "text": "Do you offer student discounts for monthly subscriptions?"},
    {"id": "R09", "label": None, "text": "The application crashed and I was also charged twice. Please fix both problems.", "review_required": True},
    {"id": "R10", "label": "other", "text": "I do not want a refund. I only want to understand your refund policy."},
]


def wav_info(path: Path) -> tuple[float, float]:
    with wave.open(str(path), "rb") as file:
        rate = file.getframerate()
        channels = file.getnchannels()
        width = file.getsampwidth()
        samples = file.getnframes()
        data = file.readframes(samples)
    if (rate, channels, width) != (16000, 1, 2):
        raise ValueError(f"Expected 16kHz PCM16 mono; got {(rate, channels, width)}")
    if not samples:
        raise ValueError("WAV contains no samples")
    pcm = array("h")
    pcm.frombytes(data)
    if sys.byteorder != "little":
        pcm.byteswap()
    rms = math.sqrt(sum(value * value for value in pcm) / len(pcm)) / 32768.0
    return samples / rate, rms


def record_one(case: dict, args) -> bool:
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg is None:
        raise SystemExit("ffmpeg unavailable. Install it with: sudo apt install ffmpeg")
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    path = AUDIO_DIR / f"{case['id']}.wav"
    print("\n" + "=" * 68)
    print(f"{case['id']}  |  {case['label'] or 'MULTI-INTENT / REVIEW'}")
    print("SAY EXACTLY: " + case["text"])
    print("=" * 68)
    if path.exists() and not args.overwrite:
        answer = input("Recording exists. [Enter] keep / r re-record / q quit: ").strip().lower()
        if answer == "q":
            raise KeyboardInterrupt()
        if answer != "r":
            return True
    input("Press ENTER to START recording, then speak naturally: ")
    cmd = [
        ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
        "-f", args.backend, "-i", args.device,
        "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le",
        "-t", str(args.max_seconds), str(path),
    ]
    process = subprocess.Popen(cmd, stdin=subprocess.DEVNULL,
                               stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    print("Recording... speak, then press ENTER to STOP (max 25 s).", flush=True)
    input()
    if process.poll() is None:
        process.send_signal(signal.SIGINT)
    try:
        _, stderr = process.communicate(timeout=8)
    except subprocess.TimeoutExpired:
        process.kill()
        _, stderr = process.communicate()
    if not path.exists():
        print("Recording failed:", stderr.decode(errors="replace")[-900:])
        print("Check microphone with: pactl list short sources")
        return False
    try:
        duration, rms = wav_info(path)
    except Exception as exc:
        print("Invalid WAV:", exc, stderr.decode(errors="replace")[-500:])
        path.unlink(missing_ok=True)
        return False
    print(f"Saved: {path.name} | duration={duration:.2f}s | RMS={rms:.4f}")
    if duration < 1 or rms < 0.002:
        print("WARNING: Recording too short or nearly silent. Re-record it.")
        return False
    return True


def record_all(args):
    print("P5.6c: microphone recordings; ensure the mic is unmuted.")
    print("Read the displayed sentence; avoid adding labels or extra context.")
    ok = 0
    for case in CASES:
        if args.case and case["id"] != args.case:
            continue
        if record_one(case, args):
            ok += 1
        else:
            print(f"Try again later with: --mode record --case {case['id']} --overwrite")
    print(f"\nRecordings available/valid this session: {ok}")


def summarise(records: list[dict]):
    summary = {
        "suite": "P5.6c", "source": "real microphone",
        "model": "d1-Omni-2B Q8_0 (confirm raw responses)",
        "threshold": THRESHOLD, "threshold_chosen_post_hoc": True,
        "method": "native WAV vs intended-script text oracle; NOT ASR comparison",
        "total_cases": len(CASES), "attempts": len(records),
        "errors": sum(r.get("status") == "error" for r in records),
        "limitations": [
            "Very small, single-speaker pilot; no real-world generalization claim",
            "Audio ground truth assumes the speaker read the prompt faithfully; no independent transcription",
            "Text oracle is the intended prompt, not an ASR transcript",
            "0.90 is an exploratory post-hoc gate, not a calibrated safety threshold",
            "Timing is local wall-clock API latency, excluding microphone capture",
            "TTFT and tokens/s are inapplicable to non-generative decisions",
        ],
    }
    for mode in ("audio", "text_oracle"):
        rows = [r for r in records if r.get("status") == "ok" and r["mode"] == mode]
        clear = [r for r in rows if r["expected"] is not None]
        latencies = sorted(r["latency_s"] for r in rows)
        summary[mode] = {
            "successful": len(rows), "labeled": len(clear),
            "correct": sum(r["correct"] for r in clear),
            "accuracy": (sum(r["correct"] for r in clear) / len(clear)) if clear else None,
            "median_latency_s": statistics.median(latencies) if latencies else None,
            "p95_latency_s": latencies[math.ceil(0.95 * len(latencies))-1] if latencies else None,
            "accepted_count": sum(r["accepted"] for r in rows),
            "review_required_cases_auto_accepted": [
                r["id"] for r in rows if r["expected"] is None and r["accepted"]
            ],
            "incorrect_case_ids": [r["id"] for r in clear if not r["correct"]],
        }
    paired = {}
    for r in records:
        if r.get("status") == "ok":
            paired.setdefault(r["id"], {})[r["mode"]] = r
    summary["complete_pairs"] = sum(
        "audio" in x and "text_oracle" in x for x in paired.values()
    )
    summary["prediction_disagreements"] = [
        case_id for case_id, x in paired.items()
        if "audio" in x and "text_oracle" in x
        and x["audio"]["prediction"] != x["text_oracle"]["prediction"]
    ]
    return summary


def evaluate_all(args):
    missing = [case["id"] for case in CASES if not (AUDIO_DIR / f"{case['id']}.wav").is_file()]
    if missing:
        raise SystemExit("Missing WAV files: " + ", ".join(missing)
                         + ". Run --mode record first.")
    RESULTS.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out = RESULTS / f"p5_6c_real_mic_{stamp}.jsonl"
    summary_path = RESULTS / f"p5_6c_real_mic_{stamp}_summary.json"
    print("P5.6c: using port 8086. Only audio inference receives WAV; never transcript.")
    print("The text-oracle input uses the exact *written* prompt, not speech recognition.")
    records = []
    with out.open("w") as stream:
        for i, case in enumerate(CASES, 1):
            wav = AUDIO_DIR / f"{case['id']}.wav"
            try:
                duration, rms = wav_info(wav)
                if not 1 <= duration <= 30 or rms < 0.002:
                    raise ValueError(f"Poor audio evidence duration={duration:.2f}s RMS={rms:.4f}")
                for mode in ("audio", "text_oracle"):
                    row = {
                        "id": case["id"], "mode": mode,
                        "expected": case["label"],
                        "review_required": bool(case.get("review_required")),
                        "reference_text": case["text"],
                        "wav_path": str(wav), "wav_sha256": hashlib.sha256(wav.read_bytes()).hexdigest(),
                        "duration_s": round(duration, 3), "rms": round(rms, 6),
                    }
                    try:
                        res = call_model(wav=wav) if mode == "audio" else call_model(text=case["text"])
                        row.update({
                            "status": "ok", "prediction": res["prediction"],
                            "confidence": res["confidence"], "probabilities": res["probabilities"],
                            "correct": (res["prediction"] == case["label"]) if case["label"] is not None else None,
                            "accepted": res["confidence"] >= THRESHOLD,
                            "latency_s": res["latency_s"], "usage": res["usage"], "ttft_s": None,
                            "model": res["model"], "raw_response": res["raw_response"],
                        })
                        status = ("PASS" if row["correct"] else "FAIL") if case["label"] is not None else ("AUTO?" if row["accepted"] else "REVIEW")
                        print(f"[{i:02d}/{len(CASES)}] {case['id']} {mode:<11} {status:<6} "
                              f"{row['prediction']:<10} p={row['confidence']:.3f} "
                              f"t={row['latency_s']:.3f}s", flush=True)
                    except Exception as exc:
                        row.update({"status": "error", "error": str(exc)})
                        print(f"{case['id']} {mode} ERROR: {exc}", flush=True)
                    records.append(row)
                    stream.write(json.dumps(row) + "\n")
                    stream.flush()
            except Exception as exc:
                print(f"{case['id']} INVALID AUDIO: {exc}", flush=True)
                row = {"id": case["id"], "status": "error", "error": str(exc), "mode": "audio"}
                records.append(row)
                stream.write(json.dumps(row) + "\n")
                stream.flush()
    summary = summarise(records)
    summary["raw_path"] = str(out)
    summary_path.write_text(json.dumps(summary, indent=2))
    print("\n=== P5.6c REAL MICROPHONE SUMMARY ===")
    print(json.dumps(summary, indent=2))
    print("Summary:", summary_path)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--mode", choices=("prompts", "record", "evaluate"), required=True)
    p.add_argument("--backend", default="pulse", help="ffmpeg input backend (default pulse)")
    p.add_argument("--device", default="default", help="ffmpeg input device (default default)")
    p.add_argument("--max-seconds", type=int, default=25, help="Safety cap; stop with ENTER")
    p.add_argument("--case", choices=[c["id"] for c in CASES], help="Only re-record one case")
    p.add_argument("--overwrite", action="store_true", help="Re-record existing WAVs")
    args = p.parse_args()
    if args.mode == "prompts":
        for case in CASES:
            print(f"{case['id']}: {case['text']}")
    elif args.mode == "record":
        record_all(args)
    else:
        evaluate_all(args)


if __name__ == "__main__":
    main()
