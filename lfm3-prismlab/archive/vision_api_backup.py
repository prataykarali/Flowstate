
import json
from time import perf_counter
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from prismlab.vision.vision_io import image_to_data_url

VISION_API = "http://127.0.0.1:8081/v1/chat/completions"


def build_vision_payload(prompt: str, image_bytes: bytes, mime: str) -> dict:
    return {
        "model": "lfm3-vision",
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": image_to_data_url(image_bytes, mime)},
                    },
                ],
            }
        ],
        "temperature": 0.1,
        "top_p": 1.0,
        "top_k": 50,
        "repeat_penalty": 1.1,
        "max_tokens": 384,
        "stream": False,
        "reasoning_effort": "none",
        "chat_template_kwargs": {"enable_thinking": False},
    }


def generate_vision(payload: dict) -> str:
    request = Request(
        VISION_API,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    print("[INFERENCE] Sending image to LFM3-VL...", flush=True)
    start = perf_counter()

    try:
        with urlopen(request, timeout=240) as response:
            result = json.load(response)
    except HTTPError as exc:
        details = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Vision API HTTP {exc.code}: {details[:500]}") from exc
    except (URLError, TimeoutError) as exc:
        raise RuntimeError(f"Cannot complete vision request: {exc}") from exc

    choice = result["choices"][0]
    message = choice["message"]
    content = (message.get("content") or "").strip()
    if content.startswith("</think>"):
        content = content.removeprefix("</think>").strip()

    reasoning = message.get("reasoning_content") or ""
    finish_reason = choice.get("finish_reason")
    print(f"[DEBUG] Finish reason: {finish_reason}")
    print(f"[DEBUG] Answer characters: {len(content)}")
    print(f"[DEBUG] Reasoning characters: {len(reasoning)}")
    print(f"[DEBUG] Request time: {perf_counter() - start:.1f} s")

    if not content:
        raise RuntimeError(
            f"No final answer (finish={finish_reason}, "
            f"reasoning_chars={len(reasoning)}). "
            "Reasoning may have exhausted the token budget."
        )
    if finish_reason == "length":
        print("[WARNING] Answer may be truncated at max_tokens.")
    return content