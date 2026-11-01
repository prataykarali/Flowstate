
"""P6.2 — capability-aware routing planner. Does not run inference."""
from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Iterable

from prismlab.core.registry import MODELS
from prismlab.core.schema import MEDIA_KINDS, PrismRequest


@dataclass(frozen=True, slots=True)
class RoutePlan:
    request_id: str
    task: str
    status: str
    model: str | None
    selected_inputs: tuple[str, ...]
    excluded_media: tuple[str, ...]
    reasons: tuple[str, ...]
    warnings: tuple[str, ...]

    def to_dict(self) -> dict:
        return asdict(self)


def plan_route(
    request: PrismRequest,
    required_media: Iterable[str] | None = None,
) -> RoutePlan:
    """Plan routing without opening files or invoking models."""
    available_media = {m.kind for m in request.media}
    warnings = []
    reasons = []

    if required_media is not None:
        selected_media = set(required_media)
        if not selected_media <= MEDIA_KINDS:
            raise ValueError(f"Unsupported media: {selected_media - MEDIA_KINDS}")
        if not selected_media <= available_media:
            raise ValueError(f"Media not attached: {selected_media - available_media}")
        reasons.append("media_relevance_explicit")

    elif request.task == "ocr":
        selected_media = available_media & {"image"}
        reasons.append("ocr_uses_image_evidence")

    elif request.task == "transcribe":
        selected_media = available_media & {"audio"}
        reasons.append("transcription_uses_audio_evidence")

    elif len(available_media) > 1:
        return RoutePlan(
            request.request_id, request.task, "review", None,
            (), (), ("ambiguous_multimedia_evidence",),
            ("Specify required_media; no model executed.",),
        )

    else:
        selected_media = available_media
        reasons.append("single_media_or_text_only")

    required_by_task = {
        "ocr": "image",
        "transcribe": "audio",
        "audio_qa": "audio",
        "video_qa": "video",
    }

    needed = required_by_task.get(request.task)
    if needed and needed not in selected_media:
        return RoutePlan(
            request.request_id, request.task, "review", None,
            (), tuple(sorted(available_media)),
            (f"missing_required_{needed}_evidence",),
            ("No model executed.",),
        )

    inputs = selected_media | (
        {"text"} if request.text.strip() else set()
    )

    if not inputs:
        return RoutePlan(
            request.request_id, request.task, "review", None,
            (), tuple(sorted(available_media)),
            ("no_selected_input_evidence",),
            ("At least one relevant input is required.",),
        )

    visual = bool(selected_media & {"image", "video"})
    has_audio = "audio" in selected_media

    if request.task == "decision":
        model = "d1_omni" if has_audio else "d1"
        reasons.append("advisory_decision_only")
        warnings.append("P5 confidence is not production-calibrated.")
        if has_audio and visual:
            warnings.append("Combined audio-visual decision inference is experimental.")

    elif request.task == "speech":
        model = "omni" if visual else "audio"
        reasons.append("speech_output_required")

    elif request.task in {"transcribe", "audio_qa"}:
        model = "omni" if visual else "audio"
        reasons.append("audio_evidence_required")

    elif request.task == "ocr":
        model = "vision"
        reasons.append("image_ocr_task")

    elif request.task == "video_qa":
        model = "omni" if has_audio else "vision"
        reasons.append("video_question_answering")

    else:
        model = (
            "omni" if has_audio and visual else
            "audio" if has_audio else
            "vision" if visual else
            "text"
        )
        reasons.append("modality_capability_match")

    if not inputs <= MODELS[model]["inputs"]:
        raise RuntimeError(f"Input capability mismatch: {model}")

    expected_output = (
        "decision" if request.task == "decision" else
        "speech" if request.task == "speech" else
        "text"
    )

    if expected_output not in MODELS[model]["outputs"]:
        raise RuntimeError(f"Output capability mismatch: {model}")

    excluded = tuple(sorted(available_media - selected_media))

    if excluded:
        warnings.append(f"Ignored media: {', '.join(excluded)}")
    if selected_media:
        warnings.append("Media existence/content not yet validated.")
    if "video" in selected_media:
        warnings.append("Video preprocessing/server support requires validation.")

    return RoutePlan(
        request_id=request.request_id,
        task=request.task,
        status="ready",
        model=model,
        selected_inputs=tuple(sorted(inputs)),
        excluded_media=excluded,
        reasons=tuple(reasons),
        warnings=tuple(warnings),
    )
