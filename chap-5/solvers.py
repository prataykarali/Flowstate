"""Hand-written explicit numerical integrators for FlowState Chapter 5.

Each step(dynamics, t, h, dt) advances ONE numerical step. A step function
receives dynamics explicitly; never swap the ODE halfway through a comparison.
"""

import math
from typing import Callable

Dynamics = Callable[[float, float], float]
StepFunction = Callable[[Dynamics, float, float, float], float]


def euler_step(dynamics: Dynamics, t: float, h: float, dt: float) -> float:
    return h + dt * dynamics(t, h)


def rk2_step(dynamics: Dynamics, t: float, h: float, dt: float) -> float:
    """Explicit midpoint RK2: k2 evaluates time t+dt/2."""
    k1 = dynamics(t, h)
    h_mid = h + (dt / 2.0) * k1
    k2 = dynamics(t + dt / 2.0, h_mid)
    return h + dt * k2


def rk4_step(dynamics: Dynamics, t: float, h: float, dt: float) -> float:
    """Classical RK4: beginning, midpoint, midpoint, endpoint."""
    k1 = dynamics(t, h)
    k2 = dynamics(t + dt / 2.0, h + (dt / 2.0) * k1)
    k3 = dynamics(t + dt / 2.0, h + (dt / 2.0) * k2)
    k4 = dynamics(t + dt, h + dt * k3)  # ENDPOINT, not midpoint!
    return h + (dt / 6.0) * (k1 + 2.0 * k2 + 2.0 * k3 + k4)


def solve(
    step_fn: StepFunction,
    dynamics: Dynamics,
    dt: float,
    T: float = 0.2,
    h0: float = 1.0,
    t0: float = 0.0,
) -> float:
    """Advance h from t0 to T using a fixed dt; require an integer # steps."""
    if dt <= 0 or T < t0:
        raise ValueError("Require dt > 0 and T >= t0")
    steps = round((T - t0) / dt)
    if not math.isclose(steps * dt, T - t0, rel_tol=0.0, abs_tol=1e-12):
        raise ValueError("dt must divide the time interval for this fixed-step lab")

    h = h0
    for i in range(steps):
        t = t0 + i * dt
        h = step_fn(dynamics, t, h, dt)
    return h
