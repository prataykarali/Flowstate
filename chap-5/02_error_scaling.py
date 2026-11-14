"""Ch 5.2: Compare global errors at the SAME final time T=0.2."""

from dynamics import decay_dynamics, exact_decay
from solvers import euler_step, rk2_step, solve


def main() -> None:
    T = 0.2
    print("dt      Euler error    RK2 error     Euler ratio  RK2 ratio")
    previous_euler = previous_rk2 = None
    for dt in [0.2, 0.1, 0.05, 0.025]:
        e = abs(solve(euler_step, decay_dynamics, dt, T) - exact_decay(T))
        r2 = abs(solve(rk2_step, decay_dynamics, dt, T) - exact_decay(T))
        er = "—" if previous_euler is None else f"{previous_euler/e:6.3f}"
        rr = "—" if previous_rk2 is None else f"{previous_rk2/r2:6.3f}"
        print(f"{dt:.3f}   {e:.8f}     {r2:.8f}      {er:>6}       {rr:>6}")
        previous_euler, previous_rk2 = e, r2
    print("Expected as dt gets small: ratios approach ~2 for Euler and ~4 for RK2.")


if __name__ == "__main__":
    main()
