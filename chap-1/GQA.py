import torch
import torch.nn as nn

B, T, C = 2, 5, 128

num_q_heads = 4
num_kv_heads = 2
head_dim = 32

x = torch.randn(B, T, C)

q_proj = nn.Linear(C, 128, bias=False)
k_proj = nn.Linear(C, 64, bias=False)
v_proj = nn.Linear(C, 64, bias=False)

q = q_proj(x)
k = k_proj(x)
v = v_proj(x)

# Reshape into attention heads
q = q.view(B, T, 4, 32).transpose(1, 2)
k = k.view(B, T, 2, 32).transpose(1, 2)
v = v.view(B, T, 2, 32).transpose(1, 2)

repeat_factor = 4 // 2  # 2

k = k.repeat_interleave(2, dim=1)
v = v.repeat_interleave(2, dim=1)

print("Q:", q.shape)
print("K:", k.shape)
print("V:", v.shape)

x = torch.arange(8).reshape(1, 2, 2, 2)

print("Original:", x)

x = x.transpose(1, 2).contiguous()
print("Transpose:", x)

x = x.view(1, 2, 4)
print("Merged:", x.shape)
print(x)