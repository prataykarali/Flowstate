import json
import math
import statistics
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from p5_2_route_benchmark import infer, evaluate, LABELS

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "route_cases_v2.tsv"
OUT = ROOT / "results"
OUT.mkdir(exist_ok=True)

cases = []

for number, line in enumerate(DATA.read_text().splitlines(), 1):
    if not line.strip():
        continue

    parts = line.split("|", 3)
    if len(parts) != 4:
        raise ValueError(f"Malformed line {number}")

    case_id, route, refund, text = parts
    if route not in LABELS or refund not in ("0", "1"):
        raise ValueError(f"Invalid label on line {number}")

    cases.append({
        "id": case_id,
        "route": route,
        "refund": refund == "1",
        "text": text
    })

assert len(cases) == 24
assert len(set(c["id"] for c in cases)) == 24
assert all(v == 6 for v in Counter(c["route"] for c in cases).values())

stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
path = OUT / f"p5_3_{stamp}.jsonl"
summary_path = OUT / f"p5_3_{stamp}_summary.json"

records = []
errors = []

with path.open("w") as file:
    for i, case in enumerate(cases, 1):
        try:
            raw, latency = infer(case["text"])
            result = evaluate(case, raw, latency)
            result["text"] = case["text"]
            records.append(result)

            status = "PASS" if result["route_correct"] else "FAIL"
            print(
                f"{i:02d}/24 {case['id']} {status} "
                f"pred={result['predicted_route']} "
                f"p={result['confidence']:.3f} "
                f"time={latency:.3f}s",
                flush=True
            )
        except Exception as exc:
            result = {"id": case["id"], "error": str(exc)}
            errors.append(result)
            print(f"{case['id']} ERROR {exc}", flush=True)

        file.write(json.dumps(result) + "\n")
        file.flush()

if not records:
    raise RuntimeError("No successful inference results")

n = len(records)
accuracy = sum(r["route_correct"] for r in records) / n

brier = statistics.mean(
    sum(
        (float(r["probabilities"][label]) -
         float(r["expected_route"] == label)) ** 2
        for label in LABELS
    )
    for r in records
)

latencies = sorted(r["latency_s"] for r in records)

thresholds = {}
for threshold in (0.8, 0.9, 0.95):
    accepted = [
        r for r in records if r["confidence"] >= threshold
    ]
    thresholds[str(threshold)] = {
        "accepted": len(accepted),
        "coverage": len(accepted) / len(cases),
        "accuracy": (
            sum(r["route_correct"] for r in accepted) / len(accepted)
            if accepted else None
        )
    }

summary = {
    "model": records[0]["raw_response"].get("model"),
    "total_cases": len(cases),
    "successful_cases": n,
    "errors": len(errors),
    "routing_accuracy": accuracy,
    "refund_accuracy": sum(
        r["refund_correct"] for r in records
    ) / n,
    "routing_brier": brier,
    "latency_p50_s": statistics.median(latencies),
    "latency_p95_s": latencies[math.ceil(0.95 * n) - 1],
    "thresholds": thresholds,
    "routing_failures": [
        {
            "id": r["id"],
            "expected": r["expected_route"],
            "predicted": r["predicted_route"],
            "confidence": r["confidence"]
        }
        for r in records if not r["route_correct"]
    ],
    "refund_failures": [
        r["id"] for r in records if not r["refund_correct"]
    ]
}

summary_path.write_text(json.dumps(summary, indent=2))

print("\n=== P5.3 STRESS TEST SUMMARY ===")
print(json.dumps(summary, indent=2))
print("\nResults:", path)
print("Summary:", summary_path)
