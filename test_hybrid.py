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