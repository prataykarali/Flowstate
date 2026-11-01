#!/usr/bin/env python3
"""PrismLab P5.6: reproducible d1-Omni audio smoke/negative-control test.

Place in: lfm3-prismlab/experiments/p5/p5_6_audio_smoke.py
Usage:   python experiments/p5/p5_6_audio_smoke.py [--audio WAV] [--port 8086]

Uses existing P3 audio outputs and standard-library HTTP calls. ffmpeg is needed
only to normalize WAV audio to 16-kHz mono PCM16 for fair, consistent inputs.
"""

import argparse
import array
import base64
import hashlib
import json
import math
import shutil
import subprocess
import sys
import time
import wave
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

SCRIPT = Path(__file__).resolve()
PROJECT = SCRIPT.parents[2]  # experiments/p5/script.py -> project root
RESULTS = PROJECT / "experiments" / "p5" / "results"
DEFAULT_AUDIO = (
    PROJECT / "results" / "p3" / "comparison"
    / "native_trialp36suite_F03_native.wav"
)

QUESTIONS = {
    "spoken_words": {
        "type": "noul",
        "instructions": "Are intelligible spoken words audible in this audio clip?",
    },
    "kind": {
        "type": "choice",
        "instructions": "Which type of sound dominates this recording?",
        "criteria": {
            "speech": "Spoken words or speech, including synthetic speech",
            "music": "Music with no audible spoken words",
            "sounds": "Other sounds without spoken words",
            "silence": "Silence or near silence",
        },
    },
}


def normalize_wav(source: Path, target: Path) -> tuple[float, float]:
    """Convert any audio ffmpeg can read to mono, 16kHz, PCM16 WAV."""
    if shutil.which("ffmpeg") is None:
        raise RuntimeError("ffmpeg is required. Install it or add it to PATH.")
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i",
         str(source), "-map", "0:a:0", "-ac", "1", "-ar", "16000",
         "-c:a", "pcm_s16le", str(target)],
        check=True,
        capture_output=True,
        text=True,
    )
    with wave.open(str(target), "rb") as f:
        assert f.getnchannels() == 1 and f.getsampwidth() == 2
        duration = f.getnframes() / f.getframerate()
        samples = array.array("h")
        samples.frombytes(f.readframes(f.getnframes()))
    if sys.byteorder != "little":
        samples.byteswap()
    rms = math.sqrt(sum(s * s for s in samples) / max(1, len(samples))) / 32768
    if not 0.5 <= duration <= 30:
        raise ValueError(
            f"Audio is {duration:.2f}s; choose a WAV between 0.5 and 30 s "
            "(the model's supported clip limit is 30 s)."
        )
    return duration, rms


def make_silence(path: Path, seconds: float = 2.0) -> None:
    with wave.open(str(path), "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(16000)
        f.writeframes(b"\x00\x00" * int(16000 * seconds))


def request_decisions(url: str, audio: Path | None, timeout: int) -> tuple[dict, float]:
    payload = {
        "state": "Judge only the acoustic evidence actually provided, not assumed content.",
        "questions": QUESTIONS,
    }
    if audio is not None:
        blob = base64.b64encode(audio.read_bytes()).decode("ascii")
        payload["files"] = [f"data:audio/wav;base64,{blob}"]

    req = Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    start = time.perf_counter()
    try:
        with urlopen(req, timeout=timeout) as response:
            result = json.load(response)
    except HTTPError as exc:
        details = exc.read().decode("utf-8", errors="replace")[:1500]
        raise RuntimeError(f"Model endpoint HTTP {exc.code}: {details}") from exc
    except URLError as exc:
        raise RuntimeError(
            f"Could not connect to {url}. Is d1-Omni serving on the requested port? "
            f"Details: {exc.reason}"
        ) from exc
    return result, time.perf_counter() - start


def validate_response(response: dict) -> tuple[float, str, float]:
    answers = response["answers"]
    p = float(answers["spoken_words"]["noul"])
    kind = answers["kind"]["choice"]
    confidence = float(answers["kind"]["confidence"])
    allowed = {"speech", "music", "sounds", "silence"}
    if not (0 <= p <= 1 and kind in allowed and 0 <= confidence <= 1):
        raise ValueError("Decision response contains invalid values")
    return p, kind, confidence


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--audio", type=Path, default=DEFAULT_AUDIO,
                        help="WAV input (default: P3 native F03 generated speech)")
    parser.add_argument("--port", type=int, default=8086)
    parser.add_argument("--timeout", type=int, default=300)
    args = parser.parse_args()

    src = args.audio.expanduser().resolve()
    if not src.is_file():
        raise FileNotFoundError(
            f"Input audio not found: {src}. Pass --audio with an existing WAV path."
        )

    RESULTS.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    normalized = RESULTS / f"p5_6_speech_16k_{stamp}.wav"
    silent = RESULTS / f"p5_6_silence_16k_{stamp}.wav"
    duration, rms = normalize_wav(src, normalized)
    if rms < 0.002:
        raise ValueError(
            f"Selected recording appears silent (RMS={rms:.5f}). "
            "Choose a different P3 WAV or supply --audio."
        )
    make_silence(silent)

    print(f"Original recording: {src}")
    print(f"Normalized audio: {duration:.2f}s, 16000 Hz, mono PCM16, RMS={rms:.4f}")
    print("Note: P3 native_trial files are generated model speech, not microphone input.")

    endpoint = f"http://127.0.0.1:{args.port}/v1/systemone"
    records = []
    conditions = [
        ("speech", normalized, "spoken words should be audible"),
        ("silence", silent, "should have no spoken words"),
        ("no_audio", None, "no audio evidence supplied"),
    ]
    for condition, audio, expectation in conditions:
        try:
            response, elapsed = request_decisions(endpoint, audio, args.timeout)
            p, kind, confidence = validate_response(response)
            rec = {
                "condition": condition,
                "expectation": expectation,
                "status": "ok",
                "spoken_words_probability": p,
                "predicted_kind": kind,
                "kind_confidence": confidence,
                "latency_total_s": round(elapsed, 4),
                "ttft_s": None,
                "usage": response.get("usage", {}),
                "model": response.get("model"),
                "raw_response": response,
            }
            print(f"{condition:<9} spoken_P={p:.3f} kind={kind:<8} "
                  f"confidence={confidence:.3f} total={elapsed:.3f}s", flush=True)
        except Exception as exc:
            rec = {"condition": condition, "status": "error", "error": str(exc)}
            print(f"{condition:<9} ERROR: {exc}", flush=True)
        records.append(rec)
        # If no server is running, don't attempt all 3 calls.
        if rec["status"] == "error" and "Could not connect" in rec["error"]:
            break

    good = {r["condition"]: r for r in records if r["status"] == "ok"}
    comparison = None
    if "speech" in good and "silence" in good:
        comparison = (
            good["speech"]["spoken_words_probability"]
            > good["silence"]["spoken_words_probability"]
        )

    report = {
        "phase": "PrismLab P5.6 native audio smoke",
        "input_path": str(src),
        "source_sha256": hashlib.sha256(src.read_bytes()).hexdigest(),
        "input_kind": "P3 generated speech or user-selected recording",
        "normalized_duration_s": round(duration, 4),
        "normalized_rms": round(rms, 6),
        "model_endpoint": endpoint,
        "speech_probability_exceeds_silence": comparison,
        "conditions": records,
        "limitations": [
            "Qualitative smoke test; not an intent accuracy benchmark",
            "Generated speech is not evidence of real microphone-ASR robustness",
            "Confidence probabilities have not been independently calibrated",
            "Local HTTP wall-clock latency, not pure model compute time",
        ],
    }
    outfile = RESULTS / f"p5_6_audio_smoke_{stamp}.json"
    outfile.write_text(json.dumps(report, indent=2))
    print("\n=== P5.6 SUMMARY ===")
    print(f"Conditions succeeded: {len(good)}/{len(records)}")
    print(f"Speech P > silence P: {comparison}")
    print(f"Saved: {outfile}")


if __name__ == "__main__":
    main()
