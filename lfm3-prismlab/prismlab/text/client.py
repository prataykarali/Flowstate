
import json
import os
from urllib.request import Request, urlopen

API_URL = os.environ.get(
    "PRISMLAB_TEXT_API",
    "http://127.0.0.1:8080/v1/chat/completions",
)


def generate_text(prompt: str) -> str:
    payload = {
        "model": "lfm3-text",
        "messages": [
            {
                "role": "system",
                "content": "You are a concise AI assistant. Answer directly."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.1,
        "top_k": 50,
        "repeat_penalty": 1.1,
        "max_tokens": 256,
        "stream": False,
        "chat_template_kwargs": {
        "enable_thinking": False
         }
    }

    request = Request(
        API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    with urlopen(request, timeout=120) as response:
        result = json.load(response)

    choice = result["choices"][0]
    message = choice["message"]

    print("Finish reason:", choice.get("finish_reason"))
    print("Content:", repr(message.get("content")))

    reasoning = message.get("reasoning_content") or ""
    print("Reasoning length:", len(reasoning))
    print("Reasoning preview:", repr(reasoning[:200]))

    content = (message.get("content") or "").strip()

    # Handle the stray delimiter observed in LFM3 output
    if content.startswith("</think>"):
        print("Warning: unexpected reasoning delimiter")
        content = content.removeprefix("</think>").strip()

    if not content:
        raise RuntimeError(
            f"No final answer. Finish reason: "
            f"{choice.get('finish_reason')}"
        )

    return content


if __name__ == "__main__":
    answer = generate_text(
    "Our PrismLab router uses fixed Python rules to "
    "select models based on input modalities. "
    "It is not a learned neural network. "
    "Explain its purpose in one sentence."
)

    print("\nPRISMLAB TEXT ENGINE:\n", answer)

