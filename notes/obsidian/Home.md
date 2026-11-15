---
title: FlowState Delta — Study Home
aliases:
  - FlowState Home
tags:
  - flowstate
  - index
created: 2026-11-15
status: active
---

# FlowState Δ — Study Home

**Mission:** Build first-principles understanding of recurrent dynamics, efficient sequence models, and reproducible research. Emphasize honest baselines and inspectable evidence.

## Chapter map

| Chapter | Area | One crucial takeaway | Study note |
|---|---|---|---|
| 1 | Hybrid decoder | Training loss ≠ generalization | [Ch 01](Ch01-Hybrid-Decoder.md) |
| 2 | Reproducibility / memory | Capacity, interference and abstention are trade-offs | [Ch 02](Ch02-Research-Memory.md) |
| 3 | Derivatives | Verify analytic/autodiff gradients against finite differences | [Ch 03](Ch03-Autodiff.md) |
| 4 | Dynamics | Eigenvalues and full state transitions govern persistence/stability | [Ch 04](Ch04-Dynamical-Systems.md) |
| 5 | ODE solvers | Accuracy, stability, NFE and latency are different quantities | [Ch 05](Ch05-ODE-Solvers.md) |
| 6 | LTC | Input-dependent time constants are learnable, advantage is unproven | [Ch 06](Ch06-LTC.md) |

## Concept chain

Hybrid models → controlled experiments → derivative verification → state dynamics → numerical integration → learned liquid dynamics → **Chapter 7: CfC**.

## Today's transition

1. Review [Ch 05](Ch05-ODE-Solvers.md) and [Ch 06](Ch06-LTC.md) for a few minutes.
2. Work through the first CfC closed-form linear ODE derivation.
3. Read the relevant parts of the [CfC paper](Paper-Desk.md) and record a real P0 paper note.
4. Implement / test a Chapter 7 prototype, then update the [Evidence Ledger](Evidence-Ledger.md).

> [!important] Research discipline
> A completed **teaching lab** is not a verified reproduction, novel architecture, or publishable comparison. Preserve both successes and failures.

## Daily note pattern

- **Question:** What did I try to establish?
- **Math:** What equation or property matters?
- **Experiment:** What code, conditions, baseline, seed and metric?
- **Observation:** What actually happened?
- **Limitation:** What cannot be claimed?
- **Next test:** What could falsify the interpretation?

See [Chapter Note Template](Chapter-Template.md).

**Primary repository:** https://github.com/prataykarali/Flowstate
