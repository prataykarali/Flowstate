
from prismlab.core.registry import MODELS
from prismlab.core.router import select_model
from prismlab.text.client import generate_text


def run_task(
    prompt: str,
    task: str,
    inputs: set[str]
) -> str:

    if not inputs:
        raise ValueError("Input modalities cannot be empty")

    # 1. Select model using the deterministic router
    model_key = select_model(task, inputs)

    # 2. Retrieve model metadata
    spec = MODELS[model_key]

    # 3. Validate selected model's capabilities
    if not inputs.issubset(spec["inputs"]):
        raise ValueError(
            f"{model_key} does not support inputs: {inputs}"
        )

    print(f"[ROUTER] Selected: {model_key}")
    print(f"[REGISTRY] Repository: {spec['repo']}")

    # 4. Only the text model is currently deployed
    if model_key != "text":
        raise NotImplementedError(
            f"{model_key} is registered but not deployed yet"
        )

    # 5. Call the running local inference server
    return generate_text(prompt)


if __name__ == "__main__":
    answer = run_task(
        prompt="Explain KV caching in two sentences.",
        task="chat",
        inputs={"text", "image"}
    )

    print("\nPRISMLAB RESULT:\n", answer)
