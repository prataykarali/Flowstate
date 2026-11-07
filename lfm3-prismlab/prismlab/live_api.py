
"""P6.6b: explicitly enabled, single-request local text inference."""
from __future__ import annotations

import os
import secrets
import threading
import asyncio
import json

from fastapi import APIRouter, Header, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from prismlab.core.executor import execute
from prismlab.core.lifecycle import LifecycleManager
from prismlab.core.schema import PrismRequest
from prismlab.runtime_config import TextRuntimeConfig

router = APIRouter(prefix="/api/v1/live", tags=["Local inference"])

# One active request for this API worker.
LIVE_LOCK = threading.Lock()


class TextInput(BaseModel):
    prompt: str = Field(min_length=1, max_length=1000)
    max_tokens: int = Field(default=256, ge=32, le=256)


def _run_text(prompt: str, on_token=None, max_tokens: int = 256) -> dict:
    """Runs in a worker thread, never on the API event loop."""
    on_demand = os.getenv("PRISMLAB_ON_DEMAND") == "1"
    spec = TextRuntimeConfig.from_env().runtime_spec()

    if on_demand:
        from prismlab.on_demand import warm_manager, touch_model, busy_model
        manager = warm_manager("text", [spec])
        touch_model("text", "text")
        active_ctx = busy_model("text", "text")
    else:
        from contextlib import nullcontext
        manager = LifecycleManager([spec], max_managed=1, log_dir="results/p6/server_logs")
        active_ctx = nullcontext()

    request = PrismRequest(task="chat", text=prompt)

    try:
        with active_ctx:
            result = execute(
                request,
                manager,
                auto_start=on_demand,
                on_token=on_token,
                max_tokens=max_tokens,
                startup_timeout_s=120,
            )
    finally:
        if not on_demand:
            manager.close()

    return {
        "mode": "live_local_inference",
        "request_id": result.request_id,
        "model": "LFM3-1.7B",
        "route": list(result.route),
        "status": result.status,
        "output": result.output,
        "finish_reason": result.finish_reason,
        "metrics": {
            "total_latency_s": result.total_latency_s,
            "ttft_s": result.ttft_s,
            "tokens_per_second": result.tokens_per_second,
        },
        "trace": [
            {
                "stage": step.stage,
                "status": step.status,
                "model": step.model,
                "latency_s": step.latency_s,
                "ttft_s": step.ttft_s,
                "note": step.note,
            }
            for step in result.trace
        ],
        "warnings": list(result.warnings),
        "error": (
            "Local text model is offline or not ready"
            if result.status == "review"
            else "Inference failed; inspect local server logs"
            if result.status == "failed"
            else None
        ),
    }


@router.post("/text")
async def live_text(
    body: TextInput,
    x_prismlab_token: str | None = Header(default=None),
):
    if os.environ.get("PRISMLAB_LIVE_ENABLED") != "1":
        raise HTTPException(403, "Live inference is disabled")

    token = os.environ.get("PRISMLAB_LIVE_TOKEN", "")

    if not token or not secrets.compare_digest(
        token, x_prismlab_token or ""
    ):
        raise HTTPException(401, "Invalid local API token")

    if not body.prompt.strip():
        raise HTTPException(422, "Prompt cannot be blank")

    if not LIVE_LOCK.acquire(blocking=False):
        raise HTTPException(
            409, "Another live inference request is running"
        )

    try:
        result = await run_in_threadpool(_run_text, body.prompt, **({"max_tokens": body.max_tokens} if body.max_tokens != 256 else {}))
        if result.get("status") != "completed":
            raise HTTPException(
                status_code=502 if result.get("status") == "failed" else 503,
                detail={
                    "request_id": result.get("request_id"),
                    "status": result.get("status"),
                    "error": result.get("error")
                        or "Local inference unavailable",
                },
            )
        return result
    except (FileNotFoundError, OSError, ValueError) as exc:
        raise HTTPException(
            503, "Local model/runtime unavailable"
        ) from exc
    finally:
        LIVE_LOCK.release()


@router.post("/text/stream")
async def live_text_stream(
    body: TextInput,
    x_prismlab_token: str | None = Header(default=None),
):
    """Forward actual text deltas while retaining the shared inference lock."""
    if os.environ.get("PRISMLAB_LIVE_ENABLED") != "1":
        raise HTTPException(403, "Live inference is disabled")
    token = os.environ.get("PRISMLAB_LIVE_TOKEN", "")
    if not token or not secrets.compare_digest(token, x_prismlab_token or ""):
        raise HTTPException(401, "Invalid local API token")
    if not body.prompt.strip():
        raise HTTPException(422, "Prompt cannot be blank")
    if not LIVE_LOCK.acquire(blocking=False):
        raise HTTPException(409, "Another live inference request is running")

    loop = asyncio.get_running_loop()
    queue: asyncio.Queue[tuple[str, dict]] = asyncio.Queue()

    def emit(kind: str, payload: dict) -> None:
        loop.call_soon_threadsafe(queue.put_nowait, (kind, payload))

    def worker() -> None:
        held = ""
        mode = "opening"

        def visible_token(token: str) -> None:
            nonlocal held, mode
            if mode == "thinking":
                held += token
                marker = held.find("</think>")
                if marker < 0:
                    held = held[-16:]
                    return
                token = held[marker + len("</think>"):]
                held = ""
                mode = "visible"
            if mode == "opening":
                held += token
                if held.startswith("<think>"):
                    held = held[len("<think>"):]
                    mode = "thinking"
                    if held:
                        visible_token("")
                    return
                if "<think>".startswith(held):
                    return
                token, held, mode = held, "", "visible"
            if token:
                emit("token", {"text": token})

        try:
            emit("status", {"stage": "loading_model", "message": "Loading local text model if needed."})
            result = _run_text(body.prompt, on_token=visible_token, max_tokens=body.max_tokens)
            emit("result", result)
        except (OSError, RuntimeError, ValueError) as exc:
            emit("error", {"message": str(exc)})
        except Exception:
            emit("error", {"message": "Local text inference failed."})
        finally:
            LIVE_LOCK.release()
            emit("done", {})

    threading.Thread(target=worker, daemon=True, name="prismlab-text-stream").start()

    async def events():
        while True:
            kind, payload = await queue.get()
            if kind == "done":
                break
            yield f"event: {kind}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"

    return StreamingResponse(events(), media_type="text/event-stream", headers={
        "Cache-Control": "no-store", "X-Accel-Buffering": "no", "X-Content-Type-Options": "nosniff",
    })
