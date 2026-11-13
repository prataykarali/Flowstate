import torch
from torch.func import jvp

def f(x):
    x1,x2=x
    return torch.stack([x1**2 +3*x2, x1*x2])

x=torch.tensor([2.0,1.0])
v= torch.tensor([2.0,-1.0])


y, tangent = jvp(f, (x,), (v,))

print("Output:", y)
print("JVP:", tangent)
