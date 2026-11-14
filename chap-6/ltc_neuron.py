
import math
import torch
from torch import nn
import matplotlib.pyplot as plt


class LiquidNeuron(nn.Module):
    def __init__(self):
        super().__init__()

        # Learnable base time constant, initially tau = 2
        self.log_tau = nn.Parameter(
            torch.tensor(math.log(2.0))
        )

        # Learnable gate parameters
        self.w_x = nn.Parameter(torch.tensor(0.5))
        self.w_u = nn.Parameter(torch.tensor(3.0))
        self.bias = nn.Parameter(
            torch.tensor(math.log(0.4 / 0.6))
        )

        # Learnable driving parameter
        self.A = nn.Parameter(torch.tensor(1.0))

    def forward(self, x, u, dt=0.1):
        tau = torch.exp(self.log_tau)

        # Input-dependent nonlinear gate: 0 < f < 1
        gate = torch.sigmoid(
            self.w_x * x + self.w_u * u + self.bias
        )

        # LTC differential equation
        dxdt = -x / tau + gate * (self.A - x)

        # Euler integration (Chapter 5)
        x_next = x + dt * dxdt

        # Effective time constant
        tau_eff = 1.0 / (1.0 / tau + gate)

        return x_next, gate, tau_eff, dxdt


torch.manual_seed(42)
neuron = LiquidNeuron()

x = torch.tensor(0.0)
states, gates, taus, inputs = [], [], [], []

# Input pulse: OFF -> ON -> OFF
with torch.no_grad():
    for step in range(40):
        u = torch.tensor(
            1.0 if 10 <= step < 25 else 0.0
        )

        x, gate, tau_eff, dxdt = neuron(x, u)
        if step in [9, 10, 24, 25]:
         print(
         f"Step {step}: "
         f"input={u.item():.0f}, "
         f"gate={gate.item():.4f}, "
         f"tau_eff={tau_eff.item():.4f}, "
         f"x={x.item():.4f}"
          )

        states.append(x.item())
        gates.append(gate.item())
        taus.append(tau_eff.item())
        inputs.append(u.item())

        if step == 0:
            print("First step:")
            print(f"dx/dt   = {dxdt.item():.5f}")
            print(f"x_next  = {x.item():.5f}")
            print(f"tau_eff = {tau_eff.item():.5f}")

print(f"\nFinal hidden state: {x.item():.5f}")

plt.figure(figsize=(9, 4))
plt.plot(states, label="Liquid hidden state")
plt.step(
    range(40), inputs, where="post",
    linestyle="--", label="External input"
)
plt.xlabel("Simulation step")
plt.ylabel("Value")
plt.title("Liquid Neuron: Response to Input Changes")
plt.legend()
plt.grid(True)
plt.tight_layout()
plt.savefig("ltc_response.png", dpi=150)
plt.show()
