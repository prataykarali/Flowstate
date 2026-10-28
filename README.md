# FlowState Δ

### A Research-Driven Journey into Hybrid Language Models, Neural Memory and Efficient AI Systems

FlowState is an independent, chapter-based learning and experimental research project exploring the foundations of modern language-model architectures, recurrent memory, neural computation, and efficient AI systems.

The project emphasizes **understanding architectures mathematically, implementing components from scratch, reproducing experimental behavior, and evaluating architectural hypotheses through controlled benchmarks.**

Rather than treating language models as black boxes, FlowState explores their internal mechanisms step by step.

## Research Focus

- Hybrid language-model architectures and recurrent neural computation
- Attention mechanisms, Gated DeltaNet-style memory, and key–value retrieval
- Optimization, reproducibility, and experimental methodology
- Associative-memory capacity, interference, and forgetting
- Efficient inference, local models, and systems engineering
- Future investigations into liquid neural networks and memory-efficient architectures

## Completed Chapters

| Chapter | Topic | Status |
|---|---|---|
| [Chapter 1](chap-1/README.md) | Miniature Qwen3.5-inspired hybrid decoder from scratch | Completed |
| [Chapter 2](chap-2/README.md) | Reproducibility, optimization, and associative-memory experiments | Experiments completed |

### Chapter 1 — Hybrid Decoder Foundations

Implemented and tested a miniature decoder using PyTorch, incorporating recurrent Gated DeltaNet-style mixing, grouped-query attention, RMSNorm, SwiGLU, and residual connections.

The objective was to understand and trace the internal computation of a hybrid language-model architecture.

[Explore Chapter 1](chap-1/README.md)

### Chapter 2 — Experimental Foundations and Associative Memory

Investigated:

- Learning-rate sensitivity and multi-seed validation
- Delta-rule associative memory and same-key overwriting
- Orthogonal keys, multi-slot storage, and retrieval interference
- Variable-dimensional value storage and recovery
- Memory capacity and raw storage scaling
- Noisy-query retrieval and confidence-gated abstention

Experiments include PyTorch notebooks, numerical measurements, and reproducible benchmark artifacts.

[Explore Chapter 2](chap-2/README.md)

## Research Methodology

FlowState follows a recurring experimental workflow:

**Study → Implement → Verify → Benchmark → Analyze → Document**

Each chapter aims to distinguish established architectural principles, measured observations, experimental limitations, and hypotheses requiring further validation.

## Future Directions

Planned investigations include liquid neural networks, state-space models, hybrid memory representations, efficient inference, and local agent architectures.

The longer-term objective is to develop the technical and experimental foundations required to investigate original architectural hypotheses.

## Research Integrity

FlowState is an independent educational and research-preparation project.

Implementations inspired by published architectures are identified accordingly. Small-scale component experiments are not presented as evidence of improvements over production language models unless evaluated against appropriate baselines.

The project is not affiliated with Qwen, Liquid AI, or other model developers.

---

**Maintained by:** [prataykarali](https://github.com/prataykarali)

**Status:** Active development · October 2026