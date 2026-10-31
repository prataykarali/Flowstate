#!/usr/bin/env python3
"""PrismLab P3: Publication-Quality Figures Generation Suite.

Generates 5 PNG figures from canonical benchmark data:
1. latency_comparison.png
2. modular_stage_breakdown.png
3. accuracy_by_category.png
4. reliability_comparison.png
5. v1_to_v21_improvement.png

Audited against Delta's exact-output rubric:
- Final Strict Task Success:
    Modular V1: 15 / 25
    Modular V2.1: 22 / 25
    Native S2S: 24 / 25
- Semantic Correctness:
    Modular V1: 17 / 25
    Modular V2.1: 24 / 24 completed (24 / 25)
    Native S2S: 25 / 25
- Timed Sample Counts:
    Modular V1: n=23 (median 27.70 s)
    Modular V2.1: n=24 (median 20.18 s)
    Native S2S: n=23 (median 13.95 s)
"""
from pathlib import Path
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

# Setup styling
plt.rcParams.update({
    "font.family": "sans-serif",
    "font.sans-serif": ["DejaVu Sans", "Helvetica", "Arial"],
    "font.size": 10,
    "axes.titlesize": 12,
    "axes.titleweight": "bold",
    "axes.labelsize": 10,
    "axes.labelweight": "bold",
    "xtick.labelsize": 9,
    "ytick.labelsize": 9,
    "legend.fontsize": 9,
    "figure.titlesize": 13,
    "figure.titleweight": "bold",
    "figure.dpi": 300,
    "savefig.dpi": 300,
    "axes.grid": True,
    "grid.alpha": 0.35,
    "grid.linestyle": "--",
    "axes.edgecolor": "#333333",
    "axes.linewidth": 1.0,
})

# Architecture Palette
COLORS = {
    "modular": "#2563EB",       # Royal Blue (V1)
    "modular_v21": "#059669",   # Emerald Green (V2.1)
    "native": "#D97706",        # Amber / Orange (Native)
}

ROOT = Path(__file__).resolve().parents[2]
INPUT_CSV = ROOT / "results/p3/reliability/p36_reconciled_graded.csv"
OUT_DIR = ROOT / "docs/p3/figures"
OUT_DIR.mkdir(parents=True, exist_ok=True)

df = pd.read_csv(INPUT_CSV)

# -------------------------------------------------------------------------
# Figure 1: Latency Comparison
# -------------------------------------------------------------------------
def plot_latency_comparison():
    fig, ax = plt.subplots(figsize=(7, 4.6))

    timed = df[df["Status"] == "ok"].copy()

    archs = ["modular", "modular_v21", "native"]
    labels = ["Modular V1\n(ASR → LFM3 → TTS)", "Modular V2.1\n(Grounded + Cleaned)", "Native S2S\n(LFM3-Audio-2B)"]
    medians = []
    means = []
    counts = []
    data_points = []

    for arch in archs:
        sub = timed[timed["Architecture"] == arch]["Total_s"].dropna()
        medians.append(sub.median())
        means.append(sub.mean())
        counts.append(len(sub))
        data_points.append(sub.values)

    x = np.arange(len(archs))
    width = 0.45

    bars = ax.bar(x, medians, width, color=[COLORS[a] for a in archs], edgecolor="#1E293B", linewidth=1.2, zorder=3)

    np.random.seed(42)
    for i, pts in enumerate(data_points):
        jitter = np.random.normal(0, 0.04, size=len(pts))
        ax.scatter(x[i] + jitter, pts, color="#0F172A", alpha=0.45, s=22, zorder=4, edgecolor="white", linewidth=0.5)

    for bar, med, cnt in zip(bars, medians, counts):
        yval = bar.get_height()
        ax.text(bar.get_x() + bar.get_width() / 2.0, yval + 1.2, f"{med:.2f} s\n(n={cnt})",
                ha="center", va="bottom", fontsize=9, fontweight="bold", color="#1E293B")

    ax.set_ylabel("End-to-End Latency (seconds)")
    ax.set_title("P3.6 Benchmark: Median End-to-End Latency by Architecture", pad=12)
    ax.set_xticks(x)
    ax.set_xticklabels(labels)
    ax.set_ylim(0, 42)

    fig.text(0.12, 0.02, "* Timed sample sizes: V1 n=23 (excludes recovered G01, S01), V2.1 n=24 (excludes failed G02), Native n=23 (excludes recovered G01, S01).",
             fontsize=7.5, color="#64748B", style="italic")

    plt.tight_layout(rect=[0, 0.05, 1, 1])
    out_path = OUT_DIR / "latency_comparison.png"
    plt.savefig(out_path)
    plt.close()
    print(f"Generated: {out_path}")

# -------------------------------------------------------------------------
# Figure 2: Modular Stage Breakdown
# -------------------------------------------------------------------------
def plot_modular_stage_breakdown():
    fig, ax = plt.subplots(figsize=(7.5, 4.8))

    v1_timed = df[(df["Architecture"] == "modular") & (df["Status"] == "ok")]
    v21_timed = df[(df["Architecture"] == "modular_v21") & (df["Status"] == "ok")]

    stages = ["ASR", "Reasoning / LLM", "Speech Synth (TTS)"]

    v1_medians = [v1_timed["ASR_s"].median(), v1_timed["Reasoning_s"].median(), v1_timed["TTS_s"].median()]
    v21_medians = [v21_timed["ASR_s"].median(), v21_timed["Reasoning_s"].median(), v21_timed["TTS_s"].median()]

    x = np.arange(len(stages))
    width = 0.35

    bars1 = ax.bar(x - width/2, v1_medians, width, label=f"Modular V1 (Median, n={len(v1_timed)})", color="#3B82F6", edgecolor="#1E3A8A", linewidth=1.1, zorder=3)
    bars2 = ax.bar(x + width/2, v21_medians, width, label=f"Modular V2.1 (Median, n={len(v21_timed)})", color="#10B981", edgecolor="#064E3B", linewidth=1.1, zorder=3)

    for bar in bars1:
        h = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2., h + 0.5, f"{h:.2f} s", ha="center", va="bottom", fontsize=8.5, fontweight="bold")
    for bar in bars2:
        h = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2., h + 0.5, f"{h:.2f} s", ha="center", va="bottom", fontsize=8.5, fontweight="bold")

    ax.set_ylabel("Processing Time (seconds)")
    ax.set_title("Modular Pipeline Stage Timing Comparison (V1 vs V2.1)", pad=12)
    ax.set_xticks(x)
    ax.set_xticklabels(stages)
    ax.set_ylim(0, 25)
    ax.legend(framealpha=0.9, loc="upper right")

    fig.text(0.12, 0.02, "* Native S2S latency (median 13.95s, n=23) is direct speech-to-speech; internal acoustic representations cannot be split into text stages.",
             fontsize=7.5, color="#64748B", style="italic")

    plt.tight_layout(rect=[0, 0.05, 1, 1])
    out_path = OUT_DIR / "modular_stage_breakdown.png"
    plt.savefig(out_path)
    plt.close()
    print(f"Generated: {out_path}")

# -------------------------------------------------------------------------
# Figure 3: Accuracy by Category (Refined Exact-Output Rubric)
# -------------------------------------------------------------------------
def plot_accuracy_by_category():
    fig, ax = plt.subplots(figsize=(8.5, 4.8))

    categories = ["Grounding", "Spatial", "Knowledge", "Instruction", "Linguistic"]
    archs = ["modular", "modular_v21", "native"]

    cat_counts = {}
    for a in archs:
        cat_counts[a] = []
        for c in categories:
            sub = df[(df["Architecture"] == a) & (df["Category"] == c)]
            score = sub["final_strict_task_success"].sum()
            cat_counts[a].append(score) # Out of 5

    x = np.arange(len(categories))
    width = 0.25

    b1 = ax.bar(x - width, cat_counts["modular"], width, label="Modular V1 (Total: 15/25)", color=COLORS["modular"], edgecolor="#1E293B", zorder=3)
    b2 = ax.bar(x, cat_counts["modular_v21"], width, label="Modular V2.1 (Total: 22/25)", color=COLORS["modular_v21"], edgecolor="#1E293B", zorder=3)
    b3 = ax.bar(x + width, cat_counts["native"], width, label="Native S2S (Total: 24/25)", color=COLORS["native"], edgecolor="#1E293B", zorder=3)

    for bar in list(b1) + list(b2) + list(b3):
        h = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2., h + 0.1, f"{int(h)}/5", ha="center", va="bottom", fontsize=8, fontweight="bold")

    ax.set_ylabel("Strict Task Success (out of 5 cases)")
    ax.set_title("P3.6 Benchmark: Strict Task Success by Domain Category", pad=12)
    ax.set_xticks(x)
    ax.set_xticklabels([f"{c}\n(n=5)" for c in categories])
    ax.set_ylim(0, 6)
    ax.set_yticks(range(0, 6))
    ax.legend(framealpha=0.9, loc="lower right")

    fig.text(0.12, 0.02, "* Evaluated under exact-output grading (e.g. Case I04 expects solitary 'No'). G03 accepted as valid abstention for Native.",
             fontsize=7.5, color="#64748B", style="italic")

    plt.tight_layout(rect=[0, 0.05, 1, 1])
    out_path = OUT_DIR / "accuracy_by_category.png"
    plt.savefig(out_path)
    plt.close()
    print(f"Generated: {out_path}")

# -------------------------------------------------------------------------
# Figure 4: Reliability Comparison (Decoupled Dimensions)
# -------------------------------------------------------------------------
def plot_reliability_comparison():
    fig, ax = plt.subplots(figsize=(8.2, 4.8))

    archs = ["modular", "modular_v21", "native"]
    labels = ["Modular V1", "Modular V2.1", "Native S2S"]

    exec_success = [df[df["Architecture"] == a]["execution_success"].sum() for a in archs]
    sem_correct = [df[df["Architecture"] == a]["semantic_correctness"].sum() for a in archs]
    clean_speech = [df[df["Architecture"] == a]["clean_speech_text"].sum() for a in archs]
    task_success = [df[df["Architecture"] == a]["final_strict_task_success"].sum() for a in archs]

    x = np.arange(len(archs))
    width = 0.20

    b1 = ax.bar(x - 1.5*width, exec_success, width, label="Execution Completion (Audio emitted)", color="#64748B", edgecolor="#1E293B", zorder=3)
    b2 = ax.bar(x - 0.5*width, sem_correct, width, label="Semantic Correctness (Factual accuracy)", color="#38BDF8", edgecolor="#0369A1", zorder=3)
    b3 = ax.bar(x + 0.5*width, clean_speech, width, label="Clean Speech Text (No leaked tags/XML)", color="#F59E0B", edgecolor="#B45309", zorder=3)
    b4 = ax.bar(x + 1.5*width, task_success, width, label="Strict Task Success (Exact contract met)", color="#10B981", edgecolor="#064E3B", zorder=3)

    for bar in list(b1) + list(b2) + list(b3) + list(b4):
        h = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2., h + 0.4, f"{int(h)}", ha="center", va="bottom", fontsize=7.5, fontweight="bold")

    ax.set_ylabel("Count of Cases (out of 25)")
    ax.set_title("PrismLab P3.6: Multi-Dimensional Reliability Audit", pad=12)
    ax.set_xticks(x)
    ax.set_xticklabels(labels)
    ax.set_ylim(0, 30)
    ax.legend(framealpha=0.9, loc="upper right")

    fig.text(0.10, 0.02, "* Decouples pipeline execution from semantic truth, speech cleanliness, and strict prompt compliance.",
             fontsize=7.5, color="#64748B", style="italic")

    plt.tight_layout(rect=[0, 0.05, 1, 1])
    out_path = OUT_DIR / "reliability_comparison.png"
    plt.savefig(out_path)
    plt.close()
    print(f"Generated: {out_path}")

# -------------------------------------------------------------------------
# Figure 5: V1 to V2.1 Improvement
# -------------------------------------------------------------------------
def plot_v1_to_v21_improvement():
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(9.5, 4.5))

    metrics = ["Spatial\nAccuracy", "Clean Speech\nOutput", "Strict Task\nSuccess"]
    v1_scores = [0/5*100, 22/25*100, 15/25*100]
    v21_scores = [5/5*100, 24/25*100, 22/25*100]

    x = np.arange(len(metrics))
    width = 0.35

    ax1.bar(x - width/2, v1_scores, width, label="Modular V1", color=COLORS["modular"], edgecolor="#1E293B", zorder=3)
    ax1.bar(x + width/2, v21_scores, width, label="Modular V2.1", color=COLORS["modular_v21"], edgecolor="#1E293B", zorder=3)

    for i, (v1, v21) in enumerate(zip(v1_scores, v21_scores)):
        diff = v21 - v1
        ax1.annotate(f"+{diff:.0f}%", xy=(x[i] + width/2, v21 + 2), ha="center", fontsize=8.5, fontweight="bold", color="#065F46")

    ax1.set_ylabel("Rate (%)")
    ax1.set_title("Reliability & Reasoning Recovery", pad=10)
    ax1.set_xticks(x)
    ax1.set_xticklabels(metrics)
    ax1.set_ylim(0, 115)
    ax1.legend(loc="upper left")

    latency_cats = ["Median\nTotal Latency", "Median\nTTS Stage"]
    v1_lat = [27.70, 19.86]
    v21_lat = [20.18, 7.91]

    x2 = np.arange(len(latency_cats))
    ax2.bar(x2 - width/2, v1_lat, width, label="Modular V1 (n=23)", color=COLORS["modular"], edgecolor="#1E293B", zorder=3)
    ax2.bar(x2 + width/2, v21_lat, width, label="Modular V2.1 (n=24)", color=COLORS["modular_v21"], edgecolor="#1E293B", zorder=3)

    for i, (v1, v21) in enumerate(zip(v1_lat, v21_lat)):
        pct = (v1 - v21) / v1 * 100
        ax2.annotate(f"-{pct:.1f}%\n(-{v1-v21:.2f}s)", xy=(x2[i] + width/2, v21 + 1), ha="center", fontsize=8, fontweight="bold", color="#065F46")

    ax2.set_ylabel("Latency (seconds)")
    ax2.set_title("Wall-Clock Latency Reduction", pad=10)
    ax2.set_xticks(x2)
    ax2.set_xticklabels(latency_cats)
    ax2.set_ylim(0, 35)
    ax2.legend(loc="upper right")

    plt.suptitle("PrismLab Modular Optimization: V1 Baseline vs V2.1 Engineered Pipeline", y=0.98, fontsize=12)
    plt.tight_layout(rect=[0, 0.05, 1, 0.95])
    out_path = OUT_DIR / "v1_to_v21_improvement.png"
    plt.savefig(out_path)
    plt.close()
    print(f"Generated: {out_path}")

if __name__ == "__main__":
    plot_latency_comparison()
    plot_modular_stage_breakdown()
    plot_accuracy_by_category()
    plot_reliability_comparison()
    plot_v1_to_v21_improvement()
