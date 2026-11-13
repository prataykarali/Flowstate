
import torch

torch.manual_seed(42)

# Training examples
x = torch.tensor([0., 1., 2., 3., 4., 5.])

target_a = torch.tensor([0.9, 0.9, 0.9, 0.2, 0.2, 0.2])
target_b = torch.tensor([0.1, 0.1, 0.1, 0.9, 0.9, 0.9])

# Four trainable parameters
wa = torch.nn.Parameter(torch.tensor(0.0))
ca = torch.nn.Parameter(torch.tensor(0.0))
wb = torch.nn.Parameter(torch.tensor(0.0))
cb = torch.nn.Parameter(torch.tensor(0.0))

optimizer = torch.optim.Adam([wa, ca, wb, cb], lr=0.1)

for epoch in range(301):
    optimizer.zero_grad()

    a = torch.sigmoid(wa * x + ca)
    b = torch.sigmoid(wb * x + cb)

    loss = ((a - target_a)**2 +
            (b - target_b)**2).mean()

    loss.backward()
    optimizer.step()

    if epoch % 100 == 0:
        print(f"Epoch {epoch}: Loss = {loss.item():.6f}")

print("\nLearned parameters:")
for name, param in [("wa", wa), ("ca", ca),
                    ("wb", wb), ("cb", cb)]:
    print(f"{name} = {param.item():.4f}")

print("\nPredicted gates:")
with torch.no_grad():
    for value in x:
        a = torch.sigmoid(wa * value + ca)
        b = torch.sigmoid(wb * value + cb)
        print(f"x={value.item():.0f}: "
              f"a={a.item():.3f}, b={b.item():.3f}")
