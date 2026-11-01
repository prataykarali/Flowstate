
"""P6.6b: explicitly enabled, single-request local text inference."""
from __future__ import annotations

import os
import secrets
import threading
from pathlib import Path

from fastapi import APIRouter, Header, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from prismlab.core.executor import execute
from prismlab.core.lifecycle import LifecycleManager, RuntimeSpec
from prismlab.core.schema import PrismRequest

router = APIRouter(prefix="/api/v1/live", tags=["Local inference"])

# One active request for this API worker.
LIVE_LOCK = threading.Lock()


class TextInput(BaseModel):
    prompt: str = Field(min_length=1, max_length=1000)


def _run_text(prompt: str) -> dict:
    """Runs in a worker thread, never on the API event loop."""
    server = (
        Path.home()
        / "Desktop/llama.cpp/build-cuda/bin/llama-server"
    )

    cache = (
        Path.home()
        / ".cache/huggingface/hub"
        / "models--LiquidAI--LFM3-1.7B-GGUF/snapshots"
    )

    models = sorted(
        p for p in cache.glob("*/LFM3-1.7B-Q4_K_M.gguf")
        if p.is_file()
    )

    if not server.is_file() or not models:
        raise FileNotFoundError(
            "Existing llama-server or cached model is unavailable"
        )

    command = (
        str(server),
        "-m", str(models[0]),
        "--alias", "lfm3-1.7b",
        "--host", "127.0.0.1",
        "--port", "8080",
        "-c", "2048",
        "-ngl", "0",
    )

    manager = LifecycleManager(
        [
            RuntimeSpec(
                "text",
                os.environ.get("PRISMLAB_ROUTER_URL", "http://127.0.0.1:8080"),
                "lfm3-1.7b",
                command,
            )
        ],
        max_managed=1,
        log_dir="results/p6/server_logs",
    )

    request = PrismRequest(task="chat", text=prompt)

    try:
        result = execute(
            request,
            manager,
            auto_start=False,
            startup_timeout_s=120,
        )
    finally:
        manager.close()

    return {
        "mode": "live_local_inference",
        "request_id": result.request_id,
        "model": "LFM3-1.7B",
        "status": result.status,
        "output": result.output,
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
            }
            for step in result.trace
        ],
        "error": (
            "Execution did not complete; inspect local server logs"
            if result.status != "completed"
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
        result = await run_in_threadpool(_run_text, body.prompt)
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
    except (FileNotFoundError, OSError) as exc:
        raise HTTPException(
            503, "Local model/runtime unavailable"
        ) from exc
    finally:
        LIVE_LOCK.release()
