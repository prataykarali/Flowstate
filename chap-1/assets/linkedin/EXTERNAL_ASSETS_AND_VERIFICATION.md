# FlowState Δ — External Assets, Licensing & Empirical Verification

## 1. External Media Assets & Licensing

All external media assets utilized in the cinematic research showcase video are strictly licensed, watermark-free, and compliant with open-source research distribution:

| Asset | Local Filename | Description | Source / Origin | License |
|---|---|---|---|---|
| **Processor Macro B-Roll** | `assets/chip_macro_2.jpg` | High-tech processor macro / microchip shot with glowing pink/orange/blue circuit traces | Provided by user / Unsplash / Pexels computing collection | Royalty-free / CC0 / Unsplash License (Commercial & Non-commercial allowed) |
| **Model Flow Graphic** | `assets/model_flow.png` | Glowing transformer & neural backbone dataflow illustration | Provided by user / Technical scientific graphic | Royalty-free / Educational research use |
| **Vector Space Geometry** | `assets/vector_math.png` | 3D coordinate planes, linear transformations, and rotating projection arrows | Provided by user / Technical scientific graphic | Royalty-free / Educational research use |
| **Data Landscape** | `assets/data_landscape.png` | Scientific data landscape, loss contours, scatter distributions, and waveforms | Provided by user / Pexels scientific collection | Royalty-free / CC0 |
| **Music Bed** | `assets/music.mp3` | "Happy Beats / Business Moves" Vol. 11 (87.6s, 114.8 BPM) by Sascha Ende | [ende.app](https://ende.app/en) | [Creative Commons Attribution 4.0 (CC BY 4.0)](https://ende.app/en/standard-license). Credit: *"Music: Sascha Ende, ende.app (CC BY 4.0)"* |
| **UI Sound Design** | `assets/sfx_*.ogg` | Interface switches, drops, clicks | Kenney.nl UI Audio Library via BRAG assets | [Creative Commons Zero (CC0 1.0 Universal - Public Domain)](https://creativecommons.org/publicdomain/zero/1.0/) |

---

## 2. Empirical Verification of All Numerical Claims

Every number, formula, and visual claim presented in the 34-second video is directly grounded in verified repository code, test runs, and serialized benchmark JSON artifacts:

### A. Chapter 1 Architecture Specifications
- **Vocab Size:** `256` bytes (UTF-8 direct byte modeling)
  - *Source:* [`chap-1/mini_qwen.py:L9`](file:///home/pratay-karali/Desktop/flowstate/chap-1/mini_qwen.py#L9)
- **Model Dimension:** `d_model = 128`
  - *Source:* [`chap-1/mini_qwen.py:L10`](file:///home/pratay-karali/Desktop/flowstate/chap-1/mini_qwen.py#L10)
- **Layer Stacking:** 4 layers total — 3 `GatedDeltaNet` recurrent blocks (Layers 0, 1, 2) + 1 `GQAAttention` block (Layer 3)
  - *Source:* [`chap-1/mini_qwen.py:L337-342`](file:///home/pratay-karali/Desktop/flowstate/chap-1/mini_qwen.py#L337-342)
- **Attention Configuration:** 4 Query Heads, 2 Key/Value Heads (KV sharing ratio 2:1), Head Dimension 32
  - *Source:* [`chap-1/mini_qwen.py:L11-13`](file:///home/pratay-karali/Desktop/flowstate/chap-1/mini_qwen.py#L11-13)
- **Recurrent State Dimensions:** State matrix $S \in \mathbb{R}^{B \times H \times 32 \times 32}$
  - *Source:* [`chap-1/mini_qwen.py:L260-291`](file:///home/pratay-karali/Desktop/flowstate/chap-1/mini_qwen.py#L260-291)
- **Feed-Forward Network:** SwiGLU projection with `mlp_dim = 256`
  - *Source:* [`chap-1/mini_qwen.py:L14, L33-51`](file:///home/pratay-karali/Desktop/flowstate/chap-1/mini_qwen.py#L33-51)

### B. Chapter 2 Key-Value Associative Memory Research
- **Overlapping Keys Interference:**
  - 2D Keys: $k_1=[1,0], k_2=[0,1], k_3=[1/\sqrt{2}, 1/\sqrt{2}]$
  - Measured L2 Retrieval Error: **1.0126**
  - *Source:* [`chap-2/README.md:L245-255`](file:///home/pratay-karali/Desktop/flowstate/chap-2/README.md#L245-255) and [`chap-2/results/chapter2_memory_benchmark.json:L6-11`](file:///home/pratay-karali/Desktop/flowstate/chap-2/results/chapter2_memory_benchmark.json#L6-11)
- **Orthogonal Keys & Discrete Slots:**
  - 3D Orthogonal Keys: L2 Retrieval Error = **0.0000**
  - Explicit Slots: L2 Retrieval Error = **0.0000**
  - *Source:* [`chap-2/results/chapter2_memory_benchmark.json:L13-28`](file:///home/pratay-karali/Desktop/flowstate/chap-2/results/chapter2_memory_benchmark.json#L13-28)
- **Storage Scaling:**
  - Fixed 3×3 matrix = **36 bytes** (constant footprint)
  - Orthogonal matrix at 100 associations = **1200 bytes** (linear scaling with $N$)
  - Explicit slots at 100 associations = **1200 bytes**
  - *Source:* [`chap-2/README.md:L406-422`](file:///home/pratay-karali/Desktop/flowstate/chap-2/README.md#L406-422)
- **Variable-Length Dimensions (Exp C):**
  - Testing dimensions $d=3, 5, 8$: Dynamic storage allocation = **64 bytes** vs Padded storage = **120 bytes**
  - *Source:* [`chap-2/README.md:L330-345`](file:///home/pratay-karali/Desktop/flowstate/chap-2/README.md#L330-345)
- **Confidence-Gated Retrieval under Gaussian Noise:**
  - At noise $\sigma = 1.0$ and cosine similarity threshold $\tau = 0.80$:
    - Coverage: **45.17%**
    - Accepted Accuracy: **73.80%** (vs 64.50% ungated)
  - *Source:* [`chap-2/README.md:L480-492`](file:///home/pratay-karali/Desktop/flowstate/chap-2/README.md#L480-492)
- **Learning Rate Sensitivity across 5 Seeds (50 Steps):**
  - $\text{LR} = 0.001$: Mean validation loss = **0.4083 ± 0.0421** (Won 5/5 seeds)
  - $\text{LR} = 0.01$: Mean validation loss = **0.5915 ± 0.0550** (+0.1832 higher error)
  - Seeds tested: `[7, 21, 42, 99, 123]`
  - *Source:* [`chap-2/results/lr_validation_50steps.json:L22-43`](file:///home/pratay-karali/Desktop/flowstate/chap-2/results/lr_validation_50steps.json#L22-43)

---

## 3. Scientific Disclaimers & Integrity
- **Educational Scope:** FlowState is an independent learning implementation inspired by Qwen3.5 and Gated DeltaNet concepts. It is not affiliated with Alibaba Qwen, Liquid AI, or any official production model release.
- **Controlled Benchmarks:** The zero-error retrieval results reflect synthetic, idealized one-hot vector keys in isolation, not trained neural embeddings.
