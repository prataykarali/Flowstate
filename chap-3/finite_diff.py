
import torch

def f(x):
    x1, x2 = x
    return x1**2 + 3*x1*x2 + 2*x2**2

x = torch.tensor(
    [1.0, 2.0],
    dtype=torch.float64,
    requires_grad=True
)

# Automatic differentiation
grad_auto = torch.autograd.grad(f(x), x)[0]
expected = torch.tensor([8.0, 11.0], dtype=x.dtype)

assert torch.allclose(grad_auto, expected, rtol=0, atol=1e-12)

# Numerical differentiation: step-size experiment
steps = [1e-1, 1e-3, 1e-6, 1e-10]

print("Autograd:", grad_auto.detach())
print("h         max error       strict check")

with torch.no_grad():
    for h in steps:
        grad_numeric = torch.zeros_like(x)

        for i in range(x.numel()):
            e = torch.zeros_like(x)
            e[i] = h

            right = f(x + e)
            left = f(x - e)

            grad_numeric[i] = (right - left) / (2 * h)

        error = (grad_auto - grad_numeric).abs().max().item()

        passed = torch.allclose(
            grad_auto,
            grad_numeric,
            rtol=0,
            atol=1e-8
        )

        print(f"{h:.0e}    {error:.3e}      {passed}")

        # The moderate step size should pass
        if h == 1e-3:
            assert passed, "Finite-difference verification failed"

print("Gradient verification: PASS at h=1e-3")
print("Step-size sensitivity experiment: COMPLETE")
