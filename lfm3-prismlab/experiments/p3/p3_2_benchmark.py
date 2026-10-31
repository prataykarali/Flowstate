#!/usr/bin/env python3
"""PrismLab P3.2 -- reproducible, small-sample audio-grounding evaluation.

Run after copying into experiments/p3/ alongside audio_qa.py.
Uses the SAME fixed QA system prompt and HTTP payload for all cases.
No automatic correctness claims: score each response by listening and checking
its semantic content against the supplied expected answer.
"""

import argparse
import base64
import csv
import json
import math
import time
import wave
from array import array
from datetime import datetime, timezone
from pathlib import Path
import sys

from audio_qa import BASE_URL, SYSTEM, request_json

# Each clip has 4 answerable and 2 unanswerable questions.
CASES = {
    "speech": [
        ("s1", "What object is beside the laptop?", "The blue notebook", "answerable"),
        ("s2", "What color is the notebook?", "Blue", "answerable"),
        ("s3", "What is the researcher testing?", "Speech recognition", "answerable"),
        ("s4", "Where is the blue notebook?", "Beside the laptop", "answerable"),
        ("s5", "What brand is the laptop?", "Not stated in the audio", "unanswerable"),
        ("s6", "What color is the laptop?", "Not stated in the audio", "unanswerable"),
    ],
    "control": [
        ("c1", "Where is the red folder?", "Next to the keyboard", "answerable"),
        ("c2", "When does the appointment start?", "Four thirty", "answerable"),
        ("c3", "Where is the silver key?", "Inside the drawer", "answerable"),
        ("c4", "What color is the key?", "Silver", "answerable"),
        ("c5", "What city is the appointment in?", "Not stated in the audio", "unanswerable"),
        ("c6", "What is the folder made of?", "Not stated in the audio", "unanswerable"),
    ],
    "third": [
        ("t1", "What color is the umbrella?", "Green", "answerable"),
        ("t2", "Where is the umbrella?", "Near the front door", "answerable"),
        ("t3", "Which platform does the train leave from?", "Platform six", "answerable"),
        ("t4", "How many tickets were bought?", "Two", "answerable"),
        ("t5", "What was the price of the tickets?", "Not stated in the audio", "unanswerable"),
        ("t6", "What date does the train depart?", "Not stated in the audio", "unanswerable"),
    ],
}

AUDIO_FILES = {
    "speech": "data/audio/speech.wav",
    "control": "data/audio/p3_2_control.wav",
    "third": "data/audio/p3_2_third.wav",
}


def inspect_audio(path):
    with wave.open(str(path), "rb") as wav:
        fmt = (wav.getframerate(), wav.getnchannels(), wav.getsampwidth(), wav.getcomptype())
        if fmt != (16000, 1, 2, "NONE"):
            raise ValueError(f"{path}: expected 16kHz mono PCM16 WAV, got {fmt}")
        duration = wav.getnframes() / 16000
        raw = wav.readframes(wav.getnframes())
    pcm = array("h")
    pcm.frombytes(raw)
    if sys.byteorder != "little":
        pcm.byteswap()
    if not pcm:
        raise ValueError(f"No audio samples in {path}")
    mean_square = sum(float(x) * x for x in pcm) / len(pcm)
    rms = math.sqrt(mean_square) / 32768
    peak = max(abs(x) for x in pcm) / 32768
    clipped = sum(abs(x) >= 32760 for x in pcm) / len(pcm)
    return dict(seconds=round(duration, 3), rms=round(rms, 6),
                peak=round(peak, 6), clipped_pct=round(clipped * 100, 4))


def run_case(model, wav_b64, question, url):
    payload = {
        "model": model, "temperature": 0, "max_tokens": 180, "stream": False,
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": [
                {"type": "input_audio", "input_audio": {"data": wav_b64, "format": "wav"}},
                {"type": "text", "text": question},
            ]},
        ],
    }
    t0 = time.perf_counter()
    reply = request_json(url.rstrip("/") + "/v1/chat/completions", payload)
    elapsed = round(time.perf_counter() - t0, 3)
    answer = reply["choices"][0]["message"]["content"]
    if not isinstance(answer, str):
        answer = json.dumps(answer, ensure_ascii=False)
    return answer.strip(), elapsed


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--clip", choices=["speech", "control", "third", "all"], default="all")
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="Project root")
    parser.add_argument("--url", default=BASE_URL)
    parser.add_argument("--output-dir", type=Path, default=None)
    args = parser.parse_args()
    root = args.root.expanduser().resolve()
    outdir = (args.output_dir or root / "results/p3/qa_benchmark").resolve()
    outdir.mkdir(parents=True, exist_ok=True)
    names = list(CASES) if args.clip == "all" else [args.clip]
    missing = [str(root / AUDIO_FILES[k]) for k in names if not (root / AUDIO_FILES[k]).is_file()]
    if missing:
        parser.error("Missing audio file(s): " + ", ".join(missing))
    model = request_json(args.url.rstrip("/") + "/v1/models")["data"][0]["id"]
    suffix = datetime.now().strftime("%Y%m%d_%H%M%S")
    jsonl = outdir / f"qa_{args.clip}_{suffix}.jsonl"
    csv_path = outdir / f"qa_{args.clip}_{suffix}_review.csv"
    rows = []
    print(f"[model] {model}\n[prompt] fixed baseline from audio_qa.py\n[output] {jsonl}")
    with jsonl.open("w", encoding="utf8") as f:
        for name in names:
            file = root / AUDIO_FILES[name]
            stats = inspect_audio(file)
            print(f"\n=== {name}: {stats} ===")
            if stats["rms"] < 0.002:
                print("[blocked] Quiet recording; fix microphone or choose another clip.")
                continue
            if stats["clipped_pct"] >= 0.1:
                print("[warning] At least 0.1% samples at clipping threshold; results may be distorted.")
            b64 = base64.b64encode(file.read_bytes()).decode("ascii")
            for qid, question, expected, category in CASES[name]:
                record = dict(
                    utc=datetime.now(timezone.utc).isoformat(timespec="seconds"),
                    clip=name, file=str(file), question_id=qid,
                    question=question, reference=expected, category=category,
                    model=model, prompt_variant="baseline", audio=stats,
                    response="", latency_s=None, error=None,
                )
                try:
                    record["response"], record["latency_s"] = run_case(model, b64, question, args.url)
                    print(f"[{qid}] {question}\n      -> {record['response']} ({record['latency_s']:.2f}s)")
                except (OSError, RuntimeError, KeyError, ValueError, IndexError) as err:
                    record["error"] = str(err)
                    print(f"[{qid}] ERROR: {err}")
                f.write(json.dumps(record, ensure_ascii=False) + "\n")
                f.flush()
                rows.append(record)
    fields = ["clip", "question_id", "category", "question", "reference", "response",
              "latency_s", "error", "manual_score_0_1", "failure_type", "reviewer_notes"]
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        for r in rows:
            writer.writerow({**r, "manual_score_0_1": "", "failure_type": "", "reviewer_notes": ""})
    print(f"\n[saved] {len(rows)} cases\n[results] {jsonl}\n[manual review] {csv_path}")
    print("[important] Do not report accuracy until each answer is manually scored against the audio.")


if __name__ == "__main__":
    main()
