
MODELS = {
    "text": {
        "repo": "LiquidAI/LFM3-1.7B",
        "inputs": {"text"},
        "outputs": {"text"},
    },
    "vision": {
        "repo": "LiquidAI/LFM3-VL-2B",
        "inputs": {"text", "image", "video"},
        "outputs": {"text"},
    },
    "audio": {
        "repo": "LiquidAI/LFM3-Audio-2B",
        "inputs": {"text", "audio"},
        "outputs": {"text", "speech"},
    },
    "omni": {
        "repo": "LiquidAI/LFM3-Omni-2B",
        "inputs": {"text", "image", "video", "audio"},
        "outputs": {"text", "speech"},
    },
    "d1": {
        "repo": "LiquidAI/d1-2B",
        "inputs": {"text", "image", "video"},
        "outputs": {"decision"},
    },
    "d1_omni": {
        "repo": "LiquidAI/d1-Omni-2B",
        "inputs": {"text", "image", "video", "audio"},
        "outputs": {"decision"},
    },
}

if __name__ == "__main__":
    for name, spec in MODELS.items():
        print(name, "=>", spec["repo"])
