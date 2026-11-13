"""FlowState Ch4 — Four linear stability cases.

Run: python stability_cases.py
Output: plots/stability_cases.png
"""
from pathlib import Path
import numpy as np
import matplotlib.pyplot as plt

CASES = {
    "Decay (0.8)": np.diag([0.8, 0.5]),
    "Persistence (1.0)": np.diag([1.0, 0.5]),
    "Oscillation (-0.8)": np.diag([-0.8, 0.5]),
    "Instability (1.2)": np.diag([1.2, 0.5]),
}
INITIAL_STATE = np.array([1.0, 0.0])
STEPS = 15


def trajectory(A, h0, steps):
    states = [h0.copy()]
    h = h0.copy()
    for _ in range(steps):
        h = A @ h
        states.append(h.copy())
    return np.asarray(states)


def main():
    output = Path("plots/stability_cases.png")
    output.parent.mkdir(parents=True, exist_ok=True)

    fig, axes = plt.subplots(2, 2, figsize=(10, 7), sharex=True)
    for ax, (name, A) in zip(axes.flat, CASES.items()):
        states = trajectory(A, INITIAL_STATE, STEPS)
        radius = max(abs(np.linalg.eigvals(A)))
        ax.plot(np.arange(STEPS + 1), states[:, 0], marker=".", label="state 1")
        ax.axhline(0, linewidth=0.8)
        ax.set_title(f"{name}; spectral radius = {radius:.2f}")
        ax.set_xlabel("Step")
        ax.set_ylabel("Hidden state")
        ax.grid(alpha=0.3)
        ax.legend()
        print(f"{name}: rho={radius:.3f}; h[15]={states[-1].tolist()}")
    fig.suptitle("FlowState Ch4: Decay, Persistence, Oscillation, Instability")
    fig.tight_layout()
    fig.savefig(output, dpi=160)
    print(f"Saved: {output}")


if __name__ == "__main__":
    main()
