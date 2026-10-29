
def select_model(task: str, inputs: set[str]) -> str:
    if task == "decision":
        return "d1_omni" if "audio" in inputs else "d1"

    if task == "speech":
        return "omni" if inputs & {"image", "video"} else "audio"

    # TODO 1:
    # If audio AND (image or video) are present:
    if "audio" in inputs and inputs & {"image", "video"}:
      return "omni"

    # TODO 2:
    # If audio alone is present:
    if "audio" in inputs:
        return "audio"

    # TODO 3:
    # If image OR video is present:
    if inputs & {"image", "video"}:
      return "vision"

    return "text"
