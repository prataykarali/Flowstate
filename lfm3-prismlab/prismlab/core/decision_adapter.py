
"""P6.4d: advisory-only d1 / d1-Omni decision inference."""
from __future__ import annotations

import base64
import json
import math
import time
from urllib.request import Request, urlopen

from prismlab.core.audio_adapter import validate_audio
from prismlab.core.schema import PrismRequest, PrismResult, TraceStep

LABELS = ("billing", "technical", "shipping", "other")
THRESHOLD = 0.90  # Exploratory, post-hoc P5 threshold. NOT calibrated.

QUESTIONS = {
    "route": {
        "type": "choice",
        "instructions": (
            "Which department should primarily handle "
            "the customer's request?"
        ),
        "criteria": {
            "billing": "Charges, invoices, payments and refunds",
            "technical": "Application bugs, login and software faults",
            "shipping": "Parcel delivery, tracking and damaged shipments",
            "other": "Product plans, general information and sales",
        },
    }
}


def validate_decision(raw: dict) -> tuple[str, float, dict]:
    answer = raw["answers"]["route"]
    choice = answer["choice"]
    probabilities = answer["probabilities"]

    if choice not in LABELS or set(probabilities) != set(LABELS):
        raise ValueError("Invalid route labels")

    values = [float(probabilities[k]) for k in LABELS]

    if (
        not all(math.isfinite(v) and 0 <= v <= 1 for v in values)
        or abs(sum(values) - 1.0) > 0.02
    ):
        raise ValueError("Invalid probability distribution")

    return choice, float(probabilities[choice]), {
        k: float(probabilities[k]) for k in LABELS
    }


def query_d1(base_url: str, payload: dict) -> tuple[dict, float]:
    req = Request(
        base_url.rstrip("/") + "/v1/systemone",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    start = time.perf_counter()
    with urlopen(req, timeout=300) as response:
        raw = json.load(response)

    return raw, time.perf_counter() - start


def execute_decision(
    request: PrismRequest,
    manager,
    plan,
    *,
    auto_start: bool = False,
    startup_timeout_s: float = 180,
) -> PrismResult:
    started = time.perf_counter()
    trace = [
        TraceStep(
            "routing", "ok",
            note="; ".join(plan.reasons),
        )
    ]
    warnings = list(plan.warnings)
    evidence = ()
    route = (plan.model,) if plan.model else ()

    def finish(status: str, reason: str) -> PrismResult:
        trace.append(TraceStep(
            "execution" if status == "failed" else "evidence",
            "error" if status == "failed" else "review",
            note=reason,
        ))
        return PrismResult(
            request.request_id,
            status,
            route=route,
            trace=tuple(trace),
            evidence=evidence,
            warnings=tuple(warnings + [reason]),
            total_latency_s=time.perf_counter() - started,
        )

    if request.task != "decision" or plan.model not in {
        "d1", "d1_omni"
    }:
        return finish("review", "Unsupported decision route")

    if plan.model == "d1":
        if set(plan.selected_inputs) != {"text"}:
            return finish(
                "review",
                "P6.4d supports d1 text decisions only",
            )
        payload = {
            "state": request.text,
            "questions": QUESTIONS,
        }
        payload["model"] = manager.specs[plan.model].model_id
        evidence = ("nonempty_text",)

    else:
        if "image" in plan.selected_inputs or "video" in plan.selected_inputs:
            return finish(
                "review",
                "Combined audio-visual decisions not integrated yet",
            )

        clips = [m for m in request.media if m.kind == "audio"]
        if len(clips) != 1:
            return finish("review", "Exactly one audio clip required")

        try:
            blob, sha, duration, rms = validate_audio(
                clips[0].path
            )
        except (OSError, ValueError, EOFError) as exc:
            return finish(
                "review", f"Invalid audio evidence: {exc}"
            )

        payload = {
            "state": request.text.strip() or None,
            "questions": QUESTIONS,
            "files": [
                "data:audio/wav;base64,"
                + base64.b64encode(blob).decode("ascii")
            ],
        }
        payload["model"] = manager.specs[plan.model].model_id
        evidence = (f"audio_sha256:{sha}",)

        trace.append(TraceStep(
            "evidence", "ok",
            note=f"Audio {duration:.2f}s; RMS={rms:.5f}",
        ))

    warnings = [
        w for w in warnings
        if w != "Media existence/content not yet validated."
    ]

    warnings.append(
        "Decision probabilities and 0.90 threshold are not "
        "production-calibrated; human review required."
    )

    try:
        probe_start = time.perf_counter()
        key = plan.model
        state = manager.probe(key)

        if not state.ready and auto_start:
            manager.start(key)
            deadline = time.monotonic() + startup_timeout_s

            while time.monotonic() < deadline:
                state = manager.probe(key)
                if state.ready:
                    break
                if state.state in {"mismatch", "unverified"}:
                    raise RuntimeError(state.detail)
                time.sleep(0.5)

        probe_latency = time.perf_counter() - probe_start

        if not state.ready:
            trace.append(TraceStep(
                "lifecycle", "review",
                model=key,
                latency_s=probe_latency,
                note=state.detail,
            ))
            return PrismResult(
                request.request_id, "review",
                route=route,
                trace=tuple(trace),
                warnings=tuple(
                    warnings + [f"Server not ready: {state.state}"]
                ),
                evidence=evidence,
                total_latency_s=time.perf_counter() - started,
            )

        trace.append(TraceStep(
            "lifecycle", "ok",
            model=key,
            latency_s=probe_latency,
            note=state.detail,
        ))

        raw, elapsed = query_d1(
            manager.specs[key].base_url, payload
        )

        prediction, confidence, probs = validate_decision(raw)

        trace.append(TraceStep(
            "inference", "ok",
            model=key,
            latency_s=elapsed,
        ))

        return PrismResult(
            request.request_id,
            "completed",
            route=route,
            output={
                "predicted_route": prediction,
                "confidence": confidence,
                "probabilities": probs,
                "exploratory_gate_passed": confidence >= THRESHOLD,
                "human_review_required": True,
                "external_action_executed": False,
            },
            trace=tuple(trace),
            evidence=evidence,
            warnings=tuple(warnings),
            total_latency_s=time.perf_counter() - started,
            ttft_s=None,
            tokens_per_second=None,
        )

    except Exception as exc:
        return finish(
            "failed",
            f"{type(exc).__name__}: {exc}",
        )
