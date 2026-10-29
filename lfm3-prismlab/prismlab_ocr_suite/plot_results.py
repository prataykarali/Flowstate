"""Plot measured PrismLab OCR / VL-only vs VL->Text results (no invented measurements)."""
from pathlib import Path
import argparse
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

ROOT=Path(__file__).resolve().parent

ap=argparse.ArgumentParser()
ap.add_argument('--csv',default=str(ROOT/'results'/'full_results.csv'))
a=ap.parse_args()
df=pd.read_csv(a.csv)
if 'error' in df.columns:
    df=df[df['error'].isna()]
if df.empty: raise SystemExit('No completed measurements to plot.')

out=ROOT/'results';out.mkdir(exist_ok=True)
# Figure 1: per-case direct versus pipeline end-to-end latency
x=np.arange(len(df));fig,ax=plt.subplots(figsize=(max(9,0.88*len(df)),5))
if 'pipeline_latency_s' in df and df['pipeline_latency_s'].notna().any():
    w=.38
    ax.bar(x-w/2,df['direct_latency_s'],w,label='VL-only')
    ax.bar(x+w/2,df['pipeline_latency_s'],w,label='VL OCR + Text')
else:
    ax.bar(x,df['direct_latency_s'],.65,label='VL-only')
ax.set_xticks(x,df['id'].astype(str).tolist())
ax.set_xlabel('Test image ID');ax.set_ylabel('Measured total latency (seconds)')
ax.set_title('PrismLab: end-to-end latency per test image');ax.legend()
ax.grid(axis='y',alpha=.2);fig.tight_layout()
fig.savefig(out/'latency_comparison.png',dpi=170);plt.close(fig)
# Figure 2: strict question answer correctness per test, and OCR key-phrase recall
if 'pipeline_exact' in df and df['pipeline_exact'].notna().any():
    fig,ax=plt.subplots(figsize=(max(9,.88*len(df)),5))
    ax.bar(x-.23,df['direct_exact'].astype(int),.46,label='VL-only exact answer')
    ax.bar(x+.23,df['pipeline_exact'].astype(int),.46,label='VL OCR -> Text exact answer')
    ax.set_xticks(x,df['id'].astype(str).tolist())
    ax.set_ylim(0,1.15);ax.set_yticks([0,1],['Incorrect','Correct'])
    ax.set_xlabel('Test image ID');ax.set_title('Exact-answer accuracy by image')
    ax.legend();fig.tight_layout()
    fig.savefig(out/'answer_accuracy.png',dpi=170);plt.close(fig)
if 'ocr_phrase_recall' in df and df['ocr_phrase_recall'].notna().any():
    fig,ax=plt.subplots(figsize=(max(9,.88*len(df)),5))
    b=ax.bar(df['id'].astype(str),df['ocr_phrase_recall']*100)
    ax.set_xlabel('Test image ID');ax.set_ylabel('Exact key-phrase recall (%)')
    ax.set_ylim(0,112)
    ax.bar_label(b,labels=[f'{v:.0%}' for v in df['ocr_phrase_recall']],padding=3)
    ax.set_title('Vision-model OCR: known phrase recall')
    fig.tight_layout();fig.savefig(out/'ocr_phrase_recall.png',dpi=170);plt.close(fig)

print('Completed cases:',len(df))
print('VL-only exact-answer fraction:',round(df['direct_exact'].astype(float).mean(),3))
print('VL-only mean latency:',round(df['direct_latency_s'].mean(),2),'s')
if 'pipeline_exact' in df and df['pipeline_exact'].notna().any():
    print('VL+Text exact-answer fraction:',round(df['pipeline_exact'].astype(float).mean(),3))
    print('VL+Text mean latency:',round(df['pipeline_latency_s'].mean(),2),'s')
if 'ocr_phrase_recall' in df and df['ocr_phrase_recall'].notna().any():
    print('OCR mean phrase recall:',round(df['ocr_phrase_recall'].mean(),3))
print('Figures saved in:',out.resolve())
