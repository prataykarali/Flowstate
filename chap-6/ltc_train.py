
import math
import torch
from torch import nn

torch.manual_seed(42)

class LiquidNeuron(nn.Module):
    def __init__(self):
        super().__init__()

        self.log_tau = nn.Parameter(
            torch.tensor(math.log(2.0))
        )
        self.w_x = nn.Parameter(torch.tensor(0.5))
        self.w_u = nn.Parameter(torch.tensor(1.0))
        self.bias = nn.Parameter(
            torch.tensor(math.log(0.4 / 0.6))
        )
        self.A = nn.Parameter(torch.tensor(1.0))

    def forward(self, x, u, dt=0.1):
        tau = torch.exp(self.log_tau)

        gate = torch.sigmoid(
            self.w_x * x + self.w_u * u + self.bias
        )

        dxdt = -x / tau + gate * (self.A - x)

        return x + dt * dxdt


# Step 1: Create the input sequence
inputs = torch.zeros(80)
inputs[10:30] = 1.0
inputs[45:65] = 1.0

# Step 2: Create target outputs
with torch.no_grad():
    target = []
    y = torch.tensor(0.0)

    for u in inputs:
        y = 0.85 * y + 0.15 * u
        target.append(y)

    targets = torch.stack(target)


# Step 3: Initialize model and optimizer
model = LiquidNeuron()
optimizer = torch.optim.Adam(
    model.parameters(), lr=0.03
)

# Step 4: Training
for epoch in range(201):

    x = torch.tensor(0.0)
    predictions = []

    for u in inputs:
        x = model(x, u)
        predictions.append(x)

    predictions = torch.stack(predictions)

    # Mean squared error
    loss = ((predictions - targets) ** 2).mean()

    optimizer.zero_grad()
    loss.backward()

    torch.nn.utils.clip_grad_norm_(
        model.parameters(), 1.0
    )

    optimizer.step()

    if epoch % 50 == 0:
        print(
            f"Epoch {epoch:3d} | "
            f"MSE: {loss.item():.6f}"
        )

print("\nLearned parameters:")
print("tau:", torch.exp(model.log_tau).item())
print("w_u:", model.w_u.item())
print("w_x:", model.w_x.item())
print("A:", model.A.item())


import matplotlib.pyplot as plt

# New sequence, never used during training
test_inputs = torch.zeros(80)
test_inputs[5:15] = 1.0
test_inputs[30:60] = 1.0
test_inputs[70:77] = 1.0

# Generate the expected filtered response
test_target = []
y = torch.tensor(0.0)

for u in test_inputs:
    y = 0.85 * y + 0.15 * u
    test_target.append(y)

test_target = torch.stack(test_target)

# Evaluate the trained neuron without gradients
model.eval()

with torch.no_grad():
    x = torch.tensor(0.0)
    test_predictions = []

    for u in test_inputs:
        x = model(x, u)
        test_predictions.append(x)

    test_predictions = torch.stack(test_predictions)

    test_mse = (
        (test_predictions - test_target) ** 2
    ).mean()

print(f"\nUnseen sequence MSE: {test_mse.item():.6f}")

plt.figure(figsize=(10, 4))
plt.plot(test_target.numpy(), label="Target")
plt.plot(
    test_predictions.numpy(),
    "--", label="LTC prediction"
)
plt.plot(
    test_inputs.numpy(),
    ":", alpha=0.5, label="Input"
)
plt.title("LTC Generalization Test")
plt.xlabel("Time step")
plt.ylabel("Value")
plt.legend()
plt.grid(True)
plt.tight_layout()
plt.savefig("ltc_generalization.png", dpi=150)
plt.show()
