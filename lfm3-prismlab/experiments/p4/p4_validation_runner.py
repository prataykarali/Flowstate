#!/usr/bin/env python3
"""Matched, resumable CPU benchmark for PrismLab P4-D and P4-D2 holdout.

Native: Omni image+audio in one request, server 8083.
Modular: Audio-2B ASR on 8082 then VL-2B image+transcript on 8180.
Run phases separately; never run native and modular concurrently for comparisons.
Prompts / temperature / budgets equal the original P4-D benchmark scripts.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import random
import re
import statistics
import time
import wave
from datetime import datetime, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MANIFEST = ROOT/'data/p4/robustness/manifest.json'
OUT = ROOT/'results/p4/stat_validation'
NATIVE_SYSTEM = (
    'Listen to the spoken question and inspect the image. '
    'Answer with exactly one word. '
    'If the referenced object or relationship does not exist, '
    'answer UNKNOWN. Do not guess.'
)
ASR_SYSTEM = 'Perform ASR in English. Transcribe the speech; do not answer the question.'
VL_SYSTEM = (
    "Answer the spoken question's transcription using the image. "
    'Answer with exactly one word. '
    'If the referenced object or relationship does not exist, '
    'answer UNKNOWN. Do not guess.'
)
DEFAULT_SERVERS = {'native': 'http://127.0.0.1:8083',
                   'audio': 'http://127.0.0.1:8082',
                   'vision': 'http://127.0.0.1:8180'}


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def norm(text):
    return re.sub(r'^[\s\W_]+|[\s\W_]+$', '', str(text).lower())


def utc():
    return datetime.now(timezone.utc).isoformat()


def atomic_save(path, data):
    temp = path.with_suffix('.json.tmp')
    temp.write_text(json.dumps(data, indent=2, ensure_ascii=False))
    temp.replace(path)


def load_cases(manifest_path):
    src = manifest_path.read_bytes()
    manifest = json.loads(src)
    cases = manifest['cases']
    if not cases or len(set(c['id'] for c in cases)) != len(cases):
        raise ValueError('Manifest cases missing or duplicate IDs')
    seen = set()
    for c in cases:
        for kind, key in [('image', 'image_sha256'), ('audio', 'audio_sha256')]:
            path = (ROOT/c[kind]).resolve(strict=True)
            if not path.is_relative_to(ROOT.resolve()):
                raise ValueError(f'Outside root: {path}')
            if sha(path.read_bytes()) != c[key]:
                raise ValueError(f'Input hash mismatch {c["id"]} {kind}')
            if kind == 'audio':
                with wave.open(str(path), 'rb') as f:
                    if (f.getframerate(), f.getnchannels(), f.getsampwidth()) != (16000,1,2):
                        raise ValueError(f'Unsupported audio WAV {path}')
            c['_' + kind] = base64.b64encode(path.read_bytes()).decode('ascii')
        if (c['image_sha256'], c['audio_sha256']) in seen:
            raise ValueError(f'Duplicate image/audio combination: {c["id"]}')
        seen.add((c['image_sha256'], c['audio_sha256']))
    return manifest, sha(src), cases


def require_server(base, model):
    r = requests.get(base.rstrip('/')+'/v1/models', timeout=12)
    r.raise_for_status()
    found = [x.get('id') for x in r.json().get('data', [])]
    if model not in found:
        raise RuntimeError(f'{base}: expected {model}, got {found}')


def send(base, model, system, content, max_tokens):
    payload = {'model': model, 'temperature': 0, 'max_tokens': max_tokens,
               'stream': False, 'messages': [
                   {'role': 'system', 'content': system},
                   {'role': 'user', 'content': content}]}
    begun = time.perf_counter()
    response = requests.post(base.rstrip('/')+'/v1/chat/completions',
                             json=payload, timeout=300)
    elapsed = time.perf_counter() - begun
    response.raise_for_status()
    raw = response.json()
    choice = raw['choices'][0]
    msg = choice['message']
    answer = msg.get('content')
    if not isinstance(answer, str):
        raise ValueError(f'Non-string answer from {model}: {type(answer).__name__}')
    return {'text': answer.strip(), 'seconds': round(elapsed, 3),
            'finish_reason': choice.get('finish_reason'),
            'reasoning_chars': len(msg.get('reasoning_content') or ''),
            'usage': raw.get('usage', {})}


def audio_content(c):
    return [{'type': 'input_audio', 'input_audio': {
        'data': c['_audio'], 'format': 'wav'}}]


def image_content(c):
    return {'type': 'image_url', 'image_url': {
        'url': 'data:image/png;base64,' + c['_image']}}


def evaluate(c, phase, servers):
    if phase == 'native':
        result = send(servers['native'], 'lfm3-omni', NATIVE_SYSTEM,
                      [image_content(c), *audio_content(c)], 64)
        return {'answer': result['text'], 'latency_s': result['seconds'],
                'strict_pass': norm(result['text']) == norm(c['expected']),
                'finish_reason': result['finish_reason'],
                'reasoning_chars': result['reasoning_chars'],
                'usage': result['usage']}
    asr = send(servers['audio'], 'lfm3-audio', ASR_SYSTEM, audio_content(c), 128)
    vl = send(servers['vision'], 'lfm3-vision', VL_SYSTEM,
              [image_content(c), {'type': 'text', 'text': asr['text']}], 128)
    return {'answer': vl['text'], 'transcript': asr['text'],
            'asr_exact': norm(asr['text']) == norm(c['spoken_question']),
            'asr_s': asr['seconds'], 'vision_s': vl['seconds'],
            'latency_s': round(asr['seconds'] + vl['seconds'], 3),
            'strict_pass': norm(vl['text']) == norm(c['expected']),
            'finish_reason': vl['finish_reason'],
            'reasoning_chars': vl['reasoning_chars'],
            'asr_finish_reason': asr['finish_reason'],
            'usage': {'asr': asr['usage'], 'vision': vl['usage']}}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--manifest', type=Path, default=DEFAULT_MANIFEST)
    p.add_argument('--phase', choices=('native', 'modular'), required=True)
    p.add_argument('--repeats', type=int, default=5)
    p.add_argument('--run-id', default='replication5')
    p.add_argument('--seed', type=int, default=20261031)
    p.add_argument('--warmup', action='store_true', help='One excluded warm-up case before measured trials')
    p.add_argument('--dry-run', action='store_true')
    p.add_argument('--native-url', default=DEFAULT_SERVERS['native'])
    p.add_argument('--audio-url', default=DEFAULT_SERVERS['audio'])
    p.add_argument('--vision-url', default=DEFAULT_SERVERS['vision'])
    args = p.parse_args()
    if not 1 <= args.repeats <= 30:
        p.error('--repeats must be between 1 and 30')
    if not re.fullmatch(r'[A-Za-z0-9_-]{1,48}', args.run_id):
        p.error('--run-id must contain only letters, numbers, underscores, dashes')
    manifest_path = args.manifest.expanduser().resolve(strict=True)
    manifest, manifest_hash, cases = load_cases(manifest_path)
    slug = 'holdout' if 'holdout' in manifest['dataset'].lower() else 'robustness'
    output = OUT/f'{slug}_{args.run_id}_{args.phase}.json'
    servers = {'native': args.native_url, 'audio': args.audio_url, 'vision': args.vision_url}
    print(f'Dataset: {manifest["dataset"]} | cases={len(cases)} | SHA256={manifest_hash}')
    print(f'Phase: {args.phase} | repeats={args.repeats} | output={output}')
    if args.dry_run:
        print('Dry run passed: inputs and hashes verified. No inference performed.')
        return
    if args.phase == 'native':
        require_server(servers['native'], 'lfm3-omni')
    else:
        require_server(servers['audio'], 'lfm3-audio')
        require_server(servers['vision'], 'lfm3-vision')
    OUT.mkdir(parents=True, exist_ok=True)
    immutable = {'dataset': manifest['dataset'], 'manifest_sha256': manifest_hash,
                 'phase': args.phase, 'repeats': args.repeats, 'seed': args.seed,
                 'system_prompts': {'native': NATIVE_SYSTEM, 'asr': ASR_SYSTEM,
                                    'vision': VL_SYSTEM},
                 'temperature': 0, 'max_tokens': {'native': 64, 'asr': 128, 'vision': 128},
                 'servers': servers,
                 'timing': 'warm-model HTTP request elapsed; modular ASR+VL sequential sum',
                 'residency': 'native Omni alone / modular Audio+VL dual resident; verify manually',
                 'case_count': len(cases)}
    if output.exists():
        report = json.loads(output.read_text())
        if any(report.get(k) != v for k, v in immutable.items()):
            raise ValueError('Existing run config differs! Select a new --run-id.')
        print('RESUME:', len(report.get('trials', [])), 'previous trials')
    else:
        report = {**immutable, 'created_utc': utc(), 'trials': []}
        atomic_save(output, report)
    if args.warmup and not report.get('trials'):
        print('Unmeasured warm-up using', cases[0]['id'])
        evaluate(cases[0], args.phase, servers)
    completed = {(row['repeat'], row['id']) for row in report['trials']}
    for repeat in range(1, args.repeats+1):
        order = cases.copy()
        random.Random(args.seed + repeat).shuffle(order)
        for c in order:
            if (repeat, c['id']) in completed:
                continue
            rec = {'repeat': repeat, 'id': c['id'], 'condition': c['condition'],
                   'expected': c['expected'], 'image_sha256': c['image_sha256'],
                   'audio_sha256': c['audio_sha256'], 'timestamp_utc': utc()}
            started = time.perf_counter()
            try:
                rec.update(evaluate(c, args.phase, servers))
                rec['status'] = 'ok'
            except Exception as exc:
                rec.update({'status': 'error', 'strict_pass': False,
                            'answer': None, 'error': f'{type(exc).__name__}: {exc}',
                            'latency_s': round(time.perf_counter()-started, 3)})
            report['trials'].append(rec)
            completed.add((repeat, c['id']))
            atomic_save(output, report)
            print(f'R{repeat:02} {c["id"]} | expected={c["expected"]} '
                  f'| answer={rec["answer"]!r} | pass={rec["strict_pass"]} '
                  f'| {rec["latency_s"]}s | {rec["status"]}', flush=True)
    trials = report['trials']
    successes = [t for t in trials if t['status'] == 'ok']
    report['summary'] = {
        'trials': len(trials), 'ok': len(successes),
        'errors': len(trials)-len(successes),
        'strict_pass': sum(t['strict_pass'] for t in trials),
        'median_inference_s': round(statistics.median(t['latency_s'] for t in successes), 3)
                              if successes else None,
    }
    report['finished_utc'] = utc()
    atomic_save(output, report)
    print('SUMMARY:', report['summary'])
    print('Saved:', output)


if __name__ == '__main__':
    main()
