import torch
from torch.func import jacrev
def f(x):
    x1,x2=x
    y1=3*x2+x1**2
    y2=x1*x2
    return torch.stack([y1,y2])
x=torch.tensor([2.0,1.0])
J=jacrev(f)(x)
print("Jacobian")
print(J)
