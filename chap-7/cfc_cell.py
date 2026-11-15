import torch
import torch.nn as nn

class TinyCfC(nn.Module):
    def __init__(self, input_dim=1, hidden_dim=4):
        super().__init__()

        self.backbone=nn.Sequential(nn.Linear(input_dim+hidden_dim,16), nn.Tanh())
        self.f= nn.Linear(16, hidden_dim)
        self.g=nn.Linear(16, hidden_dim)
        self.h=nn.Linear(16, hidden_dim)

    def forward(self,x,u,dt):
        z=self.backbone(torch.cat([x,u], dim=-1))
        f=self.f(z)
        g=torch.tanh(self.g(z))
        h=torch.tanh(self.h(z))
        alpha=torch.sigmoid(-f*dt)
        x_next=alpha*g+(1-alpha)*h
        return x_next, alpha

torch.manual_seed(42)
model=TinyCfC()
x=torch.zeros(1,4)
u=torch.ones(1,1)

dt_short = torch.tensor([[0.1]])
dt_long = torch.tensor([[2.0]])

y_short, gate_short = model(x, u, dt_short)
y_long, gate_long = model(x, u, dt_long)

print("Short interval state:", y_short)
print("Long interval state:", y_long)
print("Short interval gate:", gate_short)
print("Long interval gate:", gate_long)

assert y_short.shape == (1, 4)
assert y_long.shape == (1, 4)

loss = y_long.square().mean()
loss.backward()

assert all(p.grad is not None for p in model.parameters())
print("Shape and gradient checks: PASS")
