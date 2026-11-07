# PrismLab Playground — S5-A: Research Observatory & Trivia Victory Polish

## Overview
This document specifies the architecture, data pipeline, and verification for the **S5-A Research Observatory** and the **Trivia Victory Modal Polish**.

## 1. Trivia Victory Modal Polish
- **Component**: `playground/src/components/mascots/TriviaWinnerModal.tsx`
- **Overlay CSS**: `.s4-winner-overlay` in `playground/src/styles/global.css`
- **Features**:
  - Compact single modal dialog with 1 unified scoreboard table.
  - 5-second auto-dismiss countdown timer with visible progress bar.
  - Hover and keyboard focus pause (`isPaused` state freezes timer).
  - Reduced-motion detection (`matchMedia('(prefers-reduced-motion: reduce)')`) disables auto-dismiss.
  - `Escape` key immediate dismiss.
  - Non-blocking, translucent backdrop (`rgba(12, 6, 24, 0.45)` with `backdrop-filter: blur(4px)`) keeps the arena visible.

## 2. Deterministic Canonical Data Pipeline
- **Script**: `playground/scripts/build-research-data.mjs`
- **Target Output**: `playground/src/data/research/researchData.json`
- **Typing**: `playground/src/data/research/index.ts`
- **Canonical Sources**:
  - `results/p7/final/benchmark_summary.csv`
  - `results/p7/final/failure_taxonomy.csv`
  - `results/p7/final/p5_evidence_summary.json`
  - `results/p7/architecture/component_maps.json` & `text_config.json`
  - `results/p2_n2_resolution/p2_n2_resolution_ablation.csv` & `results/p2_n3_ocr_benchmark/p2_n3_full_results.csv`
  - `results/p3/reliability/p36_reconciled_graded.csv` (75 evaluations across 25 cases: 25 native, 25 modular_v21, 25 modular)
  - `results/p4/stat_validation/p4d2_40case_comparison.csv` (40 paired cases, McNemar p=0.25)
  - `experiments/p5/results/p5_7_integration_20261101T045955Z.jsonl` (Case X03 false-positive)

## 3. Visual Architecture & Design Language
- **Background Video**: `05_research.mp4` / `05_research.webp` mounted via `AppShell.tsx` and visible behind translucent glass cards (`rgba(16, 9, 32, 0.52)` with `backdrop-filter: blur(8px)`).
- **Navigation Ribbon**: `PhaseNavRibbon.tsx` synced with URL hash (`#research?phase=...`).
- **Raw Evidence Inspection**: `EvidenceInspectorModal.tsx` allows downloading and inspecting raw canonical JSON for any phase.

## 4. Observatory Components
- `ResearchOverview.tsx`: Executive synthesis and canonical benchmark metrics.
- `P1RoutingObservatory.tsx`: Interactive SVG topology and modality router simulator.
- `P2VisionObservatory.tsx`: Direct vs. modular paired comparison and resolution ablation.
- `P3AudioObservatory.tsx`: Latency jitter dotplot, median latencies (untimed excluded), and V2.1 stage breakdown.
- `P4FusionObservatory.tsx`: 40-case paired comparison heatmap with exact McNemar p=0.25 callout.
- `P5DecisionObservatory.tsx`: High-confidence Case X03 false-positive spotlight and selective prediction threshold.
- `P6OrchestrationObservatory.tsx`: Multi-stage pipeline diagram and 90/90 regression suite clarification.
- `P7ArchitectureObservatory.tsx`: 6-model component map and 24-layer operator schedule strip.
- `FailureLabObservatory.tsx`: Dedicated negative results catalog with 3-part scientific breakdown.

## 5. Verification
- `npm test`: 75/75 passing tests (all 68 legacy S0-S4 tests + 7 S5-A observatory equality tests).
- `npm run build`: Clean build (`build:research` → `build:runner` → `tsc` → `vite build`).
