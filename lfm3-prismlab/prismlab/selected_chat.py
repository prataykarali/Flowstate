"""Explicit character chat on the existing one-model local lifecycle.

This keeps a selected character from silently falling back to another model.
The automatic P6 planner remains unchanged for requests without a model.
"""
from __future__ import annotations

import base64
import json
import math
import threading
import time
from urllib.request import Request, urlopen

from prismlab.core.cancellation import register_upstream, unregister_upstream
from prismlab.core.decision_adapter import QUESTIONS, THRESHOLD, validate_decision
from prismlab.core.registry import MODELS
from prismlab.core.schema import PrismRequest, PrismResult, TraceStep


def execute_selected(request: PrismRequest, manager, model: str, *, auto_start: bool, startup_timeout_s: float = 120, max_tokens: int | None = None, on_token = None) -> PrismResult:
    started = time.perf_counter()
    trace = [TraceStep("routing", "ok", model=model, note="Explicit character selection")]
    if model not in MODELS or model not in manager.specs:
        raise ValueError("Selected model is unavailable")
    if not request.inputs <= MODELS[model]["inputs"]:
        raise ValueError("Selected model does not accept these inputs")

    before_probe = time.perf_counter()
    state = manager.probe(model)
    if not state.ready and auto_start:
        manager.start(model)
        deadline = time.monotonic() + startup_timeout_s
        mismatch_since = None
        while time.monotonic() < deadline:
            owned = manager._owned.get(model)
            if owned is not None and owned.poll() is not None:
                raise RuntimeError(f"Server process terminated unexpectedly with code {owned.returncode}")
            state = manager.probe(model)
            if state.ready:
                break
            if state.state == "mismatch":
                if mismatch_since is None:
                    mismatch_since = time.monotonic()
                elif time.monotonic() - mismatch_since > 6.0:
                    raise RuntimeError(state.detail)
            else:
                mismatch_since = None
            time.sleep(0.5)
    if not state.ready:
        raise RuntimeError(f"Selected model is {state.state}: {state.detail}")
    trace.append(TraceStep("lifecycle", "ok", model=model, latency_s=time.perf_counter() - before_probe))

    spec = manager.specs[model]
    media = []
    for item in request.media:
        blob = item.path.read_bytes()
        mime = {".png": "image/png", ".jpg": "image/jpeg", ".wav": "audio/wav", ".mp4": "video/mp4"}[item.path.suffix]
        encoded = base64.b64encode(blob).decode("ascii")
        if item.kind == "image":
            media.append({"type": "image_url", "image_url": {"url": f"data:{mime};base64,{encoded}"}})
        elif item.kind == "audio":
            media.append({"type": "input_audio", "input_audio": {"data": encoded, "format": "wav"}})
        else:
            media.append({"type": "input_video", "input_video": {"data": encoded}})

    headers = {"Content-Type": "application/json"}
    if spec.auth_token:
        headers["Authorization"] = f"Bearer {spec.auth_token}"

    is_stream = on_token is not None and model not in {"d1", "d1_omni"}
    if model in {"d1", "d1_omni"}:
        questions = {"route": {"type": "choice", **request.decision_question}} if request.decision_question else QUESTIONS
        payload = {"model": spec.model_id, "state": request.text.strip() or None, "questions": questions}
        if request.media:
            payload["files"] = [
                f"data:{ {'.png':'image/png','.jpg':'image/jpeg','.wav':'audio/wav','.mp4':'video/mp4'}[item.path.suffix]};base64,{base64.b64encode(item.path.read_bytes()).decode('ascii')}"
                for item in request.media
            ]
        endpoint = "/v1/systemone"
    else:
        parts = media + ([{"type": "text", "text": request.text.strip()}] if request.text.strip() else [])
        token_limit = max_tokens or 96
        payload = {
            "model": spec.model_id,
            "temperature": 0.1,
            "max_tokens": token_limit,
            "stream": is_stream,
            **({"stream_options": {"include_usage": True}} if is_stream else {}),
            "chat_template_kwargs": {"enable_thinking": False},
            "messages": [
                {"role": "system", "content": "Reply clearly and briefly using the supplied input. If evidence is insufficient, say so."},
                {"role": "user", "content": parts},
            ],
        }
        resp_fmt = getattr(request, "response_format", None)
        if resp_fmt:
            payload["response_format"] = resp_fmt
            payload["messages"][0]["content"] = "You are a helpful assistant. Output valid JSON only."
        elif "json only" in request.text.lower() or "return compact json" in request.text.lower():
            payload["response_format"] = {"type": "json_object"}
            payload["messages"][0]["content"] = "You are a helpful assistant. Output valid JSON only."
        elif "single capital letter" in request.text.lower() or "choose the single best option" in request.text.lower():
            payload["messages"][0]["content"] = "You are a quiz contestant. Reply ONLY with the single option letter (A, B, C, or D). Never write preamble, explanation, or markdown."
            payload["max_tokens"] = max(payload.get("max_tokens", 16), 32)
        endpoint = "/v1/chat/completions"

    from contextlib import nullcontext
    try:
        from prismlab.on_demand import busy_model
        active_ctx = busy_model("multimodal", model) if auto_start else nullcontext()
    except ImportError:
        active_ctx = nullcontext()

    inference_started = time.perf_counter()
    first_token_at = None
    server_timings = {}
    ident = threading.get_ident()
    with active_ctx:
        if is_stream:
            full_tokens = []
            with urlopen(Request(spec.base_url.rstrip("/") + endpoint, json.dumps(payload).encode("utf-8"), headers=headers), timeout=360) as response:
                register_upstream(ident, response)
                try:
                    for line in response:
                        decoded = line.decode("utf-8").strip()
                        if not decoded.startswith("data: "):
                            continue
                        content_raw = decoded[6:].strip()
                        if content_raw == "[DONE]":
                            break
                        try:
                            chunk = json.loads(content_raw)
                            if isinstance(chunk.get("timings"), dict):
                                server_timings = chunk["timings"]
                            delta = chunk.get("choices", [{}])[0].get("delta", {})
                            token = delta.get("content")
                            if token:
                                if first_token_at is None:
                                    first_token_at = time.perf_counter()
                                full_tokens.append(token)
                                if on_token:
                                    on_token(token)
                        except (json.JSONDecodeError, KeyError, IndexError):
                            continue
                finally:
                    unregister_upstream(ident)
            raw = {"choices": [{"message": {"content": "".join(full_tokens)}}]}
        else:
            with urlopen(Request(spec.base_url.rstrip("/") + endpoint, json.dumps(payload).encode("utf-8"), headers=headers), timeout=360) as response:
                register_upstream(ident, response)
                try:
                    raw = json.load(response)
                finally:
                    unregister_upstream(ident)
            if isinstance(raw.get("timings"), dict):
                server_timings = raw["timings"]
    inference_s = time.perf_counter() - inference_started
    if model in {"d1", "d1_omni"}:
        if request.decision_question:
            answer = raw["answers"]["route"]
            predicted = answer["choice"]
            probabilities = answer["probabilities"]
            labels = set(request.decision_question["criteria"])
            if predicted not in labels or set(probabilities) != labels or any(not isinstance(v, (int, float)) or isinstance(v, bool) or not math.isfinite(v) or not 0 <= v <= 1 for v in probabilities.values()) or abs(sum(probabilities.values()) - 1) > 0.02:
                raise ValueError("Invalid story decision probabilities")
            confidence = float(probabilities[predicted])
        else:
            predicted, confidence, probabilities = validate_decision(raw)
        output = {
            "predicted_route": predicted, "confidence": confidence,
            "probabilities": probabilities,
            "exploratory_gate_passed": confidence >= THRESHOLD,
            "human_review_required": True, "external_action_executed": False,
        }
        warnings = ("Decision confidence is not production-calibrated; human review required.",)
    else:
        output = raw["choices"][0]["message"]["content"]
        if not isinstance(output, str):
            raise RuntimeError("Model returned no text")
        output = output.rsplit("</think>", 1)[-1].strip()
        if not output or output.startswith("<think>"):
            raise RuntimeError("Model returned no final answer")
        warnings = ()

    speed = server_timings.get("predicted_per_second")
    speed = float(speed) if isinstance(speed, (int, float)) and not isinstance(speed, bool) and math.isfinite(speed) and speed >= 0 else None
    ttft = first_token_at - started if first_token_at is not None else None
    trace.append(TraceStep("inference", "ok", model=model, latency_s=inference_s,
                           ttft_s=first_token_at - inference_started if first_token_at is not None else None))
    return PrismResult(
        request.request_id, "completed", output=output, route=(model,), trace=tuple(trace),
        total_latency_s=time.perf_counter() - started, ttft_s=ttft,
        tokens_per_second=speed, warnings=warnings,
    )
