
from pathlib import Path
from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parents[2]
source_path = Path("/home/pratay-karali/Downloads/imag2.png")
if not source_path.is_file():
    source_path = PROJECT_ROOT / "data" / "images" / "imag2.png"

source = Image.open(source_path).convert("RGB")

print("Original:", source.size)

half = source.resize(
    (source.width // 2, source.height // 2),
    Image.Resampling.LANCZOS
)

output_path = PROJECT_ROOT / "data" / "images" / "imag2_half.png"
output_path.parent.mkdir(parents=True, exist_ok=True)
half.save(output_path)

print("Resized:", half.size)
