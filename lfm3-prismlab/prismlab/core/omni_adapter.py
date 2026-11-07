
"""P6.4e: Omni image+audio inference, with explicit media selection."""
from __future__ import annotations

import base64
import json
import math
import time
import wave
from dataclasses import dataclass
from urllib.request import Request, urlopen

from prismlab.core.audio_adapter import validate_audio
from prismlab.core.vision_adapter import read_image
from prismlab.core.schema import PrismRequest, PrismResult, TraceStep


@dataclass(frozen=True)
class OmniStream:
    content: str
    latency_s: float
    ttft_s: float
    tokens_per_second: float | None


def build_parts(request, plan):
    selected = set(plan.selected_inputs)

    if "video" in selected:
        raise ValueError("Video input is not integrated in P6.4e")

    parts = []
    evidence = []

    for media in request.media:
        if media.kind not in selected:
            continue

        if media.kind == "image":
            blob, mime, sha = read_image(media.path)
            parts.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:{mime};base64,"
                    + base64.b64encode(blob).decode("ascii")
                },
            })
            evidence.append(f"image_sha256:{sha}")

        elif media.kind == "audio":
            blob, sha, duration, rms = validate_audio(media.path)
            parts.append({
                "type": "input_audio",
                "input_audio": {
                    "data": base64.b64encode(blob).decode("ascii"),
                    "format": "wav",
                },
            })
            evidence.append(f"audio_sha256:{sha}")

    if request.text.strip():
        parts.append({
            "type": "text",
            "text": request.text.strip(),
        })

    if not parts:
        raise ValueError("No usable input parts")

    return parts, tuple(evidence)


def stream_omni(
    base_url, model_id, parts, on_token=None, auth_token=None
) -> OmniStream:
    payload = {
        "model": model_id,
        "temperature": 0,
        "max_tokens": 64,
        "stream": True,
        "chat_template_kwargs": {"enable_thinking": False},
        "messages": [
            {
                "role": "system",
                "content": (
                    "Answer using only the provided evidence. "
                    "If the answer is unsupported, say UNKNOWN. "
                    "Respond in text."
                ),
            },
            {"role": "user", "content": parts},
        ],
    }

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
    finished = False
    finish_reason = None

    with urlopen(req, timeout=360) as response:
        for raw in response:
            line = raw.decode("utf-8").strip()

            if not line.startswith("data:"):
                continue

            data = line[5:].strip()

            if data == "[DONE]":
                finished = True
                break

            if not data:
                continue

            event = json.loads(data)

            if event.get("error"):
                raise RuntimeError(str(event["error"]))

            if isinstance(event.get("usage"), dict):
                usage = event["usage"]

            for choice in event.get("choices", []):
                finish_reason = (
                    choice.get("finish_reason") or finish_reason
                )
                token = (choice.get("delta") or {}).get("content")

                if isinstance(token, str) and token:
                    if first is None:
                        first = time.perf_counter()
                    chunks.append(token)

                    if on_token:
                        on_token(token)

    end = time.perf_counter()
    content = "".join(chunks).strip()

    if not finished:
        raise RuntimeError("Incomplete SSE stream")

    if finish_reason == "length":
        raise RuntimeError("Omni output was truncated")

    if not content or first is None:
        raise RuntimeError("Omni produced no final text")

    if content.startswith("</think>"):
        content = content.removeprefix("</think>").strip()

    if "<think" in content or "</think" in content:
        raise RuntimeError("Unexpected reasoning markers")

    rate = None
    if isinstance(usage, dict):
        n = usage.get("completion_tokens")
        if isinstance(n, int) and n > 1 and end > first:
            value = (n - 1) / (end - first)
            if math.isfinite(value):
                rate = value

    return OmniStream(content, end - start, first - start, rate)


def execute_omni(
    request: PrismRequest,
    manager,
    plan,
    *,
    auto_start=False,
    on_token=None,
    startup_timeout_s=180,
) -> PrismResult:
    started = time.perf_counter()
    trace = [
        TraceStep("routing", "ok", note="; ".join(plan.reasons))
    ]
    warnings = list(plan.warnings)
    evidence = ()
    route = ("omni",)

    def finish(status, reason):
        trace.append(TraceStep(
            "execution" if status == "failed" else "evidence",
            "error" if status == "failed" else "review",
            note=reason,
        ))
        return PrismResult(
            request.request_id, status,
            route=route,
            trace=tuple(trace),
            evidence=evidence,
            warnings=tuple(warnings + [reason]),
            total_latency_s=time.perf_counter() - started,
        )

    if plan.model != "omni":
        return finish("review", "Wrong adapter route")

    if request.task not in {"chat", "audio_qa", "summarize"}:
        return finish("review", "Task not supported by text-only Omni adapter")

    selected = set(plan.selected_inputs)

    if not {"audio", "image"} <= selected:
        return finish(
            "review",
            "P6.4e currently tests joint image+audio requests only",
        )

    if (
        sum(m.kind == "image" for m in request.media) != 1
        or sum(m.kind == "audio" for m in request.media) != 1
    ):
        return finish(
            "review", "Exactly one image and one audio file required"
        )

    try:
        parts, evidence = build_parts(request, plan)
    except (OSError, ValueError, wave.Error) as exc:
        return finish("review", f"Invalid media: {exc}")

    warnings = [
        w for w in warnings
        if w != "Media existence/content not yet validated."
    ]
    trace.append(TraceStep(
        "evidence", "ok",
        note="Image and audio validated",
    ))

    try:
        t = time.perf_counter()
        state = manager.probe("omni")

        if not state.ready and auto_start:
            manager.start("omni")
            deadline = time.monotonic() + startup_timeout_s

            while time.monotonic() < deadline:
                state = manager.probe("omni")

                if state.ready:
                    break
                if state.state in {"mismatch", "unverified"}:
                    raise RuntimeError(state.detail)

                time.sleep(0.5)

        if not state.ready:
            trace.append(TraceStep(
                "lifecycle", "review",
                model="omni",
                latency_s=time.perf_counter() - t,
                note=state.detail,
            ))
            return PrismResult(
                request.request_id, "review",
                route=route,
                trace=tuple(trace),
                evidence=evidence,
                warnings=tuple(
                    warnings + [f"Omni server: {state.state}"]
                ),
                total_latency_s=time.perf_counter() - started,
            )

        trace.append(TraceStep(
            "lifecycle", "ok",
            model="omni",
            latency_s=time.perf_counter() - t,
            note=state.detail,
        ))

        inference_start = time.perf_counter()
        response = stream_omni(
            manager.specs["omni"].base_url,
            manager.specs["omni"].model_id,
            parts,
            on_token,
            **({"auth_token": manager.specs["omni"].auth_token} if manager.specs["omni"].auth_token else {}),
        )

        trace.append(TraceStep(
            "inference", "ok",
            model="omni",
            latency_s=response.latency_s,
            ttft_s=response.ttft_s,
        ))

        return PrismResult(
            request.request_id, "completed",
            output=response.content,
            route=route,
            trace=tuple(trace),
            evidence=evidence,
            warnings=tuple(warnings),
            total_latency_s=time.perf_counter() - started,
            ttft_s=(
                inference_start - started + response.ttft_s
            ),
            tokens_per_second=response.tokens_per_second,
        )

    except Exception as exc:
        return finish("failed", f"{type(exc).__name__}: {exc}")
