#!/usr/bin/env python3
"""P6.8: exercise EXISTING PrismLab planner + adapters against running CPU router.

No server launches, downloads, GPU use, or public network calls.
Produces an auditable report without claiming a failed route is functional.
"""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import httpx

from prismlab.core.schema import MediaRef, PrismRequest
from prismlab.core.lifecycle import LifecycleManager, RuntimeSpec
from prismlab.core.executor import execute

BASE = "http://127.0.0.1:8188"
ALIASES = {
    "text": "lfm3-1.7b",
    "vision": "lfm3-vision",
    "audio": "lfm3-audio",
    "omni": "lfm3-omni",
    "d1": "d1",
    "d1_omni": "d1-omni",
}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--models", default="vision,audio,omni,d1,d1_omni",
        help="Comma-separated internal route keys",
    )
    args = parser.parse_args()
    selected = [x.strip().replace("-", "_") for x in args.models.split(",") if x.strip()]
    if not selected or any(x not in ALIASES for x in selected):
        parser.error(f"Available models: {', '.join(ALIASES)}")

    project = Path.cwd()
    image = project / "data/p4/colors.png"
    audio = project / "data/p4/question.wav"
    needed = set()
    for key in selected:
        if key in {"vision", "omni"}:
            needed.add(image)
        if key in {"audio", "omni", "d1_omni"}:
            needed.add(audio)
    missing = [str(p) for p in needed if not p.is_file()]
    if missing:
        raise SystemExit("Missing test assets: " + ", ".join(missing))

    try:
        response = httpx.get(BASE + "/v1/models", timeout=10)
        response.raise_for_status()
        available = {m.get("id") for m in response.json().get("data", [])}
    except Exception as exc:
        raise SystemExit(f"CPU router unavailable on port 8188: {exc}") from exc
    absent = [ALIASES[k] for k in selected if ALIASES[k] not in available]
    if absent:
        raise SystemExit("Router aliases missing: " + ", ".join(absent))

    server = Path.home() / "Desktop/llama.cpp/build-cuda/bin/llama-server"
    specs = [
        RuntimeSpec(key, BASE, alias, (str(server), "--help"))
        for key, alias in ALIASES.items()
    ]
    manager = LifecycleManager(
        specs, max_managed=1, log_dir="results/p6/server_logs"
    )

    cases = {
        "text": ("chat", "Reply exactly: PRISMLAB P6.8 TEXT OK", (), None),
        "vision": (
            "chat", "Identify the left, middle and right colors in the image.",
            (MediaRef(kind="image", path=image),), None,
        ),
        "audio": (
            "transcribe", "", (MediaRef(kind="audio", path=audio),), None,
        ),
        "omni": (
            "audio_qa", "Use both attached audio and image: answer the spoken question about the image.",
            (MediaRef(kind="image", path=image), MediaRef(kind="audio", path=audio)),
            {"image", "audio"},
        ),
        "d1": (
            "decision", "A customer says: I was billed twice. Choose billing or technical; determine whether a refund is requested.",
            (), None,
        ),
        "d1_omni": (
            "decision", "Classify the attached audio input; do not take any external action.",
            (MediaRef(kind="audio", path=audio),), None,
        ),
    }

    results = []
    try:
        for key in selected:
            task, prompt, media, required = cases[key]
            print(f"\n=== {key.upper()} / {ALIASES[key]} ===", flush=True)
            started = time.perf_counter()
            try:
                request = PrismRequest(task=task, text=prompt, media=media)
                result = execute(
                    request, manager, auto_start=False,
                    startup_timeout_s=120, required_media=required,
                )
                record = {
                    "key": key,
                    "request_id": result.request_id,
                    "status": result.status,
                    "route": list(result.route),
                    "output": result.output,
                    "total_latency_s": result.total_latency_s,
                    "ttft_s": result.ttft_s,
                    "tokens_per_second": result.tokens_per_second,
                    "warnings": list(result.warnings),
                    "trace": [
                        {
                            "stage": t.stage, "status": t.status,
                            "model": t.model, "note": t.note,
                            "latency_s": t.latency_s, "ttft_s": t.ttft_s,
                        }
                        for t in result.trace
                    ],
                }
                print("Status:", result.status)
                print("Route:", result.route)
                print("Output:", repr(result.output)[:600])
                print("TTFT:", result.ttft_s)
                print("Total:", round(result.total_latency_s, 3), "s")
                print("Tokens/s:", result.tokens_per_second)
                for t in result.trace:
                    print("TRACE:", t.stage, t.status, t.model, t.note)
                if result.warnings:
                    print("Warnings:", result.warnings)
            except Exception as exc:
                record = {
                    "key": key,
                    "status": "harness_error",
                    "error": f"{type(exc).__name__}: {exc}",
                    "elapsed_s": time.perf_counter() - started,
                }
                print("HARNESS ERROR:", record["error"])
            results.append(record)
    finally:
        # auto_start=False: manager owns no launched model processes.
        manager.close()

    path = Path("results/p6/p6_8_existing_adapters_smoke.json")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"router": BASE, "results": results}, indent=2, default=str) + "\n")
    print("\nSaved:", path)
    print("Summary:", ", ".join(f"{r['key']}={r['status']}" for r in results))


if __name__ == "__main__":
    main()
