import torch
import torch.nn.functional as F
from mini_qwen import Config, MiniHybridLM

torch.manual_seed(42)

device = "cuda" if torch.cuda.is_available() else "cpu"

cfg = Config()
model = MiniHybridLM(cfg).to(device)

sentence = "A dragon guards a tiny library."

tokens = torch.tensor(
    [list(sentence.encode("utf-8"))],
    dtype=torch.long,
    device=device
)

optimizer = torch.optim.AdamW(
    model.parameters(),
    lr=1e-3
)

model.train()

for step in range(201):

    optimizer.zero_grad(set_to_none=True)

    logits = model(tokens)

    # TODO 1: Compute next-token cross-entropy loss
    loss = F.cross_entropy(
        logits[:, :-1, :].reshape(-1, cfg.vocab_size),
        tokens[:, 1:].reshape(-1)
    )

    loss.backward()

    torch.nn.utils.clip_grad_norm_(
        model.parameters(), 1.0
    )

    # TODO 2: Update the model parameters
    optimizer.step()

    if step % 25 == 0:
        print(f"Step {step}: Loss = {loss.item():.4f}")

# Autoregressive generation

model.eval()

prompt = "A rabbit"

generated = torch.tensor(
    [list(prompt.encode("utf-8"))],
    dtype=torch.long,
    device=device
)

max_new_tokens = tokens.shape[1] - generated.shape[1]

with torch.no_grad():

    for _ in range(max_new_tokens):

        logits = model(generated)

        # TODO 1: Select logits for the LAST position
        next_logits = logits[:,-1,:]

        # TODO 2: Select the most likely token ID
        next_token = torch.argmax(next_logits, dim=-1, keepdim=True)

        # Add the predicted token to the sequence
        generated = torch.cat(
            [generated, next_token],
            dim=1
        )
        print(repr(chr(next_token.item())), end=" ", flush=True)

output = bytes(
    generated[0].tolist()
).decode("utf-8", errors="replace")

print("Generated:", output)