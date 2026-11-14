"""Ch 5.5: Stability vs accuracy at T=3 for the scalar decay ODE."""

from dynamics import decay_dynamics, exact_decay
from solvers import euler_step, rk2_step, rk4_step, solve


def stability_multiplier(name: str, dt: float) -> float:
    """For dh/dt=-2h, one numerical step multiplies h by R(z), z=-2dt."""
    z = -2.0 * dt
    if name == "Euler":
        return 1 + z
    if name == "RK2":
        return 1 + z + z*z/2
    if name == "RK4":
        return 1 + z + z*z/2 + z*z*z/6 + z*z*z*z/24
    raise ValueError(name)


def status(multiplier: float) -> str:
    if abs(abs(multiplier) - 1) < 1e-12:
        return "marginal"
    return "decays" if abs(multiplier) < 1 else "diverges"


if __name__ == "__main__":
    T = 3.0
    methods = [("Euler", euler_step), ("RK2", rk2_step), ("RK4", rk4_step)]
    print("dt      Euler       RK2        RK4")
    for dt in [0.1, 0.6, 1.0, 1.5]:
        values = [solve(method, decay_dynamics, dt, T) for _, method in methods]
        print(f"{dt:.1f}    {values[0]:>9.5f}  {values[1]:>9.5f}  {values[2]:>9.5f}")
        desc = ", ".join(f"{name}: {status(stability_multiplier(name,dt))}" for name, _ in methods)
        print("       ", desc)
    print("Exact:", exact_decay(T))
    print("Note: stability describes behavior over repeated steps; it does not guarantee accuracy.")
