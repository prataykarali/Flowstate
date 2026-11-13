import torch
from torch.func import vjp,jacrev

def f(x):
    x1,x2=x
    return torch.stack([ x1**2 + 3*x2 , x1*x2 ])
x=torch.tensor([2.0,1.0])
v=torch.tensor([2.0,-1.0])

y,vjp_func=vjp(f,x)
r=vjp_func(v)[0]

J= jacrev(f)(x)
man=v@J

print("Jacobian:\n", J)
print("VJP:", r)
print("Matrix multiplication:", man)

assert torch.allclose(r, man)
print("VJP verification: PASS")
