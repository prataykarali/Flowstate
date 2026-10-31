# PrismLab P4-E — Mixed temporal video pilot

This is the **development pilot**, not a final accuracy study. It includes **2 controlled synthetic clips** immediately, plus a builder for **2 hybrid variants** and **2 natural AV clips** sourced from three CC-licensed Wikimedia Commons videos. Two hybrid variants share one underlying source; the pilot is **six conditions, not six statistically independent real-world sources**.

## Install

From project root `lfm3-prismlab` extract the starter ZIP, preserving directories. Required: Python 3.10+, `Pillow`, `requests`, `ffmpeg`, `ffprobe`.

```bash
python experiments/p4/p4e_build_pilot.py --mode synthetic  # offline, 2 MP4s, included in ZIP
python experiments/p4/p4e_build_pilot.py --mode real       # downloads 3 Wikimedia video sources; creates 4 more MP4s
```

For first local validation with Omni server on port 8083:

```bash
python experiments/p4/p4e_video_probe.py --id S01 --dry-run
python experiments/p4/p4e_video_probe.py --id S01
python experiments/p4/p4e_video_probe.py --id S02
```

`p4e_video_probe.py` sends `input_video` with raw base64 video data to llama-server, and reports time to first returned *content* token (TTFT), total time, completion, answer, and error. Zero or no TTFT may indicate server error, blocked decoding or absence of streamed content. Result rows appended to `results/p4/p4e_pilot_runs.jsonl`.

## Local CPU Omni server

```bash
cd ~/Desktop/llama.cpp
OMNI_DIR="$HOME/.cache/huggingface/hub/models--LiquidAI--LFM3-Omni-2B-GGUF/snapshots/3d29af2ad166f8299c2d820937e47dc0add20ffc"
./build/bin/llama-server -m "$OMNI_DIR/LFM3-Omni-2B-Q4_K_M.gguf" \
  --mmproj "$OMNI_DIR/mmproj-LFM3-Omni-2B-Q4_0.gguf" \
  --alias lfm3-omni --host 127.0.0.1 --port 8083 --reasoning off --temp 0 -c 4096 -ngl 0
```

If your old llama.cpp binary rejects `input_video`, verify it has video enabled and FFmpeg on PATH. An early pilot success is *not* proof of synchronized AV understanding; include sound-shift and frame-only/audio-only controls next. Do not substitute hallucinated answers with ground truth.

## Pilot source attribution

- `R01_train_original_audio.mp4`: original footage **Anna Frodesiak**, [China Railway High-speed train passing through station.webm](https://commons.wikimedia.org/wiki/File:China_Railway_High-speed_train_passing_through_station.webm), **CC BY-SA 3.0**. Trimmed to first 7s and reencoded.
- `R02_bell_original_audio.mp4`: original footage **Vojtěch Dostál**, [Bell Ringing in Tower of Přibyslav (video).webm](https://commons.wikimedia.org/wiki/File:Bell_Ringing_in_Tower_of_P%C5%99ibyslav_(video).webm), **CC BY 3.0**. Trimmed to first 7s and reencoded.
- `H01/H02_cars_*.mp4`: original footage **Maximilian Schönherr**, [Cars Passing by at Night.webm](https://commons.wikimedia.org/wiki/File:Cars_Passing_by_at_Night.webm), **CC BY-SA 4.0**. Trimmed to first 6s, original soundtrack replaced with controlled beep, red-to-blue corner marker superimposed. Derived media remain subject to source ShareAlike licensing.
- S01/S02 original computer-generated videos (PrismLab) showing a red-to-blue square change at 2s and a beep at 1s or 3s respectively.

Videos in this ZIP are synthetic only. The script downloads real videos directly on the user's machine, which ensures provenance. Don't commit raw downloaded videos to Git unless licensing, repository size, attribution, and ShareAlike obligations are addressed.

## Pilot questions and checks

| ID | Condition | Ground truth | Approval needed |
| --- | --- | --- | --- |
| S01 | Beep ~1s; change 2s | BEFORE | Listen and watch |
| S02 | Beep ~3s; change 2s | AFTER | Listen and watch |
| H01 | Street footage; corner overlay change 3s, beep 1.5s | BEFORE | Verify overlay and audio |
| H02 | Street footage; corner overlay change 3s, beep 4.5s | AFTER | Verify overlay and audio |
| R01 | Train moving at station | TRAIN | Confirm train visible in selected first 7s |
| R02 | Bell tower | BELL | Confirm ringing audible in selected first 7s |

**Pilot limitations:** Two synthetic events have simple fixed cues. H01/H02 share footage. Clip-level natural descriptions require manual review. Model samples at 2 fps; fleeting events may be missed. Absolute benchmark claims require separate, frozen unseen validation clips.
