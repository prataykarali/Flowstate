"""Ch 5.6 starter: Count actual calls to the ODE, then compare errors.

This measures number of function evaluations (NFE), NOT wall-clock latency.
"""

from dynamics import decay_dynamics, exact_decay
from solvers import euler_step, rk2_step, rk4_step, solve


class CountedDynamics:
    def __init__(self, fn):
        self.fn = fn
        self.calls = 0

    def __call__(self, t, h):
        self.calls += 1
        return self.fn(t, h)


def run_experiment(name, solver, dt, T=1.0):
    counted = CountedDynamics(decay_dynamics)
    estimate = solve(solver, counted, dt, T=T)
    error = abs(exact_decay(T) - estimate)
    return name, round(T/dt), counted.calls, estimate, error


if __name__ == "__main__":
    # Fair NFE comparison: 20 calls for both of these configurations.
    experiments = [
        ("Euler", euler_step, 0.05),
        ("RK4", rk4_step, 0.2),
        ("RK2", rk2_step, 0.1),
    ]
    print("Method   dt     steps   actual_NFE  estimate     absolute_error")
    for name, solver, dt in experiments:
        label, steps, nfe, estimate, error = run_experiment(name, solver, dt)
        print(f"{label:6}  {dt:4.2f}  {steps:5}  {nfe:11}  {estimate:.9f}  {error:.9f}")
    print("No runtime claims: for real models we must additionally time repeated runs.")
