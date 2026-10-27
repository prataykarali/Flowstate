
import torch
import torch.nn as nn
from dataclasses import dataclass
from torch.nn import functional as F

@dataclass
class Config:
    vocab_size: int = 256
    d_model: int = 128
    n_layers: int = 4
    n_heads: int = 4
    n_kv_heads: int = 2
    head_dim: int = 32
    mlp_dim: int = 256


class RMSNorm(nn.Module):
    def __init__(self, dim, eps=1e-6):
        super().__init__()
        self.eps = eps
        self.weight = nn.Parameter(torch.ones(dim))

    def forward(self, x):
        # TODO 1: Mean of squared features
        mean_sq = torch.mean(x ** 2, dim=-1, keepdim=True)

        # TODO 2: Normalize using reciprocal square root
        normalized = torch.sqrt(1/(mean_sq + self.eps)) * x

        return normalized * self.weight

class SwiGLU(nn.Module):
    def __init__(self, dim, hidden_dim):
        super().__init__()

        self.gate_proj = nn.Linear(dim, hidden_dim, bias=False)
        self.up_proj = nn.Linear(dim, hidden_dim, bias=False)
        self.down_proj = nn.Linear(hidden_dim, dim, bias=False)

    def forward(self, x):
        gate = self.gate_proj(x)
        up = self.up_proj(x)

        # TODO 1: Apply SiLU activation to gate
        activated_gate = F.silu(gate)

        # TODO 2: Multiply gate and up element-wise
        fused = activated_gate * up

        return self.down_proj(fused)

class FFNResidual(nn.Module):
    def __init__(self, dim, hidden_dim):
        super().__init__()
        self.norm = RMSNorm(dim)
        self.ffn = SwiGLU(dim, hidden_dim)

    def forward(self, x):
        # TODO 1: Normalize x
        normalized = self.norm(x)

        # TODO 2: Pass through SwiGLU
        transformed = self.ffn(normalized)

        # TODO 3: Residual addition
        return x + transformed

class GQAProjections(nn.Module):
    def __init__(self, cfg):
        super().__init__()

        self.n_heads = cfg.n_heads
        self.n_kv_heads = cfg.n_kv_heads
        self.head_dim = cfg.head_dim

        self.q_proj = nn.Linear(
            cfg.d_model,
            cfg.n_heads * cfg.head_dim,
            bias=False
        )

        self.k_proj = nn.Linear(
            cfg.d_model,
            cfg.n_kv_heads * cfg.head_dim,
            bias=False
        )

        self.v_proj = nn.Linear(
            cfg.d_model,
            cfg.n_kv_heads * cfg.head_dim,
            bias=False
        )

    def forward(self, x):
        B, T, C = x.shape

        q = self.q_proj(x)
        k = self.k_proj(x)
        v = self.v_proj(x)

        q = q.view(B, T, self.n_heads,
                   self.head_dim).transpose(1, 2)

        k = k.view(B, T, self.n_kv_heads,
                   self.head_dim).transpose(1, 2)

        v = v.view(B, T, self.n_kv_heads,
                   self.head_dim).transpose(1, 2)

        return q, k, v


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

class GQAAttention(nn.Module):
    def __init__(self, cfg):
        super().__init__()

        assert cfg.n_heads % cfg.n_kv_heads == 0

        self.norm = RMSNorm(cfg.d_model)
        self.projections = GQAProjections(cfg)

        self.n_heads = cfg.n_heads
        self.n_kv_heads = cfg.n_kv_heads
        self.head_dim = cfg.head_dim

        self.o_proj = nn.Linear(
            cfg.n_heads * cfg.head_dim,
            cfg.d_model,
            bias=False
        )

    def forward(self, x):
        B, T, C = x.shape

        # 1. Normalize and project
        normalized = self.norm(x)
        q, k, v = self.projections(normalized)

        # 2. Rotary position embeddings
        q = apply_rope(q)
        k = apply_rope(k)

        # 3. Share KV heads
        repeat_factor = self.n_heads // self.n_kv_heads

        k = k.repeat_interleave(repeat_factor, dim=1)
        v = v.repeat_interleave(repeat_factor, dim=1)

        # 4. Scaled attention scores
        scores = q @ k.transpose(-2, -1)
        scores = scores / (self.head_dim ** 0.5)

        # 5. Causal masking
        mask = torch.tril(
            torch.ones(
                T, T,
                dtype=torch.bool,
                device=x.device
            )
        )

        scores = scores.masked_fill(~mask, float("-inf"))
        attn = F.softmax(scores, dim=-1)

        # 6. Weighted value combination
        context = attn @ v

        # 7. Merge attention heads
        context = context.transpose(1, 2).contiguous()
        context = context.view(
            B, T, self.n_heads * self.head_dim
        )

        # 8. Learned output projection
        output = self.o_proj(context)

        # 9. Residual connection
        return x + output

class GatedDeltaNet(nn.Module):
    def __init__(self, cfg):
        super().__init__()

        C = cfg.d_model
        H = cfg.n_heads
        D = cfg.head_dim

        self.n_heads = H
        self.head_dim = D

        # Learned Q, K, V
        self.q_proj = nn.Linear(C, H * D, bias=False)
        self.k_proj = nn.Linear(C, H * D, bias=False)
        self.v_proj = nn.Linear(C, H * D, bias=False)

        # Learned gates
        self.decay_proj = nn.Linear(C, H)
        self.beta_proj = nn.Linear(C, H)
        self.z_proj = nn.Linear(C, H * D)

        self.norm = RMSNorm(C)

        self.o_proj = nn.Linear(
            H * D, C, bias=False
        )

    def forward(self, x):
        B, T, C = x.shape
        H = self.n_heads
        D = self.head_dim

        h = self.norm(x)

        # Project into heads
        q = self.q_proj(h).view(B, T, H, D)
        k = self.k_proj(h).view(B, T, H, D)
        v = self.v_proj(h).view(B, T, H, D)

        # Normalize Q and K for our simplified experiment
        q = F.normalize(q, dim=-1)
        k = F.normalize(k, dim=-1)

        # Gates: values between 0 and 1
        decay = torch.sigmoid(self.decay_proj(h))
        beta = torch.sigmoid(self.beta_proj(h))
        z = torch.sigmoid(
            self.z_proj(h).view(B, T, H, D)
        )

        # Recurrent memory state
        S = x.new_zeros(B, H, D, D)

        outputs = []

        # Process tokens sequentially
        for t in range(T):
            kt = k[:, t]
            vt = v[:, t]
            qt = q[:, t]

            # Predict value from previous memory
            v_hat = torch.einsum(
                "bhd,bhde->bhe", kt, S
            )

            # Delta-rule correction
            delta = vt - v_hat

            # Apply decay and beta gates
            alpha_t = decay[:, t, :, None, None]
            beta_t = beta[:, t, :, None, None]

            S = (
                alpha_t * S
                + beta_t
                * kt.unsqueeze(-1)
                * delta.unsqueeze(-2)
            )

            # Read updated memory
            y = torch.einsum(
                "bhd,bhde->bhe", qt, S
            )

            # Output gate
            y = y * z[:, t]

            outputs.append(y)

        # [B, T, H, D] -> [B, T, H*D]
        context = torch.stack(outputs, dim=1)
        context = context.reshape(B, T, H * D)

        # Output projection + residual
        return x + self.o_proj(context)

class MiniDecoderBlock(nn.Module):
    def __init__(self, mixer, cfg):
        super().__init__()

        self.mixer = mixer
        self.ffn = FFNResidual(
            cfg.d_model,
            cfg.mlp_dim
        )

    def forward(self, x):
        x = self.mixer(x)
        x = self.ffn(x)
        return x


class MiniHybridLM(nn.Module):
    def __init__(self, cfg):
        super().__init__()

        assert cfg.n_layers == 4

        self.embedding = nn.Embedding(
            cfg.vocab_size, cfg.d_model
        )

        # 3 recurrent blocks + 1 full attention block
        mixers = [
            GatedDeltaNet(cfg),
            GatedDeltaNet(cfg),
            GatedDeltaNet(cfg),
            GQAAttention(cfg)
        ]

        self.blocks = nn.ModuleList([
            MiniDecoderBlock(mixer, cfg)
            for mixer in mixers
        ])

        self.final_norm = RMSNorm(cfg.d_model)

        self.lm_head = nn.Linear(
            cfg.d_model,
            cfg.vocab_size,
            bias=False
        )

    def forward(self, token_ids):
        x = self.embedding(token_ids)

        for block in self.blocks:
            x = block(x)

        x = self.final_norm(x)

        logits = self.lm_head(x)

        return logits
