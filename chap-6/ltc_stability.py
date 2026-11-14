
import math
import matplotlib.pyplot as plt

# Frozen-gate LTC example
tau = 2.0
gate = 0.5
A = 1.0
x0 = 0.0

def dxdt(x):
    return -x / tau + gate * (A - x)

def euler(x, h):
    return x + h * dxdt(x)

def rk4(x, h):
    k1 = dxdt(x)
    k2 = dxdt(x + 0.5 * h * k1)
    k3 = dxdt(x + 0.5 * h * k2)
    k4 = dxdt(x + h * k3)

    return x + h * (k1 + 2*k2 + 2*k3 + k4)/6

# Analytical solution for this fixed gate
def exact(t):
    return 0.5 * (1 - math.exp(-t))

for h in [0.1, 1.0, 2.0, 2.5]:
    x_euler = x0
    x_rk4 = x0

    print(f"\nStep size = {h}")

    for step in range(8):
        x_euler = euler(x_euler, h)
        x_rk4 = rk4(x_rk4, h)

        if step == 0:
            print(f" Euler first step: {x_euler:.5f}")
            print(f" RK4 first step:   {x_rk4:.5f}")

    print(f" Euler after 8: {x_euler:.5f}")
    print(f" RK4 after 8:   {x_rk4:.5f}")
    print(f" Exact after 8: {exact(8*h):.5f}")


# Visualize the large-step experiment
h = 2.5
times = [i*h for i in range(9)]

euler_states = [x0]
rk4_states = [x0]

for _ in range(8):
    euler_states.append(euler(euler_states[-1], h))
    rk4_states.append(rk4(rk4_states[-1], h))

exact_states = [exact(t) for t in times]

for name, states in [
    ("euler", euler_states),
    ("rk4", rk4_states)
]:
    plt.figure(figsize=(8, 4))
    plt.plot(times, states, "o-", label=name.upper())
    plt.plot(times, exact_states, "--", label="Exact")
    plt.axhline(0.5, linestyle=":", color="gray")
    plt.xlabel("Continuous time")
    plt.ylabel("Hidden state")
    plt.title(f"{name.upper()} with step size = {h}")
    plt.legend()
    plt.grid(True)
    plt.tight_layout()
    plt.savefig(f"ltc_{name}_stability.png", dpi=150)

plt.show()
    