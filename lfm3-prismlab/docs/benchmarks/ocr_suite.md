# PrismLab P2 — 10-image OCR & VL → Text evaluation suite

## What is inside?
- `images/`: **10 synthetic PNG test cases**, all with fictional information.
- `manifest.json`: exact-answer questions, expected answers, and four OCR phrases per case.
- `make_dataset.py`: reproducible Pillow image generator.
- `benchmark.py`: real local HTTP inference + raw streamed data + incremental results saving.
- `plot_results.py`: plots **measured** accuracy, OCR phrase recall, and end-to-end latency.
- `notebooks/p2_n3_ocr_compare.ipynb`: interactive learning and benchmark notebook.
- `contact_sheet.png`: all ten images at a glance.

## Study design (do NOT conflate metrics)

**Direct VL**: image + question → LFM3-VL-2B → answer (one call).

**VL OCR**: image + generic transcription prompt → LFM3-VL-2B → text.

**VL → Text**: same OCR text + original question → LFM3-1.7B → answer (two sequential calls). The second model receives **only transcription**, never the original image.

**Primary measures**: direct exact-answer correctness, pipeline exact-answer correctness, end-to-end latency, and the fraction of four ground-truth OCR phrases recovered from each image. A zero OCR phrase recall is not proof that no text was extracted; inspect raw OCR. Accuracy on ten synthetic questions does not establish real-world OCR quality or statistical significance.

**Timing caveats**: one pass per image is an exploratory pilot. Server warm/cold state, prompt length, reasoning, image resolution, and CPU competition all affect latency; run repeated trials separately for research. `ttft_s` refers to **first visible content chunk**, and is *not* the first reasoning event.

## Launch the two llama.cpp servers

Use your existing vision server if it is already running. Its tested port was **8180** (or whichever free port you selected):

```bash
cd ~/Desktop/llama.cpp
./build/bin/llama-server -hf LiquidAI/LFM3-VL-2B-GGUF:Q4_0 \
  --alias lfm3-vision --host 127.0.0.1 --port 8180 -c 2048 -ngl 0 \
  --no-reasoning-preserve
```

In a separate terminal, start the P1 text model on port **8080** if needed:

```bash
cd ~/Desktop/llama.cpp
./build/bin/llama-server -hf LiquidAI/LFM3-1.7B-GGUF:Q4_K_M \
  --alias lfm3-text --host 127.0.0.1 --port 8080 -c 2048 -ngl 0
```

**Do not start a second server on an occupied port.** To verify each server:

```bash
curl -sS http://127.0.0.1:8180/v1/models
curl -sS http://127.0.0.1:8080/v1/models
```

Two CPU servers compete for RAM/CPU. If memory pressure becomes high, run **direct VL** and **OCR collection** first, save OCR outputs, then start text-model inference in a separate session. The supplied `--mode both` expects both servers simultaneously.

## Setup

From the extracted folder (inside your PrismLab repo is fine):

```bash
python -m pip install -r requirements.txt
```

### First smoke test: 2 images, direct VL only

```bash
python benchmark.py --mode direct --limit 2 --tag smoke
python plot_results.py --csv results/smoke_results.csv
```

### Full test: all 10 images, both pipelines

```bash
python benchmark.py --mode both --limit 0 --tag full \
  --vision-url http://127.0.0.1:8180 \
  --text-url http://127.0.0.1:8080
python plot_results.py --csv results/full_results.csv
```

To test just two cases in full mode first:

```bash
python benchmark.py --mode both --limit 2 --tag pilot
python plot_results.py --csv results/pilot_results.csv
```

Outputs are saved to `results/<tag>_results.csv` and `results/<tag>_raw.jsonl` after each case. Results start empty; no latency/accuracy values are invented. Reusing a tag **overwrites** previous files with that tag, so choose new tags for repeated experiments.

**If you use port 8181** rather than 8180, set `--vision-url http://127.0.0.1:8181`.

## Fair comparison and limitations

- Use the **same image and same question** for both approaches.
- The text model cannot repair pixels it never sees. The pipeline can improve answer extraction from readable OCR but can also introduce errors and extra latency.
- Answer scoring is **strict normalized exact-string match**; e.g. alternative date formatting may be counted wrong even if semantically correct. A secondary `*_contains` metric is also logged.
- OCR scoring is **four-phrase recall**, not CER or WER and not fully exhaustive transcription ground truth.
- All inputs are synthetic. Generalization needs real photographs, handwritten text, multi-language documents, etc., with verified annotations.
- Do not compare a failed or truncated response as if it were a normal valid completion. Inspect `*_valid`, `*_finish_reason`, and raw logs.

Sources: [llama.cpp server API](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md), [LFM3-VL GGUF](https://huggingface.co/LiquidAI/LFM3-VL-2B-GGUF), [LFM3-1.7B GGUF](https://huggingface.co/LiquidAI/LFM3-1.7B-GGUF).
