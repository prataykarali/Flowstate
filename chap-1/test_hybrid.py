import torch
import torch.nn.functional as F

from mini_qwen import Config, MiniHybridLM

torch.manual_seed(42)

cfg = Config()
model = MiniHybridLM(cfg)

sentence = "A dragon guards a tiny library."

tokens = torch.tensor(
    [list(sentence.encode("utf-8"))],
    dtype=torch.long
)

logits = model(tokens)

print("Input:", tokens.shape)
print("Logits:", logits.shape)

assert logits.shape == (
    1, tokens.shape[1], cfg.vocab_size
)

# Next-token prediction loss
loss = F.cross_entropy(
    logits[:, :-1, :].reshape(-1, cfg.vocab_size),
    tokens[:, 1:].reshape(-1)
)

loss.backward()

print("Loss:", loss.item())

assert model.blocks[0].mixer.beta_proj.weight.grad is not None
assert model.blocks[3].mixer.o_proj.weight.grad is not None

print("Gradient test: PASSED")

# Future tokens must not affect past outputs
modified = tokens.clone()
modified[:, 5:] = (
    modified[:, 5:] + 1
) % cfg.vocab_size

with torch.no_grad():
    original_logits = model(tokens)
    modified_logits = model(modified)

assert torch.allclose(
    original_logits[:, :5, :],
    modified_logits[:, :5, :],
    atol=1e-6
)

print("Causal test: PASSED")


import random
import torch

def seed_everything(seed: int):
    # TODO 1: Set Python's random seed
    random.seed(seed)

    # TODO 2: Set PyTorch's CPU random seed
    torch.manual_seed(seed)

    # TODO 3: If CUDA is available,
    # seed all CUDA devices
    if torch.cuda.is_available():
        torch.cuda.manual_seed(seed)
        torch.cuda.manual_seed_all(seed)


seed_everything(42)
a = torch.rand(3)

seed_everything(42)
b = torch.rand(3)

print("A:", a)
print("B:", b)
print("Identical:", torch.equal(a, b))
