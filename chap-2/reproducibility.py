
from pathlib import Path
import sys
import torch

# Import Chapter 1 model
chapter1 = Path(__file__).resolve().parent.parent / "chap-1"
sys.path.insert(0, str(chapter1))

from mini_qwen import Config, MiniHybridLM

def create_model(seed):
    # TODO 1: Set the seed before initialization
    torch.manual_seed(seed)

    return MiniHybridLM(Config())


model_a = create_model(42)
model_b = create_model(42)
model_c = create_model(7)


# TODO 2:
print(torch.equal(model_a.embedding.weight, model_b.embedding.weight))  # Should be True

# TODO 3:
print(torch.equal(model_a.embedding.weight, model_c.embedding.weight))  # Should be False

def train_once(seed, steps=5, lr=1e-3):
    torch.manual_seed(seed)

    model = create_model(seed)
    model.train()

    optimizer = torch.optim.AdamW(
        model.parameters(), lr=lr
    )

    sentence = "A dragon guards a tiny library."
    tokens = torch.tensor(
        [list(sentence.encode("utf-8"))],
        dtype=torch.long
    )

    losses = []

    for step in range(steps):
        optimizer.zero_grad(set_to_none=True)

        logits = model(tokens)

        # TODO 1: Compute next-token cross-entropy
        loss= torch.nn.functional.cross_entropy(logits[:,:-1,:].reshape(-1,logits.shape[-1]),tokens[:,1:].reshape(-1))

        # TODO 2: Backpropagate
        loss.backward()

        # TODO 3: Update model parameters
        optimizer.step()

        losses.append(loss.item())

    return torch.tensor(losses)

baseline = train_once(
    seed=42, steps=5, lr=1e-3
)

variant = train_once(
    seed=42, steps=5, lr=3e-4
)

print("Baseline:", baseline)
print("Variant :", variant)