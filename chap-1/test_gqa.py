import torch

from mini_qwen import (
    Config,
    GQAAttention,
    FFNResidual
)

torch.manual_seed(42)

cfg = Config()

sentence = "A dragon guards a tiny library."

# Tokenization
tokens = list(sentence.encode("utf-8"))
x = torch.tensor([tokens], dtype=torch.long)

# Embeddings
embedding = torch.nn.Embedding(
    cfg.vocab_size,
    cfg.d_model
)

h = embedding(x)

# Model components
attention = GQAAttention(cfg)
ffn_layer = FFNResidual(cfg.d_model, cfg.mlp_dim)

# Forward pass
h_attn = attention(h)
h_final = ffn_layer(h_attn)

print("Tokens:", x.shape)
print("Embeddings:", h.shape)
print("GQA output:", h_attn.shape)
print("FFN output:", h_final.shape)

# Test 1: Shape preservation
assert h_final.shape == h.shape

# Test 2: Backpropagation
loss = h_final.square().mean()
loss.backward()

assert attention.o_proj.weight.grad is not None
assert attention.projections.q_proj.weight.grad is not None

print("Gradient test: PASSED")

# Test 3: Causal independence
# Changing future tokens must not affect
# the outputs at earlier token positions.

x_modified = x.clone()
x_modified[:, 5:] = (x_modified[:, 5:] + 1) % cfg.vocab_size

with torch.no_grad():
    original = ffn_layer(attention(embedding(x)))
    modified = ffn_layer(attention(embedding(x_modified)))

assert torch.allclose(
    original[:, :5, :],
    modified[:, :5, :],
    atol=1e-6
)

print("Causal test: PASSED")
print("All GQA tests passed!")