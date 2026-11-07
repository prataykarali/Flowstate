"""One-request-at-a-time runtime specs for six local GGUF models."""
from __future__ import annotations

import os
import atexit
import threading
import time
from pathlib import Path
from urllib.parse import urlparse

from prismlab.core.lifecycle import LifecycleManager, RuntimeSpec
from prismlab.runtime_config import TextRuntimeConfig, acceleration_flags


MODELS = {
    "vision": ("LFM3-VL-2B-GGUF", "LFM3-VL-2B-QAD-Q4_0.gguf", "mmproj-LFM3-VL-2B-Q8_0.gguf", "lfm3-vision"),
    "audio": ("LFM3-Audio-2B-GGUF", "LFM3-Audio-2B-Q4_K_M.gguf", "mmproj-LFM3-Audio-2B-Q4_0.gguf", "lfm3-audio"),
    "omni": ("LFM3-Omni-2B-GGUF", "LFM3-Omni-2B-Q4_K_M.gguf", "mmproj-LFM3-Omni-2B-Q4_0.gguf", "lfm3-omni"),
    "d1": ("d1-2B-GGUF", "d1-2B-Q4_K_M.gguf", "mmproj-d1-2B-Q8_0.gguf", "d1"),
    "d1_omni": ("d1-Omni-2B-GGUF", "d1-Omni-2B-Q8_0.gguf", "mmproj-d1-Omni-2B-Q8_0.gguf", "d1-omni"),
}

from contextlib import contextmanager, nullcontext

_warm_lock = threading.Lock()
_warm_managers: dict[str, tuple[tuple[RuntimeSpec, ...], LifecycleManager]] = {}
_last_used: dict[str, float] = {}
_active_models: set[str] = set()
_reaper_started = False
IDLE_COOLDOWN_SECONDS = max(0.0, float(os.getenv("PRISMLAB_IDLE_COOLDOWN_SECONDS", "600")))


def _reaper_loop() -> None:
    while True:
        time.sleep(15)
        now = time.monotonic()
        with _warm_lock:
            for group, (_, manager) in list(_warm_managers.items()):
                for key in list(manager._owned):
                    item_key = f"{group}:{key}"
                    if item_key in _active_models or (key == "text" and "text:text" in _active_models):
                        continue
                    last = _last_used.get(item_key, 0)
                    if IDLE_COOLDOWN_SECONDS > 0 and last > 0 and (now - last) >= IDLE_COOLDOWN_SECONDS:
                        manager.stop(key)
                        _last_used.pop(item_key, None)


def _start_reaper() -> None:
    global _reaper_started
    if not _reaper_started:
        _reaper_started = True
        threading.Thread(target=_reaper_loop, daemon=True, name="prismlab-cooldown").start()


def touch_model(group: str, model_key: str) -> None:
    with _warm_lock:
        now = time.monotonic()
        _last_used[f"{group}:{model_key}"] = now
        if model_key == "text":
            _last_used["text:text"] = now
        _start_reaper()


@contextmanager
def busy_model(group: str, model_key: str):
    with _warm_lock:
        _active_models.add(f"{group}:{model_key}")
        if model_key == "text":
            _active_models.add("text:text")
        now = time.monotonic()
        _last_used[f"{group}:{model_key}"] = now
        if model_key == "text":
            _last_used["text:text"] = now
        _start_reaper()
    try:
        yield
    finally:
        with _warm_lock:
            _active_models.discard(f"{group}:{model_key}")
            if model_key == "text":
                _active_models.discard("text:text")
            now = time.monotonic()
            _last_used[f"{group}:{model_key}"] = now
            if model_key == "text":
                _last_used["text:text"] = now



def warm_manager(group: str, specs: list[RuntimeSpec]) -> LifecycleManager:
    """Reuse verified local servers across sequential requests in one worker."""
    signature = tuple(specs)
    with _warm_lock:
        _start_reaper()
        retain_text = os.getenv("PRISMLAB_RETAIN_TEXT_WARM", "0") == "1"
        if os.getenv("PRISMLAB_SINGLE_ACTIVE_MODEL") == "1":
            for other_group, (_, other_manager) in list(_warm_managers.items()):
                if other_group != group:
                    # Retain text resident if another group is activated
                    if retain_text and other_group == "text" and group != "text":
                        continue
                    other_manager.close()
                    _warm_managers.pop(other_group, None)
                    for key in list(_last_used):
                        if key.startswith(f"{other_group}:"):
                            _last_used.pop(key, None)
        cached = _warm_managers.get(group)
        if cached and cached[0] == signature:
            return cached[1]
        if cached:
            cached[1].close()
        manager = LifecycleManager(specs, max_managed=1, log_dir="results/p6/server_logs")
        _warm_managers[group] = (signature, manager)
        return manager


@atexit.register
def close_warm_managers() -> None:
    with _warm_lock:
        for _, manager in _warm_managers.values():
            manager.close()
        _warm_managers.clear()


def _cached_or_override(key: str, suffix: str, repo: str, filename: str) -> Path | None:
    override = os.getenv(f"PRISMLAB_{key.upper()}_{suffix}_PATH")
    if override:
        path = Path(override).expanduser()
        return path if path.is_file() else None
    model_dir = os.getenv("PRISMLAB_MODEL_DIR")
    if not model_dir:
        return None
    path = Path(model_dir).expanduser() / filename
    return path if path.is_file() else None


def available_routes() -> list[str]:
    if os.getenv("PRISMLAB_ON_DEMAND") != "1":
        return []
    try:
        text = TextRuntimeConfig.from_env()
        executable = text.executable
        routes = ["text"] if text.host_mode == "local" and executable and executable.is_file() and text.model_path and text.model_path.is_file() else []
    except (ValueError, OSError):
        return []
    for key, (repo, model_name, projector_name, _) in MODELS.items():
        if _cached_or_override(key, "MODEL", repo, model_name) and _cached_or_override(key, "MMPROJ", repo, projector_name):
            routes.append(key)
    return routes


def runtime_specs() -> list[RuntimeSpec]:
    text = TextRuntimeConfig.from_env()
    if text.host_mode != "local":
        raise ValueError("On-demand mode requires a local CPU llama-server host")
    text_spec = text.runtime_spec()
    executable = text.executable
    assert executable is not None
    base = os.getenv("PRISMLAB_MULTIMODAL_ROUTER_URL", "http://127.0.0.1:8188")
    port = urlparse(base).port
    threads = text.cpu_threads
    context = text.context_size
    specs = [text_spec]
    for key, (repo, model_name, projector_name, alias) in MODELS.items():
        model = _cached_or_override(key, "MODEL", repo, model_name)
        projector = _cached_or_override(key, "MMPROJ", repo, projector_name)
        if not model or not projector:
            continue
        command = (
            str(executable), "-m", str(model), "--mmproj", str(projector),
            "--alias", alias, "--host", "127.0.0.1", "--port", str(port),
            "-c", str(context), *acceleration_flags(executable), "-t", str(threads),
            "--parallel", "1", "--no-reasoning-preserve",
            "--reasoning", "off", "--reasoning-budget", "0",
            "--cache-reuse", "256",
        )
        if key in {"d1", "d1_omni"}:
            batch = "4096" if key == "d1_omni" else "2048"
            command += ("-b", batch, "-ub", batch)
        if text.auth_key_file:
            command += ("--api-key-file", str(text.auth_key_file))
        specs.append(RuntimeSpec(key, base, alias, command, auth_token=text.auth_token, timeout_s=text.timeout_s))
    return specs
