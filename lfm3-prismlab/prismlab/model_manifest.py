"""Pinned public GGUF files used by the six local and hosted routes."""

MODELS = {
    "text": ("LFM3-1.7B-GGUF", "bad5729bba61d076fff20d2548e62526665af215", ("LFM3-1.7B-Q4_K_M.gguf",)),
    "vision": ("LFM3-VL-2B-GGUF", "b36554cfd35854b06429900131730cd80f092cdb", ("LFM3-VL-2B-QAD-Q4_0.gguf", "mmproj-LFM3-VL-2B-Q8_0.gguf")),
    "audio": ("LFM3-Audio-2B-GGUF", "02355c1a141e464a064f2ab2c276638dbcb7f38a", ("LFM3-Audio-2B-Q4_K_M.gguf", "mmproj-LFM3-Audio-2B-Q4_0.gguf")),
    "omni": ("LFM3-Omni-2B-GGUF", "3d29af2ad166f8299c2d820937e47dc0add20ffc", ("LFM3-Omni-2B-Q4_K_M.gguf", "mmproj-LFM3-Omni-2B-Q4_0.gguf")),
    "d1": ("d1-2B-GGUF", "e968f6575f0d4fad928312d7af15cad90fd365c0", ("d1-2B-Q4_K_M.gguf", "mmproj-d1-2B-Q8_0.gguf")),
    "d1_omni": ("d1-Omni-2B-GGUF", "c53ae0b1f92b17065e9158d34019c9ca1ea5bcf8", ("d1-Omni-2B-Q8_0.gguf", "mmproj-d1-Omni-2B-Q8_0.gguf")),
}
