
"""PrismLab P6.1: validated, model-agnostic orchestration contracts."""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from math import isfinite
from pathlib import Path
from uuid import uuid4

MEDIA_KINDS = frozenset({"image", "audio", "video"})
TASKS = frozenset({
    "chat", "ocr", "transcribe", "audio_qa", "video_qa",
    "summarize", "speech", "decision",
})
STATUSES = frozenset({"completed", "review", "failed"})


@dataclass(frozen=True, slots=True)
class MediaRef:
    kind: str
    path: Path | str

    def __post_init__(self) -> None:
        if self.kind not in MEDIA_KINDS:
            raise ValueError(f"Unsupported media kind: {self.kind!r}")
        if not isinstance(self.path, (str, Path)) or not str(self.path).strip():
            raise ValueError("Media path must be a nonempty path")
        object.__setattr__(self, "path", Path(self.path))
        # File existence and content validity are checked by P6 evidence gates.


@dataclass(frozen=True, slots=True)
class PrismRequest:
    task: str
    text: str = ""
    media: tuple[MediaRef, ...] = ()
    request_id: str = field(default_factory=lambda: uuid4().hex)
    decision_question: dict | None = None

    def __post_init__(self) -> None:
        if self.task not in TASKS:
            raise ValueError(f"Unknown task: {self.task!r}")
        if not isinstance(self.text, str):
            raise TypeError("text must be a string")
        if not isinstance(self.media, (list, tuple)):
            raise TypeError("media must be a sequence of MediaRef")
        if not all(isinstance(item, MediaRef) for item in self.media):
            raise TypeError("Every media item must be a MediaRef")
        object.__setattr__(self, "media", tuple(self.media))
        if not self.text.strip() and not self.media:
            raise ValueError("At least one input is required")
        if not isinstance(self.request_id, str) or not self.request_id.strip():
            raise ValueError("request_id must be nonempty")
        if self.decision_question is not None and self.task != "decision":
            raise ValueError("Decision question requires a decision task")

    @property
    def inputs(self) -> frozenset[str]:
        kinds = {item.kind for item in self.media}
        if self.text.strip():
            kinds.add("text")
        return frozenset(kinds)

    def to_dict(self) -> dict:
        return {
            "request_id": self.request_id,
            "task": self.task,
            "text": self.text,
            "inputs": sorted(self.inputs),
            "media": [{"kind": m.kind, "path": str(m.path)} for m in self.media],
        }


@dataclass(frozen=True, slots=True)
class TraceStep:
    stage: str
    status: str
    model: str | None = None
    latency_s: float | None = None
    ttft_s: float | None = None
    note: str = ""

    def __post_init__(self) -> None:
        if not self.stage.strip():
            raise ValueError("Trace stage cannot be empty")
        if self.status not in {"ok", "skipped", "review", "error"}:
            raise ValueError(f"Unknown trace status: {self.status!r}")
        for name in ("latency_s", "ttft_s"):
            value = getattr(self, name)
            if value is not None and (not isinstance(value, (int, float)) or
                                      not isfinite(value) or value < 0):
                raise ValueError(f"{name} must be finite and nonnegative")
        if (self.latency_s is not None and self.ttft_s is not None and
                self.ttft_s > self.latency_s):
            raise ValueError("TTFT cannot exceed stage latency")


@dataclass(frozen=True, slots=True)
class PrismResult:
    request_id: str
    status: str
    output: str | dict | None = None
    route: tuple[str, ...] = ()
    trace: tuple[TraceStep, ...] = ()
    total_latency_s: float | None = None
    ttft_s: float | None = None
    tokens_per_second: float | None = None
    peak_rss_mb: float | None = None
    evidence: tuple[str, ...] = ()
    warnings: tuple[str, ...] = ()
    finish_reason: str | None = None

    def __post_init__(self) -> None:
        if self.status not in STATUSES:
            raise ValueError(f"Unknown result status: {self.status!r}")
        if not self.request_id.strip():
            raise ValueError("Missing request_id")
        if not all(isinstance(x, TraceStep) for x in self.trace):
            raise TypeError("trace must contain TraceStep objects")
        for name in ("total_latency_s", "ttft_s", "tokens_per_second", "peak_rss_mb"):
            value = getattr(self, name)
            if value is not None and (not isinstance(value, (int, float)) or
                                      not isfinite(value) or value < 0):
                raise ValueError(f"{name} must be finite and nonnegative")
        if (self.total_latency_s is not None and self.ttft_s is not None and
                self.ttft_s > self.total_latency_s):
            raise ValueError("TTFT cannot exceed total latency")

    def to_dict(self) -> dict:
        return asdict(self)
