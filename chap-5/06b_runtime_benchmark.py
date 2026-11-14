
import time
from statistics import median

from dynamics import decay_dynamics
from solvers import euler_step, rk2_step, rk4_step, solve

experiments = [
    ("Euler", euler_step, 0.05),
    ("RK2", rk2_step, 0.10),
    ("RK4", rk4_step, 0.20),
]

def benchmark(solver, dt):
    # Warm up
    for _ in range(200):
        solve(solver, decay_dynamics, dt, T=1.0)

    measurements = []

    # Seven independent batches
    for _ in range(7):
        start = time.perf_counter()

        for _ in range(2000):
            solve(solver, decay_dynamics, dt, T=1.0)

        elapsed = time.perf_counter() - start
        microseconds = elapsed * 1_000_000 / 2000
        measurements.append(microseconds)

    return median(measurements), min(measurements), max(measurements)


print("Solver   Median_us   Min_us   Max_us")

for name, solver, dt in experiments:
    med, low, high = benchmark(solver, dt)
    print(f"{name:6}   {med:9.3f}  {low:7.3f}  {high:7.3f}")
