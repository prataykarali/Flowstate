#!/usr/bin/env python3
"""Human review and freeze gate: never 'freeze' incomplete/unreviewed benchmarks."""
import argparse, hashlib, json, subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
DIR=ROOT/'data/p4/validation_18';DRAFT=DIR/'manifest_draft.json';FROZEN=DIR/'manifest_frozen.json'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def load():return json.loads(DRAFT.read_text())
def save(data):DRAFT.write_text(json.dumps(data,indent=2,ensure_ascii=False))
def main():
 p=argparse.ArgumentParser()
 group=p.add_mutually_exclusive_group(required=True)
 group.add_argument('--list',action='store_true');group.add_argument('--approve',metavar='CASE_ID');group.add_argument('--freeze',action='store_true')
 a=p.parse_args(); d=load()
 if a.list:
    for c in d['cases']:
      p=DIR/c['file'];status='READY' if p.is_file() else 'MISSING'
      print(f"{c['id']:3s} {c['category']:9s} {status:7s} reviewed={c['human_reviewed']!s:5s} expected={c['expected']:8s} {c['file']}")
    return
 if a.approve:
    c=next((x for x in d['cases'] if x['id']==a.approve.upper()),None)
    if c is None:raise SystemExit('Unknown ID')
    video=DIR/c['file'];assert video.exists(),'Media not built';assert sha(video)==c['sha256'],'Asset hash changed'
    print('Review video:',video)
    print('Expected:',c['expected']);print('Question:',c['question'])
    print('Source:',c['source_page'] or 'Synthetic');print('License/credit:',c['source_credit'])
    print('Inspect actual visuals, listen to sound, and inspect the source-page license before approval.')
    print('TIP: ffplay -autoexit "'+str(video)+'"')
    confirm=input('Type APPROVED after reviewing BOTH answer and license (for real source): ').strip()
    if confirm!='APPROVED':raise SystemExit('Not approved')
    c['human_reviewed']=True
    save(d);print('Approved',c['id'])
    return
 if a.freeze:
    assert len(d['cases'])==18,'Expected exactly 18'
    for c in d['cases']:
       video=DIR/c['file']
       if not video.exists() or not c['sha256'] or sha(video)!=c['sha256']:
          raise SystemExit('Missing or altered file: '+c['id'])
       if not c['human_reviewed']:
          raise SystemExit('Not manually reviewed: '+c['id'])
    d['status']='FROZEN_APPROVED'
    d['manifest_sha256_frozen_note']='hash below computed over finalized manifest contents'
    blob=json.dumps(d,indent=2,ensure_ascii=False).encode()
    FROZEN.write_bytes(blob)
    print('FROZEN:',FROZEN,'SHA256:',hashlib.sha256(blob).hexdigest())
if __name__=='__main__':main()
