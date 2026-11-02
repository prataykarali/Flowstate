#!/usr/bin/env python3
"""PrismLab P7 release preparation: local evidence audit and draft report.

Run from lfm3-prismlab: python3 experiments/p7/p7_release_prep.py
Uses only the standard library; never runs inference, downloads, edits README,
or overwrites existing final reports.
"""
from __future__ import annotations

import hashlib
import json
from collections import Counter
from pathlib import Path

ROOT = Path.cwd().resolve()
DATA = ROOT / "results/p7/final"
DOC = ROOT / "docs/p7"
FIG = DOC / "figures"
MAPS = ROOT / "results/p7/architecture/component_maps.json"
TRACE = ROOT / "results/p7/architecture/p7_2_source_trace.json"
P5 = DATA / "p5_evidence_summary.json"
OUT = DOC / "P7_FINAL_REPORT_CANDIDATE.md"
SNIPPET = DOC / "P7_ROOT_README_SECTION_CANDIDATE.md"


def need(path: Path) -> Path:
    if not path.is_file():
        raise FileNotFoundError(f"Required evidence missing: {path.relative_to(ROOT)}")
    return path


def load(path: Path):
    return json.loads(need(path).read_text())


def observed(group, key):
    return group.get("observations", {}).get(key)


def pct(n, d):
    return f"{100*n/d:.1f}%" if d else "not established"


def link(root_relative, label=None):
    p = Path(root_relative)
    return f"[{label or p.name}](../../{p.as_posix()})"


def safe_write(path, content):
    if path.exists():
        raise FileExistsError(f"Refusing to overwrite existing draft: {path}")
    path.write_text(content, encoding="utf-8")
    print("[CREATED]", path.relative_to(ROOT))


def main():
    for folder in (DATA, DOC, FIG):
        if not folder.is_dir():
            raise FileNotFoundError(f"Missing directory: {folder}")

    components = load(MAPS)
    trace = load(TRACE)
    p5 = load(P5)
    aliases = ("text", "vision", "audio", "omni", "d1", "d1_omni")
    assert set(aliases).issubset(components), "Six-model architecture inventory incomplete"
    assert set(aliases).issubset(trace), "Six-model source trace incomplete"
    assert all(trace[k]["config_matches_saved"] for k in aliases)

    figpaths = []
    for number in range(1, 6):
        matches = sorted(FIG.glob(f"p7_{number:02}_*.png"))
        assert len(matches) == 1, (number, matches)
        svg = matches[0].with_suffix(".svg")
        need(svg)
        figpaths.append(matches[0])

    for alias in aliases:
        need(ROOT / f"visuals/mermaid/p7_execution_v1/p7_{alias}.mmd")
        need(ROOT / f"visuals/p7/models/{alias}_v2.html")
    need(ROOT / "visuals/PrismLabs_Architecture_Extended_P7_NAV_v2.html")

    key = {
        "route": "P5.2 routing pilot",
        "stress": "P5.3 routing stress",
        "audio": "P5.6b audio vs transcript oracle",
        "integration": "P5.7 gated integration",
    }
    assert all(name in p5 for name in key.values()), "Incomplete P5 sources"
    route = p5[key["route"]]["observations"]
    stress = p5[key["stress"]]["observations"]
    audio = p5[key["audio"]]["observations"]
    integ = p5[key["integration"]]["observations"]

    n_route = route["successful"]
    n_stress = stress["successful_cases"]
    assert n_route == 24 and n_stress == 24
    assert len(route["failed_route_ids"]) == 1
    assert len(stress["routing_failures"]) == 4
    assert audio["fully_paired_cases"] == 12
    assert audio["audio"]["valid"] == 12 and audio["text_oracle"]["valid"] == 12

    raw_summary = ROOT / p5[key["integration"]]["source_path"]
    raw_path = raw_summary.with_name(raw_summary.name.replace("_summary.json", ".jsonl"))
    need(raw_path)
    raw = [json.loads(line) for line in raw_path.read_text().splitlines() if line.strip()]
    assert len(raw) == integ["total_cases"], "P5.7 raw record count differs from summary"
    assert len({r["id"] for r in raw}) == len(raw), "Duplicate P5.7 case IDs"
    auto = [r for r in raw if r.get("decision") == "AUTO_RECOMMEND"]
    assert len(auto) == integ["auto_recommendations"]
    labeled = [r for r in raw if r.get("model_called") and r.get("correct") is not None]
    assert len(labeled) == integ["labeled_inferences"]
    assert sum(r["correct"] is True for r in labeled) / len(labeled) == integ["labeled_accuracy"]
    auto_labeled = [r for r in auto if r.get("correct") is not None]
    wrong_auto = [r for r in auto_labeled if r["correct"] is False]
    unscored_auto = [r for r in auto if r.get("correct") is None]
    assert not unscored_auto, "Auto-recommended cases include unscored decisions; investigate"

    figures = "\n".join(
        f"- {link(str(p.relative_to(ROOT)), p.stem.replace('_',' '))} · "
        f"{link(str(p.with_suffix('.svg').relative_to(ROOT)), 'SVG')}"
        for p in figpaths
    )
    revisions = "\n".join(
        f"| {components[k]['name']} | `{trace[k]['revision']}` | "
        + ", ".join(f"{p['title']} {p['layers']}L" for p in components[k]['parts'])
        + " |" for k in aliases
    )
    wrong_lines = "\n".join(
        f"- `{r['id']}`: expected `{r.get('expected')}`, predicted "
        f"`{r.get('prediction')}`, confidence `{r.get('confidence')}`"
        for r in wrong_auto
    ) or "- No incorrect auto-recommendations found in this specific run."
    report = f"""# PrismLab P7 — Final Research Synthesis (release candidate)

**Status:** Candidate pending final visual QA, README reconciliation and regression checks.  
**Evidence:** Official revision-pinned model configurations and source traces, P2–P6 phase reports, local P5 summary JSONs, and the linked raw P5.7 case records.  
**Hardware:** Local CPU-first llama.cpp prototype; results are not cloud-service benchmarks.

## 1. Architecture inventory and provenance

| Model | Source revision | Configured component groups |
|---|---|---|
{revisions}

The architecture figures reflect configured component structure. High-level links are **not** a proof of each internal tensor operation. The two d1 models use `D1Model` and SystemOne decision interfaces; decision scoring should not be treated as language-model token generation.

## 2. Phase-local benchmark results

| Suite | Direct/native | Modular | Median time: direct/native vs modular |
|---|---|---|---|
| P2 synthetic OCR (10 cases) | 10/10 | 9/10 | 38.53 s vs 65.72 s |
| P3 speech (25 cases) | 24/25 | 22/25 (V2.1) | 13.95 s (n=23) vs 20.18 s (n=24) |
| P4 matched AV holdout (40 cases) | 25/40 | 28/40 (ASR → VL) | 20.919 s vs 21.288 s |

These are **different benchmarks and evaluation rubrics**. Do not compare the percentages across phases to rank models. P4 paired advantage was 7.5 percentage points with exact McNemar p=0.25: **not statistically significant at 0.05**. P4 video temporal ordering remained unreliable in a small exploratory pilot.

Primary reports: {link('docs/p2/README.md', 'P2')}, {link('docs/p3/README.md', 'P3')}, {link('docs/p4/P4_FINAL_REPORT.md', 'P4')}.

## 3. P5 decision intelligence: recorded case counts

- P5.2 routing pilot: **{n_route-len(route['failed_route_ids'])}/{n_route} ({pct(n_route-len(route['failed_route_ids']),n_route)})**, p50 **{route['latency_p50_s']:.4f} s**.
- P5.3 stress routing: **{n_stress-len(stress['routing_failures'])}/{n_stress} ({pct(n_stress-len(stress['routing_failures']),n_stress)})**, p50 **{stress['latency_p50_s']:.4f} s**.
- P5.6b synthetic speech: audio **{audio['audio']['correct']}/12**; exact text oracle **{audio['text_oracle']['correct']}/12**. A text oracle is **not** an ASR pipeline; these results do not establish real-world speech accuracy.
- P5.7 integrated run: **{integ['successful_records']}/{integ['total_cases']} records processed**, **{integ['model_requests']} model calls**, **{integ['blocked_without_model_call']} guard-blocked requests**, **{sum(r['correct'] is True for r in labeled)}/{len(labeled)} labeled inferences correct**. Threshold **{integ['threshold']}** was selected **post hoc**.
- P5.7 auto-recommendations: **{len(auto_labeled)-len(wrong_auto)}/{len(auto_labeled)} correctly labeled**, **{len(wrong_auto)} incorrect auto-recommendation(s)**. Note this is a small selected exploratory run, not a generalizable selective-accuracy estimate.

### P5.7 incorrect auto-recommendation audit

{wrong_lines}

**Safety caveat:** `review_required_auto_accepted` only checks explicitly marked `must_review` records; an empty list does not establish correct accepted predictions. `AUTO_RECOMMEND` is an advisory label; no external billing, refund or device action was executed. Confidence values are not production-calibrated.

P5 raw summary: `{p5[key['integration']]['source_path']}`  
P5 raw cases: `{raw_path.relative_to(ROOT)}`  
Consolidated P5 records: `{P5.relative_to(ROOT)}`

## 4. P6 orchestration

The final P6 report records all six models passing direct and orchestrated CPU inference paths, with **90/90 offline regression tests**. This count measures regression assertions; it must **not** be described as model-answer accuracy. P6 remains a research prototype; external actions require separate authorization.

See {link('docs/p6/README.md', 'P6 report')}.

## 5. Figures

{figures}

## 6. Visual architecture explorer

- [Main interactive model navigator](../../visuals/PrismLabs_Architecture_Extended_P7_NAV_v2.html)
- Six detailed animated HTML model pages under `visuals/p7/models/`.
- Editable source overview graphs under `visuals/mermaid/p7_execution_v1/`.
- Animations illustrate architecture paths and are **not** proof of runtime execution timing.

## 7. Known limitations and release QA

- Small synthetic benchmarks, varying tasks and model quantizations.
- P5 post-hoc threshold; known erroneous accepted decision.
- P4 missing-spatial-relation refusals/abstention and temporal-alignment limitations.
- Config/source trace does not establish all tensor-level computations.
- Run P6/P7 test suites and click through all six pages; check node label overflow and keyboard interaction.
- Reconcile the root README's stale model deployment table and early-stage P5 description before release.
"""
    snippet = f"""## P7 — Architecture audit and research synthesis

Six official, revision-pinned model configuration families were inspected and mapped into an interactive SVG architecture explorer. The P7 notebook generated five research figures with phase-specific P2–P4 comparisons and a separately qualified P5 decision analysis.

- [P7 final research synthesis](docs/p7/P7_FINAL_REPORT_CANDIDATE.md)
- [P7 notebook](notebooks/PrismLab_P7_Final_Research_Synthesis_v1_1.ipynb)
- [Interactive six-model architecture](visuals/PrismLabs_Architecture_Extended_P7_NAV_v2.html)
- [P6 orchestration report](docs/p6/README.md)

**Deployment note:** P6 confirms that all six model pathways executed directly and through orchestration in a *local CPU research prototype*. This does not imply simultaneous persistent deployment, a public endpoint or production calibration. Decision outputs remain advisory.

**P5 safety note:** The integrated evaluation included **{len(wrong_auto)} incorrect auto-recommendation(s) among {len(auto_labeled)} labeled accepted cases**, despite a threshold of {integ['threshold']} selected post hoc. No external action was executed.
"""
    safe_write(OUT, report)
    safe_write(SNIPPET, snippet)
    print(f"[P5.7] {len(labeled)} labeled; {len(auto_labeled)} auto-recommended; {len(wrong_auto)} incorrect auto-recommended")
    for item in wrong_auto:
        print(f"  [REVIEW] {item['id']}: expected={item.get('expected')}, predicted={item.get('prediction')}, confidence={item.get('confidence')}")
    print("[OK] P7 report candidate and root README insertion created. README.md was NOT changed.")

if __name__ == "__main__":
    main()
