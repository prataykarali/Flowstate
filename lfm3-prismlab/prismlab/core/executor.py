
"""P6.4: real text inference, traced through planner and lifecycle."""
from __future__ import annotations

import json
import math
import threading
import time
from dataclasses import dataclass
from typing import Callable
from urllib.request import Request, urlopen

from prismlab.core.cancellation import register_upstream, unregister_upstream
from prismlab.core.planner import plan_route
from prismlab.core.schema import PrismRequest, PrismResult, TraceStep


@dataclass(frozen=True)
class TextStream:
    content: str
    latency_s: float
    ttft_s: float
    tokens_per_second: float | None
    finish_reason: str | None = None


def stream_text(
    base_url: str,
    model_id: str,
    prompt: str,
    on_token: Callable[[str], None] | None = None,
    auth_token: str | None = None,
    timeout_s: float = 180,
    max_tokens: int = 256,
    response_format: dict | None = None,
) -> TextStream:
    """Stream OpenAI-style SSE; TTFT means first visible text delta."""
    messages = [{"role": "user", "content": prompt}]
    if response_format:
        messages = [
            {"role": "system", "content": "You are a helpful assistant. Output valid JSON only."},
            {"role": "user", "content": prompt},
        ]
    payload = {
        "model": model_id,
        "messages": messages,
        "temperature": 0.1,
        "max_tokens": max_tokens,
        "stream": True,
        "stream_options": {"include_usage": True},
        "chat_template_kwargs": {"enable_thinking": False},
        **({"response_format": response_format} if response_format else {}),
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
    pieces = []
    usage = None
    completed = False
    finish_reason = None

    ident = threading.get_ident()
    with urlopen(req, timeout=timeout_s) as response:
        register_upstream(ident, response)
        try:
            for raw in response:
                line = raw.decode("utf-8").strip()

                if not line.startswith("data:"):
                    continue

                data = line[5:].strip()

                if data == "[DONE]":
                    completed = True
                    break

                if not data:
                    continue

                event = json.loads(data)

                if event.get("error"):
                    raise RuntimeError(
                        f"Inference server error: {event['error']}"
                    )

                if isinstance(event.get("usage"), dict):
                    usage = event["usage"]

                for choice in event.get("choices", []):
                    if choice.get("finish_reason") is not None:
                        finish_reason = choice["finish_reason"]
                    delta = choice.get("delta") or {}
                    value = delta.get("content")

                    if isinstance(value, str) and value:
                        if first is None:
                            first = time.perf_counter()

                        pieces.append(value)

                        if on_token is not None:
                            on_token(value)
        finally:
            unregister_upstream(ident)

    end = time.perf_counter()

    if not completed:
        raise RuntimeError(
            "Streaming connection ended before [DONE]"
        )

    content = "".join(pieces).strip()

    if "</think>" in content:
        content = content.rsplit("</think>", 1)[1].strip()
    elif content.startswith("<think>"):
        raise RuntimeError("Model returned reasoning without a final answer")

    if not content or first is None:
        raise RuntimeError("No final answer text received")

    rate = None

    if isinstance(usage, dict):
        count = usage.get("completion_tokens")
        seconds = end - first

        if isinstance(count, int) and count > 1 and seconds > 0:
            # Approximate post-first-token generation rate.
            rate = (count - 1) / seconds
            if not math.isfinite(rate):
                rate = None

    return TextStream(
        content=content,
        latency_s=end - start,
        ttft_s=first - start,
        tokens_per_second=rate,
        finish_reason=finish_reason,
    )


def execute(
    request: PrismRequest,
    manager,
    *,
    auto_start: bool = False,
    on_token: Callable[[str], None] | None = None,
    startup_timeout_s: float = 90,
    required_media: set[str] | None = None,
    max_tokens: int = 256,
) -> PrismResult:
    """P6.4a: text adapter only; future models require explicit adapters."""
    start = time.perf_counter()
    trace = []
    warnings = []
    route = ()

    try:
        plan = plan_route(request, required_media=required_media)

        if plan.status == "ready" and plan.model == "omni":
            from prismlab.core.omni_adapter import execute_omni
            return execute_omni(
                request, manager, plan,
                auto_start=auto_start,
                on_token=on_token,
                startup_timeout_s=startup_timeout_s,
            )

        if plan.status == "ready" and plan.model in {"d1", "d1_omni"}:
            from prismlab.core.decision_adapter import execute_decision
            return execute_decision(
                request, manager, plan,
                auto_start=auto_start,
                startup_timeout_s=startup_timeout_s,
            )

        if (
            plan.status == "ready"
            and plan.model == "audio"
            and request.task in {"transcribe", "audio_qa"}
        ):
            from prismlab.core.audio_adapter import execute_audio
            return execute_audio(
                request, manager, plan,
                auto_start=auto_start,
                startup_timeout_s=startup_timeout_s,
            )

        if plan.status == "ready" and plan.model == "vision":
            from prismlab.core.vision_adapter import execute_vision
            return execute_vision(
                request, manager, plan,
                auto_start=auto_start,
                on_token=on_token,
                startup_timeout_s=startup_timeout_s,
            )

        trace.append(TraceStep(
            "routing",
            "ok" if plan.status == "ready" else "review",
            note="; ".join(plan.reasons),
        ))
        warnings.extend(plan.warnings)

        if plan.status != "ready":
            return PrismResult(
                request.request_id, "review",
                trace=tuple(trace),
                warnings=tuple(warnings),
                total_latency_s=time.perf_counter() - start,
            )

        route = (plan.model,)

        if plan.model != "text":
            warnings.append(
                f"No P6.4 adapter for {plan.model}; model was not invoked"
            )
            trace.append(TraceStep(
                "dispatch", "skipped", model=plan.model
            ))
            return PrismResult(
                request.request_id, "review",
                route=route,
                trace=tuple(trace),
                warnings=tuple(warnings),
                total_latency_s=time.perf_counter() - start,
            )

        before_probe = time.perf_counter()
        state = manager.probe("text")

        if not state.ready and auto_start:
            manager.start("text")
            deadline = time.monotonic() + startup_timeout_s

            while time.monotonic() < deadline:
                state = manager.probe("text")

                if state.ready:
                    break

                if state.state in {"mismatch", "unverified"}:
                    raise RuntimeError(state.detail)

                time.sleep(0.5)

        if not state.ready:
            warnings.append(
                f"Text server not ready: {state.state} — {state.detail}"
            )
            trace.append(TraceStep(
                "lifecycle", "review", model="text",
                latency_s=time.perf_counter() - before_probe,
            ))
            return PrismResult(
                request.request_id, "review",
                route=route,
                trace=tuple(trace),
                warnings=tuple(warnings),
                total_latency_s=time.perf_counter() - start,
            )

        trace.append(TraceStep(
            "lifecycle", "ok", model="text",
            latency_s=time.perf_counter() - before_probe,
            note=state.detail,
        ))

        first_inference = time.perf_counter()

        output = stream_text(
            manager.specs["text"].base_url,
            manager.specs["text"].model_id,
            request.text,
            on_token=on_token,
            auth_token=getattr(manager.specs["text"], "auth_token", None),
            timeout_s=getattr(manager.specs["text"], "timeout_s", 180),
            max_tokens=max_tokens,
            response_format=request.response_format,
        )

        trace.append(TraceStep(
            "inference", "ok", model="text",
            latency_s=output.latency_s,
            ttft_s=output.ttft_s,
        ))

        # End-to-end TTFT includes routing and any model loading.
        e2e_ttft = first_inference - start + output.ttft_s

        return PrismResult(
            request.request_id,
            "completed",
            output=output.content,
            route=route,
            trace=tuple(trace),
            total_latency_s=time.perf_counter() - start,
            ttft_s=e2e_ttft,
            tokens_per_second=output.tokens_per_second,
            finish_reason=output.finish_reason,
            warnings=tuple(warnings),
        )

    except Exception as exc:
        trace.append(TraceStep(
            "execution", "error", note=str(exc)
        ))
        return PrismResult(
            request.request_id,
            "failed",
            route=route,
            trace=tuple(trace),
            total_latency_s=time.perf_counter() - start,
            warnings=tuple(
                warnings + [f"{type(exc).__name__}: {exc}"]
            ),
        )
