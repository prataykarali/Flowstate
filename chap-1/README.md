# FlowState — Mini Hybrid Language Model

**A miniature Qwen3.5-inspired hybrid recurrent-attention language model implemented from scratch in PyTorch.**

This project is part of FlowState, a self-directed research-engineering curriculum exploring modern language model architectures, recurrent memory, efficient attention, and on-device intelligence.

## Overview

This project implements a small decoder-only language model combining GatedDeltaNet-style recurrent token mixing with Grouped Query Attention (GQA).

The objective is to understand the mathematical operations, tensor transformations, gradient flow, causality, training, and autoregressive inference of a hybrid language model.

This is an **educational architecture implementation**, not a pretrained model or an exact reproduction of the official Qwen3.5 architecture.

## Architecture

**Model pipeline:**

Token IDs → Byte Embeddings → 3× GatedDeltaNet Decoder Blocks → 1× GQA Decoder Block → RMSNorm → Linear LM Head → Vocabulary Logits

Each decoder block includes:
- Pre-normalization using RMSNorm
- A token-mixing sublayer (GatedDeltaNet or GQA)
- Residual connections
- A SwiGLU feed-forward network

**Configuration**

| Parameter | Value |
|---|---|
| Vocabulary | 256 byte tokens |
| Model dimension | 128 |
| Decoder layers | 4 |
| GatedDeltaNet layers | 3 |
| GQA layers | 1 |
| Query heads | 4 |
| KV heads | 2 |
| Head dimension | 32 |
| FFN hidden dimension | 256 |
| Training framework | PyTorch |

### Core components

**GatedDeltaNet:** Recurrent associative-state updates with learned gating and delta-rule-inspired memory operations.

**Grouped Query Attention:** Causal softmax attention with multiple query heads sharing a smaller number of key/value heads.

**RMSNorm:** Normalizes token representations using root-mean-square statistics.

**SwiGLU:** Gated feed-forward transformation using SiLU activation, elementwise multiplication, and output projection.

**Residual connections:** Preserve an additive information path across decoder sublayers.

## Project Files

| File | Purpose |
|---|---|
| `mini_qwen.py` | Model architecture and core modules |
| `test_hybrid.py` | Forward-shape, gradient, and causality tests |
| `train_hybrid.py` | Training and autoregressive generation |
| `.gitignore` | Excluded local files and artifacts |

## Running the Project

Requires Python and PyTorch.

Install PyTorch according to your platform using the official installation instructions: https://pytorch.org/get-started/locally/

Run the architecture tests:

`python3 test_hybrid.py`

Train the model and generate text:

`python3 train_hybrid.py`

## Experiments and Results

### 1. Architecture verification

The prototype passed the following checks:

- Forward-pass output shape verification
- Gradient existence checks for selected GatedDeltaNet and GQA parameters
- Causal prefix-invariance test on a modified input sequence

These are smoke tests rather than comprehensive mathematical verification.

### 2. Single-sentence training

**Training sentence:** "A dragon guards a tiny library."

| Setting | Value |
|---|---|
| Optimizer | AdamW |
| Learning rate | 0.001 |
| Training steps | 201 |
| Gradient clipping norm | 1.0 |
| Random seed | 42 |
| Objective | Next-token cross-entropy |

**Observed training loss:**

| Step | Loss |
|---|---|
| 0 | 5.6243 |
| 25 | 0.0758 |
| 50 | 0.0114 |
| 100 | 0.0050 |
| 150 | 0.0033 |
| 200 | 0.0023 |

The model achieved approximately **99.96% reduction in training loss** on the single training sentence.

### 3. Autoregressive generation

**Input prompt:** "A dragon"

**Generated output:** "A dragon guards a tiny library."

The model successfully reproduced the memorized continuation through greedy, byte-by-byte autoregressive generation.

### 4. Generalization experiment

The model was also tested with unseen prompts.

For example:

**Input:** "A rabbit"

**Generated:** "A rabbitiny library.y.y.y libra"

The model produced incoherent text despite its extremely low training loss.

This demonstrates that successful memorization of a training example does not establish robust language generalization.

## Current Limitations

- Trained on only one sentence
- No meaningful generalization benchmark
- No pretrained weights
- No optimized recurrent-state or KV-cache decoding
- No systematic comparison against full-attention baselines
- No comprehensive performance, numerical-stability, or memory benchmarks
- Causality and gradient tests cover selected behaviors rather than proving complete architectural correctness

## Future Work

- Expand architecture and numerical correctness tests
- Add controlled component-level experiments
- Benchmark state size, retrieval behavior, and token-mixing alternatives
- Compare recurrent and attention-based architectures
- Explore efficient inference and memory-constrained deployment

## Attribution

Inspired by published Gated DeltaNet, Grouped Query Attention, and Qwen hybrid architecture concepts.

This implementation is an independent educational project. It is not affiliated with Qwen, Alibaba, or any model developer.

---

**FlowState — Chapter 1 | Mini Hybrid Decoder Prototype**