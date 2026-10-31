
import base64
import hashlib
import json
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data/p4"
OUT = ROOT / "results/p4/factorial_2x2.json"

URL = "http://127.0.0.1:8083/v1/chat/completions"

images = {
    "original": DATA / "colors.png",
    "reversed": DATA / "colors_reversed.png",
}

audios = {
    "rightmost": DATA / "question.wav",
    "leftmost": DATA / "left_question.wav",
}

# Check evidence before running.
for path in [*images.values(), *audios.values()]:
    if not path.is_file() or path.stat().st_size == 0:
        raise FileNotFoundError(f"Missing/empty input: {path}")

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

assert digest(images["original"]) != digest(images["reversed"])
assert digest(audios["rightmost"]) != digest(audios["leftmost"])

def encode(path):
    return base64.b64encode(path.read_bytes()).decode()

# Cache input encoding, not model responses.
image_data = {k: encode(v) for k, v in images.items()}
audio_data = {k: encode(v) for k, v in audios.items()}

cases = [
    ("P4-F01", "original", "rightmost", "blue"),
    ("P4-F02", "original", "leftmost", "red"),
    ("P4-F03", "reversed", "rightmost", "red"),
    ("P4-F04", "reversed", "leftmost", "blue"),
]

results = []

for test_id, image_key, audio_key, expected in cases:

    payload = {
        "model": "lfm3-omni",
        "temperature": 0,
        "max_tokens": 48,
        "messages": [
            {
                "role": "system",
                "content": (
                    "Use the supplied image and spoken question. "
                    "Answer with exactly one color word in text. "
                    "Do not repeat the question."
                ),
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": (
                                "data:image/png;base64,"
                                + image_data[image_key]
                            )
                        },
                    },
                    {
                        "type": "input_audio",
                        "input_audio": {
                            "data": audio_data[audio_key],
                            "format": "wav",
                        },
                    },
                ],
            },
        ],
    }

    start = time.perf_counter()

    response = requests.post(
        URL, json=payload, timeout=300
    )
    latency = time.perf_counter() - start
    response.raise_for_status()

    actual = response.json()["choices"][0]["message"]["content"]
    normalized = actual.strip().lower().strip(" .!?,\n")

    result = {
        "id": test_id,
        "image": image_key,
        "audio": audio_key,
        "expected": expected,
        "actual": actual,
        "pass": normalized == expected,
        "latency_s": round(latency, 3),
        "image_sha256": digest(images[image_key]),
        "audio_sha256": digest(audios[audio_key]),
    }

    results.append(result)

    print(
        f"{test_id}: expected={expected}, "
        f"actual={actual!r}, "
        f"pass={result['pass']}, "
        f"latency={latency:.2f}s"
    )

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(results, indent=2))

passed = sum(r["pass"] for r in results)
print(f"\nFINAL: {passed}/{len(results)} passed")
print(f"Saved: {OUT}")
