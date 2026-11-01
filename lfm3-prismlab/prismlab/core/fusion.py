
"""P6.5a: sequential Audio -> Vision pipeline with trace retention."""
from __future__ import annotations

import re
import time
from pathlib import Path

from prismlab.core.executor import execute
from prismlab.core.schema import MediaRef, PrismRequest


def extract_direction(transcript: str) -> str | None:
    """Accept spacing variants, not guessed ASR corrections."""
    matches = set(re.findall(
        r"\b(left|right)[\s-]*most\b",
        transcript.lower(),
    ))

    if len(matches) != 1:
        return None

    return f"{next(iter(matches))}most"


def run_audio_vision(
    audio_path: str | Path,
    image_path: str | Path,
    audio_manager,
    vision_manager,
    *,
    strict_gate: bool = False,
    auto_start: bool = True,
) -> dict:
    started = time.perf_counter()

    report = {
        "pipeline": "LFM3-Audio-2B -> LFM3-VL-2B",
        "gate_mode": "strict" if strict_gate else "raw",
        "status": "running",
        "route": [],
        "transcript": None,
        "direction": None,
        "answer": None,
        "ttft_s": None,
        "total_latency_s": None,
        "stages": {},
        "warnings": [],
    }

    audio_request = PrismRequest(
        task="transcribe",
        media=(MediaRef("audio", audio_path),),
    )

    try:
        asr = execute(
            audio_request,
            audio_manager,
            auto_start=auto_start,
            startup_timeout_s=180,
        )
    finally:
        # Release the audio model before loading vision.
        audio_manager.close()

    report["route"].append("audio")
    report["stages"]["asr"] = asr.to_dict()

    if asr.status != "completed":
        report["status"] = asr.status
        report["warnings"].append(
            "ASR failed or entered review; vision was not invoked"
        )
        report["total_latency_s"] = time.perf_counter() - started
        return report

    transcript = str(asr.output).strip()
    direction = extract_direction(transcript)

    report["transcript"] = transcript
    report["direction"] = direction

    if strict_gate and direction is None:
        report["status"] = "review"
        report["warnings"].append(
            "Directional evidence ambiguous; vision not invoked"
        )
        report["total_latency_s"] = time.perf_counter() - started
        return report

    if direction is None:
        report["warnings"].append(
            "ASR direction not explicitly recognized; "
            "raw transcript forwarded for experimental comparison"
        )

    question = (
        "The following is a raw speech transcript that may "
        "contain recognition errors:\n"
        f"{transcript}\n\n"
        "Answer the question using the attached image. "
        "If the requested spatial relationship is unclear, "
        "answer UNKNOWN. "
        "Return exactly one word: Red, Green, Blue or UNKNOWN."
    )

    vision_request = PrismRequest(
        task="chat",
        text=question,
        media=(MediaRef("image", image_path),),
    )

    vision_started = time.perf_counter()

    try:
        visual = execute(
            vision_request,
            vision_manager,
            auto_start=auto_start,
            startup_timeout_s=180,
        )
    finally:
        vision_manager.close()

    report["route"].append("vision")
    report["stages"]["vision"] = visual.to_dict()
    report["status"] = visual.status
    report["answer"] = visual.output

    if visual.ttft_s is not None:
        report["ttft_s"] = (
            vision_started - started + visual.ttft_s
        )

    report["total_latency_s"] = time.perf_counter() - started

    return report
