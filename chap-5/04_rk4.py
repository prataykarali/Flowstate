"""Ch 5.4: RK4 slope trace + decay and time-dependent regressions."""

import math
from dynamics import decay_dynamics, exact_decay, exact_time, time_dynamics
from solvers import rk4_step


def trace_rk4(dynamics, t, h, dt):
    """Display the FOUR slopes without replacing the shared solver."""
    k1 = dynamics(t, h)
    k2 = dynamics(t + dt/2, h + dt*k1/2)
    k3 = dynamics(t + dt/2, h + dt*k2/2)
    k4 = dynamics(t + dt, h + dt*k3)
    return k1, k2, k3, k4


if __name__ == "__main__":
    print("RK4 decay slopes:", trace_rk4(decay_dynamics, 0.0, 1.0, 0.1))
    decay_est = rk4_step(decay_dynamics, 0.0, 1.0, 0.1)
    time_est = rk4_step(time_dynamics, 0.0, 0.0, 1.0)
    print("RK4 decay:", decay_est, "exact:", exact_decay(0.1))
    print("RK4 time:", time_est, "exact:", exact_time(1.0))
    assert math.isclose(decay_est, 0.8187333333333333, rel_tol=0, abs_tol=1e-12)
    assert math.isclose(time_est, 0.5, rel_tol=0, abs_tol=1e-12)
    print("Both RK4 regression tests PASS")
