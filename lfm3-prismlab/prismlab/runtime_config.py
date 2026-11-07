"""Validated server-side configuration for the opt-in text runtime."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse

from prismlab.core.lifecycle import RuntimeSpec


def _positive_int(name: str, default: int) -> int:
    value = int(os.getenv(name, str(default)))
    if value < 1:
        raise ValueError(f"{name} must be positive")
    return value


def acceleration_flags(executable: Path) -> tuple[str, ...]:
    """Use the local CUDA build when available; allow an explicit CPU override."""
    setting = os.getenv("PRISMLAB_GPU_LAYERS", "auto").lower()
    if setting == "auto":
        layers = 99 if Path("/dev/nvidia0").exists() and "cuda" in str(executable).lower() else 0
    else:
        layers = int(setting)
        if layers < 0:
            raise ValueError("PRISMLAB_GPU_LAYERS must be nonnegative or auto")
    return ("-ngl", str(layers)) if layers else ("-ngl", "0", "--device", "none", "--no-op-offload", "--no-kv-offload")


@dataclass(frozen=True, slots=True)
class TextRuntimeConfig:
    base_url: str
    model_id: str
    host_mode: str
    executable: Path | None
    model_path: Path | None
    context_size: int
    cpu_threads: int
    max_concurrency: int
    timeout_s: int
    auth_token: str | None
    auth_key_file: Path | None

    @classmethod
    def from_env(cls) -> "TextRuntimeConfig":
        mode = os.getenv("PRISMLAB_TEXT_HOST_MODE", "local")
        if mode not in {"local", "remote"}:
            raise ValueError("PRISMLAB_TEXT_HOST_MODE must be local or remote")
        base_url = os.getenv(
            "PRISMLAB_TEXT_ROUTER_URL",
            os.getenv("PRISMLAB_ROUTER_URL", "http://127.0.0.1:8080"),
        )
        model_id = os.getenv("PRISMLAB_TEXT_MODEL_ALIAS", "lfm3-1.7b")
        context_size = _positive_int("PRISMLAB_TEXT_CONTEXT_SIZE", 2048)
        cpu_threads = _positive_int("PRISMLAB_TEXT_CPU_THREADS", 2)
        max_concurrency = _positive_int("PRISMLAB_TEXT_MAX_CONCURRENCY", 1)
        timeout_s = _positive_int("PRISMLAB_TEXT_TIMEOUT_S", 180)
        if max_concurrency != 1:
            raise ValueError("The current FastAPI text worker supports one request at a time")
        auth_token = os.getenv("PRISMLAB_TEXT_RUNTIME_API_KEY") or None
        auth_key_file = Path(os.environ["PRISMLAB_TEXT_RUNTIME_API_KEY_FILE"]).expanduser() if os.getenv("PRISMLAB_TEXT_RUNTIME_API_KEY_FILE") else None
        RuntimeSpec("text", base_url, model_id, allow_remote=mode == "remote", auth_token=auth_token, timeout_s=timeout_s)

        if mode == "remote":
            if not auth_token:
                raise ValueError("Remote text runtime requires PRISMLAB_TEXT_RUNTIME_API_KEY")
            return cls(base_url, model_id, mode, None, None, context_size, cpu_threads, max_concurrency, timeout_s, auth_token, None)

        if auth_key_file and (not auth_token or not auth_key_file.is_file() or auth_key_file.stat().st_mode & 0o077 or auth_key_file.read_text().strip() != auth_token):
            raise ValueError("Local runtime API key file must exist, be private, and match an API key in the environment")

        executable = Path(os.getenv(
            "PRISMLAB_LLAMA_SERVER",
            str(Path.home() / "Desktop/llama.cpp/build-cuda/bin/llama-server"),
        )).expanduser()
        override = os.getenv("PRISMLAB_TEXT_MODEL_PATH")
        if override:
            model_path = Path(override).expanduser()
        else:
            model_dir = os.getenv("PRISMLAB_MODEL_DIR")
            model_path = Path(model_dir).expanduser() / "LFM3-1.7B-Q4_K_M.gguf" if model_dir else None
        return cls(base_url, model_id, mode, executable, model_path, context_size, cpu_threads, max_concurrency, timeout_s, auth_token, auth_key_file)

    def runtime_spec(self) -> RuntimeSpec:
        if self.host_mode == "remote":
            return RuntimeSpec("text", self.base_url, self.model_id, allow_remote=True, auth_token=self.auth_token, timeout_s=self.timeout_s)
        if self.executable is None or not self.executable.is_file() or self.model_path is None or not self.model_path.is_file():
            raise FileNotFoundError("Local llama-server or model file is unavailable")
        parsed = urlparse(self.base_url)
        command = (
            str(self.executable), "-m", str(self.model_path),
            "--alias", self.model_id, "--host", parsed.hostname or "127.0.0.1", "--port", str(parsed.port),
            "-c", str(self.context_size), *acceleration_flags(self.executable), "-t", str(self.cpu_threads),
            "--parallel", str(self.max_concurrency), "--no-reasoning-preserve",
            "--reasoning", "off", "--reasoning-budget", "0",
            "--cors-origins", "http://127.0.0.1:8000",
        )
        if self.auth_key_file:
            command += ("--api-key-file", str(self.auth_key_file))
        return RuntimeSpec("text", self.base_url, self.model_id, command, auth_token=self.auth_token, timeout_s=self.timeout_s)
