
import torch
import torch.nn as nn
from cfc_cell import TinyCfC

class SequenceCfC(nn.Module):
    def __init__(self):
        super().__init__()
        self.cell = TinyCfC(1, 4)
        self.readout = nn.Linear(4, 1)

    def forward(self, inputs, dts):
        state = torch.zeros(1, 4)
        predictions = []

        for u_t, dt_t in zip(inputs, dts):
            u_batch = u_t.reshape(1, 1)
            dt_batch = dt_t.reshape(1, 1)
            state, alpha = self.cell(state, u_batch, dt_batch)  
            y_hat = self.readout(state).squeeze()
            predictions.append(y_hat)

        return torch.stack(predictions)

if __name__ == "__main__":
    model = SequenceCfC()

    inputs = torch.tensor([0., 1., 1., 0., 1., 0.])
    dts = torch.tensor([0.1, 0.5, 1.0, 0.25, 0.8, 0.2])

    predictions = model(inputs, dts)

    targets = torch.tensor([
    0.0000, 0.3935, 0.7769,
    0.6050, 0.8225, 0.6734
    ])

    loss=((targets-predictions)**2).mean()

    optimizer = torch.optim.Adam(model.parameters(), lr=0.01)

    # Measure before training
    initial_loss = ((model(inputs, dts) - targets) ** 2).mean().item()

    optimizer = torch.optim.Adam(model.parameters(), lr=0.01)

    for step in range(101):
        optimizer.zero_grad()

        predictions = model(inputs, dts)
        loss = ((predictions - targets) ** 2).mean()

        loss.backward()
        optimizer.step()

        if step % 20 == 0:
            print(f"Step {step}: MSE = {loss.item():.6f}")

# Measure after training
    with torch.no_grad():
        final_predictions = model(inputs, dts)
        final_loss = ((final_predictions - targets) ** 2).mean().item()

    print("Initial MSE:", initial_loss)
    print("Final MSE:", final_loss)
    print("Final predictions:", final_predictions)

    assert final_predictions.shape == (6,)
    assert torch.isfinite(final_predictions).all()

    print("Training and shape checks: PASS")

    # Chapter 7.10 — Held-out sequence

    test_inputs = torch.tensor([1., 0., 1., 1., 0., 0., 1., 0.])
    test_dts = torch.tensor([0.3, 0.75, 0.45, 1.3,
                         0.1, 0.9, 0.6, 0.4])

# Generate targets using the analytical system
    y = torch.tensor(0.0)
    test_targets = []

    for u, dt in zip(test_inputs, test_dts):
        y = u + (y - u) * torch.exp(-dt)
        test_targets.append(y)

    test_targets = torch.stack(test_targets)

# Evaluate without updating weights
    model.eval()

    with torch.no_grad():
        test_predictions = model(test_inputs, test_dts)
        test_mse = ((test_predictions - test_targets) ** 2).mean()

    print("Test targets:", test_targets)
    print("Test predictions:", test_predictions)
    print("Unseen sequence MSE:", test_mse.item())

    # Constant baseline: uses training targets only
    baseline_value = targets.mean()

    baseline_predictions = torch.full_like(
        test_targets,
        baseline_value.item()
        )

    baseline_mse = (
        (baseline_predictions - test_targets) ** 2
    ).mean()

    print("Constant baseline MSE:", baseline_mse.item())
    print("CfC held-out MSE:", test_mse.item())

    total_params = sum(
    p.numel() for p in model.parameters()
    )

    print("CfC model parameters:", total_params)
