#!/usr/bin/env python3
"""PrismLab P4-D: freeze a reproducible 10-case audiovisual robustness dataset.

No model inference. Existing microphone recordings are read but never modified.
Requires Pillow and NumPy (already used in PrismLab).
"""
from __future__ import annotations

import hashlib
import json
import math
import wave
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data/p4/robustness"
AUDIO_SOURCE = ROOT / "data/p4/spatial"
MANIFEST = DATA / "manifest.json"

COLORS = {
    "red": (220, 64, 70),
    "blue": (55, 111, 218),
    "green": (54, 163, 94),
    "yellow": (236, 185, 40),
    "orange": (235, 132, 45),
    "purple": (142, 91, 191),
    "teal": (35, 164, 158),
}
QUESTIONS = {
    "top_right": "What color is the object in the top right?",
    "below_red": "What shape is directly below the red triangle?",
    "left_of_blue": "What shape is immediately to the left of the blue circle?",
    "missing_diamond": "What color is the diamond in the image?",
    "top_left": "What shape is in the top left?",
}

# Each grid location is (row, column) -> (color, shape). Blank cells are omitted.
DENSE = {
    (0, 0): ("orange", "star"),
    (0, 1): ("red", "triangle"),
    (0, 2): ("yellow", "square"),
    (1, 0): ("green", "triangle"),
    (1, 1): ("blue", "circle"),
    (1, 2): ("purple", "star"),
    (2, 0): ("teal", "square"),
    (2, 1): ("orange", "circle"),
    (2, 2): ("green", "star"),
}
SPARSE = {
    (0, 0): ("yellow", "star"),
    (1, 0): ("blue", "circle"),
    (1, 2): ("green", "square"),
    (2, 1): ("red", "triangle"),
    (2, 2): ("orange", "square"),
}
COUNTERFACTUAL_A = {
    (0, 0): ("red", "star"),
    (0, 1): ("blue", "square"),
    (0, 2): ("green", "square"),
    (1, 0): ("yellow", "triangle"),
    (1, 1): ("purple", "circle"),
    (1, 2): ("orange", "star"),
    (2, 0): ("teal", "square"),
    (2, 1): ("red", "circle"),
    (2, 2): ("blue", "star"),
}
COUNTERFACTUAL_B = dict(COUNTERFACTUAL_A)
COUNTERFACTUAL_B[(0, 2)] = ("red", "square")  # Only intervention is color.

SCENES = {
    "dense.png": DENSE,
    "sparse.png": SPARSE,
    "counterfactual_a.png": COUNTERFACTUAL_A,
    "counterfactual_b.png": COUNTERFACTUAL_B,
}

CASES = [
    # id, scene image, recording, condition, expected answer
    ("D01", "dense.png", "top_right", "new_layout_color", "yellow"),
    ("D02", "dense.png", "below_red", "new_layout_below", "circle"),
    ("D03", "dense.png", "left_of_blue", "new_layout_left", "triangle"),
    ("D04", "sparse.png", "below_red", "missing_below_relation", "unknown"),
    ("D05", "sparse.png", "left_of_blue", "missing_left_relation", "unknown"),
    ("D06", "sparse.png", "missing_diamond", "missing_object", "unknown"),
    ("D07", "dense_blurred.png", "top_left", "image_blur", "star"),
    ("D08", "dense.png", "top_right_noisy", "audio_noise", "yellow"),
    ("D09", "counterfactual_a.png", "top_right", "counterfactual_reference", "green"),
    ("D10", "counterfactual_b.png", "top_right", "counterfactual_changed", "red"),
]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def circle_points(cx: int, cy: int, r: int, n: int, start=-math.pi / 2):
    return [(int(cx + r * math.cos(start + i * 2 * math.pi / n)),
             int(cy + r * math.sin(start + i * 2 * math.pi / n)))
            for i in range(n)]


def draw_shape(draw: ImageDraw.ImageDraw, center, color: str, shape: str):
    x, y = center
    r = 65
    ink = (46, 49, 59)
    fill = COLORS[color]
    if shape == "square":
        draw.rounded_rectangle((x-r, y-r, x+r, y+r), radius=12,
                               fill=fill, outline=ink, width=4)
    elif shape == "circle":
        draw.ellipse((x-r, y-r, x+r, y+r), fill=fill, outline=ink, width=4)
    elif shape == "triangle":
        draw.polygon(circle_points(x, y+8, r+8, 3), fill=fill)
        draw.line(circle_points(x, y+8, r+8, 3) + [circle_points(x, y+8, r+8, 3)[0]],
                  fill=ink, width=4, joint="curve")
    elif shape == "star":
        points = []
        for i in range(10):
            radius = r+5 if i % 2 == 0 else r*0.47
            a = -math.pi/2 + i*math.pi/5
            points.append((int(x + radius*math.cos(a)), int(y + radius*math.sin(a))))
        draw.polygon(points, fill=fill)
        draw.line(points + [points[0]], fill=ink, width=4, joint="curve")
    else:
        raise ValueError(f"Unsupported shape: {shape}")


def make_scene(scene: dict, dest: Path) -> None:
    im = Image.new("RGB", (720, 720), (252, 249, 242))
    draw = ImageDraw.Draw(im)
    for p in (240, 480):
        draw.line((p, 18, p, 702), fill=(223, 220, 213), width=2)
        draw.line((18, p, 702, p), fill=(223, 220, 213), width=2)
    for (row, col), (color, shape) in scene.items():
        assert 0 <= row <= 2 and 0 <= col <= 2
        draw_shape(draw, (120 + col*240, 120 + row*240), color, shape)
    im.save(dest)


def correct_answer(scene: dict, question: str) -> str:
    if question == "top_right":
        return scene[(0, 2)][0] if (0, 2) in scene else "unknown"
    if question == "top_left":
        return scene[(0, 0)][1] if (0, 0) in scene else "unknown"
    if question == "missing_diamond":
        diamonds = [color for color, shape in scene.values() if shape == "diamond"]
        if len(diamonds) > 1:
            raise ValueError("Ambiguous diamond question")
        return diamonds[0] if diamonds else "unknown"
    if question in {"below_red", "left_of_blue"}:
        target = ("red", "triangle") if question == "below_red" else ("blue", "circle")
        locations = [loc for loc, obj in scene.items() if obj == target]
        if len(locations) != 1:
            raise ValueError(f"Expected exactly one {target}, found {len(locations)}")
        row, col = locations[0]
        neighbor = (row+1, col) if question == "below_red" else (row, col-1)
        return scene[neighbor][1] if neighbor in scene else "unknown"
    raise ValueError(f"Unexpected question: {question}")


def inspect_wav(path: Path) -> None:
    with wave.open(str(path), "rb") as wf:
        fmt = (wf.getframerate(), wf.getnchannels(), wf.getsampwidth())
        if fmt != (16000, 1, 2) or wf.getnframes() == 0:
            raise ValueError(f"Invalid WAV {path}: {fmt}")


def noisy_audio(source: Path, target: Path, *, snr_db: float = 15.0) -> float:
    with wave.open(str(source), "rb") as wf:
        samples = np.frombuffer(wf.readframes(wf.getnframes()), dtype="<i2")
    x = samples.astype(np.float64) / 32768.0
    signal_power = float(np.mean(x*x))
    if signal_power < 1e-7:
        raise ValueError("Input audio is too quiet for reliable noise injection")
    noise_std = math.sqrt(signal_power / (10 ** (snr_db / 10)))
    rng = np.random.default_rng(20261031)
    noise = rng.normal(0.0, noise_std, size=x.shape)
    y = np.clip(x + noise, -1.0, 32767/32768)
    pcm16 = np.rint(y * 32768).astype("<i2")
    with wave.open(str(target), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(16000)
        wf.writeframes(pcm16.tobytes())
    observed_noise = y-x
    actual = 10*math.log10(signal_power / max(float(np.mean(observed_noise**2)), 1e-20))
    return round(actual, 3)


def make_contact_sheet(images: list[Path], dest: Path) -> None:
    thumb = 320
    pad = 18
    label_height = 34
    w, h = 3*(thumb + pad)+pad, 2*(thumb + label_height + pad)+pad
    sheet = Image.new("RGB", (w, h), "white")
    draw = ImageDraw.Draw(sheet)
    for i, path in enumerate(images):
        r, c = divmod(i, 3)
        x, y = pad + c*(thumb+pad), pad + r*(thumb+label_height+pad)
        with Image.open(path) as im:
            sheet.paste(im.resize((thumb, thumb), Image.Resampling.LANCZOS), (x, y))
        draw.text((x, y+thumb+7), path.name, fill="black")
    sheet.save(dest)


def main() -> None:
    if MANIFEST.exists():
        raise SystemExit(f"Frozen manifest already exists: {MANIFEST}. Refusing to overwrite.")
    # Check every original recording before creating output artifacts.
    for name in {"top_right", "below_red", "left_of_blue", "missing_diamond", "top_left"}:
        inspect_wav(AUDIO_SOURCE / f"{name}.wav")
    DATA.mkdir(parents=True, exist_ok=True)
    for filename, scene in SCENES.items():
        make_scene(scene, DATA / filename)
    (Image.open(DATA / "dense.png")
     .filter(ImageFilter.GaussianBlur(radius=5))
     .save(DATA / "dense_blurred.png"))
    snr_measured = noisy_audio(AUDIO_SOURCE / "top_right.wav", DATA / "top_right_noisy.wav")
    image_to_scene = {"dense_blurred.png": DENSE, **SCENES}
    entries = []
    for case_id, image_name, audio_key, condition, expected in CASES:
        base_audio_key = "top_right" if audio_key == "top_right_noisy" else audio_key
        audio_path = (DATA / "top_right_noisy.wav" if audio_key == "top_right_noisy"
                      else AUDIO_SOURCE / f"{audio_key}.wav")
        image_path = DATA / image_name
        scene = image_to_scene[image_name]
        computed = correct_answer(scene, base_audio_key)
        if computed != expected:
            raise AssertionError(f"{case_id} expected {expected}, but geometry yields {computed}")
        entries.append({
            "id": case_id,
            "condition": condition,
            "image": str(image_path.relative_to(ROOT)),
            "audio": str(audio_path.relative_to(ROOT)),
            "spoken_question": QUESTIONS[base_audio_key],
            "expected": expected,
            "image_sha256": sha256(image_path),
            "audio_sha256": sha256(audio_path),
            **({"audio_snr_db_measured": snr_measured} if case_id == "D08" else {}),
        })
    if len(entries) != 10 or len({(x['image_sha256'], x['audio_sha256']) for x in entries}) != 10:
        raise AssertionError("Expected ten unique image/audio input combinations")
    gallery = DATA / "contact_sheet.png"
    make_contact_sheet([DATA/x for x in
        ("dense.png", "sparse.png", "dense_blurred.png",
         "counterfactual_a.png", "counterfactual_b.png")], gallery)
    manifest = {
        "dataset": "P4-D audiovisual robustness v1",
        "created_utc": datetime.now(timezone.utc).isoformat(),
        "status": "frozen_pending_human_visual_review",
        "protocol": "Fixed images, prompts, audio and expected answers. No model inference during construction.",
        "noise": {"method": "additive Gaussian", "target_snr_db": 15,
                  "measured_snr_db": snr_measured, "seed": 20261031},
        "blur_radius_px": 5,
        "cases": entries,
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Created {len(entries)} frozen cases at {MANIFEST}")
    print(f"Contact sheet: {gallery}")
    print(f"Audio D08 measured SNR: {snr_measured} dB")
    for row in entries:
        print(f"{row['id']} | {row['condition']:<25} | expected={row['expected']}")
    print("Next: visually inspect the contact sheet and listen to top_right_noisy.wav.")


if __name__ == "__main__":
    main()
