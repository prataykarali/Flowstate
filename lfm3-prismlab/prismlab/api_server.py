
"""P6.6a: read-only PrismLab Playground replay API."""
from __future__ import annotations

import json
import os
import re
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse

REPLAY_DIR = (
    Path(__file__).resolve().parents[1]
    / "results/p6/public_replays"
)

app = FastAPI(
    title="PrismLab Replay API",
    version="0.1.0",
)

MODEL_FAMILIES = (
    ("text", "LFM3-1.7B"),
    ("vision", "LFM3-VL-2B"),
    ("audio", "LFM3-Audio-2B"),
    ("omni", "LFM3-Omni-2B"),
    ("d1", "d1-2B"),
    ("d1_omni", "d1-Omni-2B"),
)


def read_replay(slug: str) -> dict:
    if not re.fullmatch(
        r"[a-z0-9][a-z0-9_-]{0,63}", slug
    ):
        raise HTTPException(404, "Replay not found")

    path = REPLAY_DIR / f"{slug}.json"

    if (
        not path.is_file()
        or path.is_symlink()
        or path.stat().st_size > 100_000
    ):
        raise HTTPException(404, "Replay not found")

    try:
        data = json.loads(
            path.read_text(encoding="utf-8")
        )
        if (
            data.get("slug") != slug
            or data.get("mode") != "recorded_replay"
        ):
            raise ValueError("Invalid replay")
        return data
    except (ValueError, OSError):
        raise HTTPException(
            404, "Replay not found"
        ) from None


@app.get("/health")
def health():
    live_enabled = (
        os.getenv("PRISMLAB_LIVE_ENABLED") == "1"
        and bool(os.getenv("PRISMLAB_LIVE_TOKEN"))
    )
    on_demand = live_enabled and os.getenv("PRISMLAB_ON_DEMAND") == "1"
    if on_demand:
        from prismlab.on_demand import available_routes
    return {
        "status": "ok",
        "mode": (
            "replay_and_local_live"
            if live_enabled else "replay_only"
        ),
        "live_inference_enabled": live_enabled,
        "on_demand_enabled": on_demand,
        "on_demand_routes": available_routes() if on_demand else [],
    }


@app.get("/api/v1/models")
def models():
    return {
        "mode": "historically_tested",
        "live_availability": "not_checked",
        "items": [
            {"key": key, "name": name}
            for key, name in MODEL_FAMILIES
        ],
    }


@app.get("/api/v1/replays")
def list_replays():
    if not REPLAY_DIR.is_dir():
        return {
            "mode": "recorded_replay",
            "items": [],
        }

    items = []

    for path in sorted(REPLAY_DIR.glob("*.json")):
        try:
            rec = read_replay(path.stem)
        except HTTPException:
            continue

        items.append({
            "slug": rec["slug"],
            "title": rec["title"],
            "model_route": rec["route"],
            "status": rec["status"],
            "evaluation": rec["evaluation"],
        })

    return {
        "mode": "recorded_replay",
        "items": items,
    }


@app.get("/api/v1/replays/{slug}")
def get_replay(slug: str):
    return read_replay(slug)


@app.get("/api/v1/replays/{slug}/events")
def replay_events(slug: str):
    rec = read_replay(slug)

    def events():
        def encode(name, data):
            return (
                f"event: {name}\n"
                f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
            )

        yield encode("metadata", {
            "mode": "recorded_replay",
            "slug": slug,
            "live_model_called": False,
        })

        for index, step in enumerate(rec["trace"]):
            yield encode("stage", {
                "index": index,
                **step,
            })

        yield encode("result", {
            "status": rec["status"],
            "output": rec["output"],
            "metrics": rec["metrics"],
        })

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-store",
            "X-Accel-Buffering": "no",
        },
    )


from prismlab.live_api import router as live_router
app.include_router(live_router)

from prismlab.multimodal_api import router as multimodal_router
app.include_router(multimodal_router)
