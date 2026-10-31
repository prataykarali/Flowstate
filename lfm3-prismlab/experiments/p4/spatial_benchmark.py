
import base64
import hashlib
import json
import time
import wave
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import requests

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data/p4/spatial"
OUTPUT = ROOT / "results/p4/spatial_benchmark.json"

URL = "http://127.0.0.1:8083/v1/chat/completions"

# ID, image, audio, expected answer
CASES = [
    ("P4-B01", "scene_a", "top_right", "blue"),
    ("P4-B02", "scene_b", "top_right", "green"),
    ("P4-B03", "scene_a", "below_red", "square"),
    ("P4-B04", "scene_b", "below_red", "unknown"),
    ("P4-B05", "scene_a", "left_of_blue", "triangle"),
    ("P4-B06", "scene_b", "left_of_blue", "unknown"),
    ("P4-B07", "scene_a", "missing_diamond", "unknown"),
    ("P4-B08", "scene_b", "top_left", "star"),
]

def encode(path):
    return base64.b64encode(path.read_bytes()).decode()

def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def validate_audio(path):
    with wave.open(str(path), "rb") as wav:
        rate = wav.getframerate()
        channels = wav.getnchannels()
        width = wav.getsampwidth()
        samples = np.frombuffer(
            wav.readframes(wav.getnframes()), dtype="<i2"
        )

    if rate != 16000 or channels != 1 or width != 2:
        raise ValueError(f"Invalid audio format: {path}")

    if samples.size == 0:
        raise ValueError(f"Empty audio: {path}")

    peak = np.max(np.abs(samples.astype(np.float32))) / 32768
    if peak < 0.005:
        raise ValueError(f"Audio may be silent: {path}")

results = []

for test_id, scene, question, expected in CASES:
    img_path = DATA / f"{scene}.png"
    wav_path = DATA / f"{question}.wav"

    validate_audio(wav_path)

    content = [
        {
            "type": "image_url",
            "image_url": {
                "url": f"data:image/png;base64,{encode(img_path)}"
            },
        },
        {
            "type": "input_audio",
            "input_audio": {
                "data": encode(wav_path),
                "format": "wav",
            },
        },
    ]

    payload = {
        "model": "lfm3-omni",
        "temperature": 0,
        "max_tokens": 64,
        "messages": [
            {
                "role": "system",
                "content": (
                    "Listen to the spoken question and inspect "
                    "the image. Answer with exactly one word. "
                    "If the referenced object or relationship "
                    "does not exist, answer UNKNOWN. "
                    "Do not guess."
                ),
            },
            {"role": "user", "content": content},
        ],
    }

    start = time.perf_counter()
    actual = None
    error = None

    try:
        response = requests.post(
            URL, json=payload, timeout=300
        )
        response.raise_for_status()

        actual = response.json()["choices"][0]["message"]["content"]

    except (requests.RequestException, KeyError,
            IndexError, ValueError, TypeError) as exc:
        error = str(exc)

    latency = round(time.perf_counter() - start, 3)

    normalized = (
        actual.strip().lower().strip(" .!?,\"'")
        if isinstance(actual, str) else ""
    )

    result = {
        "id": test_id,
        "scene": scene,
        "question_audio": question,
        "expected": expected,
        "actual": actual,
        "strict_pass": error is None and normalized == expected,
        "latency_s": latency,
        "timing_type": "end_to_end_nonstreaming",
        "image_sha256": sha256(img_path),
        "audio_sha256": sha256(wav_path),
        "error": error,
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
    }

    results.append(result)

    # Save incrementally so partial experiments are preserved.
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(results, indent=2))

    print(
        f"{test_id} | expected={expected} | "
        f"actual={actual!r} | "
        f"PASS={result['strict_pass']} | {latency}s"
    )

passed = sum(r["strict_pass"] for r in results)

print(f"\nP4-B FINAL: {passed}/{len(CASES)}")
print("Saved:", OUTPUT)
