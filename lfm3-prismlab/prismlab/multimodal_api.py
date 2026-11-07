"""P6.8: authenticated local multimodal inference API."""
from __future__ import annotations

import asyncio
import base64
import binascii
import json
import os
import secrets
import tempfile
import threading
from pathlib import Path
from urllib.parse import urlsplit

from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse

from prismlab.core.executor import execute
from prismlab.core.lifecycle import LifecycleManager, RuntimeSpec
from prismlab.core.schema import MediaRef, PrismRequest
from prismlab.live_api import LIVE_LOCK

router = APIRouter(prefix="/api/v1/live", tags=["Local inference"])

MAX_BODY = 16_000_000
MAX_MEDIA = 5_000_000
MAX_VIDEO = 8_000_000

TASKS = {
    "chat", "summarize", "ocr",
    "transcribe", "audio_qa", "video_qa", "decision",
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
    "video": {"video/mp4": ".mp4"},
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
        "PRISMLAB_MULTIMODAL_ROUTER_URL",
        os.getenv("PRISMLAB_ROUTER_URL", "http://127.0.0.1:8188"),
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

    max_bytes = MAX_VIDEO if kind == "video" else MAX_MEDIA
    if len(encoded) > ((max_bytes + 2) // 3) * 4 + 4:
        raise HTTPException(413, "Media too large")

    try:
        data = base64.b64decode(encoded, validate=True)
    except (ValueError, binascii.Error):
        raise HTTPException(422, "Invalid base64") from None

    if not data:
        raise HTTPException(422, "Empty media")

    if len(data) > max_bytes:
        raise HTTPException(413, "Media too large")

    if kind == "video":
        valid = len(data) >= 12 and data[4:8] == b"ftyp"
    elif kind == "image":
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

    task = payload.get("task")
    prompt = payload.get("prompt", "")
    model = payload.get("model")
    decision_question = payload.get("decision_question")
    max_tokens = payload.get("max_tokens")

    if max_tokens is not None:
        if not isinstance(max_tokens, int) or isinstance(max_tokens, bool) or not (16 <= max_tokens <= 256):
            raise HTTPException(422, "Invalid max_tokens")

    if task not in TASKS:
        raise HTTPException(422, "Unsupported task")
    if model is not None and (not isinstance(model, str) or model not in ALIASES):
        raise HTTPException(422, "Unsupported selected model")

    if not isinstance(prompt, str) or len(prompt) > 1000:
        raise HTTPException(422, "Invalid prompt")
    if decision_question is not None:
        if task != "decision" or model not in {"d1", "d1_omni"} or not isinstance(decision_question, dict):
            raise HTTPException(422, "Invalid decision question")
        criteria = decision_question.get("criteria")
        if (set(decision_question) != {"instructions", "criteria"}
            or not isinstance(decision_question["instructions"], str)
            or not 1 <= len(decision_question["instructions"]) <= 200
            or not isinstance(criteria, dict) or not 2 <= len(criteria) <= 4
            or any(not isinstance(k, str) or not k.isidentifier() or len(k) > 30
                   or not isinstance(v, str) or not 1 <= len(v) <= 200
                   for k, v in criteria.items())):
            raise HTTPException(422, "Invalid decision criteria")

    media = {}

    for kind in ("image", "audio", "video"):
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

    if model is None and task == "decision" and "image" in media and "audio" not in media:
        raise HTTPException(
            422, "Image-only decision not yet validated"
        )

    return task, prompt, media, selected, model


def run_local(task, prompt, media, selected, model=None, decision_question=None, max_tokens=None, on_token=None):
    on_demand = os.getenv("PRISMLAB_ON_DEMAND") == "1"
    if on_demand:
        from prismlab.on_demand import runtime_specs
        specs = runtime_specs()
    else:
        base = router_url()
        specs = [RuntimeSpec(name, base, alias) for name, alias in ALIASES.items()]

    if on_demand:
        from prismlab.on_demand import warm_manager, touch_model
        manager = warm_manager("multimodal", specs)
    else:
        manager = LifecycleManager(specs, max_managed=1, log_dir="results/p6/server_logs")

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
                decision_question=decision_question,
            )

            if model is not None:
                from prismlab.selected_chat import execute_selected
                result = execute_selected(request, manager, model, auto_start=on_demand, max_tokens=max_tokens, on_token=on_token)
            else:
                result = execute(
                    request,
                    manager,
                    auto_start=on_demand,
                    startup_timeout_s=120,
                    required_media=selected,
                    max_tokens=max_tokens or 256,
                    on_token=on_token,
                )

            return {
                "mode": "live_local_inference",
                "request_id": result.request_id,
                "requested_model": model,
                "backend_model_id": manager.specs[model].model_id if model is not None else None,
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
        if on_demand:
            if model == "text":
                touch_model("text", "text")
            for active_key in tuple(manager._owned):
                touch_model("multimodal", active_key)
        else:
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

        task, prompt, media, selected, model = parse_payload(payload)

        try:
            result = await run_in_threadpool(
                run_local, task, prompt, media, selected, model, payload.get("decision_question"), payload.get("max_tokens")
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


@router.post("/execute/stream")
async def live_execute_stream(
    request: Request,
    x_prismlab_token: str | None = Header(default=None),
):
    authorize(x_prismlab_token)

    if not LIVE_LOCK.acquire(blocking=False):
        raise HTTPException(409, "Inference already running")

    content_type = request.headers.get("content-type", "").split(";", 1)[0].strip().lower()
    if content_type != "application/json":
        LIVE_LOCK.release()
        raise HTTPException(415, "Expected application/json")

    content = bytearray()
    async for chunk in request.stream():
        content.extend(chunk)
        if len(content) > MAX_BODY:
            LIVE_LOCK.release()
            raise HTTPException(413, "Body too large")

    try:
        payload = json.loads(content)
    except (ValueError, UnicodeDecodeError):
        LIVE_LOCK.release()
        raise HTTPException(422, "Malformed JSON")

    task, prompt, media, selected, model = parse_payload(payload)

    loop = asyncio.get_running_loop()
    queue: asyncio.Queue[tuple[str, dict]] = asyncio.Queue()

    def emit(kind: str, data: dict) -> None:
        loop.call_soon_threadsafe(queue.put_nowait, (kind, data))

    def on_token(token: str) -> None:
        if token:
            emit("token", {"text": token})

    def worker() -> None:
        try:
            emit("status", {"stage": "loading_model", "message": f"Running {model or 'model'}…"})
            result = run_local(
                task, prompt, media, selected, model,
                payload.get("decision_question"), payload.get("max_tokens"),
                on_token=on_token,
            )
            emit("result", result)
        except (OSError, RuntimeError, ValueError) as exc:
            emit("error", {"message": str(exc) or "Local inference unavailable"})
        except Exception:
            emit("error", {"message": "Local inference failed."})
        finally:
            LIVE_LOCK.release()
            emit("done", {})

    threading.Thread(target=worker, daemon=True, name="prismlab-exec-stream").start()

    async def events():
        while True:
            kind, data = await queue.get()
            if kind == "done":
                break
            yield f"event: {kind}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"

    return StreamingResponse(events(), media_type="text/event-stream", headers={
        "Cache-Control": "no-store", "X-Accel-Buffering": "no", "X-Content-Type-Options": "nosniff",
    })
