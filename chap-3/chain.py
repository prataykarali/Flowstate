
import torch

x = torch.tensor([1.0, 2.0], requires_grad=True)

u = torch.tensor([2.0, 3.0]) * x
y = (u ** 2).sum()

y.backward()

print("u =", u)
print("y =", y.item())
print("Gradient =", x.grad)
