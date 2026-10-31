
import base64
import json
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data/p4/spatial"
OUT = ROOT / "results/p4/vl_empty_diagnostic.json"

ASR = json.loads(
    (ROOT / "results/p4/modular_asr.json").read_text()
)
by_id = {r["id"]: r for r in ASR}

CASES = [
    ("B04", "scene_b"),
    ("B06", "scene_b"),
    ("B07", "scene_a"),
]

SYSTEM = (
    "Answer the question using the image. "
    "Use exactly one word. "
    "If the referenced object or spatial "
    "relationship does not exist, "
    "answer UNKNOWN. Do not guess."
)

results = []

for case_id, scene in CASES:
    image_path = DATA / f"{scene}.png"
    image = base64.b64encode(
        image_path.read_bytes()
    ).decode()

    transcript = by_id[case_id]["transcript"]

    payload = {
        "model": "lfm3-vision",
        "temperature": 0,
        "max_tokens": 384,
        "messages": [
            {"role": "system", "content": SYSTEM},
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/png;base64,{image}"
                        },
                    },
                    {
                        "type": "text",
                        "text": transcript,
                    },
                ],
            },
        ],
    }

    start = time.perf_counter()

    response = requests.post(
        "http://127.0.0.1:8180/v1/chat/completions",
        json=payload,
        timeout=300,
    )
    latency = time.perf_counter() - start
    response.raise_for_status()

    data = response.json()
    choice = data["choices"][0]
    message = choice["message"]

    content = message.get("content")
    reasoning = message.get("reasoning_content")

    result = {
        "id": case_id,
        "transcript": transcript,
        "max_tokens": 384,
        "answer": content,
        "finish_reason": choice.get("finish_reason"),
        "reasoning_chars": len(reasoning or ""),
        "usage": data.get("usage", {}),
        "latency_s": round(latency, 3),
    }

    results.append(result)
    OUT.write_text(json.dumps(results, indent=2))

    print(json.dumps(result, indent=2))

print("\nDiagnostic complete.")
