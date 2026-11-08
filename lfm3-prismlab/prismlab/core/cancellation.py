"""Authoritative upstream socket cancellation registry for llama-server connections."""
from __future__ import annotations

import threading
from typing import Any

_lock = threading.Lock()
_sockets: dict[int, Any] = {}
_abort_flags: dict[int, bool] = {}


def register_upstream(ident: int, response: Any) -> None:
    with _lock:
        if _abort_flags.pop(ident, None):
            try:
                response.close()
            except Exception:
                pass
            raise RuntimeError("Request cancelled before upstream read")
        _sockets[ident] = response


def unregister_upstream(ident: int) -> None:
    with _lock:
        _sockets.pop(ident, None)
        _abort_flags.pop(ident, None)


def abort_upstream(ident: int) -> bool:
    with _lock:
        _abort_flags[ident] = True
        resp = _sockets.pop(ident, None)
        if resp is not None:
            try:
                resp.close()
                return True
            except Exception:
                pass
        return False

