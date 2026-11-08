"""Manual control of the isolated PrismLab inference gateway and its Funnel."""
from __future__ import annotations

import argparse
import base64
import hashlib
import hmac
import json
import os
import secrets
import shutil
import signal
import socket
import subprocess
import sys
import time
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / ".prismlab-local"
MODELS = STATE / "models"
PID = STATE / "gateway.pid"
SECRET = STATE / "session-secret"
INTERNAL = STATE / "internal-key"
ORIGIN = STATE / "vercel-origin"
VENV = ROOT.parent / ".venv"
LLAMA = Path.home() / "Desktop/llama.cpp/build/bin"
EXPECTED = {"text", "vision", "audio", "omni", "d1", "d1_omni"}
API = "http://127.0.0.1:8000"


def _process(pid: int) -> bool:
    try:
        return "prismlab.public_gateway" in Path(f"/proc/{pid}/cmdline").read_bytes().replace(b"\0", b" ").decode()
    except (OSError, UnicodeError):
        return False


def _pid() -> int | None:
    if not PID.exists():
        return None
    try:
        value = int(PID.read_text().strip())
        return value if _process(value) else None
    except (OSError, ValueError):
        return None


def _token() -> str:
    visitor = secrets.token_hex(16)
    encoded = base64.urlsafe_b64encode(json.dumps({"v": visitor, "exp": int(time.time()) + 600}).encode()).decode().rstrip("=")
    signature = hmac.new(SECRET.read_text().strip().encode(), encoded.encode(), hashlib.sha256).hexdigest()
    return f"{encoded}.{signature}"


def _get(path: str, authenticated: bool = False) -> dict:
    headers = {"Authorization": f"Bearer {_token()}"} if authenticated else {}
    with urlopen(Request(API + path, headers=headers), timeout=3) as response:
        return json.load(response)


def _ensure_file(path: Path) -> None:
    if not path.exists():
        path.write_text(secrets.token_urlsafe(48))
    path.chmod(0o600)


def _origin() -> str:
    value = ORIGIN.read_text().strip() if ORIGIN.exists() else ""
    if value and (not value.startswith("https://") or "/" in value[8:]):
        raise RuntimeError(".prismlab-local/vercel-origin must contain exactly one HTTPS origin")
    return value


def _build_bwrap_command(inner_command: list[str]) -> list[str]:
    return [
        "bwrap",
        "--unshare-all",
        "--share-net",
        "--ro-bind", "/usr", "/usr",
        "--ro-bind", "/lib", "/lib",
        "--ro-bind", "/lib64", "/lib64",
        "--ro-bind", "/bin", "/bin",
        "--ro-bind", "/etc", "/etc",
        "--proc", "/proc",
        "--dev", "/dev",
        "--tmpfs", "/tmp",
        "--ro-bind", str(ROOT / "prismlab"), "/app/prismlab",
        "--ro-bind", str(MODELS), "/models",
        "--ro-bind", str(LLAMA), "/runtime",
        "--ro-bind", str(VENV), "/venv",
        "--bind", str(STATE), "/state",
        "--chdir", "/state",
        *inner_command,
    ]


def _check_bwrap_sandbox() -> tuple[bool, str]:
    if not shutil.which("bwrap"):
        return False, "bwrap executable not found in PATH"
    if not (VENV / "bin/python").is_file():
        return False, f"Virtualenv Python missing: {VENV / 'bin/python'}"
    if not MODELS.is_dir():
        return False, f"Models directory missing: {MODELS}"
    if not (LLAMA / "llama-server").is_file():
        return False, f"llama-server missing: {LLAMA / 'llama-server'}"

    cmd = _build_bwrap_command(["/venv/bin/python", "-c", "import sys; sys.exit(0)"])
    env = {
        "PATH": "/venv/bin:/usr/bin:/bin",
        "LANG": "C.UTF-8",
        "HOME": "/state",
        "PYTHONPATH": "/app",
    }
    try:
        res = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=5)
        if res.returncode == 0:
            return True, ""
        err = res.stderr.strip() or res.stdout.strip() or f"exit code {res.returncode}"
        return False, err
    except Exception as exc:
        return False, str(exc)


def _bwrap_available() -> bool:
    ok, _ = _check_bwrap_sandbox()
    return ok


def preflight() -> None:
    if not (VENV / "bin/python").is_file() or not (LLAMA / "llama-server").is_file():
        raise RuntimeError("Existing Python environment or CPU llama-server is missing")
    if not MODELS.is_dir():
        raise RuntimeError(".prismlab-local/models is missing")
    bwrap_ok, bwrap_err = _check_bwrap_sandbox()
    if bwrap_ok:
        print("Bubblewrap filesystem isolation: enabled")
    else:
        if os.getenv("PRISMLAB_ALLOW_UNCONFINED_DEV") != "1":
            raise RuntimeError(
                f"Security Confinement Failure: Bubblewrap sandbox initialization failed:\n"
                f"  {bwrap_err}\n"
                "The public gateway enforces fail-closed execution and will not run unconfined.\n"
                "To authorize Bubblewrap isolation, review and install deploy/local/apparmor-bwrap.profile:\n"
                "  sudo cp deploy/local/apparmor-bwrap.profile /etc/apparmor.d/bwrap\n"
                "  sudo apparmor_parser -r /etc/apparmor.d/bwrap"
            )
        print(f"Bubblewrap filesystem isolation: unavailable ({bwrap_err})")
    os.environ.update(PRISMLAB_ON_DEMAND="1", PRISMLAB_MODEL_DIR=str(MODELS), PRISMLAB_LLAMA_SERVER=str(LLAMA / "llama-server"), PRISMLAB_GPU_LAYERS="0")
    sys.path.insert(0, str(ROOT))
    from prismlab.on_demand import available_routes
    routes = set(available_routes())
    print("Local model routes:", ", ".join(sorted(routes)))
    if routes != EXPECTED:
        raise RuntimeError(f"Model files missing for: {', '.join(sorted(EXPECTED - routes))}")
    if _origin():
        print("Vercel origin:", _origin())
    else:
        print("Vercel origin unset; gateway will be local-only")


def _build_command() -> tuple[dict[str, str], list[str]]:
    bwrap_ok, bwrap_err = _check_bwrap_sandbox()
    if bwrap_ok:
        env = {
            "PATH": "/venv/bin:/usr/bin:/bin",
            "LANG": "C.UTF-8",
            "HOME": "/state",
            "PYTHONPATH": "/app",
            "LD_LIBRARY_PATH": "/runtime",
            "PRISMLAB_PUBLIC_GATEWAY": "1",
            "PRISMLAB_ON_DEMAND": "1",
            "PRISMLAB_SINGLE_ACTIVE_MODEL": "1",
            "PRISMLAB_GPU_LAYERS": "0",
            "PRISMLAB_MODEL_DIR": "/models",
            "PRISMLAB_LLAMA_SERVER": "/runtime/llama-server",
            "PRISMLAB_TEXT_MODEL_PATH": "/models/LFM3-1.7B-Q4_K_M.gguf",
            "PRISMLAB_TEXT_ROUTER_URL": "http://127.0.0.1:8080",
            "PRISMLAB_MULTIMODAL_ROUTER_URL": "http://127.0.0.1:8188",
            "PRISMLAB_TEXT_RUNTIME_API_KEY": INTERNAL.read_text().strip(),
            "PRISMLAB_TEXT_RUNTIME_API_KEY_FILE": "/state/internal-key",
            "PRISMLAB_SESSION_SECRET": SECRET.read_text().strip(),
            "PRISMLAB_ALLOWED_ORIGINS": _origin(),
            "PRISMLAB_WAITING_LIMIT": os.getenv("PRISMLAB_WAITING_LIMIT", "3"),
            "PRISMLAB_VISITOR_LIMIT": os.getenv("PRISMLAB_VISITOR_LIMIT", "1000000"),
            "PRISMLAB_COMPUTE_BUDGET_S": os.getenv("PRISMLAB_COMPUTE_BUDGET_S", "864000.0"),
            "PRISMLAB_RATE_WINDOW_S": os.getenv("PRISMLAB_RATE_WINDOW_S", "600"),
            "PRISMLAB_TEXT_CPU_THREADS": os.getenv("PRISMLAB_TEXT_CPU_THREADS", "6"),
            "PRISMLAB_RETAIN_TEXT_WARM": "1",
        }
        command = _build_bwrap_command([
            "/venv/bin/python", "-m", "uvicorn", "prismlab.public_gateway:app",
            "--host", "127.0.0.1", "--port", "8000", "--workers", "1", "--no-access-log",
        ])
    else:
        if os.getenv("PRISMLAB_ALLOW_UNCONFINED_DEV") != "1":
            raise RuntimeError(
                f"Security Confinement Failure: Bubblewrap sandbox initialization failed:\n"
                f"  {bwrap_err}\n"
                "The public gateway enforces fail-closed execution and will not run unconfined.\n"
                "To authorize Bubblewrap isolation, review and install deploy/local/apparmor-bwrap.profile:\n"
                "  sudo cp deploy/local/apparmor-bwrap.profile /etc/apparmor.d/bwrap\n"
                "  sudo apparmor_parser -r /etc/apparmor.d/bwrap\n"
                "(Or set PRISMLAB_ALLOW_UNCONFINED_DEV=1 for local development only)"
            )
        env = os.environ.copy()
        env.update({
            "PRISMLAB_PUBLIC_GATEWAY": "1", "PRISMLAB_ON_DEMAND": "1",
            "PRISMLAB_SINGLE_ACTIVE_MODEL": "1", "PRISMLAB_GPU_LAYERS": "0",
            "PRISMLAB_MODEL_DIR": str(MODELS), "PRISMLAB_LLAMA_SERVER": str(LLAMA / "llama-server"),
            "PRISMLAB_TEXT_MODEL_PATH": str(MODELS / "LFM3-1.7B-Q4_K_M.gguf"),
            "PRISMLAB_TEXT_ROUTER_URL": "http://127.0.0.1:8080",
            "PRISMLAB_MULTIMODAL_ROUTER_URL": "http://127.0.0.1:8188",
            "PRISMLAB_TEXT_RUNTIME_API_KEY": INTERNAL.read_text().strip(),
            "PRISMLAB_TEXT_RUNTIME_API_KEY_FILE": str(INTERNAL),
            "PRISMLAB_SESSION_SECRET": SECRET.read_text().strip(),
            "PRISMLAB_ALLOWED_ORIGINS": _origin(),
            "PRISMLAB_WAITING_LIMIT": os.getenv("PRISMLAB_WAITING_LIMIT", "3"),
            "PRISMLAB_VISITOR_LIMIT": os.getenv("PRISMLAB_VISITOR_LIMIT", "1000000"),
            "PRISMLAB_COMPUTE_BUDGET_S": os.getenv("PRISMLAB_COMPUTE_BUDGET_S", "864000.0"),
            "PRISMLAB_RATE_WINDOW_S": os.getenv("PRISMLAB_RATE_WINDOW_S", "600"),
            "LD_LIBRARY_PATH": str(LLAMA),
            "PRISMLAB_TEXT_CPU_THREADS": os.getenv("PRISMLAB_TEXT_CPU_THREADS", "6"),
            "PRISMLAB_RETAIN_TEXT_WARM": "1",
            "HOME": str(STATE), "PYTHONPATH": str(ROOT),
        })
        command = [
            str(VENV / "bin/python"), "-m", "uvicorn", "prismlab.public_gateway:app",
            "--host", "127.0.0.1", "--port", "8000", "--workers", "1", "--no-access-log",
        ]
    return env, command


def _wait_for_tailscale(timeout: int = 30) -> bool:
    if not shutil.which("tailscale"):
        return False
    deadline = time.time() + timeout
    while time.time() < deadline:
        res = subprocess.run(["tailscale", "status"], capture_output=True, text=True)
        if res.returncode == 0 and "100." in res.stdout:
            return True
        time.sleep(1)
    return False


def start() -> None:
    preflight()
    if _pid():
        print("Gateway already running")
        return
    with socket.socket() as sock:
        if sock.connect_ex(("127.0.0.1", 8000)) == 0:
            raise RuntimeError("Port 8000 is occupied by an unmanaged process")
    STATE.mkdir(mode=0o700, exist_ok=True)
    STATE.chmod(0o700)
    _ensure_file(SECRET)
    _ensure_file(INTERNAL)
    _wait_for_tailscale(10)
    env, command = _build_command()
    with (STATE / "gateway.log").open("ab") as log:
        proc = subprocess.Popen(command, env=env, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
    for _ in range(60):
        if proc.poll() is not None:
            raise RuntimeError("Gateway exited; see .prismlab-local/gateway.log")
        try:
            if _get("/healthz").get("status") == "ok":
                PID.write_text(str(proc.pid))
                PID.chmod(0o600)
                print("Local gateway healthy;", _get("/readyz"))
                break
        except (URLError, TimeoutError, OSError):
            time.sleep(0.5)
    else:
        os.killpg(proc.pid, signal.SIGTERM)
        raise RuntimeError("Gateway did not become healthy")
    if _origin():
        _start_funnel()


def run() -> None:
    preflight()
    with socket.socket() as sock:
        if sock.connect_ex(("127.0.0.1", 8000)) == 0:
            raise RuntimeError("Port 8000 is occupied by an unmanaged process")
    STATE.mkdir(mode=0o700, exist_ok=True)
    STATE.chmod(0o700)
    _ensure_file(SECRET)
    _ensure_file(INTERNAL)
    _wait_for_tailscale(30)
    if _origin():
        _start_funnel()
    env, command = _build_command()
    PID.write_text(str(os.getpid()))
    PID.chmod(0o600)
    print("Starting PrismLab gateway in foreground under supervision...")
    os.execvpe(command[0], command, env)


def _start_funnel() -> None:
    if not shutil.which("tailscale"):
        print("Tailscale is not installed; Funnel remains off")
        return
    status = subprocess.run(["tailscale", "funnel", "status"], capture_output=True, text=True)
    if status.returncode != 0:
        print("Tailscale is not authenticated or Funnel unavailable; Funnel remains off")
        return
    if "proxy" in status.stdout.lower():
        print("Existing Funnel configuration detected; preserving active forwarding")
        return
    if not _origin() or not SECRET.exists() or _get("/readyz").get("ready") is not True:
        print("Security preflight incomplete; Funnel remains off")
        return
    result = subprocess.run(["tailscale", "funnel", "--bg", "8000"], capture_output=True, text=True, timeout=30)
    if result.returncode != 0:
        err = (result.stderr or result.stdout).strip()
        if "serve config denied" in err or "operator" in err:
            print("Funnel requires operator permissions. Run once: sudo tailscale set --operator=$USER (or sudo tailscale funnel --bg 8000)")
        else:
            print("Funnel activation needs Tailscale approval:", err)
        return
    (STATE / "funnel-owned").write_text("443\n")
    print((result.stdout or result.stderr).strip())


def stop() -> None:
    if (STATE / "funnel-owned").exists() and shutil.which("tailscale"):
        result = subprocess.run(["tailscale", "funnel", "--https=443", "off"], capture_output=True, text=True)
        if result.returncode == 0:
            (STATE / "funnel-owned").unlink()
        else:
            print("Funnel shutdown failed:", (result.stderr or result.stdout).strip())
    pid = _pid()
    if pid:
        os.killpg(pid, signal.SIGTERM)
        for _ in range(20):
            if not _process(pid):
                break
            time.sleep(0.1)
        try:
            os.killpg(pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        print("Stopped gateway process group", pid)
    else:
        print("No owned gateway process running")
    PID.unlink(missing_ok=True)


def status() -> None:
    # Check systemd user service status
    systemd_state = "unknown"
    if shutil.which("systemctl"):
        res = subprocess.run(["systemctl", "--user", "is-active", "prismlab-inference"], capture_output=True, text=True)
        systemd_state = res.stdout.strip() if res.returncode == 0 else "inactive"
    print("Systemd Service:", systemd_state)
    pid = _pid()
    print("Gateway Process:", f"running (PID: {pid})" if pid else ("active (systemd)" if systemd_state == "active" else "stopped"))
    funnel_status = "off"
    if shutil.which("tailscale"):
        res = subprocess.run(["tailscale", "funnel", "status"], capture_output=True, text=True)
        if "proxy" in res.stdout.lower() or "funnel on" in res.stdout.lower():
            funnel_status = "active (public forwarding)"
    print("Tailscale Funnel:", funnel_status)
    try:
        health = _get("/healthz")
        if health.get("status") == "ok":
            state = _get("/local-api/status", authenticated=True)
            print("Available models:", ", ".join(state.get("on_demand_routes", [])))
            print("Queue:", state.get("queue"))
    except (URLError, TimeoutError, OSError, ValueError) as exc:
        if pid or systemd_state == "active":
            print("Health check failed:", type(exc).__name__)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("preflight", "start", "run", "stop", "status"))
    try:
        globals()[parser.parse_args().action]()
    except (RuntimeError, OSError, ValueError) as error:
        parser.exit(1, f"{error}\n")

