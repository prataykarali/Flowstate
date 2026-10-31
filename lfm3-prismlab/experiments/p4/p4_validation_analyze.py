#!/usr/bin/env python3
"""Case-clustered analysis for paired PrismLab validation runs.

Accuracy uncertainty resamples independent case IDs, NOT repeated same-case trials.
Repeated trials quantify reproducibility / latency variability; they are not new cases.
Outputs CSV and JSON beside the supplied results. Requires numpy.
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import statistics
from pathlib import Path

import numpy as np


def pctl(numbers, percentile):
    return float(np.quantile(np.asarray(numbers, dtype=float), percentile))


def exact_sign_p(differences, tol=1e-9):
    plus = sum(x > tol for x in differences)
    minus = sum(x < -tol for x in differences)
    n = plus+minus
    if n == 0:
        return 1.0
    k = min(plus, minus)
    return min(1.0, 2.0*sum(math.comb(n, i) for i in range(k+1))/2**n)


def inspect(path, expected_phase):
    report = json.loads(path.read_text())
    if report['phase'] != expected_phase:
        raise ValueError(f'{path}: expected {expected_phase} data')
    trials = report['trials']
    expected_count = report['case_count']*report['repeats']
    if len(trials) != expected_count:
        raise ValueError(f'{path}: {len(trials)} trials, expected {expected_count}')
    seen = {(r['repeat'], r['id']) for r in trials}
    if len(seen) != expected_count:
        raise ValueError(f'{path}: missing/duplicate case/repeat keys')
    by = {}
    for row in trials:
        by.setdefault(row['id'], []).append(row)
    if len(by) != report['case_count']:
        raise ValueError('Case ID count mismatch')
    return report, by


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--native', type=Path, required=True)
    p.add_argument('--modular', type=Path, required=True)
    p.add_argument('--bootstrap', type=int, default=10000)
    p.add_argument('--seed', type=int, default=2501)
    args = p.parse_args()
    if args.bootstrap < 1000:
        p.error('--bootstrap must be >= 1000')
    native, nrows = inspect(args.native, 'native')
    modular, mrows = inspect(args.modular, 'modular')
    for key in ('manifest_sha256', 'dataset', 'case_count', 'repeats', 'seed'):
        if native[key] != modular[key]:
            raise ValueError(f'Mismatched run conditions: {key}')
    if set(nrows) != set(mrows):
        raise ValueError('Case IDs differ')
    if native['temperature'] != modular['temperature']:
        raise ValueError('Temperature differs')
    ncases = len(nrows)
    rows = []
    for case in sorted(nrows):
        a, b = nrows[case], mrows[case]
        if any(x['image_sha256'] != a[0]['image_sha256'] or
               x['audio_sha256'] != a[0]['audio_sha256'] or
               x['expected'] != a[0]['expected'] for x in a+b):
            raise ValueError(f'Input hashes/labels changed: {case}')
        aval = [int(x['strict_pass']) for x in a]
        bval = [int(x['strict_pass']) for x in b]
        # Failed executions count as incorrect for task accuracy.
        atime = [x['latency_s'] for x in a if x['status'] == 'ok']
        btime = [x['latency_s'] for x in b if x['status'] == 'ok']
        rows.append({
            'case_id': case,
            'condition': a[0]['condition'], 'expected': a[0]['expected'],
            'native_accuracy': statistics.mean(aval),
            'modular_accuracy': statistics.mean(bval),
            'accuracy_delta_modular_minus_native': statistics.mean(bval)-statistics.mean(aval),
            'native_executions_ok': len(atime),
            'modular_executions_ok': len(btime),
            'native_median_s': statistics.median(atime) if atime else math.nan,
            'modular_median_s': statistics.median(btime) if btime else math.nan,
            'native_mean_s': statistics.mean(atime) if atime else math.nan,
            'modular_mean_s': statistics.mean(btime) if btime else math.nan,
        })
    if any(math.isnan(r['native_mean_s']) or math.isnan(r['modular_mean_s']) for r in rows):
        raise ValueError('Some cases have zero successful executions; report execution failures first')

    d_acc = np.array([r['accuracy_delta_modular_minus_native'] for r in rows])
    d_latency = np.array([r['modular_mean_s']-r['native_mean_s'] for r in rows])
    rng = np.random.default_rng(args.seed)
    samples = rng.integers(0, ncases, size=(args.bootstrap, ncases))
    acc_boot = d_acc[samples].mean(axis=1)
    time_boot = d_latency[samples].mean(axis=1)
    # The holdout reuses five audio question templates. Resampling those
    # families as blocks is more conservative than treating all 40 pairs as
    # fully independent for a generalization claim.
    families = [r['condition'].split('_present')[0].split('_absent')[0] for r in rows]
    groups = sorted(set(families))
    blocks = {name: [i for i, value in enumerate(families) if value == name]
              for name in groups}
    block_acc, block_lat = [], []
    for _ in range(args.bootstrap):
        selected = rng.choice(groups, size=len(groups), replace=True)
        idx = [i for family in selected for i in blocks[family]]
        block_acc.append(float(d_acc[idx].mean()))
        block_lat.append(float(d_latency[idx].mean()))
    all_n = [x for group in nrows.values() for x in group]
    all_m = [x for group in mrows.values() for x in group]
    good_n = [x['latency_s'] for x in all_n if x['status'] == 'ok']
    good_m = [x['latency_s'] for x in all_m if x['status'] == 'ok']
    pairs = []
    for case in sorted(nrows):
        for a, b in zip(sorted(nrows[case], key=lambda x: x['repeat']),
                        sorted(mrows[case], key=lambda x: x['repeat'])):
            pairs.append((a, b))
    transitions = {'both_pass': 0, 'both_fail': 0,
                   'native_only': 0, 'modular_only': 0}
    for a,b in pairs:
        x,y = bool(a['strict_pass']),bool(b['strict_pass'])
        k = ('both_pass' if x and y else 'both_fail' if not x and not y
             else 'native_only' if x else 'modular_only')
        transitions[k] += 1
    # Exact McNemar is valid for ONE independent observation per case. We use
    # majority result for repeated trials; with even repeats, ties count as failures.
    case_discord = {'native_only': 0, 'modular_only': 0}
    for case in sorted(nrows):
        x = statistics.mean(bool(t['strict_pass']) for t in nrows[case]) > 0.5
        y = statistics.mean(bool(t['strict_pass']) for t in mrows[case]) > 0.5
        if x != y:
            case_discord['native_only' if x else 'modular_only'] += 1
    p_mcnemar = exact_sign_p([1]*case_discord['modular_only']+[-1]*case_discord['native_only'])
    summary = {
        'dataset': native['dataset'], 'manifest_sha256': native['manifest_sha256'],
        'independent_cases': ncases, 'repeats_per_case': native['repeats'],
        'trials_per_architecture': ncases*native['repeats'],
        'native_strict_rate': statistics.mean(int(x['strict_pass']) for x in all_n),
        'modular_strict_rate': statistics.mean(int(x['strict_pass']) for x in all_m),
        'paired_accuracy_difference_modular_minus_native': float(d_acc.mean()),
        'accuracy_diff_95pct_case_bootstrap_CI': [pctl(acc_boot,.025), pctl(acc_boot,.975)],
        'question_families': len(groups),
        'accuracy_diff_95pct_question_block_bootstrap_CI': [pctl(block_acc,.025), pctl(block_acc,.975)],
        'native_median_latency_s': statistics.median(good_n),
        'modular_median_latency_s': statistics.median(good_m),
        'native_p95_latency_s': pctl(good_n,.95),
        'modular_p95_latency_s': pctl(good_m,.95),
        'paired_case_mean_latency_diff_s': float(d_latency.mean()),
        'latency_diff_95pct_case_bootstrap_CI_s': [pctl(time_boot,.025), pctl(time_boot,.975)],
        'latency_diff_95pct_question_block_bootstrap_CI_s': [pctl(block_lat,.025), pctl(block_lat,.975)],
        'paired_case_latency_sign_test_p': exact_sign_p(d_latency),
        'case_level_majority_mcnemar_exact_p': p_mcnemar,
        'case_level_majority_discordance': case_discord,
        'per_trial_outcome_pairs_DESCRIPTIVE_ONLY': transitions,
        'native_execution_errors': sum(x['status'] != 'ok' for x in all_n),
        'modular_execution_errors': sum(x['status'] != 'ok' for x in all_m),
        'native_missing_relation_strict': [int(x['strict_pass']) for x in all_n if 'missing_' in x['condition'] or 'absent' in x['condition']],
        'modular_missing_relation_strict': [int(x['strict_pass']) for x in all_m if 'missing_' in x['condition'] or 'absent' in x['condition']],
        'caveat': ('Confidence intervals resample cases, not trials. On the previously observed 10-case dataset, '
                   'these reflect case variability/repeatability, not out-of-sample generalization. '
                   'Shared audio question templates and synthetically generated images induce dependency. '
                   'Question-family block intervals are more conservative but include only five families. '
                   'Server residency and phase order may confound latency differences.'),
    }
    prefix = args.native.parent / f'analysis_{args.native.stem.removesuffix("_native")}'
    out_json = prefix.with_suffix('.json')
    out_csv = prefix.with_suffix('.csv')
    out_json.write_text(json.dumps(summary, indent=2))
    with out_csv.open('w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    print('\n=== PAIRED STATISTICAL SUMMARY ===')
    print('Dataset:', summary['dataset'])
    print('Independent cases:', ncases, '| repeat trials each:', native['repeats'])
    print('Strict accuracy:', f"native {summary['native_strict_rate']:.1%}",
          f"modular {summary['modular_strict_rate']:.1%}")
    print('Accuracy delta (modular-native):', f"{summary['paired_accuracy_difference_modular_minus_native']:+.1%}",
          '95% case bootstrap CI:', summary['accuracy_diff_95pct_case_bootstrap_CI'])
    print('Latency median (s):', summary['native_median_latency_s'], summary['modular_median_latency_s'])
    print('Paired mean latency delta (s), case-clustered CI:',
          round(summary['paired_case_mean_latency_diff_s'], 3),
          summary['latency_diff_95pct_case_bootstrap_CI_s'])
    print('Exact case-level McNemar p:', p_mcnemar)
    print('Outputs:', out_csv, out_json)
    print('NOTE: statistical significance is not guaranteed; case-count and selection bias still matter.')


if __name__ == '__main__':
    main()
