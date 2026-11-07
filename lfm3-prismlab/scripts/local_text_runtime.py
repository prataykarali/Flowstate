"""Opt-in local text stack. Owns only processes it starts; never downloads weights."""
from __future__ import annotations

import argparse
import importlib.util
import json
import os
import secrets
import signal
import socket
import subprocess
import sys
import time
from pathlib import Path
from urllib.error import URLError
from urllib.parse import urlparse
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
STATE = ROOT / ".prismlab-local"
PIDS = STATE / "pids.json"
TOKEN = STATE / "token"


def _start_time(pid: int) -> str | None:
    try:
        return Path(f"/proc/{pid}/stat").read_text().split(") ", 1)[1].split()[19]
    except (OSError, IndexError):
        return None


def _owns(item: dict) -> bool:
    return _start_time(item["pid"]) == item["start_time"]


def _port_free(port: int) -> bool:
    with socket.socket() as sock:
        return sock.connect_ex(("127.0.0.1", port)) != 0


def _ready(url: str, *, expected_model: str | None = None, gateway: bool = False) -> bool:
    try:
        headers = {"Authorization": f"Bearer {TOKEN.read_text().strip()}"} if expected_model and TOKEN.exists() else {}
        from urllib.request import Request
        with urlopen(Request(url, headers=headers), timeout=2) as response:
            if response.status != 200:
                return False
            if gateway:
                state = json.load(response)
                return all(state.get(key) is True for key in ("gateway_enabled", "backend_available", "backend_live_enabled", "text_model_available"))
            if expected_model:
                state = json.load(response)
                return any(model.get("id") == expected_model for model in state.get("data", []))
            return True
    except (URLError, TimeoutError, OSError, ValueError, KeyError, TypeError):
        return False


def _wait(url: str, name: str, timeout: float = 120, **checks: object) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if _ready(url, **checks):
            return
        time.sleep(0.5)
    raise RuntimeError(f"{name} did not become ready; inspect .prismlab-local/{name}.log")


def _spawn(name: str, command: tuple[str, ...], cwd: Path, env: dict[str, str]) -> dict:
    with (STATE / f"{name}.log").open("ab") as log:
        process = subprocess.Popen(command, cwd=cwd, env=env, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
    return {"pid": process.pid, "start_time": _start_time(process.pid)}


def _stop_items(items: dict) -> None:
    for name in ("playground", "backend", "model"):
        item = items.get(name)
        if item and _owns(item):
            try:
                os.killpg(item["pid"], signal.SIGTERM)
                print(f"Stopped owned {name} process {item['pid']}")
            except ProcessLookupError:
                pass


def preflight() -> None:
    from prismlab.runtime_config import TextRuntimeConfig

    cfg = TextRuntimeConfig.from_env()
    print(f"Text mode: {cfg.host_mode}; URL: {cfg.base_url}; alias: {cfg.model_id}")
    print(f"Context: {cfg.context_size}; CPU threads: {cfg.cpu_threads}; concurrency: {cfg.max_concurrency}; timeout: {cfg.timeout_s}s")
    if cfg.host_mode == "local":
        print(f"llama-server: {cfg.executable} ({'found' if cfg.executable and cfg.executable.is_file() else 'missing'})")
        print(f"GGUF: {cfg.model_path} ({'found' if cfg.model_path and cfg.model_path.is_file() else 'missing'})")
    print(f"FastAPI available: {importlib.util.find_spec('fastapi') is not None}")
    print(f"Uvicorn available: {importlib.util.find_spec('uvicorn') is not None}")
    print(f"Playground dependencies: {(ROOT / 'playground/node_modules').is_dir()}")
    for port in (urlparse(cfg.base_url).port, 8000, int(os.getenv("PRISMLAB_PLAYGROUND_PORT", "5173"))):
        print(f"Port {port}: {'free' if _port_free(port) else 'occupied'}")


def start_text() -> None:
    from prismlab.runtime_config import TextRuntimeConfig

    cfg = TextRuntimeConfig.from_env()
    if cfg.host_mode != "local":
        raise RuntimeError("This launcher starts only the local CPU text stack")
    frontend_port = int(os.getenv("PRISMLAB_PLAYGROUND_PORT", "5173"))
    ports = (urlparse(cfg.base_url).port, 8000, frontend_port)
    if len(set(ports)) != 3 or any(not _port_free(port) for port in ports):
        raise RuntimeError("Required port is occupied; refusing to adopt or stop existing processes")
    if PIDS.exists() and any(_owns(item) for item in json.loads(PIDS.read_text()).values()):
        raise RuntimeError("This launcher already owns running processes")
    STATE.mkdir(mode=0o700, exist_ok=True)
    STATE.chmod(0o700)
    TOKEN.write_text(secrets.token_urlsafe(32))
    TOKEN.chmod(0o600)
    os.environ["PRISMLAB_TEXT_RUNTIME_API_KEY"] = TOKEN.read_text()
    os.environ["PRISMLAB_TEXT_RUNTIME_API_KEY_FILE"] = str(TOKEN)
    cfg = TextRuntimeConfig.from_env()
    spec = cfg.runtime_spec()
    env = os.environ.copy()
    env.update({"PRISMLAB_LIVE_ENABLED": "1", "PRISMLAB_GATEWAY_ENABLED": "1", "PRISMLAB_LIVE_TOKEN": TOKEN.read_text(), "PRISMLAB_TEXT_ROUTER_URL": cfg.base_url, "PRISMLAB_PLAYGROUND_PORT": str(frontend_port)})
    items = {}
    try:
        items["model"] = _spawn("model", spec.launch_command, ROOT, env)
        _wait(cfg.base_url.rstrip("/") + "/health", "model")
        _wait(cfg.base_url.rstrip("/") + "/v1/models", "model", expected_model=cfg.model_id)
        items["backend"] = _spawn("backend", (sys.executable, "-m", "uvicorn", "prismlab.api_server:app", "--host", "127.0.0.1", "--port", "8000", "--no-access-log"), ROOT, env)
        _wait("http://127.0.0.1:8000/health", "backend")
        items["playground"] = _spawn("playground", ("npm", "run", "dev", "--", "--host", "127.0.0.1"), ROOT / "playground", env)
        _wait(f"http://127.0.0.1:{frontend_port}/local-api/status", "playground", gateway=True)
        PIDS.write_text(json.dumps(items, indent=2))
        PIDS.chmod(0o600)
        print(f"Ready: http://127.0.0.1:{frontend_port}/#chat")
    except Exception:
        _stop_items(items)
        raise


def start() -> None:
    """Start an idle backend that loads exactly one model per request."""
    from prismlab.runtime_config import TextRuntimeConfig

    cfg = TextRuntimeConfig.from_env()
    if cfg.host_mode != "local":
        raise RuntimeError("This launcher requires a local CPU host")
    frontend_port = int(os.getenv("PRISMLAB_PLAYGROUND_PORT", "5173"))
    ports = (urlparse(cfg.base_url).port, 8188, 8000)
    if len(set(ports)) != 3 or any(not _port_free(port) for port in ports):
        raise RuntimeError("A model or backend port is occupied; stop only the owned stack first")
    if PIDS.exists() and any(_owns(item) for item in json.loads(PIDS.read_text()).values()):
        raise RuntimeError("This launcher already owns running processes")
    STATE.mkdir(mode=0o700, exist_ok=True)
    STATE.chmod(0o700)
    TOKEN.write_text(secrets.token_urlsafe(32))
    TOKEN.chmod(0o600)
    env = os.environ.copy()
    env.update({
        "PRISMLAB_LIVE_ENABLED": "1", "PRISMLAB_ON_DEMAND": "1",
        "PRISMLAB_GATEWAY_ENABLED": "1", "PRISMLAB_LIVE_TOKEN": TOKEN.read_text(),
        "PRISMLAB_TEXT_RUNTIME_API_KEY": TOKEN.read_text(),
        "PRISMLAB_TEXT_RUNTIME_API_KEY_FILE": str(TOKEN),
        "PRISMLAB_TEXT_ROUTER_URL": cfg.base_url,
        "PRISMLAB_MULTIMODAL_ROUTER_URL": "http://127.0.0.1:8188",
        "PRISMLAB_PLAYGROUND_PORT": str(frontend_port),
    })
    items = {}
    try:
        items["backend"] = _spawn("backend", (sys.executable, "-m", "uvicorn", "prismlab.api_server:app", "--host", "127.0.0.1", "--port", "8000", "--no-access-log"), ROOT, env)
        _wait("http://127.0.0.1:8000/health", "backend")
        with urlopen("http://127.0.0.1:8000/health", timeout=3) as response:
            health = json.load(response)
        if set(health.get("on_demand_routes", [])) != {"text", "vision", "audio", "omni", "d1", "d1_omni"}:
            raise RuntimeError(f"Not all six model files are available: {health.get('on_demand_routes', [])}")
        if _port_free(frontend_port):
            items["playground"] = _spawn("playground", ("npm", "run", "dev", "--", "--host", "127.0.0.1"), ROOT / "playground", env)
        _wait(f"http://127.0.0.1:{frontend_port}/local-api/status", "playground")
        with urlopen(f"http://127.0.0.1:{frontend_port}/local-api/status", timeout=3) as response:
            gateway = json.load(response)
        if not gateway.get("gateway_enabled") or len(gateway.get("on_demand_routes", [])) != 6:
            raise RuntimeError("Playground gateway did not activate all six on-demand routes")
        PIDS.write_text(json.dumps(items, indent=2))
        PIDS.chmod(0o600)
        print(f"Ready on request: http://127.0.0.1:{frontend_port}/#chat (six models, none loaded)")
    except Exception:
        _stop_items(items)
        TOKEN.unlink(missing_ok=True)
        raise


def status() -> None:
    from prismlab.runtime_config import TextRuntimeConfig

    cfg = TextRuntimeConfig.from_env()
    items = json.loads(PIDS.read_text()) if PIDS.exists() else {}
    for name in ("model", "backend", "playground"):
        item = items.get(name)
        print(f"{name}: {'owned/running' if item and _owns(item) else 'not owned/running'}")
    for name, url in (("model", cfg.base_url.rstrip("/") + "/health"), ("backend", "http://127.0.0.1:8000/health"), ("gateway", f"http://127.0.0.1:{os.getenv('PRISMLAB_PLAYGROUND_PORT', '5173')}/local-api/status")):
        print(f"{name} health: {'ok' if _ready(url) else 'offline'}")
    try:
        with urlopen("http://127.0.0.1:8000/health", timeout=2) as response:
            health = json.load(response)
        if health.get("on_demand_enabled"):
            print(f"On-demand routes: {', '.join(health.get('on_demand_routes', []))}; model idle between requests")
    except (URLError, TimeoutError, OSError, ValueError):
        pass


def stop() -> None:
    if not PIDS.exists():
        print("No owned processes recorded")
        return
    _stop_items(json.loads(PIDS.read_text()))
    PIDS.unlink()
    TOKEN.unlink(missing_ok=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("preflight", "start", "start_text", "status", "stop"))
    action = parser.parse_args().action
    try:
        globals()[action]()
    except (RuntimeError, ValueError, OSError) as error:
        parser.exit(1, f"{error}\n")
