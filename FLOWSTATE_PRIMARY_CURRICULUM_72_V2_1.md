# FlowState Δ — Primary Research Curriculum v2.1 (72 chapters)

**Original source:** October 14, 2026 FlowState Research Curriculum v2.0 (exact chapter names/order retained). **Additive update:** November 20, 2026. LittleBit enrichment is *planned* rather than completed. Optional Tier III chapters 73–80 are not interleaved.


## Phase 0 — Research Transition

1. **Transformer Competency Checkpoint**
2. **Research Engineering Setup**

## Phase I — Mathematics & Continuous Dynamics

3. **Vector Calculus & Matrix Autodiff**
4. **Dynamical Systems for Neural Networks**
5. **Numerical ODE Solvers**
6. **Liquid Time-Constant Networks**
7. **Closed-form Continuous-time Networks (CfC)**
8. **Research Reproduction #1**

## Phase II — State-Space & FlowState Core

9. **State-Space Models & Discretization**
10. **S4 & HiPPO Intuition**
11. **Mamba & Selective State Spaces**
12. **Input-Varying State Dynamics & LIV**
13. **Low-Rank State Operators** — *Optional LittleBit-2 enrichment:* SVD, binary low-rank factorization, spectral-energy and rotation toy exercises (optional).
14. **Long-Context State Memory**
15. **Liquid + LIV Hybrid**

## Phase III — Efficient Backbone

16. **Tokenization & Embeddings Refresher**
17. **Gated Short Convolutions**
18. **FlowState State-Mixing Block**
19. **Grouped Query Attention & KV Cache**
20. **Selective / Periodic Attention**
21. **FlowState Hybrid Block v0.1**

## Phase IV — Experimental Architecture

22. **Tiny Language Model Training**
23. **Matched Baselines**
24. **Efficiency Benchmarking** — *Optional LittleBit-2 enrichment:* Real storage, quality and tokens/second for matched compression controls.
25. **Long-Context Benchmark**
26. **Ablation Studies**
27. **Architecture Scaling**
28. **Falsifiable Research Hypothesis**

## Phase V — Multimodal

29. **Vision Transformer Fundamentals**
30. **CLIP & SigLIP Contrastive Learning**
31. **VLM Fusion & Projectors**
32. **PaliGemma Reproduction Study**
33. **Audio / Speech Representation Interface**
34. **Streaming Multimodal State**
35. **Multimodal FlowState Fusion**
36. **Multimodal Benchmark & Ablation**

## Phase VI — Memory & Continual Learning

37. **Knowledge Distillation** — *Optional LittleBit-2 enrichment:* Teacher–student / QAT vs PTQ conceptual comparison.
38. **Catastrophic Forgetting**
39. **Continual Learning Experiments** — *Optional LittleBit-2 enrichment:* Distinguish compression adaptation from continual-learning/forgetting; main topic unchanged.
40. **Chronological Event / State Store**
41. **HNSW / ANN Memory Retrieval**
42. **Internal State vs External Memory**
43. **Calibrated Retrieval & Abstention**

## Phase VII — Reinforcement Learning & Reasoning

44. **Reinforcement Learning Foundations**
45. **Policy Gradients & REINFORCE**
46. **PPO, GAE & RLHF**
47. **DPO & Preference Optimization**
48. **RLVR, GRPO & Verifiers**
49. **Inference-Time Reasoning & Scaling**
50. **Behavioral / Reasoning Distillation**
51. **RL for Action Selection**

## Phase VIII — Agentic & Proactive AI

52. **Deterministic Output Controller**
53. **Native Tool Routing & Dynamic Registration**
54. **ReAct, Planning & Agent Loops**
55. **Async Agent Workers**
56. **Reflection & Episodic Feedback**
57. **Proactivity: Salience, Utility & NO-OP**
58. **Proactive Policy Baseline**
59. **RL for Proactive Intervention**
60. **Multi-Agent Mesh**

## Phase IX — Native Edge Runtime

61. **SafeTensors, Precision & Quantization** — *Optional LittleBit-2 enrichment:* LittleBit v1/v2: QAT, residual compensation, Joint-ITQ, embeddings and 4-bit comparator.
62. **Rust Zero-Copy Loading** — *Optional LittleBit-2 enrichment:* Packed factor storage and loader validation in Rust.
63. **Native Rust Inference** — *Optional LittleBit-2 enrichment:* Correctness-tested factorized binary inference operator in Rust/Candle.
64. **Performance Engineering** — *Optional LittleBit-2 enrichment:* Kernel versus end-to-end speed and peak-memory measurement.
65. **Android / Mobile Edge Deployment** — *Optional LittleBit-2 enrichment:* Galaxy A16 cold/warm load, TTFT, sustained tok/s and quality experiment.
66. **Energy, Thermal & Sustained Profiling** — *Optional LittleBit-2 enrichment:* Phone RAM, battery, thermal throttling and sustained performance checks.

## Phase X — Research Output

67. **Experimental Methodology & Statistics**
68. **Experiment Registry & Reproducibility**
69. **Literature Review & Related Work**
70. **Research Report / Thesis Writing**
71. **Open-Source Release**
72. **Defense, Handoff & Next Research Proposal**

## Evidence and boundaries

- First prove toy matrix rotation and factorization behavior (multiple seeds); then tiny PyTorch QAT, then verified Rust inference parity; finally real Samsung Galaxy A16 measurement.
- Report model quality, full storage, peak runtime RAM, TTFT, actual tok/s, thermal and energy metrics; a smaller model is not automatically faster.
- Preserve the main architecture hypothesis and the 72-chapter sequence. Persistent persona/episodic memory remains its own research topic in Chapters 37–43.
- Do not claim the Samsung 7B/8B QAT runs on an RTX 2050 4GB or that GGUF/llama.cpp already supports the compressed operators.

**Detailed experiment plan:** [LittleBit-2 quantization enrichment](LITTLEBIT2_QUANTIZATION_ENRICHMENT.md). **Papers:** [LittleBit](https://arxiv.org/abs/2506.13771) · [LittleBit-2](https://arxiv.org/abs/2603.00042). **Progress must be evidence-verified.**
