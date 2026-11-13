import torch
from torch.func import hessian

def f(x):
    x1,x2=x
    return x1**2 + 3*x1*x2+ 2*x2**2

x=torch.tensor([1.0,2.0])
H=hessian(f)(x)

print("Hessian:\n", H)

expected = torch.tensor([
    [2.0, 3.0],
    [3.0, 4.0]
])

assert torch.allclose(H, expected)
print("Hessian verification: PASS")


eigenvalues, eigenvectors = torch.linalg.eigh(H)

print("Eigenvalues:", eigenvalues)
print("Eigenvectors:\n", eigenvectors)

# Verify H @ v = lambda * v
for i in range(2):
    v = eigenvectors[:, i]
    lam = eigenvalues[i]
    assert torch.allclose(H @ v, lam * v)

print("Eigen verification: PASS")
