"""Ch 5.3: RK2 worked example and time-argument regression tests."""

import math
from dynamics import decay_dynamics, exact_decay, time_dynamics, exact_time
from solvers import rk2_step


if __name__ == "__main__":
    h1 = rk2_step(decay_dynamics, 0.0, 1.0, 0.1)
    print(f"RK2 decay h(0.1): {h1:.12f}; exact: {exact_decay(0.1):.12f}")
    assert math.isclose(h1, 0.82, rel_tol=0, abs_tol=1e-12)

    timed = rk2_step(time_dynamics, 0.0, 0.0, 1.0)
    print(f"RK2 time-dependent h(1): {timed:.12f}; exact: {exact_time(1.0):.12f}")
    assert math.isclose(timed, 0.5, rel_tol=0, abs_tol=1e-12)
    print("Both RK2 tests PASS")
