import json
import time
import math
import hashlib
import statistics
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
DATASET = ROOT / "route_cases_v1.jsonl"
OUT = ROOT / "results"
URL = "http://127.0.0.1:8085/v1/systemone"

LABELS = ["billing", "technical", "shipping", "other"]

QUESTIONS = {
    "route": {
        "type": "choice",
        "instructions": "Which team should primarily handle this request?",
        "criteria": {
            "billing": "Payments, invoices, charges, refunds",
            "technical": "Software faults, login, application errors",
            "shipping": "Parcel tracking, delivery, damaged packages",
            "other": "General questions, product information, sales"
        }
    },
    "refund": {
        "type": "noul",
        "instructions": "Is the customer requesting money back or a payment reversal?"
    }
}


def load_cases():
    cases = []

    for number, line in enumerate(DATASET.read_text().splitlines(), 1):
        if not line.strip():
            continue

        try:
            case = json.loads(line)
            assert all(k in case for k in ("id", "text", "route", "refund"))
            assert case["route"] in LABELS
            assert isinstance(case["refund"], bool)
            cases.append(case)
        except Exception as exc:
            raise ValueError(
                f"Invalid dataset line {number}: {exc}"
            ) from exc

    if not cases:
        raise ValueError("Dataset contains no valid cases")

    ids = [case["id"] for case in cases]

    if len(ids) != len(set(ids)):
        duplicates = [k for k, v in Counter(ids).items() if v > 1]
        raise ValueError(f"Duplicate case IDs: {duplicates}")

    print(f"Dataset: {len(cases)} valid cases")
    print(f"Distribution: {dict(Counter(c['route'] for c in cases))}")

    if len(cases) != 24:
        print("NOTE: Dataset differs from original 24-case design.")

    return cases


def infer(text):
    payload = {"state": text, "questions": QUESTIONS}

    request = Request(
        URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    start = time.perf_counter()

    with urlopen(request, timeout=180) as response:
        result = json.load(response)

    return result, time.perf_counter() - start


def evaluate(case, response, latency):
    answers = response["answers"]
    route = answers["route"]

    prediction = route["choice"]
    probs = route["probabilities"]
    refund_prob = float(answers["refund"]["noul"])

    if prediction not in LABELS or set(probs) != set(LABELS):
        raise ValueError("Invalid route labels or probabilities")

    values = [float(probs[k]) for k in LABELS]

    if (
        any(not math.isfinite(v) or not 0 <= v <= 1 for v in values)
        or abs(sum(values) - 1) > 0.02
        or not math.isfinite(refund_prob)
        or not 0 <= refund_prob <= 1
    ):
        raise ValueError("Invalid probability values")

    return {
        "id": case["id"],
        "group": case.get("group", "unspecified"),
        "expected_route": case["route"],
        "predicted_route": prediction,
        "route_correct": prediction == case["route"],
        "probabilities": probs,
        "confidence": float(probs[prediction]),
        "expected_refund": case["refund"],
        "predicted_refund": refund_prob >= 0.5,
        "refund_probability": refund_prob,
        "refund_correct": (refund_prob >= 0.5) == case["refund"],
        "latency_s": round(latency, 4),
        "usage": response.get("usage", {}),
        "raw_response": response
    }


def main():
    cases = load_cases()
    OUT.mkdir(parents=True, exist_ok=True)

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    raw_path = OUT / f"p5_2_{stamp}.jsonl"
    summary_path = OUT / f"p5_2_{stamp}_summary.json"

    records = []
    errors = []

    with raw_path.open("w") as file:
        for index, case in enumerate(cases, 1):
            try:
                response, latency = infer(case["text"])
                record = evaluate(case, response, latency)
                records.append(record)

                status = "PASS" if record["route_correct"] else "FAIL"

                print(
                    f"[{index:02d}/{len(cases)}] "
                    f"{case['id']} {status} "
                    f"expected={case['route']} "
                    f"predicted={record['predicted_route']} "
                    f"p={record['confidence']:.3f} "
                    f"time={latency:.3f}s",
                    flush=True
                )
            except Exception as exc:
                record = {"id": case["id"], "error": str(exc)}
                errors.append(record)
                print(f"{case['id']} ERROR: {exc}", flush=True)

            file.write(json.dumps(record) + "\n")
            file.flush()

    if not records:
        raise RuntimeError("No successful inference results")

    n = len(records)
    latencies = sorted(r["latency_s"] for r in records)

    route_accuracy = sum(r["route_correct"] for r in records) / n
    refund_accuracy = sum(r["refund_correct"] for r in records) / n

    route_brier = statistics.mean(
        sum(
            (float(r["probabilities"][k]) - float(r["expected_route"] == k)) ** 2
            for k in LABELS
        )
        for r in records
    )

    refund_brier = statistics.mean(
        (r["refund_probability"] - float(r["expected_refund"])) ** 2
        for r in records
    )

    thresholds = {}

    for t in (0.5, 0.7, 0.8, 0.9, 0.95):
        accepted = [r for r in records if r["confidence"] >= t]
        thresholds[str(t)] = {
            "accepted": len(accepted),
            "coverage": len(accepted) / n,
            "selective_accuracy": (
                sum(r["route_correct"] for r in accepted) / len(accepted)
                if accepted else None
            )
        }

    summary = {
        "model": records[0]["raw_response"].get("model"),
        "dataset_sha256": hashlib.sha256(DATASET.read_bytes()).hexdigest(),
        "cases": len(cases),
        "successful": n,
        "errors": len(errors),
        "route_accuracy": route_accuracy,
        "refund_accuracy": refund_accuracy,
        "route_brier": route_brier,
        "refund_brier": refund_brier,
        "latency_p50_s": statistics.median(latencies),
        "latency_p95_s": latencies[math.ceil(0.95 * n) - 1],
        "thresholds": thresholds,
        "failed_route_ids": [
            r["id"] for r in records if not r["route_correct"]
        ]
    }

    summary_path.write_text(json.dumps(summary, indent=2))

    print("\n========== P5.2 SUMMARY ==========")
    print(json.dumps(summary, indent=2))
    print("\nRaw:", raw_path)
    print("Summary:", summary_path)


if __name__ == "__main__":
    main()
