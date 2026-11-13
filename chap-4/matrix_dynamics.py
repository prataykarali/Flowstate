import torch
dtype= torch.float64

A=torch.tensor([[0.8,0.2],[0.1,0.5]],dtype=dtype)
h=torch.tensor([10.0,6.0],dtype=dtype)
print("step 0",h.tolist())

for t in range(1,11):
    h=A@h
    print(f"Step {t}:", h.tolist())

eigen=torch.linalg.eigvals(A)
spec=eigen.abs().max().item()

print("\nEigenvalues:", eigen)
print("Spectral radius:", spec)

if spec < 1:
    print("Asymptotically stable")
elif spec > 1:
    print("Unstable")
else:
    print("Boundary case: further analysis needed")