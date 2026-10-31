
import base64
import io
import json
import time
from pathlib import Path

import requests
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]

# 1. Generate controlled visual evidence
img = Image.new("RGB", (480, 180), "white")
draw = ImageDraw.Draw(img)

for i, color in enumerate(["red", "green", "blue"]):
    x = 30 + i * 160
    draw.rectangle((x, 35, x + 100, 145), fill=color)

image_path = ROOT / "data/p4/colors.png"
image_path.parent.mkdir(parents=True, exist_ok=True)
img.save(image_path)

# 2. Encode image
buffer = io.BytesIO()
img.save(buffer, format="PNG")
encoded = base64.b64encode(buffer.getvalue()).decode()

# 3. Construct multimodal request
payload = {
    "model": "lfm3-omni",
    "temperature": 0,
    "max_tokens": 32,
    "messages": [
        {
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/png;base64,{encoded}"
                    }
                },
                {
                    "type": "text",
                    "text": (
                        "What color is the rightmost rectangle? "
                        "Answer with one color word."
                    )
                }
            ]
        }
    ]
}

# 4. Execute and record
start = time.perf_counter()

response = requests.post(
    "http://127.0.0.1:8083/v1/chat/completions",
    json=payload,
    timeout=300
)
elapsed = time.perf_counter() - start
response.raise_for_status()

answer = response.json()["choices"][0]["message"]["content"]

result = {
    "test_id": "P4-V01",
    "model": "LFM3-Omni-2B",
    "inputs": ["image", "text"],
    "expected": "blue",
    "actual": answer,
    "pass": answer.strip().lower().rstrip(".!") == "blue",
    "latency_seconds": round(elapsed, 3),
    "timing_type": "end_to_end_nonstreaming"
}

output = ROOT / "results/p4/first_probe.json"
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(result, indent=2))

print(json.dumps(result, indent=2))
