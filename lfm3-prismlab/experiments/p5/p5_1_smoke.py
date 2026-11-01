import json
import time
from pathlib import Path
from urllib.request import Request, urlopen

URL = "http://127.0.0.1:8085/v1/systemone"

payload = {
    "state": (
        "I was charged twice for my subscription. "
        "Please refund the duplicate charge. "
        "I can still log in normally."
    ),
    "questions": {
        "refund": {
            "type": "noul",
            "instructions": "Is the user requesting a refund?"
        },
        "team": {
            "type": "choice",
            "instructions": "Which department should handle this?",
            "criteria": {
                "billing": "Payments and refunds",
                "technical": "Login or software issues",
                "shipping": "Package delivery"
            }
        },
        "urgency": {
            "type": "score",
            "instructions": "How urgent is the problem?",
            "criteria": [
                "Low urgency",
                "Medium urgency",
                "Critical urgency"
            ]
        }
    }
}

request = Request(
    URL,
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json"},
    method="POST"
)

start = time.perf_counter()

with urlopen(request, timeout=300) as response:
    result = json.load(response)

latency = time.perf_counter() - start

assert set(payload["questions"]).issubset(
    result["answers"]
), "Missing decision answers"

output = {
    "model": result.get("model"),
    "quantization": "Q4_K_M",
    "total_latency_s": round(latency, 3),
    "ttft_s": None,
    "usage": result.get("usage"),
    "answers": result["answers"]
}

path = Path("experiments/p5/results/p5_1_smoke.json")
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps(output, indent=2))

print(json.dumps(output, indent=2))
print(f"\nSaved: {path}")
