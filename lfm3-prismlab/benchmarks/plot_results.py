"""Plot measured PrismLab OCR and resolution results (no invented measurements)."""

from pathlib import Path
import argparse
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parent
PROJECT_DIR = ROOT.parent

DEFAULT_OCR_CSV = PROJECT_DIR / "results" / "p2_n3_ocr_benchmark" / "p2_n3_full_results.csv"
DEFAULT_RES_CSV = PROJECT_DIR / "results" / "p2_n2_resolution" / "p2_n2_resolution_ablation.csv"
DEFAULT_OUT_DIR = PROJECT_DIR / "docs" / "p2" / "figures"


def plot_ocr_benchmarks(csv_path: Path, out_dir: Path) -> None:
    df = pd.read_csv(csv_path)
    if "error" in df.columns:
        df = df[df["error"].isna()]
    if df.empty:
        print("[WARNING] No completed OCR measurements to plot.")
        return

    out_dir.mkdir(parents=True, exist_ok=True)
    x = np.arange(len(df))

    # Figure 1: Per-case direct versus pipeline end-to-end latency
    fig, ax = plt.subplots(figsize=(max(9, 0.88 * len(df)), 5))
    if "pipeline_latency_s" in df and df["pipeline_latency_s"].notna().any():
        w = 0.38
        ax.bar(x - w / 2, df["direct_latency_s"], w, label="Direct VL (LFM3-VL)", color="#3b82f6")
        ax.bar(x + w / 2, df["pipeline_latency_s"], w, label="Full Pipeline (VL OCR → LFM3-1.7B)", color="#10b981")
    else:
        ax.bar(x, df["direct_latency_s"], 0.65, label="Direct VL", color="#3b82f6")

    ax.set_xticks(x, df["id"].astype(str).tolist())
    ax.set_xlabel("Test Image ID")
    ax.set_ylabel("Measured Total Latency (seconds)")
    ax.set_title("PrismLab P2: End-to-End Latency per Synthetic Test Case")
    ax.legend(loc="upper left")
    ax.grid(axis="y", alpha=0.25)
    fig.tight_layout()
    fig.savefig(out_dir / "latency_comparison.png", dpi=200)
    plt.close(fig)

    # Figure 2: Strict question answer correctness
    if "pipeline_exact" in df and df["pipeline_exact"].notna().any():
        fig, ax = plt.subplots(figsize=(max(9, 0.88 * len(df)), 4.5))
        ax.bar(x - 0.22, df["direct_exact"].astype(int), 0.44, label="Direct VL Exact Match", color="#3b82f6")
        ax.bar(x + 0.22, df["pipeline_exact"].astype(int), 0.44, label="VL OCR → Text Exact Match", color="#10b981")
        ax.set_xticks(x, df["id"].astype(str).tolist())
        ax.set_ylim(0, 1.2)
        ax.set_yticks([0, 1], ["Mismatch / Fail", "Exact Match"])
        ax.set_xlabel("Test Image ID")
        ax.set_title("PrismLab P2: Strict Exact-Answer Accuracy by Case")
        ax.legend(loc="upper right")
        ax.grid(axis="y", alpha=0.25)
        fig.tight_layout()
        fig.savefig(out_dir / "answer_accuracy.png", dpi=200)
        plt.close(fig)

    # Figure 3: OCR key-phrase recall
    if "ocr_phrase_recall" in df and df["ocr_phrase_recall"].notna().any():
        fig, ax = plt.subplots(figsize=(max(9, 0.88 * len(df)), 4.5))
        bars = ax.bar(df["id"].astype(str), df["ocr_phrase_recall"] * 100, color="#6366f1", width=0.6)
        ax.set_xlabel("Test Image ID")
        ax.set_ylabel("Exact Key-Phrase Recall (%)")
        ax.set_ylim(0, 115)
        ax.bar_label(bars, labels=[f"{v:.0%}" for v in df["ocr_phrase_recall"]], padding=3)
        ax.set_title("PrismLab P2: LFM3-VL Transcription Key-Phrase Recall (4 phrases/image)")
        ax.grid(axis="y", alpha=0.25)
        fig.tight_layout()
        fig.savefig(out_dir / "ocr_phrase_recall.png", dpi=200)
        plt.close(fig)

    print(f"OCR Figures saved to: {out_dir.resolve()}")
    print("Completed cases:", len(df))
    print("Direct VL exact match fraction:", round(df["direct_exact"].astype(float).mean(), 3))
    print("Direct VL median latency:", round(df["direct_latency_s"].median(), 2), "s")
    if "pipeline_exact" in df and df["pipeline_exact"].notna().any():
        print("Pipeline exact match fraction:", round(df["pipeline_exact"].astype(float).mean(), 3))
        print("Pipeline median latency:", round(df["pipeline_latency_s"].median(), 2), "s")


def plot_resolution_ablation(res_csv_path: Path, out_dir: Path) -> None:
    if not res_csv_path.exists():
        return
    df = pd.read_csv(res_csv_path)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Resolution vs TTFT
    fig, ax = plt.subplots(figsize=(7, 4.5))
    scales = [str(s) for s in df["scale"]]
    ax.plot(scales, df["ttft_s"], marker="o", linewidth=2.2, markersize=8, color="#ef4444", label="Time-to-First-Token (TTFT)")
    ax.plot(scales, df["total_s"], marker="s", linewidth=2.2, markersize=8, color="#3b82f6", label="Total Latency")
    for s, t, tot in zip(scales, df["ttft_s"], df["total_s"]):
        ax.annotate(f"{t:.1f}s", (s, t), textcoords="offset points", xytext=(0, 10), ha="center", fontweight="bold")
        ax.annotate(f"{tot:.1f}s", (s, tot), textcoords="offset points", xytext=(0, -15), ha="center")

    ax.set_xlabel("Resolution Scale (1.0 = 836x470, 0.5 = 418x235, 0.25 = 209x118)")
    ax.set_ylabel("Measured Time (seconds)")
    ax.set_title("LFM3-VL-2B: Resolution Scale vs. TTFT and Total Latency")
    ax.legend(loc="upper left")
    ax.grid(True, alpha=0.25)
    fig.tight_layout()
    fig.savefig(out_dir / "resolution_ttft.png", dpi=200)
    fig.savefig(out_dir / "resolution_latency.png", dpi=200)
    plt.close(fig)
    print(f"Resolution figures saved to: {out_dir.resolve()}")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--csv", default=str(DEFAULT_OCR_CSV), help="Path to OCR results CSV")
    ap.add_argument("--res-csv", default=str(DEFAULT_RES_CSV), help="Path to resolution ablation CSV")
    ap.add_argument("--out", default=str(DEFAULT_OUT_DIR), help="Output directory for generated PNG figures")
    args = ap.parse_args()

    out_dir = Path(args.out)
    plot_ocr_benchmarks(Path(args.csv), out_dir)
    plot_resolution_ablation(Path(args.res_csv), out_dir)


if __name__ == "__main__":
    main()
