import sys
import json
from time import perf_counter
from urllib.request import Request, urlopen

from prismlab.vision.vision_io import read_file_image
from prismlab.vision.vision_api import build_vision_payload, VISION_API

from pathlib import Path

# Use the small image so testing is inexpensive
PROJECT_ROOT = Path(__file__).resolve().parents[2]
default_image = PROJECT_ROOT / "data" / "test_images" / "test_discover.png"
if not default_image.is_file():
    default_image = PROJECT_ROOT / "data" / "images" / "test_discover.png"
if not default_image.is_file():
    default_image = Path("test_discover.png")

image_path = sys.argv[1] if len(sys.argv) > 1 else str(default_image)

image, mime = read_file_image(image_path)

payload = build_vision_payload(
    "Read the four problem labels in the LEFT half "
    "of the image. Return only the four labels "
    "as a numbered list. Do not guess.",
    image,
    mime
)

payload["max_tokens"] = 32
payload["cache_prompt"] = False
# Enable streaming
payload["stream"] = True
payload["stream_options"] = {"include_usage": True}

request = Request(
    VISION_API,
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json"},
    method="POST"
)

started = perf_counter()
ttft = None
chunks = []
usage = {}

with urlopen(request, timeout=240) as response:
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

            text = delta.get("content") or ""
            reasoning = delta.get("reasoning_content") or ""

            # TODO 1:
            # Record TTFT at the first generated delta.
            if ttft is None and (text or reasoning):
                ttft = perf_counter() - started

            if text:
                chunks.append(text)

total = perf_counter() - started

answer = "".join(chunks).strip()
answer = answer.removeprefix("</think>").strip()

print("\nANSWER:", answer)
print("TTFT:", round(ttft, 2) if ttft is not None else "N/A")
print("Total time:", round(total, 2), "s")
print("Output tokens:", usage.get("completion_tokens", "N/A"))
