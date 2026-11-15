import torch
def update(y,u,dt,rate=1.0):
    y_next=u+(y-u)*torch.exp(-rate*dt)
    return y_next
rate=1.0
y=torch.tensor(0.0)
u=torch.tensor(1.0)

short=update(y,u,torch.tensor(0.1))
long=update(y,u,torch.tensor(2.0))

print("Short interval:", short.item())
print("Long interval:", long.item())

assert torch.isclose(short, torch.tensor(0.09516258), atol=1e-6)
assert torch.isclose(long, torch.tensor(0.86466472), atol=1e-6)

print("Analytical target checks: PASS")

inputs = torch.tensor([0., 1., 1., 0., 1., 0.])
dts = torch.tensor([0.1, 0.5, 1.0, 0.25, 0.8, 0.2])

y = torch.tensor(0.0)
targets = []

for u_t, dt_t in zip(inputs,dts):
    y_next=u_t+(y-u_t)*torch.exp(-rate*dt_t)
    targets.append(y_next)
    y=y_next

targets = torch.stack(targets)

print("Target sequence:", targets)
print("Shape:", targets.shape)



assert torch.isclose(
    targets[2],
    torch.tensor(0.77687),
    atol=1e-4
)