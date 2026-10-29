"""PrismLab P2 -- controlled OCR and VL-only versus VL->Text benchmark.

Runs only on the user's LOCAL llama.cpp HTTP servers. No data sent elsewhere.
No model measurements are bundled or invented; all results are measured on run.
"""
import argparse
import base64
import csv
import json
import re
import sys
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent
CASES = json.loads((ROOT / 'manifest.json').read_text(encoding='utf-8'))['cases']


def norm(s):
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9]+', ' ', str(s).casefold())).strip()


def exact(got, expected):
    return bool(got.strip()) and norm(got) == norm(expected)


def contain(got, expected):
    return bool(got.strip()) and norm(expected) in norm(got)


def discover_model(base_url):
    try:
        r = requests.get(base_url.rstrip('/') + '/v1/models', timeout=10)
        r.raise_for_status()
        return r.json()['data'][0]['id']
    except Exception as e:
        raise RuntimeError(f'Cannot connect to {base_url}: {e}') from e


def chat_stream(base_url, model, content, max_tokens, temperature=0.0):
    url=base_url.rstrip('/')+'/v1/chat/completions'
    payload={
        'model':model,'messages':[{'role':'user','content':content}],
        'temperature':temperature,'max_tokens':max_tokens,'stream':True,
    }
    start=time.perf_counter()
    first_event=None; first_content=None; first_reasoning=None
    parts=[]; finish_reason=None; usage={}; had_reasoning=False
    with requests.post(url,json=payload,timeout=(20,600),stream=True) as response:
        response.raise_for_status()
        for raw_line in response.iter_lines():
            if not raw_line: continue
            line=raw_line.decode('utf-8',errors='replace')
            if not line.startswith('data:'): continue
            data=line[5:].strip()
            if data=='[DONE]': break
            try: chunk=json.loads(data)
            except json.JSONDecodeError: continue
            if first_event is None: first_event=time.perf_counter()
            if isinstance(chunk.get('usage'),dict): usage=chunk['usage']
            choices=chunk.get('choices') or []
            if not choices: continue
            choice=choices[0]
            if choice.get('finish_reason') is not None: finish_reason=choice['finish_reason']
            delta=choice.get('delta') or {}
            reasoning=delta.get('reasoning_content')
            if reasoning:
                had_reasoning=True
                if first_reasoning is None: first_reasoning=time.perf_counter()
            piece=delta.get('content')
            if isinstance(piece,str) and piece:
                if first_content is None: first_content=time.perf_counter()
                parts.append(piece)
    end=time.perf_counter()
    return dict(answer=''.join(parts).strip(), latency_s=round(end-start,3),
        ttft_s=round(first_content-start,3) if first_content else None,
        first_event_s=round(first_event-start,3) if first_event else None,
        reasoning_first_s=round(first_reasoning-start,3) if first_reasoning else None,
        reasoning_seen=had_reasoning, finish_reason=finish_reason,
        completion_tokens=usage.get('completion_tokens'),
        prompt_tokens=usage.get('prompt_tokens'))


def vision_input(image_path, prompt):
    encoded=base64.b64encode(image_path.read_bytes()).decode('ascii')
    return [
      {'type':'text','text':prompt},
      {'type':'image_url','image_url':{'url':'data:image/png;base64,'+encoded}},
    ]


def evaluate_case(case, vision_url, vision_model, text_url, text_model, mode):
    image_path=ROOT/'images'/case['filename']
    q=case['question']; expected=case['expected_answer']
    record={
        'id':case['id'],'filename':case['filename'],'category':case['category'],
        'difficulty':case['difficulty'],'question':q,'expected_answer':expected,
        'vision_model':vision_model,'text_model':text_model if mode=='both' else None,
        'mode':mode,
    }
    direct_prompt=(
        'Read the image and answer the question. Reply with ONLY the requested answer, '
        'without explanation. If unreadable, reply NOT_FOUND.\nQUESTION: '+q
    )
    direct=chat_stream(vision_url,vision_model,vision_input(image_path,direct_prompt),256)
    record.update({
        'direct_answer':direct['answer'],
        'direct_exact':exact(direct['answer'],expected),
        'direct_contains':contain(direct['answer'],expected),
        'direct_valid':bool(direct['answer']) and direct['finish_reason']!='length',
        'direct_latency_s':direct['latency_s'],
        'direct_ttft_s':direct['ttft_s'],
        'direct_finish_reason':direct['finish_reason'],
        'direct_reasoning_seen':direct['reasoning_seen'],
        'direct_completion_tokens':direct['completion_tokens'],
    })
    if mode=='direct':return record

    ocr_prompt=(
        'Perform OCR on this image. Transcribe ALL visible text in reading order, '
        'including headings, numbers, labels and values. Preserve exact letter/digit sequences. '
        'Return only the transcription; do not summarize or explain.'
    )
    ocr=chat_stream(vision_url,vision_model,vision_input(image_path,ocr_prompt),768)
    phrases=case['required_phrases']
    hits=[p for p in phrases if norm(p) in norm(ocr['answer'])]
    record.update({
        'ocr_text':ocr['answer'],
        'ocr_phrase_hits':len(hits),
        'ocr_phrase_total':len(phrases),
        'ocr_phrase_recall':round(len(hits)/len(phrases),4),
        'ocr_found_phrases':' | '.join(hits),
        'ocr_latency_s':ocr['latency_s'],
        'ocr_ttft_s':ocr['ttft_s'],
        'ocr_valid':bool(ocr['answer']) and ocr['finish_reason']!='length',
        'ocr_finish_reason':ocr['finish_reason'],
        'ocr_completion_tokens':ocr['completion_tokens'],
    })
    if not ocr['answer']:
        record.update({'pipeline_answer':'','pipeline_exact':False,'pipeline_contains':False,
                       'pipeline_valid':False,'text_latency_s':None,'text_ttft_s':None,
                       'pipeline_latency_s':None,'text_finish_reason':None})
        return record
    text_prompt=(
        'You are answering a question using OCR TRANSCRIPTION ONLY. Do not invent missing '
        'information. Reply with ONLY the requested answer; if the answer is not in the '
        'transcription, reply NOT_FOUND.\n\n'
        f'OCR TRANSCRIPTION:\n{ocr["answer"]}\n\nQUESTION: {q}'
    )
    text=chat_stream(text_url,text_model,text_prompt,256)
    record.update({
        'pipeline_answer':text['answer'],
        'pipeline_exact':exact(text['answer'],expected),
        'pipeline_contains':contain(text['answer'],expected),
        'pipeline_valid':bool(text['answer']) and text['finish_reason']!='length',
        'text_latency_s':text['latency_s'],
        'text_ttft_s':text['ttft_s'],
        'pipeline_latency_s':round(ocr['latency_s']+text['latency_s'],3),
        'text_finish_reason':text['finish_reason'],
        'text_completion_tokens':text['completion_tokens'],
    })
    return record


def write_csv(rows,filepath):
    keys=list(dict.fromkeys(k for row in rows for k in row))
    with filepath.open('w',newline='',encoding='utf-8') as f:
        writer=csv.DictWriter(f,fieldnames=keys)
        writer.writeheader();writer.writerows(rows)


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--vision-url',default='http://127.0.0.1:8180')
    ap.add_argument('--text-url',default='http://127.0.0.1:8080')
    ap.add_argument('--mode',choices=['direct','both'],default='direct',
                    help='direct: VL question only; both: VL question + VL OCR + text reasoning')
    ap.add_argument('--limit',type=int,default=2,
                    help='0 for all 10; default 2 for a fast smoke test')
    ap.add_argument('--tag',default='smoke',help='Output filename prefix')
    args=ap.parse_args()
    vis=discover_model(args.vision_url)
    txt=discover_model(args.text_url) if args.mode=='both' else None
    print(f'Vision: {vis} at {args.vision_url}',flush=True)
    if txt:print(f'Text:   {txt} at {args.text_url}',flush=True)
    selected=CASES if args.limit==0 else CASES[:args.limit]
    outdir=ROOT/'results'; outdir.mkdir(exist_ok=True)
    jsonl=outdir/(args.tag+'_raw.jsonl')
    csvfile=outdir/(args.tag+'_results.csv')
    # A run always starts a new results file; do not append different configurations.
    jsonl.write_text('',encoding='utf-8')
    allrows=[]
    for index,case in enumerate(selected,1):
        print(f'\n[{index}/{len(selected)}] {case["filename"]} | {case["question"]}',flush=True)
        try:
            row=evaluate_case(case,args.vision_url,vis,args.text_url,txt,args.mode)
            print('  DIRECT:',repr(row.get('direct_answer')),
                  '| exact=',row.get('direct_exact'),
                  '| latency=',row.get('direct_latency_s'),flush=True)
            if args.mode=='both':
                print('  OCR phrase recall:',row.get('ocr_phrase_recall'),
                      '| valid=',row.get('ocr_valid'),flush=True)
                print('  PIPELINE:',repr(row.get('pipeline_answer')),
                      '| exact=',row.get('pipeline_exact'),
                      '| latency=',row.get('pipeline_latency_s'),flush=True)
        except Exception as exc:
            row={'id':case['id'],'filename':case['filename'],
                 'expected_answer':case['expected_answer'],'error':repr(exc)}
            print('  ERROR:',repr(exc),flush=True)
        allrows.append(row)
        with jsonl.open('a',encoding='utf-8') as f:
            f.write(json.dumps(row,ensure_ascii=False)+'\n')
        write_csv(allrows,csvfile)
    print('\nSaved:',csvfile,'and',jsonl,flush=True)
    print('No results were pre-populated; every number is measured locally.',flush=True)

if __name__=='__main__':main()
