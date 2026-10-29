
import json
import os
from time import perf_counter
from urllib.request import Request, urlopen
from pathlib import Path


API = os.environ.get(
    "PRISMLAB_TEXT_API",
    "http://127.0.0.1:8080/v1/chat/completions",
)

# Cached evidence extracted by LFM3-VL

PROJECT_ROOT = Path(__file__).resolve().parents[2]
evidence_path = PROJECT_ROOT / "data" / "cache" / "visual_facts.txt"
if not evidence_path.is_file():
    evidence_path = Path(__file__).resolve().parent / "visual_facts.txt"

visual_facts = evidence_path.read_text(
    encoding="utf-8"
).strip()

if not visual_facts:
    raise ValueError("Extracted evidence is empty")

print("[EVIDENCE LOADED]")
print(visual_facts)

question = "What are the main railway booking problems?"

payload = {
    "model": "lfm3-text",
    "messages": [
        {
            "role": "system",
            "content": (
                "Answer using only the provided visual evidence. "
                "Do not invent missing facts."
            )
        },
        {
            "role": "user",
            "content": (
                f"Extracted visual evidence:\n{visual_facts}\n"
                f"Question: {question}"
            )
        }
    ],
    "stream": True,
    "stream_options": {"include_usage": True},
    "temperature": 0.1,
    "max_tokens": 150,
    "chat_template_kwargs": {
        "enable_thinking": False
    }
}

request = Request(
    API,
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json"},
    method="POST"
)

start = perf_counter()
ttft = None
chunks = []
usage = {}

with urlopen(request, timeout=120) as response:
    for raw_line in response:
        line = raw_line.decode("utf-8").strip()

        if not line.startswith("data:"):
            continue

        data = line[5:].strip()

        if data == "[DONE]":
            break

        event = json.loads(data)

        if event.get("usage"):
            usage = event["usage"]

        for choice in event.get("choices", []):
            delta = choice.get("delta") or {}

            content = delta.get("content") or ""
            reasoning = delta.get("reasoning_content") or ""

            if ttft is None and (content or reasoning):
                # TODO: Record elapsed time until first token
                ttft = perf_counter() - start

            if content:
                chunks.append(content)

total = perf_counter() - start
answer = "".join(chunks).strip()
answer = answer.removeprefix("</think>").strip()

print("\n=== TEXT MODEL ANSWER ===")
print(answer)

print("\n=== PERFORMANCE ===")
print("TTFT:", round(ttft, 2) if ttft is not None else "N/A")
print("Total:", round(total, 2), "s")
print("Tokens:", usage.get("completion_tokens", "N/A"))
