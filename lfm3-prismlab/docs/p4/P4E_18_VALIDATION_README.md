# PrismLab P4-E: 18-clip frozen validation protocol

**Purpose.** Evaluate local CPU-only LFM3-Omni-2B on distinct video clip conditions (6 synthetic, 6 hybrid, 6 natural-audio). This package contains **6 created and checked synthetic MP4s**; **12 real-source clips are not embedded** and must be acquired/build on the researcher's laptop. No validation inferences have been performed with this package. An earlier 4–6s pilot and 12s P4-E+ experiments must **not** be pooled with this new, frozen validation set.

## Dataset specification

| ID | Category | Footage/source | Intervention | Answer target |
|---|---|---|---|---|
| S01 | Synthetic | Original white-background marker | Beep at 3s, red→blue at 6s | BEFORE |
| S02 | Synthetic | Original white-background marker | Beep at 9s, red→blue at 6s | AFTER |
| S03 | Synthetic | Original white-background marker | No beep, red→blue at 6s | UNKNOWN |
| S04 | Synthetic | Original white-background marker | Beep at 2s, red→blue at 8s | BEFORE |
| S05 | Synthetic | Original white-background marker | Beep at 10s, red→blue at 4s | AFTER |
| S06 | Synthetic | Original white-background marker | Beeps at 3s and 9s, red→blue at 6s | BOTH |
| H01 | Hybrid | Cars passing by at night | Original audio replaced; timed beep + marker | BEFORE |
| H02 | Hybrid | High-speed train passing station | Original audio replaced; timed beep + marker | AFTER |
| H03 | Hybrid | Bouncing ball | Original audio replaced; silent marker change | UNKNOWN |
| H04 | Hybrid | Train arriving at station | Original audio replaced; timed beep + marker | BEFORE |
| H05 | Hybrid | Waterfall in Karbi Anglong | Original audio replaced; timed beep + marker | AFTER |
| H06 | Hybrid | Stream of flowing water | Original audio replaced; dual beeps + marker | BOTH |
| N01 | Natural | Bell ringing in tower | Original audio kept | BELL (provisional) |
| N02 | Natural | Guitar solo | Original audio kept | GUITAR (provisional) |
| N03 | Natural | Comtoise clock ticking/ringing | Original audio kept | CLOCK (provisional) |
| N04 | Natural | Crowd applause | Original audio kept | APPLAUSE (provisional) |
| N05 | Natural | Tick-tock clock | Original audio kept | CLOCK (provisional) |
| N06 | Natural | Waterfall on Santo Antão | Original audio kept | WATER (provisional) |

**Critical:** Natural answers are source-title-derived *hypotheses*. It must be true in the 8–12s extracted segment. If not, choose another unambiguous segment/source and update code/labels *before* freezing. A description on Wikimedia is NOT clip-level ground truth.

These 18 cases are not 18 independent natural source scenes: six synthetic share a graphic template, six hybrid use six source scenes with controlled sound, and six natural use their recorded audio. Correlation by task template should be reported; aggregate percentages are descriptive pilot estimates, not a definitive benchmark for all videos.

## Installation

From Ubuntu PrismLab repo root:

```bash
cd ~/Desktop/flowstate/lfm3-prismlab
unzip -o ~/Downloads/PrismLab_P4E_18_Video_Validation.zip -d .
python experiments/p4/p4e18_review.py --list
```

The archive includes the six synthetic MP4s and a draft manifest, so it works without any download.

## Obtain the 12 real-source originals

```bash
python experiments/p4/p4e18_build.py --mode real --download
python experiments/p4/p4e18_review.py --list
```

The builder attempts **one download per missing source**, without loops or bypasses. If Wikimedia responds with HTTP 429, stop requesting that file; open its official source page in your browser, download the **original** manually when allowed, and save it to the exact `data/p4/validation_18/sources/<file>` path printed by the script. Then run:

```bash
python experiments/p4/p4e18_build.py --mode real
python experiments/p4/p4e18_review.py --list
```

Your *already cached* `Cars_Passing_by_at_Night.webm` and `China_Railway_High-speed_train_passing_through_station.webm` from `data/p4/temporal_pilot/sources/` are reused automatically if found.

All clips are transcoded to short H.264/AAC MP4s, 320×180 at 8fps (the model itself may sample more sparsely). Original soundtracks are preserved for **natural** clips, but **deliberately replaced** for hybrid clips. No source is artificially looped. Videos shorter than eight seconds are rejected.

## Review, freeze, infer

1. Inspect all 18 videos with `ffplay -autoexit path/to/file.mp4`. For synthetic and hybrid, confirm beep/no-beep timing and marker transitions. For natural, **listen carefully** to check whether the expected category is actually audible in the extracted segment; inspect page license and attribution. Never just approve the label based on the title.
2. Run `python experiments/p4/p4e18_review.py --approve S01` and type `APPROVED` after completing that inspection. Repeat for all 18 case IDs. You can view progress using `--list`.
3. After verifying all 18 and freezing *before* model inference, run:

```bash
python experiments/p4/p4e18_review.py --freeze
python experiments/p4/p4e18_run.py --dry-run
```

4. Run Omni in CPU-only mode using your known working `llama-server` configuration on port 8083. Then evaluate:

```bash
python experiments/p4/p4e18_run.py
```

The runner randomizes order with seed 404, saves each trial incrementally to `results/p4/p4e18_frozen_eval.json`, and refuses changed media or changed frozen manifests. Existing results are resumed rather than overwritten. Records raw response, exact-token compliance, punctuation-tolerant one-label scoring, TTFT, total latency, finish reason, input hash and errors. Always report execution errors distinctly from incorrect inferences.

## Source provenance and redistribution

Source entries and links are embedded in `manifest_draft.json` under `source_catalog`. This does **not** mean every specific license was independently verified. Follow the file page's author, license, attribution and share-alike requirements when producing derivative footage. A license must be reviewed for **each** file. Do not redistribute real MP4s or original WebMs through GitHub by default; publish generator scripts, manifest, hashes and attribution instead. In particular, if source rights are unclear, replace that source before freezing.

## Analysis guardrails

- Keep P4-A–D, P4-E earlier pilot, P4-E+ and this frozen study as separate experiments.
- This new evaluation is single-run per clip unless repeated trials are explicitly conducted; no repetition claims.
- The synthetic and hybrid condition labels are generated by code. Natural labels are human-verified *after* inspecting extracts, not inferred from filename.
- Do not change prompts, target labels, media or model settings after freezing; record changes as a new dataset version.
- The metric `normalized_pass` is **conservative**: exactly one permitted answer label, with optional terminal punctuation. Semantic interpretations beyond that require a manual, blinded audit.
- Preserve both audio timing (TTFT where streaming) and total inference latency; RAM measured by one snapshot is not peak memory.
