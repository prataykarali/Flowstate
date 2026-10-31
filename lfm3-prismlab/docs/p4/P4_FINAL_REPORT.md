# PrismLab P4 — Multimodal Research Report

## Scope

CPU-only evaluation of LFM3-Omni-2B and modular
LFM3-Audio-2B → LFM3-VL-2B pipelines.

Research components:
- P4-A: causal grounding
- P4-B: spatial reasoning
- P4-C: architecture ablations
- P4-D: robustness
- P4-D2: matched statistical holdout
- P4-E: exploratory temporal video and audio fusion
- P4-F: reporting and profiling

Earlier P4-A–D measurements remain documented in
`notebooks/p4/PrismLab_P4_Research_Checkpoint.ipynb`.
They are not pooled with the separate holdout.

## P4-D2 — Paired Holdout

- Cases: 40
- Native Omni: 25/40 (62.5%)
- Modular ASR → VL: 28/40 (70.0%)
- Modular advantage: +7.5 percentage points
- Modular-only correct: 3
- Native-only correct: 0
- Exact McNemar p-value: 0.2500
- Native median latency: 20.919s
- Modular median latency: 21.288s

### Unanswerable Spatial Questions

- Native: 4/16
- Modular: 4/16

Both approaches frequently generated answers when the
requested spatial relationship was absent.

The observed accuracy difference is not statistically
significant at alpha=0.05.

## P4-E — Exploratory Video Pilot

Four video-with-soundtrack questions were executed.

| Case | Expected | Semantic output | Correct |
|---|---|---|---|
| S01 | BEFORE | BEFORE | Yes |
| S02 | AFTER | BEFORE | No |
| H01 | BEFORE | BEFORE | Yes |
| H02 | AFTER | BEFORE | No |

The four-case table is transcribed from the recorded
console outputs of the video probes.

- Video temporal ordering: 2/4 correct
- Sound presence: 2/2 correct
- Early/late/none localization: 2/3 correct
- Audio localization median TTFT: 26.799s
- Audio localization median total latency: 27.072s

### Interpretation

The model distinguished audible beep from silence.
It did not reliably identify whether the beep preceded
or followed the visual color change.

The model repeatedly answered BEFORE, even when the
beep was shifted after the visual event.

These results do not isolate model architecture from
runtime audio/video timestamp handling.

## P4-F — Hardware Snapshot

CPU-only llama.cpp server with `-ngl 0`.

```
=== DATE ===
2026-10-31T23:00:30+05:30
=== PROCESS ===
    PID %CPU %MEM   RSS     ELAPSED COMMAND
 142069 43.0 16.1 2594720     29:56 ./build/bin/llama-server -m ~/.cache/huggingface/hub/models--LiquidAI--LFM3-Omni-2B-GGUF/snapshots/3d29af2ad166f8299c2d820937e47dc0add20ffc/LFM3-Omni-2B-Q4_K_M.gguf --mmproj ~/.cache/huggingface/hub/models--LiquidAI--LFM3-Omni-2B-GGUF/snapshots/3d29af2ad166f8299c2d820937e47dc0add20ffc/mmproj-LFM3-Omni-2B-Q4_0.gguf --alias lfm3-omni --host 127.0.0.1 --port 8083 --reasoning off --temp 0 -c 4096 -ngl 0
=== MEMORY ===
               total        used        free      shared  buff/cache   available
Mem:            15Gi        10Gi       859Mi       1.4Gi       5.8Gi       4.7Gi
Swap:          4.0Gi       332Ki       4.0Gi
=== CPU ===
CPU(s):                                  12
On-line CPU(s) list:                     0-11
Model name:                              13th Gen Intel(R) Core(TM) i5-13420H
Thread(s) per core:                      2
Core(s) per socket:                      8
CPU(s) scaling MHz:                      30%
NUMA node0 CPU(s):                       0-11
=== GPU ===
NVIDIA GeForce RTX 2050, 14 MiB, 4096 MiB
```

The memory reading is a single RSS snapshot,
not a measurement of peak memory.

## Limitations

1. P4-D2 contains one inference per holdout case.
2. Holdout examples share templates and may be correlated.
3. Human visual-label review requires explicit documentation.
4. P4-E is a small exploratory pilot, not frozen validation.
5. The originally proposed 18 video validation clips were not evaluated.
6. Audio/video timestamp preservation is not independently confirmed.
7. System RAM is a snapshot; peak resource use is not measured.
8. No universal model-ranking claim is supported.

## Conclusions

- Both local architectures can perform selected audio-visual
  and spatial grounding tasks.
- Modular outperformed native Omni on this matched holdout,
  but the statistical evidence does not establish superiority.
- Missing spatial relationships triggered frequent unsupported answers.
- Native video input and sound detection worked in the pilot.
- Reliable cross-modal temporal ordering was not demonstrated.

## Reproducibility

Primary files:
- `results/p4/stat_validation/holdout_holdout1_native.json`
- `results/p4/stat_validation/holdout_holdout1_modular.json`
- `results/p4/p4e_audio_control.json`
- `results/p4/p4e_audio_timing_scored.json`
- `results/p4/system_profile/omni_snapshot.txt`
- `results/p4/p4_final_summary.csv`

Video case outputs, licenses, and source metadata should
be retained alongside the video probe and dataset manifests.
