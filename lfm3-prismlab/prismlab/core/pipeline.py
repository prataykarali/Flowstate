"""PrismLab core execution pipeline for multi-modal model dispatch."""

from pathlib import Path
from prismlab.core.registry import MODELS
from prismlab.core.router import select_model
from prismlab.text.client import generate_text
from prismlab.vision.vision_api import build_vision_payload, generate_vision
from prismlab.vision.vision_io import read_file_image


def run_task(
    prompt: str,
    task: str,
    inputs: set[str],
    image: str | Path | bytes | None = None,
    mime: str | None = None,
) -> str:
    """Execute a task by routing to the appropriate model based on task and inputs.

    Args:
        prompt: Text query or instruction.
        task: Task category (e.g. 'chat', 'decision', 'speech').
        inputs: Set of available modalities (e.g. {'text'}, {'text', 'image'}).
        image: Optional image filepath (str/Path) or raw image bytes for vision tasks.
        mime: Optional MIME type (e.g. 'image/png') if image bytes are provided directly.

    Returns:
        Generated model output string.
    """
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

    # 4. Dispatch based on deployed models (P1: text, P2: vision)
    if model_key == "text":
        return generate_text(prompt)

    if model_key == "vision":
        if image is None:
            raise ValueError("Vision task requested but no image provided to pipeline")

        if isinstance(image, (str, Path)):
            image_bytes, detected_mime = read_file_image(str(image))
            image_mime = mime or detected_mime
        elif isinstance(image, bytes):
            image_bytes = image
            image_mime = mime or "image/png"
        else:
            raise TypeError(f"Unsupported image input type: {type(image)}")

        payload = build_vision_payload(prompt, image_bytes, image_mime)
        return generate_vision(payload)

    # 5. Audio, omni, and decision pathways are registered but not yet deployed
    raise NotImplementedError(
        f"{model_key} is registered but not deployed yet (planned for P3+)"
    )


if __name__ == "__main__":
    print("Testing pipeline routing structure...")
    for task_name, test_inputs in [
        ("chat", {"text"}),
        ("chat", {"text", "image"}),
        ("speech", {"text"}),
    ]:
        m = select_model(task_name, test_inputs)
        print(f"Task: {task_name}, Inputs: {test_inputs} -> Selected: {m}")
