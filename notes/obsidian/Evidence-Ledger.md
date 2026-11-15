---
title: FlowState — Evidence Ledger
tags:
  - flowstate
  - research
  - reproducibility
status: ongoing
---

# Evidence Ledger — Chapters 1–6

| Ch | Observed evidence | Interpretation | Not established |
|---|---|---|---|
| 1 | Single-sentence CE 5.6243 → 0.0023 over 201 steps; seen text reproduced | Tiny hybrid can memorize a training sentence | General language ability or benchmarked Qwen3.5 equivalence |
| 2 | LR 0.001 mean held-out CE 0.4083 vs 0.5915 for 0.01 over five seeds; synthetic retrieval interference & abstention | Training settings and key geometry affect behavior | Broad optimality, calibrated factual confidence, scalable unlimited memory |
| 3 | Analytic gradient [8,11] and Hessian [[2,3],[3,4]] verified in small exercises | Autograd and numerical derivatives can cross-check calculations | Correct gradients for all future models |
| 4 | Stable coupled A spectral radius ~0.8562; modified A ~1.2275 unstable | Matrix eigenstructure affects recurrence behavior | Reliable behavior for arbitrary nonlinear trained networks |
| 5 | Last-halving observed orders Euler ~1.006, RK2 ~2.028, RK4 ~4.030; equal-20-NFE RK4 smallest error on test ODE | Solver theory matches controlled numerical experiments | Universal speed ranking, GPU/mobile performance |
| 6 | Scalar LTC-inspired train MSE 0.075411 → 0.000158; held-out pulse MSE ~0.000141; EMA baseline near 0 | Learned gate can approximate a simple signal; deliberately constructed EMA baseline wins | LTC advantage, faithful full LTC reproduction or edge efficiency |

## Experimental quality ladder

1. **Educational sanity check:** small toy experiment, correct algebra, tests.
2. **Reproducible benchmark:** fixed dataset/protocol, source + seeds + output artifacts.
3. **Matched baseline comparison:** comparable budgets/parameters/training, uncertainty and ablations.
4. **Research contribution:** a falsifiable claim that survives robust comparisons and relevant external literature review.

Current Chapters 1–6 mainly occupy stages 1–2. Do not upgrade a result to stages 3–4 without evidence.

## Research gates

- **P0:** Read Hasani et al., *Closed-form Continuous-time Neural Networks* (2022), record actual notes. **Pending.**
- **B1:** Matched LTC/CfC/RNN/GRU reproduction and baselines. **Not done; Chapter 8+.**
- **N1:** Next technical update to Nishant only when an independently inspectable result merits feedback. **Not ready.**
- **M1:** Early recurrent-state retention / decay / interference experiments around Chapters 9–15. **Planned.**
- **M2:** Episodic/continual memory area Chapters 37–43. **Later.**

Related: [Home](Home.md) · [Paper Desk](Paper-Desk.md) · [FlowState Milestones](https://github.com/prataykarali/Flowstate/blob/main/RESEARCH_MILESTONES.md)
