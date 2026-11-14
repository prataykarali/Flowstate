# FlowState Δ — Parallel Research Milestones

> **Status ledger · initialized 15 November 2026 (Asia/Kolkata).**
>
> **Canonical learning order:** October 2026 FlowState Research Curriculum v2.0, Chapters **1–72**. Optional Tier III Chapters **73–80** only **after** Chapter 72. The tracks below run *alongside* the curriculum; they do not create new prerequisite chapters or justify scope creep.
>
> **Evidence rule:** `Planned` ≠ `Started` ≠ `Verified` ≠ `Completed`. An actual literature reading, saved artifact, measured comparison or mentor reply is required before the associated milestone advances. Never turn a hypothesis, README claim, imagined result or message draft into a completed milestone.

## Status as of 15 November 2026

| Code | Parallel track | Trigger / position | Real status | Next proof needed |
| --- | --- | --- | --- | --- |
| **C** | Core curriculum | Every chapter, 1–72 | **Ch 1–6 introductory work documented; Ch 7 next** | Ch 7 CfC mathematical checks, implementation and notebook |
| **P** | Paper Desk | Start alongside Ch 7; continue selectively | **P0 PENDING — no systematic paper reading completed** | Actually read key sections of Hasani et al. (2022) CfC paper; write a source-grounded note covering motivation, mechanisms, baselines, open questions and citation |
| **E** | Experimental evidence stamps | Every experimental chapter | **Educational evidence STARTED, not publication-grade** | Preserve precise methods, hardware, code, seeds, metric definitions, raw outputs, plots, tests and limitations; repeat/extend when warranted |
| **B** | Baseline comparisons | Preliminary Ch 6; rigorous Ch 8–15 | **B0 preliminary only** | Ch 6 LTC-style (5 params) vs EMA (1 param) was a useful sanity check on an EMA-generated task; matched multi-seed RNN/GRU/LTC/CfC comparisons remain unperformed |
| **M1** | Early state-memory research | Ch 9–15 | **PLANNED** | Recurrent-state retention, decay, interference, long-context behavior, and simple matched baselines; distinguish recurrent state from episodic memory |
| **N1** | Nishant technical follow-up | **Evidence-triggered**, possible after Ch 8; more likely Ch 9–15 | **NOT READY. N0 mentoring already occurred** | Independently inspectable reproduction or focused research result; one-page evidence brief and a specific question; user decides if/when to message |
| **N2–N5** | Mentorship progression | After N1, only if engagement proceeds | **CONDITIONAL / NOT STARTED** | Actual feedback, meaningful new evidence, user-directed outreach; no automatic messages or implied supervision |
| **W** | Parallel scientific writing | Maintain from first meaningful experiments | **W0 research memos only; no substantive manuscript** | Collect problem statement, hypotheses, related work, verified methods, baselines, results, ablations, negative findings and limitations; manuscript only when scientific evidence supports it |
| **M2** | Dedicated memory research | Ch 37–43 | **PLANNED / NOT STARTED** | Continual learning, catastrophic forgetting, episodic and external memory, consolidation/retrieval, related distillation/fine-tuning concepts |
| **R** | Formal methodology and scientific writing training | Ch 67–72 | **PLANNED** | Deeper statistical methodology, experimental design, manuscript writing, reproducible packaging; early writing is permitted before Ch 67 |
| **T** | Optional Tier III | After Ch 72 only | **DEFERRED** | Electives Ch 73–80; do not interleave with the core |

## Nearby gates

| Gate | When to assess | Pass condition | Fail / defer condition |
| --- | --- | --- | --- |
| **P0** | During Ch 7 | Read actual CfC source, document claim/equation/baselines/limitations and at least one open question | Only citing or discussing a paper without examining it |
| **E6** | Ch 6 closed at introductory scope | [Published Ch 6 notebook, scripts, plots and CSV metrics](chap-6/) | Does **not** establish LTC advantage, edge efficiency or published-model reproduction |
| **B1** | Ch 8 onward | Relevant published result reproduced or deviations characterized; simple and matched baselines measured | Single-seed toy-task fit only |
| **N1** | After Ch 8 if evidence warrants; otherwise reassess Ch 9–15 | One rigorous result with source references, limitations, one narrow mentor question and a concise update | Chapter count, shared AURA/Nora interest, or speculative architecture idea alone |
| **M1** | Ch 9–15 | Memory-retention task and metrics recorded, including meaningful controls and generalization constraints | Confusing hidden-state retention with long-term autobiographical or weight-based memory |
| **W1** | When repeated experiments support a focused question | Related work, reproducible baselines/ablations, sound interpretation and limitations ready for outside review | A collection of exercises packaged as a research paper |
| **M2** | Ch 37–43 | Prerequisite sequence/memory foundations established and specific continual/episodic memory questions articulated | Automatically upgrading AURA's interface or building a new app |

### Next study session — 16 November 2026: Chapter 7 + P0

1. **10–15 min signals refresher:** exponential decay, first-order response/EMA, continuous vs discrete time, numerical step size. **No full DSP book, Fourier, Laplace or Z-transform prerequisites** for this first session.
2. **25–30 min actual paper reading:** Hasani et al., [*Closed-form Continuous-time Neural Networks*](https://www.nature.com/articles/s42256-022-00556-7), *Nature Machine Intelligence* (2022), DOI 10.1038/s42256-022-00556-7. Start with abstract, motivation, explicit time dependence and model derivation relevant to the Chapter 7 equations. **P0 remains pending until the reading and note occur.**
3. **60–90 min Chapter 7:** derivation, implementation and checkpoint exercise.
4. **~10 min log:** what was read, what was coded/verified, what remains unverified. Update this ledger only with actual outcomes.

### Lightweight operating procedure

- **Before each session:** read the relevant rows above; choose the single main chapter objective plus at most one small P/E/B task.
- **After each session:** update status only when code, a paper note, a dataset/run or other primary evidence exists; link the file/commit.
- **Weekly GitHub review:** look for meaningful new evidence and flag N1/memory/manuscript triggers. The scheduled review is an *audit*, not automatic proof of completion and not automatic contact with Nishant.
- **Academic constraint:** coursework/exams through 11 December 2026 remain priorities; reduce parallel reading or writing when time is limited.
- **Project boundaries:** PrismLab is a frozen exploratory workbench; AURA product/UI development remains paused; Archipelago is a separate information-retrieval research track and publication plan.

## Update history

| Date | Change | Evidence |
| --- | --- | --- |
| 2026-11-15 | Initialized explicit C/P/E/B/M1/N1/N2–N5/W/M2/R/T statuses; marked P0 pending rather than claimed active; set Ch 7 + P0 next | [Chapter 6](chap-6/README.md), [Chapter 6 results](chap-6/chapter6_outputs/summary_metrics.csv) |

