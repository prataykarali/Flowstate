# FlowState Δ

### A Research-Driven Exploration of Hybrid Language Models, Neural Associative Memory & Efficient Cognitive Systems

**FlowState Δ** is an independent, foundational research project investigating the mathematical principles, stateful recurrent dynamics, and memory limits of modern neural architectures.

The project emphasizes **first-principles mathematical derivation, component-level implementations in PyTorch, rigorous multi-seed experimental reproducibility, and empirical capacity characterization.**

Rather than treating deep language models as inscrutable black boxes, FlowState isolates and probes their core computational mechanisms—layer by layer, equation by equation.

---

## 1. Research Tracks at a Glance

The repository hosts two independent, complementary research tracks:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        FLOWSTATE REPOSITORY                            │
├──────────────────────────────────┬─────────────────────────────────────┤
│      FlowState Δ Track           │          PrismLab Track             │
│   (Foundational Neural Theory)   │    (Applied Multimodal Systems)     │
├──────────────────────────────────┼─────────────────────────────────────┤
│ • Hybrid Recurrent Decoders      │ • Liquid AI (LFM3) Model Family     │
│ • GatedDeltaNet & Causal GQA     │ • Deterministic Modality Routing    │
│ • Associative Memory Capacity    │ • Quantized CPU Inference (Q4_0)    │
│ • Confidence Gating & Noise      │ • Vision-Language OCR Benchmarks    │
│ • Completed: Chapters 1 & 2      │ • Completed: Phases 1 & 2           │
│ ➔ Explore: chap-1/ & chap-2/     │ ➔ Explore: lfm3-prismlab/           │
└──────────────────────────────────┴─────────────────────────────────────┘
```

> **Repository Boundary:** **PrismLab** is an independent applied engineering workbench testing quantized Liquid AI models on local hardware—it is **not** another chapter of the foundational FlowState Δ curriculum.

---

## 2. Completed Research Chapters

| Chapter | Topic | Status | Key Artifacts | Notebooks & Code |
| :--- | :--- | :---: | :--- | :--- |
| **[Chapter 1](chap-1/README.md)** | Miniature Qwen3.5-inspired Hybrid Decoder from Scratch | **Completed** | Full PyTorch Hybrid LM, SwiGLU, RMSNorm, Causal GQA | [`mini_qwen.py`](chap-1/mini_qwen.py)<br>[`train_hybrid.py`](chap-1/train_hybrid.py) |
| **[Chapter 2](chap-2/README.md)** | Reproducibility, Optimization & Associative Memory | **Completed** | 5-Seed Validation, Capacity Benchmarks, Confidence Gate | [`associative_memory_A.ipynb`](chap-2/associative_memory_A.ipynb)<br>[`final_memory_benchmark.ipynb`](chap-2/final_memory_benchmark.ipynb) |

---

### Chapter 1 — Hybrid Decoder Foundations

Chapter 1 implemented an educational decoder-only language model combining **GatedDeltaNet-style recurrent token mixing** with **causal Grouped Query Attention (GQA)** in PyTorch.

**Core Mathematical Pipeline:**
$$\text{Tokens} \xrightarrow{\text{Byte Embedding}} \left[ 3 \times \text{GatedDeltaNet Blocks} \right] \xrightarrow{} \left[ 1 \times \text{GQA Block} \right] \xrightarrow{\text{RMSNorm}} \text{Linear Head} \xrightarrow{} \text{Logits}$$

- **GatedDeltaNet Recurrence:** Implements delta-rule associative state updates with learned input and decay gating:
  $$S_t = \alpha_t S_{t-1} + \beta_t (v_t - S_{t-1} k_t) k_t^T$$
- **Grouped Query Attention (GQA):** 4 query heads sharing 2 key/value heads (head dimension 32), providing an efficient causal attention baseline.
- **Verification:** Unit tests confirm strict lower-triangular causal masking and non-zero gradient backpropagation across all layers (`chap-1/test_hybrid.py`).

[Explore Chapter 1 Documentation](chap-1/README.md)

---

### Chapter 2 — Experimental Foundations & Associative Memory

Chapter 2 moved from architectural construction to empirical characterization, investigating learning rate optimization, recurrent associative memory capacity, cross-key interference, and noisy-query retrieval.

[Explore Chapter 2 Documentation](chap-2/README.md)

---

## 3. Chapter 2 Research Highlights (Verified Measurements)

All findings are derived directly from committed experimental JSON records (`chap-2/results/`):

1. **Learning-Rate Sensitivity Across Multi-Seed Trials:**
   - Over 5 random initialization seeds and 50 training updates on held-out text, **$\text{LR}=0.001$** converged to a mean validation loss of **$0.4083 \pm 0.041$**, whereas **$\text{LR}=0.01$** produced severe underfitting and divergence with a mean loss of **$0.5915 \pm 0.089$** (`chap-2/results/lr_validation_50steps.json`).
2. **Associative Memory Capacity & Scaling (1 to 100 Associations):**
   - **Fixed 2D Recurrent Matrix:** Demonstrates strictly constant memory footprint (**36 raw payload bytes** from 1 to 100 associations), but experiences severe cross-key retrieval interference as overlapping key vectors are written.
   - **Orthogonal Matrix & Explicit Slots:** Eliminate retrieval interference under ideal indexing, but require linearly growing storage (**1,200 bytes** at 100 associations) and $N$ mutually orthogonal key dimensions (`chap-2/results/chapter2_memory_benchmark.json`).
3. **Variable-Dimensional Payload Storage:**
   - Evaluated storing differently-sized feature vectors under a single entity key: dynamic tensor storage required **64 bytes** vs. padded fixed-width storage requiring **96 bytes** (+ 24 bytes length metadata = **120 bytes**).
4. **Confidence-Gated Abstention Under Gaussian Query Noise:**
   - When queries are degraded by synthetic Gaussian noise ($q_{\text{noisy}} = q + \sigma \epsilon$), linear retrieval error rises from $L_2 = 0.00$ ($\sigma=0$) to $L_2 = 1.77$ ($\sigma=1.0$).
   - Introducing a cosine-similarity gate ($\tau = 0.80$) allows the memory system to abstain on ambiguous queries. Under severe noise ($\sigma=1.0$), the gate rejects **54.83%** of queries (coverage: **45.17%**), boosting accepted-query accuracy from **64.5%** (ungated) to **73.80%**.

---

## 4. Research Visualizations

The following figures illustrate the primary empirical findings of Chapter 2:

### Memory Storage Scaling
![Memory Storage Scaling](chap-2/figures/memory_storage.png)

**Figure 1:** Raw numerical payload byte scaling as stored associations increase from 1 to 100. The fixed-size recurrent state maintains a constant 36-byte footprint, whereas orthogonal matrices and explicit vector slots scale linearly to 1,200 bytes. Key materialization overhead is excluded.

---

### Memory Interference Scaling
![Memory Interference Scaling](chap-2/figures/memory_inference.png)

**Figure 2:** Mean $L_2$ retrieval error progression across 1 to 100 stored associations. The fixed-size matrix suffers progressive interference as key directions overlap, while the idealized expanding orthogonal and explicit-slot baselines preserve target vectors exactly.

---

### Retrieval Fidelity Under Gaussian Query Noise
![Noisy Query Retrieval](chap-2/figures/noisy_retrieval.png)

**Figure 3:** Impact of synthetic Gaussian query noise ($\sigma \in [0.0, 1.0]$) across 600 trials. Direct linear matrix reads exhibit monotonic $L_2$ degradation due to coefficient mixing. Hard row selection and indexed slots maintain exact retrieval until noise causes a false winner.

---

### Cosine Confidence Gating & Abstention Trade-off
![Confidence Gating](chap-2/figures/confidence_gate.png)

**Figure 4:** Empirical coverage–accuracy trade-off under cosine similarity thresholding ($\tau = 0.80$). As noise increases, the gate abstains more frequently; accepted accuracy significantly exceeds ungated accuracy, demonstrating that refusal improves retrieval reliability.

---

## 5. Independent Experimental Workbench: PrismLab

Located in [`lfm3-prismlab/`](lfm3-prismlab/README.md), **PrismLab** evaluates Liquid AI's quantized models under local CPU inference:

- **Phase 1 (Complete):** Deterministic 6-model capability router and standard-library Python HTTP client for `LFM3-1.7B` on `llama-server`.
- **Phase 2 (Complete):** `LFM3-VL-2B` vision-language integration, resolution ablation, and a 10-image synthetic OCR evaluation suite:
  - *Direct VL:* **10 / 10 exact matches (100%)**, median latency **38.53 s**.
  - *Sequential Pipeline (VL OCR $\to$ Text):* **9 / 10 exact matches (90%)**, median latency **65.72 s**.
- **Phase 3 (Planned):** Audio understanding and speech transcription with `LFM3-Audio-2B`.

[Explore PrismLab Documentation](lfm3-prismlab/README.md)

---

## 6. Long-Term 72-Chapter Research Roadmap

FlowState Δ is structured as a progressive 72-chapter research curriculum exploring the transition from static Transformer decoders to dynamic, memory-augmented cognitive architectures:

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           FLOWSTATE Δ 72-CHAPTER ROADMAP                         │
├──────────────────────────────────────────────────────────────────────────────────┤
│ Tier 1: Mathematical & Recurrent Foundations (Chapters 01 – 12)                  │
│ • [Ch 01] Miniature Hybrid Recurrent Decoder (GatedDeltaNet + GQA) [COMPLETE]   │
│ • [Ch 02] Reproducibility, Optimization & Associative Memory Capacity [COMPLETE] │
│ • [Ch 03 – 06] State Tracking, Multi-Scale Decay & Recurrent State Topologies     │
│ • [Ch 07 – 12] Causal Attention Compaction & Chunkwise Recurrence Dynamics       │
├──────────────────────────────────────────────────────────────────────────────────┤
│ Tier 2: Neural Memory & Continual Learning Dynamics (Chapters 13 – 24)           │
│ • Dynamic Key-Value Compaction, Fast/Slow Weight Separation, Episodic Retrieval  │
│ • Overwriting Dynamics, Catastrophic Forgetting Mitigations, Elastic Memory      │
├──────────────────────────────────────────────────────────────────────────────────┤
│ Tier 3: Continuous-Time & Liquid Neural Systems (Chapters 25 – 36)               │
│ • Liquid Time-Constant (LTC) Networks, Neural ODEs, Adaptive Time-Stepping       │
│ • Closed-Form Continuous-Time (CfC) Models, Non-linear State Transitions         │
├──────────────────────────────────────────────────────────────────────────────────┤
│ Tier 4: State-Space Models & Long-Sequence Dynamics (Chapters 37 – 48)           │
│ • Structured State Spaces (S4), Selective SSMs (Mamba), HiPPO Orthogonal Proj.   │
│ • Convolutional-Recurrent Dualities, Hardware-Aware Associative Scan Algorithms  │
├──────────────────────────────────────────────────────────────────────────────────┤
│ Tier 5: Efficiency, Quantization & Edge Systems (Chapters 49 – 60)               │
│ • Extreme Quantization (1-bit / 2-bit Ternary Weights), KV Cache Compression     │
│ • Sparse Linear Attention, Speculative Decoding, Kernel-Fused Recurrent Decoders │
├──────────────────────────────────────────────────────────────────────────────────┤
│ Tier 6: Unified Cognitive Architectures & Autonomous Agents (Chapters 61 – 72)   │
│ • Multi-Agent Recurrent Communication, Working Memory Buffering, Self-Correction │
│ • Hierarchical Planning Decoders, First-Principles Meta-Learning Architectures   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Research Integrity & Open Science

- **Educational & Hypothesis-Driven:** Implementations inspired by published models (such as Qwen3.5 or Liquid LFM) are built from first principles for mechanistic understanding. Small-scale experiments are never presented as claims of superiority over production LLMs.
- **Deterministic & Traceable:** All reported metrics correspond to reproducible JSON/CSV logs stored in this repository.
- **Independence:** FlowState Δ is an independent personal research initiative with no commercial affiliation with Liquid AI, Qwen/Alibaba, or other model providers.

---

**Author:** [Pratay Karali](https://github.com/prataykarali)  
**Status:** Chapters 1 & 2 Complete · PrismLab P1 & P2 Complete · October 2026
