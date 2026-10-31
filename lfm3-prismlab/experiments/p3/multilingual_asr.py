#!/usr/bin/env python3
"""PrismLab P3.3 — reproducible local multilingual ASR.

Requires the earlier live_asr_v3.py in the SAME folder, a running LFM3-Audio
llama-server on port 8082, Python 3.12, and ffmpeg for --record.

Examples:
    python experiments/p3/multilingual_asr.py --file data/audio/speech.wav --lang auto
    python experiments/p3/multilingual_asr.py --record 8 --lang Spanish
"""
import argparse
import base64
import json
import re
import sys
import time
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

import live_asr_v3 as audio  # reuse P3.1's microphone, WAV check, API client, and silence gate

ROOT = Path(__file__).resolve().parents[2]
LANGUAGES = {
    'auto': None,
    'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
    'it': 'Italian', 'pt': 'Portuguese', 'ja': 'Japanese', 'ko': 'Korean',
    'zh': 'Chinese', 'ar': 'Arabic', 'nl': 'Dutch', 'pl': 'Polish',
    'tr': 'Turkish', 'sv': 'Swedish', 'da': 'Danish', 'fi': 'Finnish',
    'el': 'Greek', 'he': 'Hebrew',
    'bn': 'Bengali',  # unsupported exploratory condition, NOT an official speech locale
}


def words(text):
    # Unicode-friendly word split for rough WER; not a tokenizer for CJK languages.
    normalized = unicodedata.normalize('NFKC', text).casefold()
    return re.findall(r'[^\W_]+', normalized, flags=re.UNICODE)


def wer(reference, hypothesis):
    ref, hyp = words(reference), words(hypothesis)
    if not ref:
        raise ValueError('Reference has no words')
    prev = list(range(len(hyp) + 1))
    for i, token in enumerate(ref, 1):
        curr = [i] + [0] * len(hyp)
        for j, output in enumerate(hyp, 1):
            curr[j] = min(prev[j] + 1, curr[j - 1] + 1,
                          prev[j - 1] + (token != output))
        prev = curr
    return prev[-1] / len(ref)


def main():
    p = argparse.ArgumentParser(description='PrismLab P3.3 multilingual ASR')
    input_group = p.add_mutually_exclusive_group(required=True)
    input_group.add_argument('--file', type=Path, help='16 kHz mono PCM16 WAV')
    input_group.add_argument('--record', type=float, metavar='SECONDS', help='Record from mic')
    p.add_argument('--lang', choices=sorted(LANGUAGES), default='auto',
                   help='Language code; auto infers language; bn is experimental')
    p.add_argument('--reference', help='Exact spoken reference for approximate WER')
    p.add_argument('--source', default='default', help='PulseAudio input')
    p.add_argument('--url', default='http://127.0.0.1:8082')
    p.add_argument('--min-rms', type=float, default=0.002,
                   help='Provisional amplitude gate, not speech detection')
    p.add_argument('--log', type=Path, default=ROOT / 'results/p3/multilingual_asr.jsonl')
    args = p.parse_args()
    if args.record is not None and not (0 < args.record <= 120):
        p.error('--record must be within (0,120] seconds')
    if not 0 <= args.min_rms < 1:
        p.error('--min-rms must be within [0,1)')

    try:
        file = args.file.expanduser() if args.file else ROOT / 'data/audio/live' / (
            f'p3_3_{args.lang}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.wav')
        if args.record is not None:
            audio.record_wav(file, args.record, args.source)
        duration, rms, peak = audio.inspect_wav(file)
        print(f'[audio] {file} | {duration:.2f}s | RMS={rms:.6f} | peak={peak:.6f}')
        if rms < args.min_rms:
            print('[blocked] Recording is too quiet; no model request. Check microphone.')
            return
        if peak >= 0.98:
            print('[warning] Peak near clipping; consider reducing input gain.')

        lang = LANGUAGES[args.lang]
        if args.lang == 'bn':
            print('[warning] Bengali is NOT an officially supported LFM3-Audio speech locale.')
        sys_prompt = f'Perform ASR in {lang}.' if lang else 'Perform ASR.'
        base = args.url.rstrip('/')
        model = audio.server_model(base)
        payload = {
            'model': model, 'temperature': 0, 'max_tokens': 512, 'stream': False,
            'messages': [
                {'role': 'system', 'content': sys_prompt},
                {'role': 'user', 'content': [{'type': 'input_audio', 'input_audio': {
                    'data': base64.b64encode(file.read_bytes()).decode('ascii'),
                    'format': 'wav'}}]},
            ]
        }
        print(f'[model] {model} | prompt: {sys_prompt}')
        start = time.perf_counter()
        reply = audio.api_json(base + '/v1/chat/completions', payload)
        latency = time.perf_counter() - start
        transcript = audio.get_text(reply)
        print(f'[transcript] {transcript or "(EMPTY)"}')
        print(f'[latency] {latency:.2f}s (request only, not recording)')
        error_rate = None
        if args.reference is not None:
            error_rate = wer(args.reference, transcript)
            print(f'[word error rate] {error_rate:.1%} (whitespace-like Unicode tokens; CJK unreliable)')
        log = {
            'timestamp_utc': datetime.now(timezone.utc).isoformat(),
            'model': model, 'language': args.lang, 'system_prompt': sys_prompt,
            'file': str(file), 'duration_s': round(duration, 3),
            'rms': round(rms, 6), 'peak': round(peak, 6),
            'transcript': transcript, 'reference': args.reference,
            'wer': error_rate, 'request_latency_s': round(latency, 3),
        }
        args.log.parent.mkdir(parents=True, exist_ok=True)
        with args.log.open('a', encoding='utf-8') as output:
            output.write(json.dumps(log, ensure_ascii=False) + '\n')
        print(f'[saved] {args.log}')
    except (RuntimeError, OSError, KeyError, ValueError, IndexError) as exc:
        p.exit(1, f'[error] {exc}\n')


if __name__ == '__main__':
    main()
