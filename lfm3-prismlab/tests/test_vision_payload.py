"""Offline smoke test: encoding and message shape only. No server required."""
import base64

from prismlab.vision.vision_api import build_vision_payload

# 1x1 valid PNG image, used only to verify the request transport.
PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/"
    "Yj8AAAAASUVORK5CYII="
)
payload = build_vision_payload("What do you see?", PNG, "image/png")
parts = payload["messages"][0]["content"]
assert parts[0]["type"] == "image_url"
assert parts[1]["type"] == "text"
url = parts[0]["image_url"]["url"]
assert url.startswith("data:image/png;base64,")
assert base64.b64decode(url.split(",", 1)[1]) == PNG
assert "reasoning_effort" not in payload
print("PASS: image bytes round-trip, image-first message, JSON-ready payload")
