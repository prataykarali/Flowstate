#!/usr/bin/env python3
"""Analyze the frozen PrismLab P4-E 18-clip benchmark without rerunning inference."""
from collections import Counter, defaultdict
from pathlib import Path
import hashlib
import json
import statistics

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "data/p4/validation_18/manifest_frozen.json"
RESULTS = ROOT / "results/p4/p4e18_frozen_eval.json"
REPORT = ROOT / "docs/p4/P4E_18_VALIDATION_RESULTS.md"
FIGURES = ROOT / "results/p4/figures"


def median_of(records, field):
    values = [r[field] for r in records if r.get(field) is not None and not r.get("error")]
    return statistics.median(values) if values else None


def display_seconds(value):
    return "N/A" if value is None else f"{value:.3f}"


def main():
    if not MANIFEST.is_file() or not RESULTS.is_file():
        raise SystemExit("Missing manifest_frozen.json or p4e18_frozen_eval.json")

    manifest_bytes = MANIFEST.read_bytes()
    sha = hashlib.sha256(manifest_bytes).hexdigest()
    manifest = json.loads(manifest_bytes)
    results = json.loads(RESULTS.read_text())

    if manifest.get("status") != "FROZEN_APPROVED":
        raise SystemExit("Manifest is not FROZEN_APPROVED")
    if sha != results.get("manifest_sha256"):
        raise SystemExit("STOP: Result file and frozen manifest hashes do not match")

    cases = {c["id"]: c for c in manifest["cases"]}
    trials = results.get("trials", [])
    trials_by_id = {r["case_id"]: r for r in trials}
    if len(cases) != 18 or len(trials) != 18 or len(trials_by_id) != 18:
        raise SystemExit("STOP: Dataset must contain 18 unique cases and 18 unique trials")
    if set(cases) != set(trials_by_id):
        raise SystemExit("STOP: Case IDs do not match frozen manifest")
    for case_id, r in trials_by_id.items():
        c = cases[case_id]
        for k, expected in (("expected", c["expected"]),
                            ("category", c["category"]),
                            ("sha256", c["sha256"])):
            if r.get(k) != expected:
                raise SystemExit(f"STOP: {case_id} {k} differs from frozen manifest")

    ordered = [trials_by_id[k] for k in sorted(cases)]
    by_category = {cat: [r for r in ordered if r["category"] == cat]
                   for cat in ("synthetic", "hybrid", "natural")}
    errors = [r for r in ordered if r.get("error")]
    passes = sum(bool(r["normalized_pass"]) for r in ordered)
    strict = sum(bool(r["strict_pass"]) for r in ordered)

    FIGURES.mkdir(parents=True, exist_ok=True)
    REPORT.parent.mkdir(parents=True, exist_ok=True)

    # Plot 1: Category accuracy
    labels = ["Synthetic", "Hybrid", "Natural"]
    nums = [sum(bool(r["normalized_pass"]) for r in by_category[c])
            for c in ("synthetic", "hybrid", "natural")]
    fig, ax = plt.subplots(figsize=(7.5, 4.5))
    bars = ax.bar(labels, [100 * n / 6 for n in nums])
    ax.set_ylim(0, 105)
    ax.set_ylabel("Normalized exact-label accuracy (%)")
    ax.set_title("PrismLab P4-E · Frozen 18-video validation")
    for bar, n in zip(bars, nums):
        ax.annotate(f"{n}/6", (bar.get_x()+bar.get_width()/2, bar.get_height()),
                    ha="center", va="bottom", xytext=(0, 4), textcoords="offset points")
    fig.tight_layout()
    fig.savefig(FIGURES / "p4e18_category_accuracy.png", dpi=180)
    plt.close(fig)

    # Plot 2: Temporal confusion matrix, never mixing natural task labels.
    temporal = by_category["synthetic"] + by_category["hybrid"]
    temporal_labels = ["BEFORE", "AFTER", "BOTH", "UNKNOWN"]
    matrix = [[sum(r["expected"] == exp and r["actual"].strip().upper().rstrip(".! ") == pred
                   for r in temporal)
               for pred in temporal_labels]
              for exp in temporal_labels]
    fig, ax = plt.subplots(figsize=(7.4, 5.5))
    ax.imshow(matrix, cmap="Blues", vmin=0, vmax=max(max(row) for row in matrix))
    ax.set_xticks(range(4), labels=temporal_labels)
    ax.set_yticks(range(4), labels=temporal_labels)
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Expected")
    ax.set_title("Temporal event-order confusion · 12 cases")
    for row in range(4):
        for col in range(4):
            ax.text(col, row, str(matrix[row][col]), ha="center", va="center")
    fig.tight_layout()
    fig.savefig(FIGURES / "p4e18_temporal_confusion.png", dpi=180)
    plt.close(fig)

    # Plot 3: TTFT and total per case in seconds.
    fig, ax = plt.subplots(figsize=(12, 4.8))
    xs = list(range(len(ordered)))
    ax.plot(xs, [r.get("ttft_s") for r in ordered], marker="o", label="TTFT")
    ax.plot(xs, [r.get("total_s") for r in ordered], marker="x", label="Total")
    ax.set_xticks(xs, [r["case_id"] for r in ordered], rotation=45)
    ax.set_ylabel("Seconds")
    ax.set_title("CPU inference timing by case")
    ax.grid(axis="y", alpha=.3)
    ax.legend()
    fig.tight_layout()
    fig.savefig(FIGURES / "p4e18_case_latency.png", dpi=180)
    plt.close(fig)

    body = [
        "# PrismLab P4-E · Frozen 18-video evaluation",
        "",
        "## Experiment and integrity",
        "",
        f"- Model API label: `{results.get('model','not recorded')}`; local CPU inference; model binary and exact server flags were not embedded in this results JSON.",
        f"- Frozen manifest SHA256: `{sha}`",
        f"- Cases/trials: {len(cases)}/{len(ordered)}; errors: {len(errors)}.",
        "- Fixed seed: 404 in the provided evaluation script; each case evaluated once (no repetitions).",
        "- Scoring: one correct label, permitting terminal punctuation, according to the frozen evaluation runner.",
        "- Six synthetic, six hybrid (original soundtrack replaced), and six natural (original soundtrack retained) cases.",
        "",
        "## Results",
        "",
        f"- Overall normalized correct: **{passes}/18 ({passes/18:.1%})**.",
        f"- Strict exact-token correct: **{strict}/18 ({strict/18:.1%})**.",
        f"- Median TTFT: **{display_seconds(median_of(ordered,'ttft_s'))} s**; median total: **{display_seconds(median_of(ordered,'total_s'))} s**.",
        "",
        "| Category | Correct | Accuracy | Median TTFT (s) | Median total (s) |",
        "|---|---:|---:|---:|---:|",
    ]
    for cat, rr in by_category.items():
        n = sum(bool(r["normalized_pass"]) for r in rr)
        body.append(f"| {cat} | {n}/{len(rr)} | {n/len(rr):.1%} | {display_seconds(median_of(rr, 'ttft_s'))} | {display_seconds(median_of(rr, 'total_s'))} |")

    body += [
        "",
        "### Temporal-order labels (synthetic + hybrid only)",
        "",
        "| Expected | Correct | Predictions |",
        "|---|---:|---|",
    ]
    for label in temporal_labels:
        rr = [r for r in temporal if r["expected"] == label]
        n = sum(bool(r["normalized_pass"]) for r in rr)
        observed = Counter(r["actual"].strip().upper().rstrip(".! ") for r in rr)
        distribution = ", ".join(f"{k}: {v}" for k, v in sorted(observed.items()))
        body.append(f"| {label} | {n}/{len(rr)} | {distribution} |")

    body += [
        "",
        "### Complete case-level record",
        "",
        "| Case | Type | Expected | Actual | Correct | TTFT (s) | Total (s) | Error |",
        "|---|---|---|---|---|---:|---:|---|",
    ]
    for r in ordered:
        safe_actual = str(r["actual"]).replace("|", "/").replace("\n", " ")
        safe_error = str(r.get("error") or "-").replace("|", "/").replace("\n", " ")
        body.append(
            f"| {r['case_id']} | {r['category']} | {r['expected']} | {safe_actual} | "
            f"{bool(r['normalized_pass'])} | {display_seconds(r.get('ttft_s'))} | "
            f"{display_seconds(r.get('total_s'))} | {safe_error} |"
        )

    body += [
        "",
        "## Figures",
        "",
        "![Accuracy by category](../../results/p4/figures/p4e18_category_accuracy.png)",
        "",
        "![Temporal confusion matrix](../../results/p4/figures/p4e18_temporal_confusion.png)",
        "",
        "![Inference latency](../../results/p4/figures/p4e18_case_latency.png)",
        "",
        "## Interpretation and limitations",
        "",
        "- Natural sound-source identification and temporal event-ordering are different tasks with different label sets and difficulty; do not attribute category differences solely to modality.",
        "- Controlled temporal cases share an event template and are not independent random samples; no generalization or statistical significance claims follow from the descriptive percentages.",
        "- Zero errors means the requests completed; it does not imply model correctness or robust runtime behavior on other inputs.",
        "- One inference per case, one prompt formulation and a small natural-video subset. No systematic audio-only/video-only ablations were performed for this frozen set.",
        "- Visible objects might cue natural source labels without audible recognition; this evaluation alone cannot establish cross-modal fusion.",
        "- Timing comes from the client streaming API; no per-trial peak RAM, peak VRAM or power measurements are present.",
        "- The older P4-E pilot, P4-E+ counterfactual test and P4-D image/audio evaluations are separate experiments, not pooled into these 18 trials.",
        "- Source licenses and attribution must be handled separately from this automatically generated analysis. Do not commit third-party video files by default.",
        "",
    ]
    REPORT.write_text("\n".join(body), encoding="utf-8")
    print("Verified frozen manifest SHA256:", sha)
    print(f"Completed: {passes}/18 normalized ({passes/18:.1%}); errors={len(errors)}")
    for cat, rr in by_category.items():
        print(f"  {cat}: {sum(bool(r['normalized_pass']) for r in rr)}/{len(rr)}")
    print(f"Median TTFT={median_of(ordered,'ttft_s'):.3f}s; median total={median_of(ordered,'total_s'):.3f}s")
    print("Saved report:", REPORT)
    print("Saved figures:", FIGURES)


if __name__ == "__main__":
    main()
