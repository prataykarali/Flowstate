
from prismlab.core.router import select_model

cases = [
    ("chat", {"text"}, "text"),
    ("chat", {"text", "image"}, "vision"),
    ("chat", {"audio"}, "audio"),
    ("chat", {"audio", "image"}, "omni"),
    ("decision", {"text", "image"}, "d1"),
    ("decision", {"audio"}, "d1_omni"),
    ("speech", {"text"}, "audio"),
]

for task, inputs, expected in cases:
    result = select_model(task, inputs)
    assert result == expected, (
        f"Expected {expected}, got {result}"
    )
    print("PASS:", task, inputs, "=>", result)

print("All 7 router tests passed!")
