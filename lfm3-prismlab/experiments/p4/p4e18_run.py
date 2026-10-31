#!/usr/bin/env python3
"""Stream a frozen P4-E video validation set to local Omni, save after each trial."""
import argparse, base64, datetime, hashlib, json, random, re, time, urllib.request, urllib.error
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
DATA=ROOT/'data/p4/validation_18'
RESULT=ROOT/'results/p4/p4e18_frozen_eval.json'

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def score(answer,expected):
    # Sentence punctuation allowed, but no explanations or multiple conflicting labels.
    pattern=r'^\s*'+re.escape(expected)+r'\s*[.!]?\s*$'
    return bool(re.fullmatch(pattern,answer,flags=re.I))

def one(case,endpoint,timeout=360):
    video=DATA/case['file'];raw=video.read_bytes();assert hashlib.sha256(raw).hexdigest()==case['sha256']
    payload={'model':'lfm3-omni','temperature':0,'max_tokens':64,'stream':True,
        'messages':[{'role':'system','content':('Respond with one choice token only. Do not guess if the evidence is absent. '
           'Use UNKNOWN when you cannot determine an answer from audio/video.')},
           {'role':'user','content':[{'type':'input_video','input_video':{'data':base64.b64encode(raw).decode('ascii')}},
             {'type':'text','text':case['question']}]}]}
    req=urllib.request.Request(endpoint,json.dumps(payload).encode(),{'Content-Type':'application/json'})
    t0=time.perf_counter();ttft=None;tokens=[];finish=None;error=None
    try:
       with urllib.request.urlopen(req,timeout=timeout) as resp:
          for line in resp:
             line=line.decode('utf-8','replace').strip()
             if not line.startswith('data:'):continue
             raw_event=line[5:].strip()
             if raw_event=='[DONE]':break
             event=json.loads(raw_event)
             if event.get('error'):raise RuntimeError(str(event['error']))
             for choice in event.get('choices',[]):
                 finish=choice.get('finish_reason') or finish
                 token=choice.get('delta',{}).get('content','')
                 if token:
                    if ttft is None:ttft=time.perf_counter()-t0
                    tokens.append(token)
    except Exception as exc:error=str(exc)
    actual=''.join(tokens).strip();t=time.perf_counter()-t0
    return {'case_id':case['id'],'category':case['category'],'expected':case['expected'],'actual':actual,
            'strict_pass':actual.upper()==case['expected'],'normalized_pass':score(actual,case['expected']),
            'ttft_s':round(ttft,3) if ttft is not None else None,'total_s':round(t,3),
            'error':error,'finish_reason':finish,'sha256':case['sha256'],
            'timestamp_utc':datetime.datetime.now(datetime.timezone.utc).isoformat()}

def main():
    p=argparse.ArgumentParser();p.add_argument('--dry-run',action='store_true');p.add_argument('--endpoint',default='http://127.0.0.1:8083/v1/chat/completions');p.add_argument('--seed',type=int,default=404);args=p.parse_args()
    manifest=DATA/'manifest_frozen.json'
    if not manifest.exists():raise SystemExit('Need approved frozen manifest: python experiments/p4/p4e18_review.py --freeze')
    data=json.loads(manifest.read_text());assert data['status']=='FROZEN_APPROVED' and len(data['cases'])==18
    for c in data['cases']:
       media=DATA/c['file'];assert c['human_reviewed'] and media.is_file() and sha(media)==c['sha256']
    print('Frozen cases=18; dataset verified',sha(manifest))
    if args.dry_run:
       for c in data['cases']:print(c['id'],c['category'],c['expected'],c['file'])
       return
    order=list(data['cases']);random.Random(args.seed).shuffle(order)
    existing={}
    if RESULT.exists():
      old=json.loads(RESULT.read_text())
      if old['manifest_sha256']!=sha(manifest):raise SystemExit('Existing result belongs to a different frozen manifest. Move it aside before rerunning.')
      existing={r['case_id']:r for r in old['trials']}
    print(f'Continuing from {len(existing)}/18 stored trials.')
    for c in order:
       if c['id'] in existing:continue
       r=one(c,args.endpoint);existing[c['id']]=r
       payload={'manifest_sha256':sha(manifest),'model':'lfm3-omni','source_manifest':str(manifest.relative_to(ROOT)),
                'experimental_unit':'individual case; related templates are correlated',
                'trials':[existing[k] for k in sorted(existing)]}
       RESULT.parent.mkdir(parents=True,exist_ok=True)
       temp=RESULT.with_suffix('.json.tmp');temp.write_text(json.dumps(payload,indent=2));temp.replace(RESULT)
       print(f"{c['id']} expected={c['expected']} actual={r['actual']!r} correct={r['normalized_pass']} TTFT={r['ttft_s']}s total={r['total_s']}s error={r['error']}")
    print('Complete:',len(existing),'/',18,'semantic',sum(r['normalized_pass'] for r in existing.values()),'/',18,'Saved:',RESULT)
if __name__=='__main__':main()
