
import json
from pathlib import Path
from PIL import Image

from p5_5_visual import RESULTS, ASSETS, infer

# TODO 1: Insert our provisional threshold
THRESHOLD = 0.90

# Read the latest completed P5.5.1 experiment
files = sorted(RESULTS.glob("p5_5_visual_*.json"))
assert files, "Run P5.5.1 first"

records = json.loads(files[-1].read_text())

controls = [
    r for r in records
    if r["condition"] == "no_image"
]

print("=== NO-IMAGE CONFIDENCE ===")

accepted = 0

for row in controls:
    # TODO 2: Both shape and color must be confident
    score = min(
    row["shape_confidence"],
    row["color_confidence"]
    )

    action = "AUTO" if score >= THRESHOLD else "REVIEW"
    accepted += action == "AUTO"

    print(
        row["id"],
        row["predicted_shape"],
        row["predicted_color"],
        f"score={score:.3f}",
        action
    )

print(f"Unsupported auto-decisions: {accepted}/6")


# A blank white image contains no central colored shape
blank = Image.new("RGB", (256, 256), "white")
blank_path = ASSETS / "V_blank.png"
blank.save(blank_path)

raw, latency = infer(blank_path)

shape = raw["answers"]["shape"]
color = raw["answers"]["color"]

blank_score = min(
    float(shape["confidence"]),
    float(color["confidence"])
)

print("\n=== BLANK IMAGE ===")
print("Shape:", shape["choice"], shape["confidence"])
print("Color:", color["choice"], color["confidence"])
print("Evidence score:", round(blank_score, 4))
print("Auto-route:", blank_score >= THRESHOLD)
print("Latency:", round(latency, 3), "s")

output = {
    "threshold": THRESHOLD,
    "no_image_auto_decisions": accepted,
    "no_image_cases": len(controls),
    "blank_score": blank_score,
    "blank_auto_decision": blank_score >= THRESHOLD,
    "latency_s": latency,
    "ttft_s": None,
    "usage": raw.get("usage"),
    "blank_raw": raw
}

path = RESULTS / "p5_5_evidence_gate.json"
path.write_text(json.dumps(output, indent=2))
print("Saved:", path)
