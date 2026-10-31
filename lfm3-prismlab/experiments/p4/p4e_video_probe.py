#!/usr/bin/env python3
"""P4-E local llama-server input_video smoke test. Measures TTFT (stream) and total latency.

Send video bytes as raw base64, compatible with llama.cpp b12004 input_video.
"""
import argparse
import base64
import hashlib
import json
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[2]
PILOT = ROOT / 'data/p4/temporal_pilot'
RESULTS = ROOT / 'results/p4/p4e_pilot_runs.jsonl'

def file_hash(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--id', default='S01',help='Case ID, e.g. S01, S02, H01, H02, R01, R02')
    p.add_argument('--dry-run',action='store_true')
    p.add_argument('--url',default='http://127.0.0.1:8083')
    p.add_argument('--max-tokens',type=int,default=96)
    p.add_argument('--no-stream',action='store_true')
    args=p.parse_args()
    man_path=PILOT/'pilot_manifest.json'
    manifest=json.loads(man_path.read_text())
    case=next((x for x in manifest['clips'] if x['id']==args.id),None)
    if not case:p.error(f'Case {args.id!r} not in {man_path}')
    path=PILOT/case['file']
    if not path.exists():p.error(f'Missing {path}. Run p4e_build_pilot.py first.')
    actual_sha=file_hash(path)
    if actual_sha!=case.get('sha256'):p.error('Clip hash mismatch: rebuild the pilot manifest before use')
    info=subprocess.run(['ffprobe','-v','error','-show_entries','stream=codec_type','-of','json',str(path)],capture_output=True,text=True,check=True)
    tracks={x['codec_type'] for x in json.loads(info.stdout)['streams']}
    if tracks!={'audio','video'}:p.error(f'Missing audio/video track: {tracks}')
    print(f'Case: {args.id} | {case["kind"]} | expected={case["expected"]} | sha256={actual_sha[:12]}')
    print(f'Question: {case["question"]}')
    print('Clip has audio+video, content hash checked')
    if args.dry_run:return
    endpoint=args.url.rstrip('/')+'/v1/chat/completions'
    try:
        status=requests.get(args.url.rstrip('/')+'/v1/models',timeout=10)
        status.raise_for_status()
    except requests.RequestException as e:
        p.error(f'Omni server unavailable: {e}')
    payload={
        'model':'lfm3-omni',
        'temperature':0,
        'max_tokens':args.max_tokens,
        'stream':not args.no_stream,
        'messages':[
          {'role':'system','content':'Answer questions about the video using what you see and hear. Respond with only the requested answer, without explanation.'},
          {'role':'user','content':[
             {'type':'input_video','input_video':{'data':base64.b64encode(path.read_bytes()).decode('ascii')}},
             {'type':'text','text':case['question']}
          ]}
        ]
    }
    start=time.perf_counter()
    first_content=None
    chunks=[]
    finish=None
    err=None
    try:
        with requests.post(endpoint,json=payload,stream=not args.no_stream,timeout=420) as response:
            if response.status_code>=400:
                raise RuntimeError(f'HTTP {response.status_code}: {response.text[:800]}')
            if args.no_stream:
                data=response.json(); choice=data['choices'][0]
                answer=choice.get('message',{}).get('content') or ''
                chunks=[answer];finish=choice.get('finish_reason')
            else:
                for line in response.iter_lines(decode_unicode=True):
                    if not line or not line.startswith('data:'):continue
                    raw=line[5:].strip()
                    if raw=='[DONE]':break
                    try: ev=json.loads(raw)
                    except json.JSONDecodeError:continue
                    if ev.get('error'):raise RuntimeError(str(ev['error'])[:500])
                    for choice in ev.get('choices',[]):
                        delta=choice.get('delta',{})
                        part=delta.get('content')
                        if isinstance(part,str) and part:
                            if first_content is None:first_content=time.perf_counter()-start
                            chunks.append(part)
                        if choice.get('finish_reason'):finish=choice['finish_reason']
    except Exception as e:
        err=f'{type(e).__name__}: {e}'
    total=round(time.perf_counter()-start,3)
    answer=''.join(chunks).strip()
    strict=(answer.strip(' .!?\n\t"\'').lower()==str(case['expected']).lower()) if not err else False
    record={
      'case_id':args.id,'file':case['file'],'sha256':actual_sha,
      'timestamp_utc':datetime.now(timezone.utc).isoformat(),
      'input_type':'raw_mp4_with_soundtrack','question':case['question'],
      'expected':case['expected'],'actual':answer,'strict_pass':strict,
      'ttft_s':round(first_content,3) if first_content is not None else None,
      'total_s':total,'streamed':not args.no_stream,'finish_reason':finish,
      'error':err,'model':'lfm3-omni','cpu_config_note':'Check server -ngl 0 at runtime'
    }
    RESULTS.parent.mkdir(parents=True,exist_ok=True)
    with RESULTS.open('a') as f:f.write(json.dumps(record,ensure_ascii=False)+'\n')
    print(json.dumps(record,indent=2,ensure_ascii=False))
    if err:raise SystemExit(1)

if __name__=='__main__':main()
