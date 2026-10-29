# PrismLab — Synthetic OCR Benchmark Suite Documentation

**Evaluation Harness:** `benchmarks/ocr_benchmark.py`  
**Dataset Generator:** `benchmarks/make_dataset.py`  
**Plotting Utility:** `benchmarks/plot_results.py`  
**Dataset Directory:** `data/synthetic_ocr/`  
**Primary Records:** `results/p2_n3_ocr_benchmark/p2_n3_full_results.csv`  

---

## 1. Overview & Objectives

The PrismLab Synthetic OCR Benchmark Suite was engineered to provide a controlled, reproducible testbed for evaluating quantized local vision-language models without external internet dependencies.

All ten test cases feature entirely fictional metadata, dates, order numbers, and organization names rendered procedurally using Pillow (`make_dataset.py`). Each test case pairs a targeted factual question with a strict ground-truth answer and four reference OCR key-phrases.

---

## 2. Benchmark Dataset Specification

![Synthetic Contact Sheet](../../data/synthetic_ocr/contact_sheet.png)

| ID | Filename | Category | Question | Expected Answer | Reference Key-Phrases | Difficulty |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| `01` | `01_event_poster.png` | Poster | What is the entry code? | `RBL-42` | `ROBOTICS OPEN LAB`, `14 NOVEMBER 2026`, `HALL C-204`, `RBL-42` | Easy |
| `02` | `02_cafe_receipt.png` | Receipt | What is the grand total amount? | `446.25` | `NORTH PIER CAFE`, `ORDER 0048`, `GRAND TOTAL`, `446.25` | Medium |
| `03` | `03_department_notice.png`| Notice | When does the faculty meeting take place? | `07 DEC 2026, 5:30 PM` | `FACULTY SENATE`, `07 DEC 2026`, `5:30 PM`, `AUDITORIUM 3` | Medium |
| `04` | `04_lab_schedule.png` | Table | What is the time slot for the Robotics Lab?| `14:00 - 15:30` | `WEEKLY ALLOCATIONS`, `Robotics Lab`, `Hall B`, `14:00 - 15:30` | Medium |
| `05` | `05_shipping_label.png` | Label | What is the tracking number? | `AX-7049-2261` | `EXPRESS LOGISTICS`, `PRIORITY AIR`, `TRACKING`, `AX-7049-2261` | Easy |
| `06` | `06_terminal_logs.png` | Console | What is the failure code in the logs? | `E_ALLOC_17` | `KERNEL PANIC`, `SYSTEM RUNTIME`, `E_ALLOC_17`, `ABORT 0x44` | Hard |
| `07` | `07_workshop_invite.png` | Invite | Which room hosts the seminar? | `DS-218` | `QUANTUM COMPUTING`, `SEMINAR SERIES`, `ROOM DS-218`, `DS-218` | Easy |
| `08` | `08_train_ticket.png` | Ticket | What is the departure gate? | `G-06` | `RAPID TRANSIT`, `COACH 04`, `SEAT 12A`, `GATE G-06` | Medium |
| `09` | `09_low_contrast_note.png`| Sticky Note| What is the project code written on the note?| `PLB-7602` | `CONFIDENTIAL`, `PROJECT REF`, `PLB-7602`, `ARCHIVE` | Hard |
| `10` | `10_research_brief.png` | Report | What is the reviewer tag? | `RPT-06-DELTA` | `BENCH-074`, `18.7 s`, `REVIEW REQUIRED`, `RPT-06-DELTA` | Hard |

---

## 3. Evaluation Metrics & Disambiguation

To preserve scientific integrity, four distinct evaluation metrics are computed independently:

1. **Strict Exact-Answer Accuracy (`direct_exact`, `pipeline_exact`):**
   - Computed by normalizing strings (casefold, collapsing whitespace, stripping punctuation) and evaluating exact token equality (`got == expected`).
   - *Limitation:* Semantic equivalents with formatting discrepancies (e.g. `G-06` vs `**G-06**`) are marked `False`.
2. **Sub-string Contains Accuracy (`direct_contains`, `pipeline_contains`):**
   - Assesses whether the ground-truth token appears as an exact substring within the model's generated text (`expected in got`).
3. **Key-Phrase Recall (`ocr_phrase_recall`):**
   - Measures what fraction of the four ground-truth phrases are transcribed by the vision model ($k / 4$).
   - Character error rate (CER) or word error rate (WER) are not measured because full transcriptions may introduce stylistic whitespace without losing factual fidelity.
4. **End-to-End Latency (`direct_latency_s`, `pipeline_latency_s`):**
   - Direct latency: Request dispatch to final token emission.
   - Pipeline latency: Combined latency of vision transcription stage plus text reasoning stage.

---

## 4. Execution Commands

### Launching Local Inference Servers

```bash
# Vision Server (Port 8180)
./build/bin/llama-server -hf LiquidAI/LFM3-VL-2B-GGUF:Q4_0 \
  --alias lfm3-vision --host 127.0.0.1 --port 8180 -c 2048 -ngl 0

# Text Server (Port 8080)
./build/bin/llama-server -hf LiquidAI/LFM3-1.7B-GGUF:Q4_K_M \
  --alias lfm3-text --host 127.0.0.1 --port 8080 -c 2048 -ngl 0
```

### Running Benchmark Executions

From `lfm3-prismlab/`:

```bash
# Direct VL Smoke Test (2 cases)
python benchmarks/ocr_benchmark.py --mode direct --limit 2 --tag smoke

# Full Pipeline Comparative Evaluation (All 10 cases, requires both servers)
python benchmarks/ocr_benchmark.py --mode both --limit 0 --tag p2_n3_full \
  --vision-url http://127.0.0.1:8180 \
  --text-url http://127.0.0.1:8080

# Plotting Results
python benchmarks/plot_results.py \
  --csv results/p2_n3_ocr_benchmark/p2_n3_full_results.csv \
  --out docs/p2/figures
```
