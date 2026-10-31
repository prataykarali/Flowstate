
from pathlib import Path
from math import cos, sin, pi
import subprocess

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data/p4/spatial"
DATA.mkdir(parents=True, exist_ok=True)

# Fixed positions: TL, TR, BL, BR
positions = [(160, 120), (480, 120),
             (160, 360), (480, 360)]

scenes = {
    "scene_a": [
        ("triangle", "red"),
        ("circle", "blue"),
        ("square", "green"),
        ("star", "yellow"),
    ],
    "scene_b": [
        ("star", "yellow"),
        ("square", "green"),
        ("circle", "blue"),
        ("triangle", "red"),
    ],
}

def draw_shape(draw, shape, color, x, y):
    r = 60

    if shape == "circle":
        draw.ellipse((x-r, y-r, x+r, y+r), fill=color)

    elif shape == "square":
        draw.rectangle((x-r, y-r, x+r, y+r), fill=color)

    elif shape == "triangle":
        draw.polygon(
            [(x, y-r), (x-r, y+r), (x+r, y+r)],
            fill=color
        )

    elif shape == "star":
        points = []
        for i in range(10):
            angle = -pi/2 + i*pi/5
            radius = r if i % 2 == 0 else r*0.45
            points.append((
                x + radius*cos(angle),
                y + radius*sin(angle)
            ))
        draw.polygon(points, fill=color)

# Generate images
for name, objects in scenes.items():
    image = Image.new("RGB", (640, 480), "white")
    draw = ImageDraw.Draw(image)

    for (shape, color), (x, y) in zip(objects, positions):
        draw_shape(draw, shape, color, x, y)

    image.save(DATA / f"{name}.png")
    print(f"Created {name}.png")

# Audio question dataset
questions = {
    "top_right": "Which color is the object in the top right?",
    "below_red": "What shape is directly below the red triangle?",
    "left_of_blue": "What shape is immediately to the left of the blue circle?",
    "missing_diamond": "What color is the diamond in the image?",
    "top_left": "What shape is in the top left?",
}

for key, question in questions.items():
    path = DATA / f"{key}.wav"

    if path.exists():
        print(f"Keeping existing recording: {key}")
        continue

    input(f"\nSay: {question}\nPress ENTER to record...")

    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error",
        "-f", "pulse", "-i", "default",
        "-t", "7", "-ar", "16000", "-ac", "1",
        "-c:a", "pcm_s16le",
        "-y", str(path)
    ], check=True)

    print(f"Saved {path.name}")

print("\nDataset preparation complete.")
