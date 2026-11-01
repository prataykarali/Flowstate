"""P6.8: authenticated local multimodal inference API."""
from __future__ import annotations

import base64
import binascii
import json
import os
import secrets
import tempfile
from pathlib import Path
from urllib.parse import urlsplit

from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.concurrency import run_in_threadpool

from prismlab.core.executor import execute
from prismlab.core.lifecycle import LifecycleManager, RuntimeSpec
from prismlab.core.schema import MediaRef, PrismRequest
from prismlab.live_api import LIVE_LOCK

router = APIRouter(prefix="/api/v1/live", tags=["Local inference"])

MAX_BODY = 16_000_000
MAX_MEDIA = 5_000_000

TASKS = {
    "chat", "summarize", "ocr",
    "transcribe", "audio_qa", "decision",
}

ALIASES = {
    "text": "lfm3-1.7b",
    "vision": "lfm3-vision",
    "audio": "lfm3-audio",
    "omni": "lfm3-omni",
    "d1": "d1",
    "d1_omni": "d1-omni",
}

MEDIA_TYPES = {
    "image": {
        "image/png": ".png",
        "image/jpeg": ".jpg",
    },
    "audio": {
        "audio/wav": ".wav",
        "audio/x-wav": ".wav",
    },
}


def authorize(token):
    if os.getenv("PRISMLAB_LIVE_ENABLED") != "1":
        raise HTTPException(403, "Live inference disabled")

    expected = os.getenv("PRISMLAB_LIVE_TOKEN", "")
    if not expected or not secrets.compare_digest(
        expected, token or ""
    ):
        raise HTTPException(401, "Invalid API token")


def router_url():
    value = os.getenv(
        "PRISMLAB_ROUTER_URL",
        "http://127.0.0.1:8188",
    )
    url = urlsplit(value)

    if (
        url.scheme != "http"
        or url.hostname not in {"127.0.0.1", "localhost", "::1"}
        or url.port is None
        or url.username or url.password
        or url.path not in {"", "/"}
        or url.query or url.fragment
    ):
        raise RuntimeError("Router URL must be local HTTP")

    return value.rstrip("/")


def decode_media(value, kind):
    if not isinstance(value, dict):
        raise HTTPException(422, f"Invalid {kind} object")

    if set(value) != {"mime", "data_base64"}:
        raise HTTPException(422, f"Invalid {kind} fields")

    mime = value["mime"]
    encoded = value["data_base64"]

    if mime not in MEDIA_TYPES[kind]:
        raise HTTPException(415, f"Unsupported {kind} MIME")

    if not isinstance(encoded, str):
        raise HTTPException(422, "Expected base64 string")

    if len(encoded) > ((MAX_MEDIA + 2) // 3) * 4 + 4:
        raise HTTPException(413, "Media too large")

    try:
        data = base64.b64decode(encoded, validate=True)
    except (ValueError, binascii.Error):
        raise HTTPException(422, "Invalid base64") from None

    if not data:
        raise HTTPException(422, "Empty media")

    if len(data) > MAX_MEDIA:
        raise HTTPException(413, "Media too large")

    if kind == "image":
        valid = (
            data.startswith(b"\x89PNG\r\n\x1a\n")
            if mime == "image/png"
            else data.startswith(b"\xff\xd8\xff")
        )
    else:
        valid = (
            data[:4] == b"RIFF"
            and data[8:12] == b"WAVE"
        )

    if not valid:
        raise HTTPException(422, "Media signature mismatch")

    return data, MEDIA_TYPES[kind][mime]


def parse_payload(payload):
    if not isinstance(payload, dict):
        raise HTTPException(422, "Expected JSON object")

    allowed = {
        "task", "prompt", "image",
        "audio", "required_media",
    }

    if set(payload) - allowed:
        raise HTTPException(422, "Unexpected fields")

    task = payload.get("task")
    prompt = payload.get("prompt", "")

    if task not in TASKS:
        raise HTTPException(422, "Unsupported task")

    if not isinstance(prompt, str) or len(prompt) > 1000:
        raise HTTPException(422, "Invalid prompt")

    media = {}

    for kind in ("image", "audio"):
        if payload.get(kind) is not None:
            media[kind] = decode_media(payload[kind], kind)

    if not prompt.strip() and not media:
        raise HTTPException(422, "No input supplied")

    selected = payload.get("required_media")

    if selected is not None:
        if (
            not isinstance(selected, list)
            or not selected
            or any(
                not isinstance(k, str) or k not in media
                for k in selected
            )
            or len(selected) != len(set(selected))
        ):
            raise HTTPException(422, "Invalid required_media")

        selected = set(selected)

    if len(media) > 1 and selected is None:
        raise HTTPException(
            422,
            "Explicit required_media needed for mixed inputs",
        )

    if task == "decision" and "image" in media and "audio" not in media:
        raise HTTPException(
            422, "Image-only decision not yet validated"
        )

    return task, prompt, media, selected


def run_local(task, prompt, media, selected):
    server = str(
        Path.home()
        / "Desktop/llama.cpp/build-cuda/bin/llama-server"
    )
    base = router_url()

    specs = [
        RuntimeSpec(name, base, alias, (server, "--help"))
        for name, alias in ALIASES.items()
    ]

    manager = LifecycleManager(
        specs,
        max_managed=1,
        log_dir="results/p6/server_logs",
    )

    try:
        with tempfile.TemporaryDirectory(
            prefix="prismlab-p6-"
        ) as folder:
            refs = []

            for kind, (data, suffix) in media.items():
                path = Path(folder) / f"{kind}{suffix}"
                path.write_bytes(data)
                refs.append(MediaRef(kind, path))

            request = PrismRequest(
                task=task,
                text=prompt,
                media=tuple(refs),
            )

            result = execute(
                request,
                manager,
                auto_start=False,
                startup_timeout_s=120,
                required_media=selected,
            )

            return {
                "mode": "live_local_inference",
                "request_id": result.request_id,
                "task": task,
                "status": result.status,
                "route": list(result.route),
                "output": result.output,
                "metrics": {
                    "total_latency_s": result.total_latency_s,
                    "ttft_s": result.ttft_s,
                    "tokens_per_second": result.tokens_per_second,
                },
                "trace": [
                    {
                        "stage": t.stage,
                        "status": t.status,
                        "model": t.model,
                        "latency_s": t.latency_s,
                        "ttft_s": t.ttft_s,
                        "note": t.note,
                    }
                    for t in result.trace
                ],
                "warnings": list(result.warnings),
            }
    finally:
        manager.close()


@router.post("/execute")
async def live_execute(
    request: Request,
    x_prismlab_token: str | None = Header(default=None),
):
    authorize(x_prismlab_token)

    if not LIVE_LOCK.acquire(blocking=False):
        raise HTTPException(409, "Inference already running")

    try:
        content_type = request.headers.get(
            "content-type", ""
        ).split(";", 1)[0].strip().lower()

        if content_type != "application/json":
            raise HTTPException(415, "JSON required")

        content = bytearray()

        async for chunk in request.stream():
            content.extend(chunk)
            if len(content) > MAX_BODY:
                raise HTTPException(413, "Request too large")

        try:
            payload = json.loads(content)
        except (ValueError, UnicodeDecodeError):
            raise HTTPException(422, "Invalid JSON") from None

        task, prompt, media, selected = parse_payload(payload)

        try:
            result = await run_in_threadpool(
                run_local, task, prompt, media, selected
            )
        except (OSError, RuntimeError, ValueError):
            raise HTTPException(
                503, "Local inference unavailable"
            ) from None

        if result["status"] == "failed":
            raise HTTPException(
                502,
                {
                    "status": "failed",
                    "request_id": result["request_id"],
                },
            )

        return result
    finally:
        LIVE_LOCK.release()
