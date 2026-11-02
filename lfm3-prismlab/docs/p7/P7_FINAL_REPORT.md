# PrismLab P7 — Final Research Synthesis

**Status:** Research validated; final browser QA and Git release pending.  
**Evidence:** Official revision-pinned model configurations and source traces, P2–P6 phase reports, local P5 summary JSONs, and the linked raw P5.7 case records.  
**Hardware:** Local CPU-first llama.cpp prototype; results are not cloud-service benchmarks.

## 1. Architecture inventory and provenance

| Model | Source revision | Configured component groups |
|---|---|---|
| LFM3-1.7B | `ac2586a34f1a1c03329dbdcdefabd8b6478ddaa7` | Text backbone 24L |
| LFM3-VL-2B | `ba44bd51db20a2753f28c273a1571ccaa210d954` | Vision encoder 14L, Text backbone 24L |
| LFM3-Audio-2B | `0295e4130594c06800fd25451d97139ac2da1aff` | Audio encoder 17L, Text backbone 24L, Depthformer 3L |
| LFM3-Omni-2B | `5797d07c125503bd4f4c0e7f915ae2d3d703e8de` | Vision encoder 14L, Audio encoder 17L, Text backbone 24L, Depthformer 3L |
| d1-2B | `10e7671d44e4b37700020b1eed3f594c5f2af0b4` | Vision encoder 14L, Text backbone 24L |
| d1-Omni-2B | `431f1d667de5afcc9b0c58b2d9c170a7b38b358b` | Vision encoder 14L, Audio encoder 17L, Text backbone 24L, Depthformer 3L |

The architecture figures reflect configured component structure. High-level links are **not** a proof of each internal tensor operation. The two d1 models use `D1Model` and SystemOne decision interfaces; decision scoring should not be treated as language-model token generation.

## 2. Phase-local benchmark results

| Suite | Direct/native | Modular | Median time: direct/native vs modular |
|---|---|---|---|
| P2 synthetic OCR (10 cases) | 10/10 | 9/10 | 38.53 s vs 65.72 s |
| P3 speech (25 cases) | 24/25 | 22/25 (V2.1) | 13.95 s (n=23) vs 20.18 s (n=24) |
| P4 matched AV holdout (40 cases) | 25/40 | 28/40 (ASR → VL) | 20.919 s vs 21.288 s |

These are **different benchmarks and evaluation rubrics**. Do not compare the percentages across phases to rank models. P4 paired advantage was 7.5 percentage points with exact McNemar p=0.25: **not statistically significant at 0.05**. P4 video temporal ordering remained unreliable in a small exploratory pilot.

Primary reports: [P2](../../docs/p2/README.md), [P3](../../docs/p3/README.md), [P4](../../docs/p4/P4_FINAL_REPORT.md).

## 3. P5 decision intelligence: recorded case counts

- P5.2 routing pilot: **23/24 (95.8%)**, p50 **0.4128 s**.
- P5.3 stress routing: **20/24 (83.3%)**, p50 **0.4114 s**.
- P5.6b synthetic speech: audio **12/12**; exact text oracle **12/12**. A text oracle is **not** an ASR pipeline; these results do not establish real-world speech accuracy.
- P5.7 integrated run: **9/9 records processed**, **6 model calls**, **3 guard-blocked requests**, **5/6 labeled inferences correct**. Threshold **0.9** was selected **post hoc**.
- P5.7 auto-recommendations: **4/5 correctly labeled**, **1 incorrect auto-recommendation(s)**. Note this is a small selected exploratory run, not a generalizable selective-accuracy estimate.

### P5.7 incorrect auto-recommendation audit

- `X03`: expected `technical`, predicted `billing`, confidence `0.9199223848109496`

**Safety caveat:** `review_required_auto_accepted` only checks explicitly marked `must_review` records; an empty list does not establish correct accepted predictions. `AUTO_RECOMMEND` is an advisory label; no external billing, refund or device action was executed. Confidence values are not production-calibrated.

P5 raw summary: `experiments/p5/results/p5_7_integration_20261101T045955Z_summary.json`  
P5 raw cases: `experiments/p5/results/p5_7_integration_20261101T045955Z.jsonl`  
Consolidated P5 records: `results/p7/final/p5_evidence_summary.json`

## 4. P6 orchestration

The final P6 report records all six models passing direct and orchestrated CPU inference paths, with **90/90 offline regression tests**. This count measures regression assertions; it must **not** be described as model-answer accuracy. P6 remains a research prototype; external actions require separate authorization.

See [P6 report](../../docs/p6/README.md).

## 5. Figures

- [p7 01 model component matrix](../../docs/p7/figures/p7_01_model_component_matrix.png) · [SVG](../../docs/p7/figures/p7_01_model_component_matrix.svg)
- [p7 02 text operator schedule](../../docs/p7/figures/p7_02_text_operator_schedule.png) · [SVG](../../docs/p7/figures/p7_02_text_operator_schedule.svg)
- [p7 03 phase local strict success](../../docs/p7/figures/p7_03_phase_local_strict_success.png) · [SVG](../../docs/p7/figures/p7_03_phase_local_strict_success.svg)
- [p7 04 phase local latency](../../docs/p7/figures/p7_04_phase_local_latency.png) · [SVG](../../docs/p7/figures/p7_04_phase_local_latency.svg)
- [p7 05 p5 decision evidence](../../docs/p7/figures/p7_05_p5_decision_evidence.png) · [SVG](../../docs/p7/figures/p7_05_p5_decision_evidence.svg)

## 6. Visual architecture explorer

- [Main interactive model navigator](../../visuals/PrismLabs_Architecture_Extended_P7_NAV_v2.html)
- Six detailed animated HTML model pages under `visuals/p7/models/`.
- Editable source overview graphs under `visuals/mermaid/p7_execution_v1/`.
- Animations illustrate architecture paths and are **not** proof of runtime execution timing.

## 7. Known limitations and release QA

- Small synthetic benchmarks, varying tasks and model quantizations.
- P5 post-hoc threshold; known erroneous accepted decision.
- P4 missing-spatial-relation refusals/abstention and temporal-alignment limitations.
- Config/source trace does not establish all tensor-level computations.
- Run P6/P7 test suites and click through all six pages; check node label overflow and keyboard interaction.
- Reconcile the root README's stale model deployment table and early-stage P5 description before release.
