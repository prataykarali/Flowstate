
from pathlib import Path

from prismlab.vision.vision_io import read_file_image
from prismlab.vision.vision_api import build_vision_payload, generate_vision

PROJECT_ROOT = Path(__file__).resolve().parents[2]
image_path = PROJECT_ROOT / "data" / "images" / "imag2_half.png"
if not image_path.is_file():
    image_path = Path("imag2_half.png")

image_bytes, mime = read_file_image(image_path)

payload = build_vision_payload(
    "Extract the four railway booking problem labels "
    "from the left side. Return only the labels, "
    "one per line.",
    image_bytes,
    mime
)

# Run the vision model
evidence = generate_vision(payload)

# Validate extracted evidence
if not evidence.strip():
    raise ValueError("Vision model returned empty evidence")

# Save actual model output
evidence_path = PROJECT_ROOT / "data" / "cache" / "visual_facts.txt"
evidence_path.parent.mkdir(parents=True, exist_ok=True)

evidence_path.write_text(
    evidence.strip(),
    encoding="utf-8"
)

print("\n[EVIDENCE SAVED]")
print("Location:", evidence_path)
print("Extracted evidence:\n", evidence)
