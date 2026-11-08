"""Single-worker admission control for a VPS inference gateway.

This queue is intentionally process-local: run exactly one ASGI worker per VPS instance.
"""
from __future__ import annotations

import asyncio
import os
import time
from collections import deque
from dataclasses import dataclass, field

from fastapi import HTTPException


@dataclass(eq=False)
class Ticket:
    visitor: str
    ready: asyncio.Event = field(default_factory=asyncio.Event)
    cancelled: bool = False
    released: bool = False


class AdmissionQueue:
    def __init__(self, waiting_limit: int = 3, per_visitor_limit: int = 60,
                 rate_window_s: int = 600, wait_timeout_s: int = 600,
                 compute_budget_s: float = 300.0):
        self.waiting_limit = waiting_limit
        self.per_visitor_limit = per_visitor_limit
        self.rate_window_s = rate_window_s
        self.wait_timeout_s = wait_timeout_s
        self.compute_budget_s = compute_budget_s
        self._lock = asyncio.Lock()
        self._active: Ticket | None = None
        self._waiting: deque[Ticket] = deque()
        self._pending: dict[str, int] = {}
        self._calls: dict[str, deque[float]] = {}
        self._compute_history: dict[str, deque[tuple[float, float]]] = {}

    @classmethod
    def from_env(cls) -> "AdmissionQueue":
        return cls(
            waiting_limit=max(0, min(32, int(os.getenv("PRISMLAB_WAITING_LIMIT", "3")))),
            per_visitor_limit=max(1, int(os.getenv("PRISMLAB_VISITOR_LIMIT", "60"))),
            rate_window_s=max(1, int(os.getenv("PRISMLAB_RATE_WINDOW_S", "600"))),
            wait_timeout_s=max(1, int(os.getenv("PRISMLAB_WAIT_TIMEOUT_S", "600"))),
            compute_budget_s=max(10.0, float(os.getenv("PRISMLAB_COMPUTE_BUDGET_S", "300.0"))),
        )

    def _dec_pending(self, visitor: str) -> None:
        if visitor in self._pending:
            self._pending[visitor] -= 1
            if self._pending[visitor] <= 0:
                self._pending.pop(visitor, None)

    async def get_visitor_compute_status(self, visitor: str) -> dict:
        async with self._lock:
            now = time.monotonic()
            compute_hist = self._compute_history.setdefault(visitor, deque())
            while compute_hist and now - compute_hist[0][0] >= self.rate_window_s:
                compute_hist.popleft()
            used_compute = sum(d for _, d in compute_hist)
            remaining_compute = max(0.0, self.compute_budget_s - used_compute)

            cooldown_s = 0
            if used_compute >= self.compute_budget_s:
                remaining_excess = used_compute - self.compute_budget_s
                cleared = 0.0
                for ts, dur in compute_hist:
                    cleared += dur
                    if cleared > remaining_excess:
                        cooldown_s = max(1, int(self.rate_window_s - (now - ts) + 1))
                        break
                if cooldown_s == 0 and compute_hist:
                    cooldown_s = max(1, int(self.rate_window_s - (now - compute_hist[0][0]) + 1))

            return {
                "visitor_id": visitor,
                "compute_budget_s": round(self.compute_budget_s, 1),
                "compute_used_s": round(used_compute, 2),
                "compute_remaining_s": round(remaining_compute, 2),
                "rate_window_s": self.rate_window_s,
                "cooldown_s": cooldown_s,
                "is_rate_limited": used_compute >= self.compute_budget_s,
            }

    async def admit(self, visitor: str) -> Ticket:
        async with self._lock:
            # Allow at most 1 active and 1 pending queued request per visitor
            if self._pending.get(visitor, 0) >= 2:
                raise HTTPException(429, "One active and at most one pending request allowed per visitor",
                                    headers={"Retry-After": "5"})
            now = time.monotonic()
            if len(self._calls) > 512:
                self._calls = {key: history for key, history in self._calls.items()
                               if history and now - history[-1] < self.rate_window_s}
                while len(self._calls) > 4096:
                    self._calls.pop(next(iter(self._calls)))
            calls = self._calls.setdefault(visitor, deque())
            while calls and now - calls[0] >= self.rate_window_s:
                calls.popleft()
            if len(calls) >= self.per_visitor_limit:
                call_cooldown = max(1, int(self.rate_window_s - (now - calls[0]) + 1))
                raise HTTPException(429, "Visitor request rate limit reached; try again later",
                                    headers={"Retry-After": str(call_cooldown)})

            # Check rolling compute budget in execution seconds
            compute_hist = self._compute_history.setdefault(visitor, deque())
            while compute_hist and now - compute_hist[0][0] >= self.rate_window_s:
                compute_hist.popleft()
            used_compute = sum(d for _, d in compute_hist)
            if used_compute >= self.compute_budget_s:
                remaining_excess = used_compute - self.compute_budget_s
                cooldown_s = self.rate_window_s
                cleared = 0.0
                for ts, dur in compute_hist:
                    cleared += dur
                    if cleared > remaining_excess:
                        cooldown_s = max(1, int(self.rate_window_s - (now - ts) + 1))
                        break
                raise HTTPException(
                    429,
                    f"Visitor compute budget of {int(self.compute_budget_s)}s reached; try again later",
                    headers={
                        "Retry-After": str(cooldown_s),
                        "X-Compute-Budget": str(int(self.compute_budget_s)),
                        "X-Compute-Used": str(round(used_compute, 1)),
                        "X-Compute-Remaining": "0",
                    }
                )

            if self._active is not None and len(self._waiting) >= self.waiting_limit:
                raise HTTPException(503, "Inference queue is full; try again shortly", headers={"Retry-After": "30"})

            calls.append(now)
            ticket = Ticket(visitor)
            self._pending[visitor] = self._pending.get(visitor, 0) + 1
            if self._active is None:
                self._active = ticket
                ticket.ready.set()
            else:
                self._waiting.append(ticket)
            return ticket

    async def record_compute(self, visitor: str, duration_s: float) -> None:
        async with self._lock:
            now = time.monotonic()
            hist = self._compute_history.setdefault(visitor, deque())
            hist.append((now, max(0.0, duration_s)))

    async def position(self, ticket: Ticket) -> int:
        async with self._lock:
            if ticket is self._active:
                return 0
            try:
                # Calculate position skipping any cancelled tickets ahead of it
                active_waiting = [t for t in self._waiting if not t.cancelled]
                return active_waiting.index(ticket) + 1
            except ValueError:
                return -1

    async def cancel(self, ticket: Ticket) -> bool:
        """Cancel a ticket. If queued, remove immediately and release ownership slot.
        If active, mark cancelled; worker must confirm termination before release."""
        async with self._lock:
            if ticket.released:
                return False
            ticket.cancelled = True
            if ticket in self._waiting:
                try:
                    self._waiting.remove(ticket)
                except ValueError:
                    pass
                ticket.released = True
                self._dec_pending(ticket.visitor)
                return True
            if ticket is self._active:
                return True
            return False

    async def release(self, ticket: Ticket) -> None:
        async with self._lock:
            if ticket.released:
                return
            ticket.released = True
            self._dec_pending(ticket.visitor)
            if ticket is self._active:
                self._active = None
                while self._waiting:
                    candidate = self._waiting.popleft()
                    if not candidate.cancelled:
                        self._active = candidate
                        candidate.ready.set()
                        break
                    else:
                        candidate.released = True
                        self._dec_pending(candidate.visitor)
            else:
                try:
                    self._waiting.remove(ticket)
                except ValueError:
                    pass

    async def snapshot(self) -> dict[str, int]:
        async with self._lock:
            waiting_count = sum(1 for t in self._waiting if not t.cancelled)
            return {"active": int(self._active is not None and not self._active.cancelled),
                    "waiting": waiting_count,
                    "waiting_limit": self.waiting_limit}
