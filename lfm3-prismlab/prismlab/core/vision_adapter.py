
"""P6.4b: local image evidence and streamed vision inference."""
from __future__ import annotations

import hashlib
import io
import json
import math
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable
from urllib.request import Request, urlopen

from PIL import Image

from prismlab.core.schema import PrismRequest, PrismResult, TraceStep
from prismlab.vision.vision_api import build_vision_payload

MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_PIXELS = 16_000_000
MIME_BY_FORMAT = {
    "PNG": "image/png",
    "JPEG": "image/jpeg",
    "WEBP": "image/webp",
}


@dataclass(frozen=True)
class VisionStream:
    content: str
    latency_s: float
    ttft_s: float
    tokens_per_second: float | None


def read_image(path: Path) -> tuple[bytes, str, str]:
    """Validate actual image bytes, not just the extension."""
    if not path.is_file():
        raise ValueError(f"Image missing: {path}")
    if path.stat().st_size > MAX_IMAGE_BYTES:
        raise ValueError("Image exceeds 5 MiB limit")

    blob = path.read_bytes()
    if not blob:
        raise ValueError("Image file is empty")

    with Image.open(io.BytesIO(blob)) as image:
        fmt = image.format
        if fmt not in MIME_BY_FORMAT:
            raise ValueError(f"Unsupported image format: {fmt}")
        if image.width * image.height > MAX_PIXELS:
            raise ValueError("Image exceeds 16 megapixels")
        image.verify()

    return (
        blob,
        MIME_BY_FORMAT[fmt],
        hashlib.sha256(blob).hexdigest(),
    )


def stream_vision(
    base_url: str,
    model_id: str,
    prompt: str,
    blob: bytes,
    mime: str,
    on_token: Callable[[str], None] | None = None,
    auth_token: str | None = None,
) -> VisionStream:
    payload = build_vision_payload(prompt, blob, mime)
    payload["model"] = model_id
    payload["stream"] = True

    req = Request(
        base_url.rstrip("/") + "/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
            **({"Authorization": f"Bearer {auth_token}"} if auth_token else {}),
        },
        method="POST",
    )

    start = time.perf_counter()
    first = None
    chunks = []
    usage = None
    complete = False

    with urlopen(req, timeout=300) as response:
        for raw in response:
            line = raw.decode("utf-8").strip()

            if not line.startswith("data:"):
                continue

            data = line[5:].strip()

            if data == "[DONE]":
                complete = True
                break

            if not data:
                continue

            event = json.loads(data)

            if event.get("error"):
                raise RuntimeError(
                    f"Vision inference error: {event['error']}"
                )

            if isinstance(event.get("usage"), dict):
                usage = event["usage"]

            for choice in event.get("choices", []):
                value = (
                    choice.get("delta") or {}
                ).get("content")

                if isinstance(value, str) and value:
                    if first is None:
                        first = time.perf_counter()
                    chunks.append(value)
                    if on_token:
                        on_token(value)

    end = time.perf_counter()

    if not complete:
        raise RuntimeError("Vision stream ended before [DONE]")

    content = "".join(chunks).strip()

    if "</think>" in content:
        content = content.rsplit("</think>", 1)[1].strip()
    elif content.startswith("<think>"):
        raise RuntimeError("Vision model returned reasoning without a final answer")

    if not content or first is None:
        raise RuntimeError("Vision stream returned no final answer text")

    rate = None

    if isinstance(usage, dict):
        count = usage.get("completion_tokens")
        if isinstance(count, int) and count > 1 and end > first:
            estimate = (count - 1) / (end - first)
            rate = estimate if math.isfinite(estimate) else None

    return VisionStream(
        content=content,
        latency_s=end - start,
        ttft_s=first - start,
        tokens_per_second=rate,
    )


def execute_vision(
    request: PrismRequest,
    manager,
    plan,
    *,
    auto_start: bool = False,
    on_token: Callable[[str], None] | None = None,
    startup_timeout_s: float = 120,
) -> PrismResult:
    start = time.perf_counter()
    warnings = list(plan.warnings)
    trace = [
        TraceStep(
            "routing", "ok",
            note="; ".join(plan.reasons),
        )
    ]
    route = ("vision",)
    evidence = ()

    def review(reason: str) -> PrismResult:
        trace.append(TraceStep("evidence", "review", note=reason))
        return PrismResult(
            request.request_id, "review",
            route=route,
            trace=tuple(trace),
            warnings=tuple(warnings + [reason]),
            total_latency_s=time.perf_counter() - start,
            evidence=evidence,
        )

    if plan.model != "vision":
        return review("Wrong adapter for route")

    if (
        "video" in plan.selected_inputs
        or "audio" in plan.selected_inputs
    ):
        return review(
            "Selected video/audio input is not supported "
            "by the P6.4b vision adapter"
        )

    images = [m for m in request.media if m.kind == "image"]

    if len(images) != 1:
        return review("P6.4b supports exactly one image")

    try:
        blob, mime, sha = read_image(images[0].path)
    except (OSError, ValueError) as exc:
        return review(
            f"Invalid image or local input: "
            f"{type(exc).__name__}: {exc}"
        )

    warnings = [
        w for w in warnings
        if w != "Media existence/content not yet validated."
    ]
    evidence = (f"image_sha256:{sha}",)
    trace.append(TraceStep(
        "evidence", "ok", note="Validated one image"
    ))

    prompt = request.text.strip() or (
        "Read all legible text in this image."
        if request.task == "ocr"
        else "Describe the contents of this image accurately."
    )

    try:
        probing = time.perf_counter()
        state = manager.probe("vision")

        if not state.ready and auto_start:
            manager.start("vision")
            deadline = time.monotonic() + startup_timeout_s

            while time.monotonic() < deadline:
                state = manager.probe("vision")

                if state.ready:
                    break

                if state.state in {"mismatch", "unverified"}:
                    raise RuntimeError(state.detail)

                time.sleep(0.5)

        if not state.ready:
            trace.append(TraceStep(
                "lifecycle", "review",
                model="vision",
                latency_s=time.perf_counter() - probing,
            ))

            warnings.append(
                f"Vision server not ready: "
                f"{state.state}: {state.detail}"
            )

            return PrismResult(
                request.request_id, "review",
                route=route,
                trace=tuple(trace),
                warnings=tuple(warnings),
                evidence=evidence,
                total_latency_s=time.perf_counter() - start,
            )

        trace.append(TraceStep(
            "lifecycle", "ok",
            model="vision",
            latency_s=time.perf_counter() - probing,
            note=state.detail,
        ))

        inference_start = time.perf_counter()

        result = stream_vision(
            manager.specs["vision"].base_url,
            manager.specs["vision"].model_id,
            prompt, blob, mime, on_token,
            **({"auth_token": getattr(manager.specs["vision"], "auth_token", None)} if getattr(manager.specs["vision"], "auth_token", None) else {}),
        )

        trace.append(TraceStep(
            "inference", "ok",
            model="vision",
            latency_s=result.latency_s,
            ttft_s=result.ttft_s,
        ))

        return PrismResult(
            request.request_id, "completed",
            output=result.content,
            route=route,
            trace=tuple(trace),
            evidence=evidence,
            warnings=tuple(warnings),
            total_latency_s=time.perf_counter() - start,
            ttft_s=(
                inference_start - start + result.ttft_s
            ),
            tokens_per_second=result.tokens_per_second,
        )

    except Exception as exc:
        trace.append(TraceStep(
            "execution", "error", note=str(exc)
        ))

        return PrismResult(
            request.request_id, "failed",
            route=route,
            trace=tuple(trace),
            evidence=evidence,
            total_latency_s=time.perf_counter() - start,
            warnings=tuple(
                warnings + [f"{type(exc).__name__}: {exc}"]
            ),
        )
