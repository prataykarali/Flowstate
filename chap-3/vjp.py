import torch
x=torch.tensor(3.0,requires_grad=True)
u=2*x
y=u**2
y.backward()

print("Forward output:", y.item())
print("Gradient dy/dx:", x.grad.item())