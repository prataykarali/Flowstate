import torch

# Tiny memory matrix: 2 key dimensions × 2 value dimensions
S = torch.zeros(2, 2)

k = torch.tensor([1.0, 0.0])
v = torch.tensor([2.0, 3.0])

# Example gate values
decay = 0.9
beta = 0.5

# 1. Predict value using existing memory
v_hat = k @ S

# 2. Calculate prediction error
delta = v - v_hat

# 3. Update memory state
S = decay * S + beta * torch.outer(k, delta)

print("Prediction:", v_hat)
print("Prediction error:", delta)
print("Updated state:")
print(S)