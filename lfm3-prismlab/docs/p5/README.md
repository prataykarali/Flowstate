# PrismLab P5 — Decision Intelligence

## Models
- d1-2B GGUF Q4_K_M
- d1-Omni-2B (later stage)

## P5.1 — Smoke test
- Status: PASS
- Model: d1-2B Q4_K_M
- Latency: 0.978 s
- Input tokens: 176
- Output tokens: 0
- Refund P(yes): 0.998228
- Route: billing (P=0.996137)
- Urgency: low (P=0.689950)

## P5.2 — Routing pilot
Dataset: 24 synthetic, manually labeled cases.
Classes: billing, technical, shipping, other.
Metrics: accuracy, Brier scores, latency p50/p95.
Threshold analysis: coverage vs selective accuracy.

IMPORTANT:
The dataset is exploratory, not a representative sample.
No threshold is production-calibrated.
No TTFT or tokens/sec for non-generative decisions.

## Next
P5.3: larger disjoint calibration and test sets.
P5.4: out-of-distribution and abstention stress tests.
P5.5: image-based decision experiments.
P5.6: d1-Omni audio decisions.
