import torch

def apply_rope(x, base=10000.0):
    B, H, T, D = x.shape
    assert D % 2 == 0

    positions = torch.arange(T, device=x.device)

    # One rotation frequency for each feature pair
    indices = torch.arange(0, D, 2, device=x.device)
    inv_freq = 1.0 / (base ** (indices.float() / D))

    # Angle depends on token position and frequency
    angles = positions[:, None] * inv_freq[None, :]

    cos = angles.cos()[None, None, :, :].to(x.dtype)
    sin = angles.sin()[None, None, :, :].to(x.dtype)

    # Split adjacent pairs: (0,1), (2,3), ...
    even = x[..., 0::2]
    odd = x[..., 1::2]

    # Rotate each pair
    rotated = torch.stack(
        (even * cos - odd * sin,
         even * sin + odd * cos),
        dim=-1
    )

    return rotated.flatten(-2) 
test = torch.randn(1, 2, 5, 32)
rotated = apply_rope(test)

# Position 0 has angle 0: rotation is identity
print("Position zero unchanged:",
      torch.allclose(test[:, :, 0], rotated[:, :, 0]))

# Rotation should preserve vector length
print("Vector lengths preserved:",
      torch.allclose(
          test.norm(dim=-1),
          rotated.norm(dim=-1),
          atol=1e-5
      ))

print("Shape preserved:", test.shape == rotated.shape)