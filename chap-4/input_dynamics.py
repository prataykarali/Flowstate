import torch
dtype=torch.float64

A=torch.tensor([[0.8,0.2],[0.1,0.5]],dtype=dtype)
B=torch.tensor([2.0,-1.0],dtype=dtype)

h=torch.zeros(2,dtype=dtype)

inputs=[1,0,0,0,0]

print("Initial state:", h.tolist())

for t, x in enumerate(inputs):
    x = torch.tensor(float(x), dtype=dtype)

    h = A @ h + B * x

    print(f"Step {t + 1}: input={x.item()}, state={h.tolist()}")
