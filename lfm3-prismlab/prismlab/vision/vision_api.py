"""PrismLab P2: image/text request construction and local LFM3-VL inference."""

import json
import os
from time import perf_counter
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from prismlab.vision.vision_io import image_to_data_url

VISION_API = os.environ.get(
    "PRISMLAB_VISION_API",
    "http://127.0.0.1:8081/v1/chat/completions",
)


def build_vision_payload(prompt: str, image_bytes: bytes, mime: str) -> dict:
    """Build an OpenAI-compatible image + question message."""
    if not prompt.strip():
        raise ValueError("Vision prompt cannot be empty")

    return {
        "model": "lfm3-vision",
        "messages": [
            {
                "role": "user",
                "content": [
                    # Image-first matches the order in Liquid AI's API example.
                    {
                        "type": "image_url",
                        "image_url": {"url": image_to_data_url(image_bytes, mime)},
                    },
                    {"type": "text", "text": prompt},
                ],
            }
        ],
        "temperature": 0.1,
        "top_p": 1.0,
        "top_k": 50,
        "min_p": 0.0,
        "repeat_penalty": 1.1,
        "max_tokens": 384,
        "stream": False,
        # Deliberately no reasoning_effort/chat_template_kwargs override:
        # use server flags so CPU comparisons have a single control point.
    }


def generate_vision(payload: dict) -> str:
    request = Request(
        VISION_API,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    print(f"[INFERENCE] Sending image to {VISION_API}", flush=True)
    started = perf_counter()
    try:
        with urlopen(request, timeout=240) as response:
            result = json.load(response)
    except HTTPError as exc:
        details = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Vision API HTTP {exc.code}: {details[:500]}") from exc
    except (URLError, TimeoutError) as exc:
        raise RuntimeError(f"Vision server unavailable or timed out: {exc}") from exc

    choices = result.get("choices") or []
    if not choices:
        raise RuntimeError(f"Unexpected response (no choices): {str(result)[:500]}")
    choice = choices[0]
    message = choice.get("message") or {}
    raw_content = message.get("content") or ""
    reasoning = message.get("reasoning_content") or ""
    finish_reason = choice.get("finish_reason")

    print(f"[DEBUG] Finish: {finish_reason}")
    print(f"[DEBUG] Content characters: {len(raw_content)}")
    print(f"[DEBUG] Reasoning characters: {len(reasoning)}")
    print(f"[DEBUG] Request time: {perf_counter() - started:.1f} s")
    if not raw_content:
        print(f"[DEBUG] Reasoning excerpt: {reasoning[:160]!r}")
    if finish_reason == "length":
        print("[WARNING] Generation reached max_tokens; answer may be missing or incomplete.")

    # Specific known stray delimiter in no-thinking responses. Do not hide
    # other malformed output or turn a reasoning trace into an answer.
    content = raw_content.strip()
    if content.startswith("</think>"):
        print("[WARNING] Stray closing reasoning tag removed")
        content = content.removeprefix("</think>").strip()

    if not content:
        raise RuntimeError(
            f"No final answer (finish={finish_reason}; "
            f"reasoning_chars={len(reasoning)})."
        )
    return content
