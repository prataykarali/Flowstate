
"""P6.3: safe lifecycle management for localhost llama.cpp servers."""
from __future__ import annotations

import json
import os
import subprocess
from dataclasses import dataclass
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen


@dataclass(frozen=True, slots=True)
class RuntimeSpec:
    key: str
    base_url: str
    model_id: str
    launch_command: tuple[str, ...] | None = None
    allow_remote: bool = False
    auth_token: str | None = None
    timeout_s: float = 180

    def __post_init__(self) -> None:
        parsed = urlparse(self.base_url)
        if (
            (parsed.scheme != "https" if self.allow_remote else parsed.scheme != "http")
            or (parsed.hostname in {"localhost", "127.0.0.1", "::1"} if self.allow_remote else parsed.hostname not in {"localhost", "127.0.0.1", "::1"})
            or parsed.hostname is None
            or parsed.port is None
            or parsed.path not in {"", "/"}
            or parsed.query
            or parsed.fragment
            or parsed.username
            or parsed.password
        ):
            raise ValueError(
                "Use a localhost HTTP base URL with an explicit port"
            )
        if not self.key.strip() or not self.model_id.strip():
            raise ValueError("key and model_id must be nonempty")
        if self.timeout_s <= 0:
            raise ValueError("timeout_s must be positive")
        if self.allow_remote and self.launch_command is not None:
            raise ValueError("Remote runtimes cannot be launched locally")
        if self.launch_command is not None and (
            not self.launch_command
            or not all(
                isinstance(x, str) and x
                for x in self.launch_command
            )
        ):
            raise ValueError(
                "launch_command must contain nonempty arguments"
            )


@dataclass(frozen=True, slots=True)
class ProbeResult:
    state: str  # ready, offline, loading, mismatch, unverified
    detail: str

    @property
    def ready(self) -> bool:
        return self.state == "ready"


class LifecycleManager:
    """Only stop processes launched by this manager."""

    def __init__(
        self,
        specs: list[RuntimeSpec],
        *,
        max_managed: int = 1,
        log_dir: str | Path = "results/p6/server_logs",
    ):
        if max_managed < 1:
            raise ValueError("max_managed must be >= 1")
        if len({s.key for s in specs}) != len(specs):
            raise ValueError("Duplicate model keys")

        self.specs = {s.key: s for s in specs}
        self.max_managed = max_managed
        self.log_dir = Path(log_dir)
        self._owned: dict[str, subprocess.Popen] = {}

    def probe(self, key: str) -> ProbeResult:
        spec = self.specs[key]
        base = spec.base_url.rstrip("/")
        headers = {"Authorization": f"Bearer {spec.auth_token}"} if spec.auth_token else {}

        try:
            with urlopen(Request(base + "/health", headers=headers), timeout=2) as response:
                if response.status != 200:
                    return ProbeResult(
                        "unverified", "Unexpected health response"
                    )
        except HTTPError as exc:
            if exc.code == 503:
                return ProbeResult(
                    "loading", "Health endpoint reports loading"
                )
            return ProbeResult(
                "unverified", f"Health HTTP {exc.code}"
            )
        except (URLError, TimeoutError, OSError) as exc:
            return ProbeResult("offline", type(exc).__name__)

        try:
            with urlopen(Request(base + "/v1/models", headers=headers), timeout=2) as response:
                data = json.load(response)

            ids = {
                x.get("id")
                for x in data["data"]
                if isinstance(x, dict)
            }
        except (
            HTTPError, URLError, TimeoutError, OSError,
            ValueError, KeyError, TypeError
        ) as exc:
            return ProbeResult(
                "unverified",
                f"Cannot verify model identity: {type(exc).__name__}",
            )

        if spec.model_id in ids:
            return ProbeResult(
                "ready", f"Verified model: {spec.model_id}"
            )

        return ProbeResult(
            "mismatch",
            f"Expected {spec.model_id}; "
            f"server advertises {sorted(str(x) for x in ids)}",
        )

    def start(self, key: str) -> str:
        spec = self.specs[key]
        owned = self._owned.get(key)

        if owned is not None and owned.poll() is None:
            state = self.probe(key)
            if state.state == "mismatch":
                raise RuntimeError(state.detail)
            return (
                "reused_managed"
                if state.ready else "managed_starting"
            )

        if owned is not None:
            del self._owned[key]

        # A warm on-demand model may own this port. Switch only processes
        # launched by this manager; an unrelated external server is untouched.
        for other_key, process in list(self._owned.items()):
            if other_key != key and process.poll() is None and self.specs[other_key].base_url == spec.base_url:
                self.stop(other_key)

        status = self.probe(key)

        if status.ready:
            return "reused_external"
        if status.state == "loading":
            return "external_loading"
        if status.state != "offline":
            if os.getenv("PRISMLAB_ON_DEMAND") == "1":
                self._free_port(spec.base_url)
                status = self.probe(key)
                if status.ready:
                    return "reused_external"
            if status.state != "offline":
                raise RuntimeError(
                    f"Refusing launch: {status.state}: {status.detail}"
                )
        if spec.launch_command is None:
            raise RuntimeError(
                f"{key}: offline; no launch_command configured"
            )

        live_owned = sum(
            p.poll() is None for p in self._owned.values()
        )
        if live_owned >= self.max_managed:
            if os.getenv("PRISMLAB_ON_DEMAND") == "1":
                for other_key, process in list(self._owned.items()):
                    if other_key != key and process.poll() is None:
                        self.stop(other_key)
                        live_owned = sum(p.poll() is None for p in self._owned.values())
                        if live_owned < self.max_managed:
                            break
            if live_owned >= self.max_managed:
                raise RuntimeError(
                    "Managed model limit reached; "
                    "stop a managed model first"
                )

        self.log_dir.mkdir(parents=True, exist_ok=True)

        with (self.log_dir / f"{key}.log").open("ab") as log:
            process = subprocess.Popen(
                spec.launch_command,
                stdout=log,
                stderr=subprocess.STDOUT,
                start_new_session=True,
                shell=False,
            )

        self._owned[key] = process
        return "launched_not_yet_ready"

    def stop(self, key: str, *, timeout: float = 5.0) -> bool:
        """Never terminate external/unowned server processes."""
        process = self._owned.pop(key, None)

        if process is None:
            return False

        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=timeout)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=timeout)

        return True

    def close(self) -> None:
        for key in list(self._owned):
            self.stop(key)

    @staticmethod
    def _free_port(base_url: str) -> None:
        try:
            from urllib.parse import urlparse
            import subprocess
            import time
            port = urlparse(base_url).port
            if port:
                subprocess.run(["fuser", "-k", f"{port}/tcp"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                time.sleep(0.3)
        except Exception:
            pass

