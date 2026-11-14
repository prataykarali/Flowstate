"""Reference ODEs (what changes) for FlowState Chapter 5.

The numerical methods in solvers.py are deliberately independent of these ODEs.
"""

import math


def decay_dynamics(t: float, h: float) -> float:
    """dh/dt = -2h; t is intentionally unused."""
    return -2.0 * h


def exact_decay(t: float, h0: float = 1.0) -> float:
    """Exact solution to dh/dt=-2h with h(0)=h0."""
    return h0 * math.exp(-2.0 * t)


def time_dynamics(t: float, h: float) -> float:
    """dh/dt = t; h is intentionally unused."""
    return t


def exact_time(t: float, h0: float = 0.0, t0: float = 0.0) -> float:
    """Exact solution to dh/dt=t with h(t0)=h0."""
    return h0 + 0.5 * (t * t - t0 * t0)
