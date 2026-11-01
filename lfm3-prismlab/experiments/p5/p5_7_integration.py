#!/usr/bin/env python3
"""PrismLab P5.7: modality-aware d1 decision integration checkpoint.

Place this file in experiments/p5 and run from the PrismLab repository root:
    python -u experiments/p5/p5_7_integration.py

Requires:
    d1-2B (image/text) at localhost:8085
    d1-Omni-2B (audio) at localhost:8086
    Pillow (already used in P5.5)
    P5.6b's generated AS01_16k.wav and AT02_16k.wav

This is an integration smoke test, not a production router, calibration study,
head-to-head speed benchmark, or an ASR comparison. No action is executed.
"""
from __future__ import annotations

import base64
import hashlib
import json
import math
import statistics
import time
import wave
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from PIL import Image, ImageDraw, ImageStat

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / "assets"
RESULTS = ROOT / "results"
AUDIO_DIR = ASSETS / "p5_6b"
TEXT_VISION_URL = "http://127.0.0.1:8085/v1/systemone"
AUDIO_URL = "http://127.0.0.1:8086/v1/systemone"
THRESHOLD = 0.90   # Exploratory: chosen after examining P5.2/P5.3. NOT CALIBRATED.

ROUTE_LABELS = ("billing", "technical", "shipping", "other")
ROUTE_QUESTION = {
    "route": {
        "type": "choice",
        "instructions": "Which department should primarily handle the customer's request?",
        "criteria": {
            "billing": "Charges, invoices, subscription payments and refunds",
            "technical": "Application bugs, sign-in failures and software faults",
            "shipping": "Parcel delivery, tracking and damaged shipments",
            "other": "General information, product plans and sales enquiries",
        },
    }
}
VISUAL_QUESTIONS = {
    "shape": {
        "type": "choice",
        "instructions": "What is the large central geometric shape in the image?",
        "criteria": {
            "circle": "A circle", "square": "A square", "triangle": "A triangle",
        },
    },
    "color": {
        "type": "choice",
        "instructions": "What color is the large central shape in the image?",
        "criteria": {"red": "Red", "blue": "Blue", "green": "Green"},
    },
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def send_request(url: str, payload: dict) -> tuple[dict, float]:
    request = Request(
        url, data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}, method="POST"
    )
    start = time.perf_counter()
    try:
        with urlopen(request, timeout=180) as response:
            raw = json.load(response)
    except HTTPError as exc:
        msg = exc.read(700).decode("utf-8", "replace")
        raise RuntimeError(f"HTTP {exc.code} from {url}: {msg}") from exc
    except URLError as exc:
        raise RuntimeError(f"Server unavailable at {url}: {exc.reason}") from exc
    return raw, round(time.perf_counter() - start, 5)


def validate_choice(answer: dict, expected_labels: tuple[str, ...]) -> tuple[str, float]:
    prediction = answer["choice"]
    probs = answer["probabilities"]
    if prediction not in expected_labels or set(probs) != set(expected_labels):
        raise ValueError("Unexpected label set in choice output")
    values = [float(probs[k]) for k in expected_labels]
    if (not all(math.isfinite(v) and 0 <= v <= 1 for v in values)
            or abs(sum(values) - 1.0) > 0.02):
        raise ValueError("Invalid decision probabilities")
    return prediction, float(probs[prediction])


def evidence_check_image(path: Path | None) -> tuple[bool, str]:
    if path is None or not path.is_file():
        return False, "missing_image"
    with Image.open(path) as im:
        rgb = im.convert("RGB")
        # A perfectly or nearly uniform image cannot provide this task's
        # required colored central-shape evidence. Not a general OOD detector.
        stdev = ImageStat.Stat(rgb).stddev
        if max(stdev) < 3.0:
            return False, "near_uniform_image"
    return True, "image_present_nonuniform"


def evidence_check_audio(path: Path | None) -> tuple[bool, str]:
    if path is None or not path.is_file():
        return False, "missing_audio"
    try:
        with wave.open(str(path), "rb") as wav:
            if (wav.getnchannels(), wav.getframerate(), wav.getsampwidth()) != (1, 16000, 2):
                return False, "unexpected_wav_format"
            if wav.getnframes() == 0:
                return False, "empty_wav"
            frames = wav.readframes(wav.getnframes())
            # stdlib audioop was removed in Python 3.13: use array('h').
            from array import array
            import sys
            samples = array("h")
            samples.frombytes(frames)
            if sys.byteorder != "little":
                samples.byteswap()
            if not samples:
                return False, "empty_samples"
            rms = (sum(int(s) * int(s) for s in samples) / len(samples)) ** 0.5 / 32768
            if rms < 0.002:
                return False, "near_silent_audio"
    except (wave.Error, EOFError, OSError) as exc:
        return False, f"invalid_wav_{type(exc).__name__}"
    return True, "wav16k_with_nontrivial_audio"


def make_visual_tests() -> tuple[Path, Path]:
    ASSETS.mkdir(parents=True, exist_ok=True)
    colored = ASSETS / "p5_7_red_circle.png"
    blank = ASSETS / "p5_7_blank.png"
    im = Image.new("RGB", (256, 256), "white")
    ImageDraw.Draw(im).ellipse((45, 45, 211, 211), fill=(230, 40, 40))
    im.save(colored)
    Image.new("RGB", (256, 256), "white").save(blank)
    return colored, blank


def scenarios() -> list[dict]:
    circle, blank = make_visual_tests()
    return [
        {"id": "X01", "modality": "text", "expected": "billing",
         "text": "I was charged twice. Please refund the duplicate payment."},
        {"id": "X02", "modality": "text", "expected": "technical",
         "text": "The app crashes whenever I try to sign in."},
        {"id": "X03", "modality": "text", "expected": "technical",
         "text": "The payment form is blank and my card has not been charged."},
        {"id": "X04", "modality": "image", "expected": {"shape": "circle", "color": "red"},
         "path": circle},
        {"id": "X05", "modality": "image", "expected": None,
         "path": blank, "must_review": True},
        {"id": "X06", "modality": "image", "expected": None,
         "path": None, "must_review": True},
        {"id": "X07", "modality": "audio", "expected": "shipping",
         "path": AUDIO_DIR / "AS01_16k.wav"},
        {"id": "X08", "modality": "audio", "expected": "technical",
         "path": AUDIO_DIR / "AT02_16k.wav"},
        {"id": "X09", "modality": "audio", "expected": None,
         "path": None, "must_review": True},
    ]


def evaluate(case: dict) -> dict:
    cid = case["id"]
    modality = case["modality"]
    record = {"id": cid, "modality": modality, "expected": case["expected"],
              "threshold": THRESHOLD, "status": "ok", "ttft_s": None}
    try:
        if modality == "text":
            payload = {"state": case["text"], "questions": ROUTE_QUESTION}
            url = TEXT_VISION_URL
            eligible, evidence_status = True, "nonempty_text"
        elif modality == "image":
            eligible, evidence_status = evidence_check_image(case.get("path"))
            payload = {"state": "Identify the central geometric shape and color.",
                       "questions": VISUAL_QUESTIONS}
            if case.get("path") is not None:
                path = case["path"]
                payload["images"] = [
                    "data:image/png;base64," + base64.b64encode(path.read_bytes()).decode("ascii")
                ]
            url = TEXT_VISION_URL
        elif modality == "audio":
            eligible, evidence_status = evidence_check_audio(case.get("path"))
            payload = {"state": None, "questions": ROUTE_QUESTION}
            if case.get("path") is not None:
                path = case["path"]
                payload["files"] = [
                    "data:audio/wav;base64," + base64.b64encode(path.read_bytes()).decode("ascii")
                ]
            url = AUDIO_URL
        else:
            raise ValueError(f"Unknown modality: {modality}")
        record["evidence_status"] = evidence_status
        record["evidence_eligible"] = eligible
        if case.get("path") is not None and case["path"].is_file():
            record["asset_sha256"] = sha256(case["path"])
        # Missing input: refuse without ever consulting the model.
        if not eligible:
            record.update({"decision": "REVIEW", "reason": evidence_status,
                           "model_called": False, "latency_s": None,
                           "confidence": None, "prediction": None, "correct": None})
            return record
        raw, latency = send_request(url, payload)
        record.update({"model_called": True, "model": raw.get("model"),
                       "latency_s": latency, "usage": raw.get("usage", {}),
                       "raw_response": raw})
        if modality == "image":
            shp, shp_conf = validate_choice(raw["answers"]["shape"],
                                            ("circle", "square", "triangle"))
            col, col_conf = validate_choice(raw["answers"]["color"],
                                            ("red", "blue", "green"))
            prediction = {"shape": shp, "color": col}
            confidence = min(shp_conf, col_conf)  # NOT a calibrated joint probability.
            record["individual_confidences"] = {"shape": shp_conf, "color": col_conf}
        else:
            prediction, confidence = validate_choice(raw["answers"]["route"], ROUTE_LABELS)
        record["prediction"] = prediction
        record["confidence"] = confidence
        # Gate is advisory only. No billing/refund/app/device action is executed.
        record["decision"] = "AUTO_RECOMMEND" if confidence >= THRESHOLD else "REVIEW"
        record["reason"] = "confidence_gate" if confidence < THRESHOLD else "passed_exploratory_gate"
        record["correct"] = prediction == case["expected"] if case["expected"] is not None else None
        if case.get("must_review") and record["decision"] != "REVIEW":
            record["warning"] = "REVIEW_REQUIRED_CASE_WAS_AUTO_RECOMMENDED"
        return record
    except Exception as exc:
        record.update({"status": "error", "error": str(exc), "decision": "ERROR"})
        return record


def main() -> None:
    RESULTS.mkdir(parents=True, exist_ok=True)
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    raw_path = RESULTS / f"p5_7_integration_{run_id}.jsonl"
    summary_path = RESULTS / f"p5_7_integration_{run_id}_summary.json"
    rows = []
    print("P5.7 — Decision router integration smoke test")
    print("Text/image: :8085 | Audio: :8086 | Advisory threshold: 0.90")
    with raw_path.open("w") as f:
        for case in scenarios():
            r = evaluate(case)
            rows.append(r)
            f.write(json.dumps(r) + "\n")
            f.flush()
            print(f"{r['id']} {r['modality']:<5} {r['decision']:<14} "
                  f"pred={str(r.get('prediction')):<38} "
                  f"p={str(round(r['confidence'], 3)) if r.get('confidence') is not None else '-':<6} "
                  f"latency={r.get('latency_s')} "
                  f"reason={r.get('reason', r.get('error'))}", flush=True)

    valid = [r for r in rows if r["status"] == "ok"]
    inference = [r for r in valid if r.get("model_called")]
    labeled = [r for r in inference if r["correct"] is not None]
    times = [r["latency_s"] for r in inference]
    summary = {
        "suite": "P5.7", "timestamp_utc": run_id,
        "threshold": THRESHOLD, "threshold_was_selected_post_hoc": True,
        "total_cases": len(rows), "successful_records": len(valid),
        "request_errors": len(rows) - len(valid),
        "model_requests": len(inference),
        "blocked_without_model_call": sum(r.get("model_called") is False for r in valid),
        "auto_recommendations": sum(r.get("decision") == "AUTO_RECOMMEND" for r in valid),
        "review_decisions": sum(r.get("decision") == "REVIEW" for r in valid),
        "labeled_inferences": len(labeled),
        "labeled_accuracy": (sum(r["correct"] for r in labeled) / len(labeled)) if labeled else None,
        "median_model_request_latency_s": statistics.median(times) if times else None,
        "review_required_auto_accepted": [r["id"] for r in rows if r.get("warning")],
        "errors": [{"id": r["id"], "error": r["error"]} for r in rows if r["status"] == "error"],
        "caveats": [
            "Small selected synthetic cases; reported accuracy is NOT a generalization estimate",
            "No real user traffic, deployment-calibrated probabilities, or independently locked threshold",
            "Text/vision and audio use different models/quantizations; cross-modal speed comparison is not controlled",
            "Visual and audio input guards only check trivial missing/invalid evidence; not semantic validity",
            "Some rejected requests are blocked by explicit input guards, not by model confidence",
            "AUTO_RECOMMEND is only a label; the script NEVER executes external actions",
            "TTFT, output generation tokens/sec are inapplicable to these non-generative decisions",
        ],
        "raw_path": str(raw_path),
    }
    summary_path.write_text(json.dumps(summary, indent=2))
    print("\n=== P5.7 SUMMARY ===")
    print(json.dumps(summary, indent=2))
    print("Saved raw:", raw_path)
    print("Saved summary:", summary_path)


if __name__ == "__main__":
    main()
