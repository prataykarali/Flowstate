
import base64
import json
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[2]
URL = "http://127.0.0.1:8083/v1/chat/completions"

def b64(path):
    return base64.b64encode(path.read_bytes()).decode()

audio = b64(ROOT / "data/p4/question.wav")
image = b64(ROOT / "data/p4/colors.png")

audio_part = {
    "type": "input_audio",
    "input_audio": {"data": audio, "format": "wav"},
}

image_part = {
    "type": "image_url",
    "image_url": {
        "url": f"data:image/png;base64,{image}"
    },
}

def run(name, system, content):
    payload = {
        "model": "lfm3-omni",
        "temperature": 0,
        "max_tokens": 80,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": content},
        ],
    }

    start = time.perf_counter()
    response = requests.post(
        URL, json=payload, timeout=300
    )
    elapsed = time.perf_counter() - start
    response.raise_for_status()

    answer = response.json()["choices"][0]["message"]["content"]

    return {
        "test": name,
        "actual": answer,
        "latency_s": round(elapsed, 3),
    }

results = []

# Control B: Speech recognition without image
results.append(run(
    "P4-A01",
    "Perform ASR in English. Respond in text.",
    [audio_part],
))

# Experiment C: Joint image + speech
results.append(run(
    "P4-AV01",
    "Respond in text. Answer the spoken question using the image. "
    "Use only one color word.",
    [
        image_part,
        audio_part,
        {"type": "text", "text": "Answer the spoken question."},
    ],
))

for r in results:
    print(json.dumps(r, indent=2))

output = ROOT / "results/p4/audio_visual_probe.json"
output.write_text(json.dumps(results, indent=2))
