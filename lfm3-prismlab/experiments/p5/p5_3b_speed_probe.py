import json
import math
import statistics
from datetime import datetime, timezone
from pathlib import Path

from p5_2_route_benchmark import infer

BASE = (
    "The checkout application freezes before I enter "
    "my card details. No transaction has occurred. "
)

SIZES = {"short": 1, "medium": 16, "long": 64}
RUNS = 8
results = []

# Warm up before measuring
infer(BASE)

for name, repetitions in SIZES.items():
    times = []
    token_counts = []

    print(f"\n=== {name.upper()} ===", flush=True)

    for i in range(RUNS):
        response, elapsed = infer(BASE * repetitions)

        tokens = response.get("usage", {}).get("input_tokens")
        times.append(elapsed)
        token_counts.append(tokens)

        print(
            f"{i + 1}/{RUNS} | "
            f"tokens={tokens} | "
            f"latency={elapsed:.3f}s",
            flush=True
        )

    ordered = sorted(times)

    results.append({
        "size": name,
        "repetitions": repetitions,
        "input_tokens": token_counts,
        "latencies_s": times,
        "median_s": statistics.median(times),
        "p95_s": ordered[math.ceil(0.95 * RUNS) - 1]
    })

out = Path("experiments/p5/results")
out.mkdir(parents=True, exist_ok=True)

stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
path = out / f"p5_3b_speed_{stamp}.json"

path.write_text(json.dumps(results, indent=2))

print("\n=== SPEED PROBE SUMMARY ===")
for row in results:
    print(
        f"{row['size']:<8} "
        f"tokens={row['input_tokens'][0]} "
        f"p50={row['median_s']:.3f}s "
        f"p95={row['p95_s']:.3f}s"
    )

print("Saved:", path)
