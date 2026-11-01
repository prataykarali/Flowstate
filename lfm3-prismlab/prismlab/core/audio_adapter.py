
"""PrismLab P6.4c: validated, grounded local audio inference."""
from __future__ import annotations

import base64
import hashlib
import json
import math
import sys
import time
import wave
from array import array
from dataclasses import dataclass
from pathlib import Path
from urllib.request import Request, urlopen

from prismlab.core.schema import PrismRequest, PrismResult, TraceStep

ASR_SYSTEM = (
    "Perform ASR in English. Transcribe the speech accurately. "
    "Return only the transcription. Do not answer questions."
)

QA_SYSTEM = (
    "Answer the question using only information audible in the clip. "
    "If the answer is unsupported, say 'Not stated in the audio'. "
    "Keep the answer brief."
)


@dataclass(frozen=True)
class AudioResponse:
    content: str
    latency_s: float


def validate_audio(path: Path) -> tuple[bytes, str, float, float]:
    if not path.is_file():
        raise ValueError(f"Audio file not found: {path}")

    if path.stat().st_size > 2 * 1024 * 1024:
        raise ValueError("Audio exceeds 2 MiB")

    with wave.open(str(path), "rb") as wf:
        fmt = (
            wf.getframerate(),
            wf.getnchannels(),
            wf.getsampwidth(),
            wf.getcomptype(),
        )
        if fmt != (16000, 1, 2, "NONE"):
            raise ValueError(
                "Expected 16 kHz mono PCM16 WAV"
            )

        frames = wf.getnframes()
        duration = frames / 16000

        if not 0.5 <= duration <= 30:
            raise ValueError(
                "Audio duration must be 0.5–30 seconds"
            )

        pcm = wf.readframes(frames)

    samples = array("h")
    samples.frombytes(pcm)

    if sys.byteorder != "little":
        samples.byteswap()

    if not samples:
        raise ValueError("Empty audio")

    rms = math.sqrt(
        math.fsum(float(x) * x for x in samples)
        / len(samples)
    ) / 32768

    if rms < 0.002:
        raise ValueError(
            f"Near-silent audio (RMS={rms:.6f})"
        )

    blob = path.read_bytes()

    return (
        blob,
        hashlib.sha256(blob).hexdigest(),
        duration,
        rms,
    )


def post_audio(
    base_url: str,
    model_id: str,
    task: str,
    prompt: str,
    wav: bytes,
) -> AudioResponse:
    system = ASR_SYSTEM if task == "transcribe" else QA_SYSTEM

    content = [
        {
            "type": "input_audio",
            "input_audio": {
                "data": base64.b64encode(wav).decode("ascii"),
                "format": "wav",
            },
        },
    ]

    if task == "audio_qa":
        content.append({"type": "text", "text": prompt})

    payload = {
        "model": model_id,
        "temperature": 0,
        "max_tokens": 256,
        "stream": False,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": content},
        ],
    }

    req = Request(
        base_url.rstrip("/") + "/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    start = time.perf_counter()

    with urlopen(req, timeout=300) as response:
        raw = json.load(response)

    elapsed = time.perf_counter() - start

    choice = raw["choices"][0]
    if choice.get("finish_reason") == "length":
        raise RuntimeError("Audio response truncated by token limit")

    result = choice["message"].get("content")

    if not isinstance(result, str) or not result.strip():
        raise RuntimeError("Empty or invalid audio model response")

    answer = result.strip()

    if "<think" in answer or "</think" in answer:
        raise RuntimeError("Unexpected reasoning markers in audio answer")

    return AudioResponse(answer, elapsed)


def execute_audio(
    request: PrismRequest,
    manager,
    plan,
    *,
    auto_start: bool = False,
    startup_timeout_s: float = 180,
) -> PrismResult:

    start = time.perf_counter()
    trace = [
        TraceStep(
            "routing", "ok",
            note="; ".join(plan.reasons),
        )
    ]
    warnings = list(plan.warnings)
    evidence = ()
    route = ("audio",)

    def report(status, reason):
        trace.append(TraceStep(
            "evidence" if status == "review" else "execution",
            "review" if status == "review" else "error",
            note=reason,
        ))
        return PrismResult(
            request.request_id,
            status,
            route=route,
            trace=tuple(trace),
            warnings=tuple(warnings + [reason]),
            evidence=evidence,
            total_latency_s=time.perf_counter() - start,
        )

    if plan.model != "audio":
        return report("review", "Wrong audio adapter route")

    if request.task not in {"transcribe", "audio_qa"}:
        return report("review", "Audio task adapter unavailable")

    if any(
        kind in plan.selected_inputs
        for kind in ("image", "video")
    ):
        return report("review", "Joint media requires Omni adapter")

    if request.task == "audio_qa" and not request.text.strip():
        return report("review", "Audio QA question is missing")

    clips = [m for m in request.media if m.kind == "audio"]

    if len(clips) != 1:
        return report("review", "Exactly one audio clip required")

    try:
        blob, sha, duration, rms = validate_audio(clips[0].path)
    except (OSError, ValueError, wave.Error) as exc:
        return report(
            "review",
            f"Invalid audio evidence: {exc}",
        )

    evidence = (f"audio_sha256:{sha}",)
    warnings = [
        w for w in warnings
        if w != "Media existence/content not yet validated."
    ]

    trace.append(TraceStep(
        "evidence", "ok",
        note=f"WAV duration={duration:.3f}s RMS={rms:.6f}",
    ))

    try:
        probe_started = time.perf_counter()
        state = manager.probe("audio")

        if not state.ready and auto_start:
            manager.start("audio")
            deadline = time.monotonic() + startup_timeout_s

            while time.monotonic() < deadline:
                state = manager.probe("audio")
                if state.ready:
                    break
                if state.state in {"mismatch", "unverified"}:
                    raise RuntimeError(state.detail)
                time.sleep(0.5)

        probe_latency = time.perf_counter() - probe_started

        if not state.ready:
            trace.append(TraceStep(
                "lifecycle", "review", model="audio",
                latency_s=probe_latency,
                note=state.detail,
            ))
            return PrismResult(
                request.request_id, "review",
                route=route,
                trace=tuple(trace),
                evidence=evidence,
                warnings=tuple(
                    warnings + [f"Audio server: {state.state}"]
                ),
                total_latency_s=time.perf_counter() - start,
            )

        trace.append(TraceStep(
            "lifecycle", "ok", model="audio",
            latency_s=probe_latency,
            note=state.detail,
        ))

        output = post_audio(
            manager.specs["audio"].base_url,
            manager.specs["audio"].model_id,
            request.task,
            request.text,
            blob,
        )

        trace.append(TraceStep(
            "inference", "ok", model="audio",
            latency_s=output.latency_s,
        ))

        return PrismResult(
            request.request_id, "completed",
            output=output.content,
            route=route,
            trace=tuple(trace),
            warnings=tuple(warnings),
            evidence=evidence,
            total_latency_s=time.perf_counter() - start,
            # Non-streamed response: TTFT cannot be measured.
            ttft_s=None,
            tokens_per_second=None,
        )

    except Exception as exc:
        return report(
            "failed",
            f"{type(exc).__name__}: {exc}",
        )
