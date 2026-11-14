"""Ch 5.1: Euler recurrence, step size and oscillation."""

from dynamics import decay_dynamics, exact_decay
from solvers import euler_step


def show_steps(dt: float, count: int) -> None:
    h = 1.0
    print(f"\nEuler with dt={dt:g}: h(0) = {h:.6f}")
    for n in range(count):
        t = n * dt
        h = euler_step(decay_dynamics, t, h, dt)
        print(f"  n={n + 1}  t={(n + 1) * dt:.2f}  numerical={h:.6f}  exact={exact_decay((n + 1)*dt):.6f}")


if __name__ == "__main__":
    show_steps(dt=0.1, count=3)
    show_steps(dt=1.5, count=2)  # Numerical divergence: 1 -> -2 -> 4
