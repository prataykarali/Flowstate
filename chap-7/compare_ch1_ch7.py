"""Fresh exploratory comparison on a shared synthetic temporal task.

This is a NEW rerunnable probe, not the original local comparison_results.csv
from 15 November 2026. Ch1 is adapted from actual repository blocks (3
GatedDeltaNet + 1 GQA), not the original byte-token language model. The two
models have unequal parameter counts, so results cannot prove superiority.
Run from the repo root: python chap-7/compare_ch1_ch7.py --epochs 6 --seeds 42
"""
import argparse
import csv
import random
import sys
from pathlib import Path

import torch
import torch.nn as nn

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "chap-1"))
sys.path.insert(0, str(ROOT / "chap-7"))
from mini_qwen import Config, GatedDeltaNet, GQAAttention, MiniDecoderBlock, RMSNorm
from cfc_cell import TinyCfC  # The existing module performs a smoke test on import.


class BatchedCfC(nn.Module):
    """Wrap the existing Chapter 7 cell for independent batched sequences."""
    def __init__(self):
        super().__init__()
        self.cell = TinyCfC(1, 4)
        self.readout = nn.Linear(4, 1)

    def forward(self, features):
        batch_size, steps, _ = features.shape
        state = features.new_zeros(batch_size, 4)
        outputs = []
        for step in range(steps):
            u = features[:, step, :1]
            dt = features[:, step, 1:2]
            state, _ = self.cell(state, u, dt)
            outputs.append(self.readout(state))
        return torch.cat(outputs, dim=1)


class Chapter1AdaptedHybrid(nn.Module):
    """Numeric-input adaptation of Chapter 1's real 3 Delta + 1 GQA blocks.

    Replaces byte embeddings and LM vocabulary head with 2-feature projection
    and scalar regression head. Not the original Chapter 1 language model.
    """
    def __init__(self):
        super().__init__()
        cfg = Config(vocab_size=256, d_model=16, n_layers=4,
                     n_heads=2, n_kv_heads=1, head_dim=8, mlp_dim=32)
        self.input_proj = nn.Linear(2, cfg.d_model)
        self.blocks = nn.ModuleList([
            MiniDecoderBlock(GatedDeltaNet(cfg), cfg),
            MiniDecoderBlock(GatedDeltaNet(cfg), cfg),
            MiniDecoderBlock(GatedDeltaNet(cfg), cfg),
            MiniDecoderBlock(GQAAttention(cfg), cfg),
        ])
        self.final_norm = RMSNorm(cfg.d_model)
        self.readout = nn.Linear(cfg.d_model, 1)

    def forward(self, features):
        z = self.input_proj(features)
        for block in self.blocks:
            z = block(z)
        return self.readout(self.final_norm(z)).squeeze(-1)


def data(num_sequences, steps, seed):
    """Synthetic independent sequences with analytical per-step targets."""
    generator = torch.Generator().manual_seed(seed)
    u = torch.randint(0, 2, (num_sequences, steps), generator=generator).float()
    dt = 0.05 + 1.25 * torch.rand((num_sequences, steps), generator=generator)
    target = torch.zeros_like(u)
    y = torch.zeros(num_sequences)
    for t in range(steps):
        y = u[:, t] + (y - u[:, t]) * torch.exp(-dt[:, t])
        target[:, t] = y
    return torch.stack((u, dt), dim=-1), target


def params(model):
    return sum(p.numel() for p in model.parameters())


def run_one(seed, epochs, n_train, n_val, n_test, steps):
    train_x, train_y = data(n_train, steps, 1000)
    val_x, val_y = data(n_val, steps, 2000)
    test_x, test_y = data(n_test, steps, 3000)
    results = []
    for label, factory in [("Chapter7_TinyCfC", BatchedCfC),
                           ("Chapter1_adapted_hybrid", Chapter1AdaptedHybrid)]:
        random.seed(seed)
        torch.manual_seed(seed)
        model = factory()
        opt = torch.optim.Adam(model.parameters(), lr=0.01)
        for _ in range(epochs):
            model.train()
            opt.zero_grad(set_to_none=True)
            loss = (model(train_x) - train_y).square().mean()
            loss.backward()
            opt.step()
        model.eval()
        with torch.no_grad():
            train_mse = (model(train_x) - train_y).square().mean().item()
            val_mse = (model(val_x) - val_y).square().mean().item()
            test_mse = (model(test_x) - test_y).square().mean().item()
        results.append(dict(seed=seed, model=label, parameters=params(model),
                            train_mse=train_mse, validation_mse=val_mse, test_mse=test_mse,
                            epochs=epochs, train_sequences=n_train,
                            val_sequences=n_val, test_sequences=n_test, steps=steps))
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--epochs", type=int, default=6)
    parser.add_argument("--seeds", default="42", help="Comma-separated list, e.g. 1,2,3")
    parser.add_argument("--train", type=int, default=24)
    parser.add_argument("--val", type=int, default=8)
    parser.add_argument("--test", type=int, default=8)
    parser.add_argument("--steps", type=int, default=10)
    args = parser.parse_args()
    assert min(args.epochs, args.train, args.val, args.test, args.steps) > 0
    torch.set_num_threads(1)
    rows = []
    for seed in [int(s.strip()) for s in args.seeds.split(",")]:
        rows.extend(run_one(seed, args.epochs, args.train, args.val, args.test, args.steps))
    outdir = ROOT / "chap-7" / "results"
    outdir.mkdir(exist_ok=True)
    outfile = outdir / "ch1_ch7_fresh.csv"
    with outfile.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    for row in rows:
        print(f"{row['model']} seed={row['seed']} params={row['parameters']} "
              f"train={row['train_mse']:.6f} val={row['validation_mse']:.6f} "
              f"test={row['test_mse']:.6f}")
    print(f"Fresh, non-capacity-matched exploratory run saved: {outfile}")
    print("This is NOT the missing Nov-15 benchmark or evidence of architecture superiority.")


if __name__ == "__main__":
    main()
