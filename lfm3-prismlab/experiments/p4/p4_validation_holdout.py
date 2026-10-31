#!/usr/bin/env python3
"""Generate 40 previously unseen spatial/audio-image test cases for PrismLab P4.

Human review is required before inference. Refuses to overwrite a frozen manifest.
Requires Pillow; reuses the five audited WAV files in data/p4/spatial/.
"""
from __future__ import annotations

import hashlib
import json
import math
import random
import wave
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / 'data/p4/holdout_v1'
AUDIO_DIR = ROOT / 'data/p4/spatial'
SEED = 20261031
RNG = random.Random(SEED)
COLORS = {'red': (220, 62, 66), 'blue': (63, 121, 220),
          'green': (58, 159, 102), 'yellow': (235, 186, 57),
          'orange': (237, 137, 66), 'purple': (142, 100, 193)}
SHAPES = ('square', 'circle', 'triangle', 'star', 'diamond')
QUESTIONS = {
    'top_right': 'What color is the object in the top right?',
    'below_red': 'What shape is directly below the red triangle?',
    'left_of_blue': 'What shape is immediately to the left of the blue circle?',
    'missing_diamond': 'What color is the diamond in the image?',
    'top_left': 'What shape is in the top left?',
}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def draw_shape(draw, x, y, color, shape):
    r = 60
    fill = COLORS[color]
    stroke = (44, 46, 55)
    if shape == 'square':
        draw.rounded_rectangle((x-r, y-r, x+r, y+r), radius=9,
                               fill=fill, outline=stroke, width=4)
    elif shape == 'circle':
        draw.ellipse((x-r, y-r, x+r, y+r), fill=fill, outline=stroke, width=4)
    elif shape == 'diamond':
        points = [(x, y-r-4), (x+r+4, y), (x, y+r+4), (x-r-4, y)]
        draw.polygon(points, fill=fill)
        draw.line(points + [points[0]], fill=stroke, width=4)
    else:
        n = 3 if shape == 'triangle' else 10
        points = []
        for i in range(n):
            angle = -math.pi/2 + i*2*math.pi/n
            radius = (r+8) if shape == 'triangle' or i % 2 == 0 else r*.46
            points.append((round(x+radius*math.cos(angle)),
                           round(y+radius*math.sin(angle))))
        draw.polygon(points, fill=fill)
        draw.line(points + [points[0]], fill=stroke, width=4)


def render(scene, path):
    image = Image.new('RGB', (720, 720), (251, 249, 243))
    draw = ImageDraw.Draw(image)
    for p in (240, 480):
        draw.line((p, 15, p, 705), fill=(219, 219, 213), width=2)
        draw.line((15, p, 705, p), fill=(219, 219, 213), width=2)
    for (row, col), (color, shape) in scene.items():
        draw_shape(draw, 120+240*col, 120+240*row, color, shape)
    image.save(path)


def candidate(scene, forbidden_shapes=(), forbidden_objects=()):
    options = [(c, s) for c in COLORS for s in SHAPES
               if s not in forbidden_shapes and (c, s) not in forbidden_objects]
    used = set(scene.values())
    return RNG.choice([obj for obj in options if obj not in used])


def make_case(question, should_exist, idx):
    scene = {}
    cells = [(r, c) for r in range(3) for c in range(3)]
    forced_blanks = set()
    forbidden_shapes = set()
    forbidden_objects = set()
    if question == 'top_right':
        spot = (0, 2)
        if should_exist:
            scene[spot] = (RNG.choice(tuple(COLORS)), RNG.choice(SHAPES))
        else:
            forced_blanks.add(spot)
    elif question == 'top_left':
        spot = (0, 0)
        if should_exist:
            scene[spot] = (RNG.choice(tuple(COLORS)), RNG.choice(SHAPES))
        else:
            forced_blanks.add(spot)
    elif question == 'below_red':
        forbidden_objects.add(('red', 'triangle'))
        if should_exist:
            origin = RNG.choice([(r, c) for r in range(2) for c in range(3)])
            below = (origin[0]+1, origin[1])
            scene[origin] = ('red', 'triangle')
            scene[below] = candidate(scene, forbidden_objects={('red', 'triangle')})
        else:
            origin = RNG.choice(cells)
            scene[origin] = ('red', 'triangle')
            below = (origin[0]+1, origin[1])
            if below in cells:
                forced_blanks.add(below)
    elif question == 'left_of_blue':
        forbidden_objects.add(('blue', 'circle'))
        if should_exist:
            origin = RNG.choice([(r, c) for r in range(3) for c in (1, 2)])
            left = (origin[0], origin[1]-1)
            scene[origin] = ('blue', 'circle')
            scene[left] = candidate(scene, forbidden_objects={('blue', 'circle')})
        else:
            origin = RNG.choice(cells)
            scene[origin] = ('blue', 'circle')
            left = (origin[0], origin[1]-1)
            if left in cells:
                forced_blanks.add(left)
    elif question == 'missing_diamond':
        forbidden_shapes.add('diamond')
        if should_exist:
            scene[RNG.choice(cells)] = (RNG.choice(tuple(COLORS)), 'diamond')
    else:
        raise ValueError(question)
    # Add distractors while preserving the truth conditions.
    free = [cell for cell in cells if cell not in scene and cell not in forced_blanks]
    RNG.shuffle(free)
    for spot in free[:min(len(free), RNG.randint(4, 6))]:
        scene[spot] = candidate(scene, forbidden_shapes=forbidden_shapes,
                                forbidden_objects=forbidden_objects)
    actual = ground_truth(scene, question)
    if should_exist != (actual != 'unknown'):
        raise AssertionError((idx, question, should_exist, scene, actual))
    return scene, actual


def ground_truth(scene, question):
    if question == 'top_right':
        return scene.get((0,2), ('unknown', 'unknown'))[0]
    if question == 'top_left':
        return scene.get((0,0), ('unknown', 'unknown'))[1]
    if question == 'missing_diamond':
        hits = [c for c, s in scene.values() if s == 'diamond']
        assert len(hits) < 2
        return hits[0] if hits else 'unknown'
    target = ('red', 'triangle') if question == 'below_red' else ('blue', 'circle')
    origins = [spot for spot, obj in scene.items() if obj == target]
    assert len(origins) == 1
    r, c = origins[0]
    adjacent = (r+1, c) if question == 'below_red' else (r, c-1)
    return scene.get(adjacent, ('unknown', 'unknown'))[1]


def sheet(images, output):
    w, h = 210, 234
    cols = 8
    out = Image.new('RGB', (cols*w, 5*h), 'white')
    d = ImageDraw.Draw(out)
    for i, path in enumerate(images):
        x, y = (i % cols)*w, (i//cols)*h
        with Image.open(path) as img:
            out.paste(img.resize((192, 192), Image.Resampling.LANCZOS), (x+7, y+4))
        d.text((x+7, y+199), path.stem, fill='black')
    out.save(output)


def main():
    manifest_path = DEST/'manifest.json'
    if manifest_path.exists():
        raise SystemExit(f'Refusing to overwrite existing frozen manifest: {manifest_path}')
    for name in QUESTIONS:
        wav = AUDIO_DIR/f'{name}.wav'
        with wave.open(str(wav), 'rb') as f:
            assert (f.getframerate(), f.getnchannels(), f.getsampwidth()) == (16000,1,2)
    DEST.mkdir(parents=True, exist_ok=True)
    # 40 new cases: 24 answerable, 16 not answerable.
    categories = [
        ('top_right', 6), ('below_red', 4), ('left_of_blue', 4),
        ('missing_diamond', 4), ('top_left', 6),
    ]
    entries, images = [], []
    for question, n_positive in categories:
        conditions = [True]*n_positive + [False]*(8-n_positive)
        RNG.shuffle(conditions)
        for exists in conditions:
            idx = len(entries)+1
            cid = f'H{idx:02}'
            scene, expected = make_case(question, exists, idx)
            image_file = DEST/f'{cid}.png'
            wav_file = AUDIO_DIR/f'{question}.wav'
            render(scene, image_file)
            images.append(image_file)
            entries.append({
                'id': cid, 'condition': question + ('_present' if exists else '_absent'),
                'image': str(image_file.relative_to(ROOT)),
                'audio': str(wav_file.relative_to(ROOT)),
                'spoken_question': QUESTIONS[question],
                'expected': expected,
                'image_sha256': sha(image_file), 'audio_sha256': sha(wav_file),
            })
    assert len(entries) == 40
    assert sum(item['expected'] != 'unknown' for item in entries) == 24
    sheet(images, DEST/'contact_sheet.png')
    manifest = {
        'dataset': 'P4-D2 spatial holdout v1',
        'created_utc': datetime.now(timezone.utc).isoformat(),
        'status': 'frozen_pending_human_visual_review',
        'seed': SEED,
        'protocol': 'Constructed before P4-D2 model inference; labels from geometry, inputs immutable.',
        'cases': entries,
    }
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    print('Created', manifest_path, 'SHA256', sha(manifest_path))
    print('New unseen cases:', len(entries), '| answerable 24 | unanswerable 16')
    print('Contact sheet:', DEST/'contact_sheet.png')
    print('Human visual review required before running inference.')


if __name__ == '__main__':
    main()
