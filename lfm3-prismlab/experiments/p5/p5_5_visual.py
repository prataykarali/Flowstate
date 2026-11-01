
import base64
import json
import statistics
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / "assets"
RESULTS = ROOT / "results"

ASSETS.mkdir(exist_ok=True)
RESULTS.mkdir(exist_ok=True)

URL = "http://127.0.0.1:8085/v1/systemone"

CASES = [
    ("V01", "circle", "red"),
    ("V02", "square", "blue"),
    ("V03", "triangle", "green"),
    ("V04", "square", "red"),
    ("V05", "triangle", "blue"),
    ("V06", "circle", "green"),
]

COLORS = {
    "red": (230, 40, 40),
    "blue": (40, 90, 230),
    "green": (35, 175, 75),
}


# 1. Create visual evidence
def create_image(case_id, shape, color):
    image = Image.new("RGB", (256, 256), "white")
    draw = ImageDraw.Draw(image)
    fill = COLORS[color]

    if shape == "circle":
        draw.ellipse((45, 45, 211, 211), fill=fill)
    elif shape == "square":
        draw.rectangle((45, 45, 211, 211), fill=fill)
    elif shape == "triangle":
        draw.polygon(
            [(128, 35), (35, 215), (221, 215)],
            fill=fill
        )

    path = ASSETS / f"{case_id}.png"
    image.save(path)
    return path


# 2. Encode an image for the API
def encode_image(path):
    data = base64.b64encode(path.read_bytes()).decode()
    return f"data:image/png;base64,{data}"


# 3. Define typed decisions
QUESTIONS = {
    "shape": {
        "type": "choice",
        "instructions": "What is the large central geometric shape?",
        "criteria": {
            "circle": "A circular shape",
            "square": "A square shape",
            "triangle": "A triangular shape"
        }
    },
    "color": {
        "type": "choice",
        "instructions": "What is the color of the large central shape?",
        "criteria": {
            "red": "Red",
            "blue": "Blue",
            "green": "Green"
        }
    }
}


# 4. Call the decision model
def infer(image_path=None):
    payload = {
        "state": (
            "Determine the central shape and its color "
            "from the available visual evidence."
        ),
        "questions": QUESTIONS
    }

    if image_path is not None:
        payload["images"] = [encode_image(image_path)]

    request = Request(
        URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    start = time.perf_counter()

    with urlopen(request, timeout=180) as response:
        result = json.load(response)

    latency = time.perf_counter() - start
    return result, latency


# 5. Benchmark
def main():
    records = []

    stamp = datetime.now(timezone.utc).strftime(
        "%Y%m%dT%H%M%SZ"
    )
    output = RESULTS / f"p5_5_visual_{stamp}.json"

    for case_id, shape, color in CASES:
        path = create_image(case_id, shape, color)

        # Both conditions use identical text and questions.
        for condition in ("image", "no_image"):
            image_input = path if condition == "image" else None

            raw, latency = infer(image_input)
            answers = raw["answers"]

            predicted_shape = answers["shape"]["choice"]
            predicted_color = answers["color"]["choice"]

            record = {
                "id": case_id,
                "condition": condition,
                "expected_shape": shape,
                "expected_color": color,
                "predicted_shape": predicted_shape,
                "predicted_color": predicted_color,
                "shape_confidence": answers["shape"]["confidence"],
                "color_confidence": answers["color"]["confidence"],
                "correct": (
                    predicted_shape == shape
                    and predicted_color == color
                ) if condition == "image" else None,
                "latency_s": round(latency, 4),
                "usage": raw.get("usage", {}),
                "raw_response": raw
            }

            records.append(record)

            print(
                f"{case_id} {condition:<8} "
                f"shape={predicted_shape:<9} "
                f"color={predicted_color:<5} "
                f"time={latency:.3f}s",
                flush=True
            )

    output.write_text(json.dumps(records, indent=2))

    visual = [
        r for r in records if r["condition"] == "image"
    ]
    controls = [
        r for r in records if r["condition"] == "no_image"
    ]

    print("\n=== P5.5.1 RESULTS ===")
    print(
        "Visual accuracy:",
        f"{sum(r['correct'] for r in visual)}/{len(visual)}"
    )
    print(
        "Visual median latency:",
        round(statistics.median(r["latency_s"] for r in visual), 3),
        "seconds"
    )
    print(
        "No-image median latency:",
        round(statistics.median(r["latency_s"] for r in controls), 3),
        "seconds"
    )
    print("Saved:", output)


if __name__ == "__main__":
    main()
