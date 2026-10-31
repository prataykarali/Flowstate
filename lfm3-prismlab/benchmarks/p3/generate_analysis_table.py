#!/usr/bin/env python3
"""Generate reconciled and graded canonical benchmark evaluation table for P3.6.

Reads: results/p3/reliability/p36_final_three_way.csv
Outputs:
- results/p3/reliability/p36_reconciled_graded.csv (Publishable dataset with repository-relative paths)

Delta's Refined Evaluation Rubric:
- Exact-Output Grading:
    Case I04 expects exactly 'No'. Modular V1 ('Yes or no: No...'), Modular V2.1 ('No, 4 is not greater than 9.'),
    and Native ('No, 4 is not greater than 9.') all contain additional explanations and fail strict task success.
    Case G03 (Native) is a valid abstention because it does not invent a notebook color -> Passes strict task success.
- Final Strict Task Success Totals:
    Modular V1: 15 / 25
    Modular V2.1: 22 / 25
    Native S2S: 24 / 25
- Historical Comparison (Prior Rubric without I04 strict exact-word requirement):
    Modular V1: 16 / 25
    Modular V2.1: 22 / 25
    Native S2S: 24 / 25
- Semantic Correctness:
    Modular V1: 17 / 25
    Modular V2.1: 24 / 24 completed runs (24 / 25 overall)
    Native S2S: 25 / 25
- Sample Counts:
    Modular V1: 23 timed (2 recovered G01, S01 excluded), median 27.70 s
    Modular V2.1: 24 timed (1 G02 word limit failure excluded), median 20.18 s
    Native S2S: 23 timed (2 recovered G01, S01 excluded), median 13.95 s
"""
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
INPUT_CSV = ROOT / "results/p3/reliability/p36_final_three_way.csv"
OUTPUT_CSV = ROOT / "results/p3/reliability/p36_reconciled_graded.csv"

def evaluate_row(r):
    cid = r["ID"]
    arch = r["Architecture"]
    status = r["Status"]
    ans = str(r["Answer"]) if pd.notna(r["Answer"]) else ""

    # 1. Execution Success: pipeline completed without crash and emitted audio
    exec_success = 1 if status in ["ok", "recovered"] else 0

    # 2. Semantic Correctness: factual correctness of response content regardless of length or formatting
    sem_correct = 0
    if exec_success:
        if arch == "modular":
            # Failed: S01-S05 (refusal), F03 (raw tool XML), I02 (unclosed think tag), L01 (refusal)
            # Passed (17 cases): G01-G05, F01, F02, F04, F05, I01, I03, I04, I05, L02, L03, L04, L05
            if cid not in ["S01", "S02", "S03", "S04", "S05", "F03", "I02", "L01"]:
                sem_correct = 1
        elif arch == "modular_v21":
            # G02 failed execution. All 24 completed runs are factually correct.
            sem_correct = 1
        elif arch == "native":
            # All 25 runs are factually correct.
            sem_correct = 1

    # 3. Clean Speech Text: free of unstripped think tags, tool call blocks, or code fences
    clean_speech = 0
    if exec_success and ans:
        if not ("<think>" in ans or "</think>" in ans or "<tool_call>" in ans or "```" in ans):
            clean_speech = 1

    # 4. Prior Strict Task Success (Historical Rubric):
    prior_strict = 0
    if arch == "modular":
        if cid not in ["S01", "S02", "S03", "S04", "S05", "F01", "F03", "I02", "L01"]:
            prior_strict = 1
    elif arch == "modular_v21":
        if exec_success and cid not in ["I02", "L05"]:
            prior_strict = 1
    elif arch == "native":
        if cid != "G03":
            prior_strict = 1

    # 5. Final Strict Task Success (Refined Exact-Output Rubric):
    # I04: expects exactly 'No'. V1, V2.1, and Native all contain explanation and fail.
    # G03: Native is a valid abstention (does not invent color) -> Pass.
    # L01-L05: Linguistic-precision tests evaluate semantic precision, not exact-output constraint;
    #          all 5 V2.1 linguistic cases correctly answer their questions -> Pass.
    final_strict = 0
    if arch == "modular":
        if cid not in ["S01", "S02", "S03", "S04", "S05", "F01", "F03", "I02", "I04", "L01"]:
            final_strict = 1
    elif arch == "modular_v21":
        if exec_success and cid not in ["I02", "I04"]:
            final_strict = 1
    elif arch == "native":
        if cid != "I04":
            final_strict = 1

    return pd.Series({
        "execution_success": exec_success,
        "semantic_correctness": sem_correct,
        "clean_speech_text": clean_speech,
        "prior_strict_task_success": prior_strict,
        "final_strict_task_success": final_strict
    })

def make_relative_path(val):
    if pd.isna(val):
        return val
    s = str(val)
    # Strip any absolute path prefix up to 'lfm3-prismlab/' or match ROOT
    root_str = str(ROOT)
    if s.startswith(root_str):
        rel = s[len(root_str):].lstrip("/")
        return rel
    if "lfm3-prismlab/" in s:
        return s.split("lfm3-prismlab/", 1)[1]
    return s

def main():
    df = pd.read_csv(INPUT_CSV)
    eval_cols = df.apply(evaluate_row, axis=1)
    out_df = pd.concat([df, eval_cols], axis=1)

    # Sanitize WAV column for public portability
    out_df["WAV"] = out_df["WAV"].apply(make_relative_path)

    out_df.to_csv(OUTPUT_CSV, index=False)
    print(f"Saved reconciled, portable and graded benchmark table to: {OUTPUT_CSV}")
    print("\nSummary by Architecture:")
    summary = out_df.groupby("Architecture")[[
        "execution_success", "semantic_correctness", "clean_speech_text",
        "prior_strict_task_success", "final_strict_task_success"
    ]].sum()
    print(summary)

    print("\nCategory Breakdown for Final Strict Task Success:")
    print(pd.crosstab(out_df["Category"], out_df["Architecture"], values=out_df["final_strict_task_success"], aggfunc="sum"))

if __name__ == "__main__":
    main()
