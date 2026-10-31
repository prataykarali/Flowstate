
import base64
import json
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data/p4/spatial"
OUT = ROOT / "results/p4"
URL = "http://127.0.0.1:8083/v1/chat/completions"

QUESTIONS = {
    "top_right": "Which color is the object in the top right?",
    "below_red": "What shape is directly below the red triangle?",
    "left_of_blue": "What shape is immediately to the left of the blue circle?",
    "missing_diamond": "What color is the diamond in the image?",
    "top_left": "What shape is in the top left?",
}

CASES = [
    ("B01", "scene_a", "top_right", "blue"),
    ("B02", "scene_b", "top_right", "green"),
    ("B03", "scene_a", "below_red", "square"),
    ("B04", "scene_b", "below_red", "unknown"),
    ("B05", "scene_a", "left_of_blue", "triangle"),
    ("B06", "scene_b", "left_of_blue", "unknown"),
    ("B07", "scene_a", "missing_diamond", "unknown"),
    ("B08", "scene_b", "top_left", "star"),
]

def encode(path):
    return base64.b64encode(path.read_bytes()).decode()

def request_model(system, content):
    payload = {
        "model": "lfm3-omni",
        "temperature": 0,
        "max_tokens": 100,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": content},
        ],
    }

    start = time.perf_counter()
    response = requests.post(URL, json=payload, timeout=300)
    response.raise_for_status()

    answer = response.json()["choices"][0]["message"]["content"]
    return answer, round(time.perf_counter() - start, 3)

def normalize(text):
    return str(text).lower().strip(" \n.!?,\"'")

# -----------------------------------------
# Experiment 1: Audio-only ASR
# -----------------------------------------

asr_results = []

print("\n=== AUDIO-ONLY TRANSCRIPTION ===")

for key, expected in QUESTIONS.items():
    wav = DATA / f"{key}.wav"

    content = [{
        "type": "input_audio",
        "input_audio": {
            "data": encode(wav),
            "format": "wav",
        },
    }]

    actual, latency = request_model(
        "Perform ASR in English. Transcribe the speech. "
        "Respond with the transcription only.",
        content
    )

    result = {
        "question": key,
        "expected": expected,
        "transcription": actual,
        "exact_match": normalize(actual) == normalize(expected),
        "latency_s": latency,
    }
    asr_results.append(result)

    print(f"\n{key}")
    print("Expected:", expected)
    print("Heard:   ", actual)
    print("Latency: ", latency)

(OUT / "spatial_asr_diagnostic.json").write_text(
    json.dumps(asr_results, indent=2)
)

# -----------------------------------------
# Experiment 2: Image + typed question
# -----------------------------------------

typed_results = []

print("\n=== IMAGE + TEXT CONTROL ===")

system = (
    "Answer the user's question using the supplied image. "
    "Answer with exactly one word. "
    "If the referenced object or relationship does not exist, "
    "answer UNKNOWN. Do not guess."
)

for case_id, scene, question_key, expected in CASES:
    image_path = DATA / f"{scene}.png"

    content = [
        {
            "type": "image_url",
            "image_url": {
                "url": f"data:image/png;base64,{encode(image_path)}"
            },
        },
        {
            "type": "text",
            "text": QUESTIONS[question_key],
        },
    ]

    actual, latency = request_model(system, content)

    passed = normalize(actual) == expected

    result = {
        "id": case_id,
        "scene": scene,
        "question": question_key,
        "expected": expected,
        "actual": actual,
        "strict_pass": passed,
        "latency_s": latency,
    }

    typed_results.append(result)

    print(
        f"{case_id} | expected={expected} | "
        f"actual={actual!r} | PASS={passed} | {latency}s"
    )

(OUT / "spatial_typed_diagnostic.json").write_text(
    json.dumps(typed_results, indent=2)
)

passed = sum(r["strict_pass"] for r in typed_results)

print(f"\nTEXT CONTROL: {passed}/8")
print("Diagnostic files saved.")
