
import argparse
import base64
import json
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data/p4/spatial"
OUT = ROOT / "results/p4"
OUT.mkdir(parents=True, exist_ok=True)

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

def infer(url, payload):
    start = time.perf_counter()
    r = requests.post(url, json=payload, timeout=300)
    r.raise_for_status()
    elapsed = time.perf_counter() - start

    data = r.json()
    choice = data["choices"][0]
    answer = choice["message"]["content"]

    if not isinstance(answer, str):
        raise ValueError("Expected text response")

    return answer.strip(), round(elapsed, 3), choice.get("finish_reason")

def save(path, rows):
    path.write_text(json.dumps(rows, indent=2))

def asr_stage(port):
    url = f"http://127.0.0.1:{port}/v1/chat/completions"
    results = []

    for case_id, scene, question, expected in CASES:
        wav = DATA / f"{question}.wav"

        payload = {
            "model": "lfm3-audio",
            "temperature": 0,
            "max_tokens": 128,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "Perform ASR in English. "
                        "Transcribe the speech; "
                        "do not answer the question."
                    )
                },
                {
                    "role": "user",
                    "content": [{
                        "type": "input_audio",
                        "input_audio": {
                            "data": encode(wav),
                            "format": "wav",
                        },
                    }],
                },
            ],
        }

        text, latency, finish = infer(url, payload)

        row = {
            "id": case_id,
            "scene": scene,
            "question": question,
            "expected_answer": expected,
            "transcript": text,
            "asr_s": latency,
            "asr_finish": finish,
        }

        results.append(row)
        save(OUT / "modular_asr.json", results)

        print(f"{case_id} | ASR={text!r} | {latency}s")

def vision_stage(port):
    url = f"http://127.0.0.1:{port}/v1/chat/completions"
    asr_path = OUT / "modular_asr.json"

    if not asr_path.exists():
        raise FileNotFoundError("Run --stage asr first")

    rows = json.loads(asr_path.read_text())
    if len(rows) != len(CASES):
        raise ValueError("Incomplete ASR results")

    results = []

    for case_id, scene, question, expected in CASES:
        row = next(r for r in rows if r["id"] == case_id)
        transcript = row["transcript"]

        image = DATA / f"{scene}.png"

        payload = {
            "model": "lfm3-vision",
            "temperature": 0,
            "max_tokens": 128,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "Answer the question using the image. "
                        "Use exactly one word. "
                        "If the referenced object or spatial "
                        "relationship does not exist, "
                        "answer UNKNOWN. Do not guess."
                    ),
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": (
                                    "data:image/png;base64,"
                                    + encode(image)
                                ),
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

        answer, latency, finish = infer(url, payload)

        normalized = answer.lower().strip(" .!?,\"'")
        strict = normalized == expected

        result = {
            **row,
            "answer": answer,
            "strict_pass": strict,
            "vision_s": latency,
            "total_inference_s": round(
                row["asr_s"] + latency, 3
            ),
            "vision_finish": finish,
        }

        results.append(result)
        save(OUT / "modular_results.json", results)

        print(
            f"{case_id} | expected={expected} | "
            f"actual={answer!r} | "
            f"PASS={strict} | "
            f"total={result['total_inference_s']}s"
        )

    passed = sum(r["strict_pass"] for r in results)
    print(f"\nMODULAR STRICT: {passed}/{len(results)}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--stage",
        choices=["asr", "vision"],
        required=True,
    )
    parser.add_argument("--port", type=int)
    args = parser.parse_args()

    if args.stage == "asr":
        asr_stage(args.port or 8082)
    else:
        vision_stage(args.port or 8180)
