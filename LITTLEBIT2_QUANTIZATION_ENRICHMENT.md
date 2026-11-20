# FlowState Δ — LittleBit / LittleBit-2 Quantization Enrichment

**Added:** 20 November 2026 · **Status:** PLANNED (reading / experiments / Android benchmarking are not completed)  
**Curriculum:** FlowState Research Curriculum v2.0, 72 chapters; optional Tier III Chapters 73–80 only after Chapter 72.

## Boundary

This note is an *enrichment of the existing chapter objectives*, not a new chapter, paper commitment, standalone research track, or change to the canonical 72-chapter learning order. The original scientific focus on input-varying state dynamics and controlled hybrid-model experiments remains the priority.

## Literature

1. Lee, B., Kim, D., You, Y., & Kim, Y. (2025). **LittleBit: Ultra Low-Bit Quantization via Latent Factorization**, NeurIPS 2025. https://proceedings.neurips.cc/paper_files/paper/2025/hash/a917c1d57088897beba47f96b4fd7f3c-Abstract-Conference.html
2. Lee, B., & Kim, Y. (2026). **LittleBit-2: Maximizing the Spectral Energy Gain in Sub-1-Bit LLMs via Latent Geometry Alignment**, ICML 2026. https://proceedings.mlr.press/v306/lee26y.html
3. Official research implementation: https://github.com/SamsungLabs/LittleBit (CC BY-NC 4.0; check restrictions before reuse). The LittleBit-2 Joint-ITQ initialization is opt-in through `--use_itq True` and does not add operations to the LittleBit inference representation.

## Existing chapter alignment (additive only)

| Original chapter | Optional targeted enrichment and evidence |
| --- | --- |
| 13 — Low-Rank State Operators | Derive low-rank SVD reconstruction, binary factorization, spectral energy, orthogonal rotations. Verify that `(UR)(VR)^T = UV^T` in floating point but generally not after elementwise sign. |
| 24 — Efficiency Benchmarking | Establish rigorous baselines for reconstruction error, total stored bytes, actual runtime RSS, precision and throughput. Do not confuse nominal sub-1 BPW on selected layers with total model size. |
| 37–39 — Distillation / PEFT / Memory prerequisites | Understand QAT, straight-through / smooth sign approximations, teacher–student objectives and calibration. Distillation/QAT is not the same as post-training conversion. |
| 61 — SafeTensors, Precision & Quantization | Read LittleBit v1/v2, compare 4-bit and sub-1-bit quality/memory budgets, inspect checkpoint layouts, nonquantized embeddings and heads. |
| 62–64 — Rust zero-copy loading, native inference, performance | Only after a scientific baseline works, prototype packed binary factors plus learned scales (e.g., via Rust/Candle), including a numerical parity test against PyTorch. No end-to-end speedup claim without measurement. |
| 65–66 — Android edge / energy, thermal and sustained profiling | On Samsung Galaxy A16, compare cold/warm loads, time-to-first-token, decoded tokens/s, peak RSS, battery and thermal behavior, and response quality with a matched baseline. |

### Minimal hands-on gates

**Gate A — CPU/PyTorch mathematics (small, optional after Chapter 13).**
- Use seeded toy matrices. Compare truncated SVD, naive sign-factorized reconstruction and optionally optimized orthogonal rotation + sign.
- Record matrix shape, rank, rank-to-BPW estimate including FP scaling overhead, reconstruction norm, multiple seeds and failures.
- Do **not** call an educational approximation a faithful LittleBit reproduction.

**Gate B — Tiny model QAT (only if hardware permits; later Chapters 37–39 / 61).**
- Compare a single known baseline model to a LittleBit-like factorized-QAT model. Document teacher checkpoint, training data, tokens, exact quantized components, effective total model bytes and perplexity/task scores.
- Avoid full 7B/8B QAT on the user's 4 GB RTX 2050. Begin with toy layers/tiny networks. Cloud training is not a required part of the original syllabus.
- Evaluate matched conventional 4-bit inference as the practical reference, whenever compatible.

**Gate C — Native/mobile inference (Chapters 62–66).**
- Port only validated inference operators, not the entire research training pipeline. Check exact tensor results against PyTorch and include storage/load overhead.
- Benchmark identical base model, prompts, sequence lengths, threading, warm-up, cold-start, runtime, phone configuration and sampling conditions. Report median and tail latency, output quality, memory and thermal trajectory.
- A smaller checkpoint does **not** guarantee faster tokens/s. Factorized operations, unsupported CPU kernels, dequantization, memory traffic, caches and thermal throttling can remove any theoretical benefit.
- Mark as *unverified* until real Galaxy A16 logs show stable operation and quality at least good enough for the chosen task. Do not assume a ready-made Android runtime or 0.1-BPW checkpoint.

### Separate memory-system hypothesis — intentionally deferred

The user's long-term goal is an offline companion whose persona and relevant experiences persist through model unload/reload, restarts and multi-year upgrades. **LittleBit does not provide episodic recall or longitudinal identity by itself.** This stays in the existing Chapters 37–43 memory track, distinct from the quantization work. Later evaluations should explicitly distinguish: model weights vs. context/KV cache vs. external retrieval store vs. persona/configuration vs. model-version migrations. No promise of perfect long-term recall.

## Decision and success criteria

- **Decision:** Include as a literature-backed chapter enrichment; no new numbered chapters and no immediate implementation diversion.
- **Immediate priority:** Continue current curriculum, beginning with Chapter 8 reproduction when appropriate. The material here is a later reference, not a prerequisite today.
- **Success:** reproducible evidence that a specified model + runtime reaches an improved real-device quality/memory/speed tradeoff vs. a named 4-bit baseline.
- **Failure is valuable:** if the binary-factorized runtime is slower or less reliable than 4-bit on Android, document the result and keep the practical baseline.

**Evidence status as of 20 November 2026:** Literature references identified; all proposed FlowState-specific and Galaxy A16 experiments remain PLANNED, not measured.
