#!/usr/bin/env python3
"""Repair P4-E source catalog, create an official-source browser checklist, and
import manually downloaded Commons originals. Does not make network requests.
Run from anywhere after copying to experiments/p4/ in lfm3-prismlab.
"""
from pathlib import Path
import html
import importlib.util
import json
import re
import shutil
import subprocess
import sys
import unicodedata
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[2]
BUILDER = ROOT / 'experiments/p4/p4e18_build.py'
DATA = ROOT / 'data/p4/validation_18'
SOURCES = DATA / 'sources'
DOWNLOADS = Path.home() / 'Downloads'

REPLACEMENTS = {
    'waterfall': "  dict(id='waterfall', file='Front_view_video_of_Kawaida_Waterfall,_Cianda,_Kiambu_County.webm', page='https://commons.wikimedia.org/wiki/File:Front_view_video_of_Kawaida_Waterfall,_Cianda,_Kiambu_County.webm', category='waterfall', credit='Lebu Ayiga; confirm Creative Commons terms on source page'),",
    'guitar': "  dict(id='guitar', file='Guitar_Decacorde.webm', page='https://commons.wikimedia.org/wiki/File:Guitar_Decacorde.webm', category='guitar performance', credit=\"St Cecilia's Hall; Commons states CC BY 3.0, source license review required\"),",
}


def normalize(filename):
    text = unicodedata.normalize('NFKC', filename).casefold()
    text = re.sub(r'\s*\(\d+\)(?=\.(?:webm|ogv|ogg|mp4)$)', '', text)
    return re.sub(r'[\s_]+', ' ', text).strip()


def probe(path):
    try:
        out = subprocess.check_output([
            'ffprobe', '-v', 'error', '-show_format', '-show_streams',
            '-of', 'json', str(path)
        ], text=True, stderr=subprocess.DEVNULL, timeout=20)
        data = json.loads(out)
        streams = data.get('streams', [])
        return {
            'duration': float(data['format']['duration']),
            'video': any(s.get('codec_type') == 'video' for s in streams),
            'audio': any(s.get('codec_type') == 'audio' for s in streams),
        }
    except Exception:
        return None


def patch_catalog():
    text = BUILDER.read_text(encoding='utf-8')
    changed = []
    for src_id, replacement in REPLACEMENTS.items():
        pattern = re.compile(r'^\s*dict\(id=' + repr(src_id) + r',.*\),?$', re.MULTILINE)
        matches = list(pattern.finditer(text))
        if len(matches) != 1:
            raise RuntimeError(f'Expected one source catalog row for {src_id}; found {len(matches)}')
        old = matches[0].group(0)
        if old != replacement:
            text = text[:matches[0].start()] + replacement + text[matches[0].end():]
            changed.append(src_id)
    if changed:
        backup = BUILDER.with_suffix('.py.before_source_repair.bak')
        if not backup.exists():
            backup.write_text(BUILDER.read_text(encoding='utf-8'), encoding='utf-8')
        BUILDER.write_text(text, encoding='utf-8')
    return changed


def load_catalog():
    spec = importlib.util.spec_from_file_location('p4e18_build', BUILDER)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def make_page(missing):
    rows = []
    for row, case_id in missing:
        page = html.escape(row['page'], quote=True)
        title = html.escape(row['file'])
        credit = html.escape(row['credit'])
        rows.append(f'''<tr><td><strong>{case_id}</strong></td><td><a href="{page}" target="_blank" rel="noopener">Open file page</a></td><td><code>{title}</code></td><td>{credit}</td></tr>''')
    body = '\n'.join(rows)
    page = f'''<!doctype html><html lang="en"><meta charset="utf-8"><title>PrismLab P4-E original media checklist</title>
<style>body{{font:15px system-ui;max-width:1200px;margin:28px auto;padding:0 20px;line-height:1.55}}table{{border-collapse:collapse;width:100%}}td,th{{border-bottom:1px solid #ccd3da;padding:12px;text-align:left;vertical-align:top}}code{{overflow-wrap:anywhere}}a{{color:#1465b5}}small{{color:#53616c}}.warn{{background:#fff7dc;padding:14px;border-radius:8px}}</style>
<h1>PrismLab — missing original footage</h1><p class="warn">Wikimedia is responding with HTTP 429. Do not bypass the rate limit or use rapid retries. Open a source page and use its <strong>Original file</strong> link if the service permits; otherwise return later. Never save the HTML page as if it were a video.</p>
<p>Download the original media normally into <code>~/Downloads</code>, keeping its filename. The repair helper automatically imports matching files to the correct dataset directory. No downloaded original needs to be committed to GitHub. Verify rights and actual audible events before approving any natural label.</p>
<table><thead><tr><th>Case</th><th>Source</th><th>Download filename</th><th>Attribution / review</th></tr></thead><tbody>{body}</tbody></table>
<p><small>Run <code>python experiments/p4/p4e18_repair_sources.py</code> again after downloading. Then run <code>python experiments/p4/p4e18_build.py --mode real</code>.</small></p></html>'''
    page_path = DATA / 'source_downloads.html'
    page_path.write_text(page, encoding='utf-8')
    return page_path


def main():
    if not BUILDER.exists():
        raise SystemExit('Copy this script into experiments/p4/ of your PrismLab project first.')
    SOURCES.mkdir(parents=True, exist_ok=True)
    changed = patch_catalog()
    mod = load_catalog()
    cat = {c['id']: c for c in mod.CATALOG}
    case_map = mod.HYBRID + mod.NATURAL
    missing = []
    imported = []
    already = []
    for case_id, source_id, _ in case_map:
        row = cat[source_id]
        existing = mod.find_existing(row)
        if existing is not None:
            already.append((case_id, existing))
            continue
        matches = ([p for p in DOWNLOADS.iterdir() if p.is_file() and normalize(p.name) == normalize(row['file'])] if DOWNLOADS.is_dir() else [])
        target = SOURCES / row['file']
        if matches:
            valid = []
            for src in matches:
                media = probe(src)
                needs_audio = case_id.startswith('N')
                if media and media['video'] and media['duration'] >= 8 and (not needs_audio or media['audio']):
                    valid.append((src, media))
            if valid:
                src, media = max(valid, key=lambda item: item[0].stat().st_size)
                shutil.copy2(src, target)
                imported.append((case_id, target, media))
                continue
            print(f'INVALID MEDIA for {case_id}: matching file found but ffprobe/duration/audio gate failed: {matches}')
        missing.append((row, case_id))
    guide = make_page(missing)
    print('Catalog repaired:', ', '.join(changed) if changed else 'already current')
    print('Existing sources:', len(already), '; newly imported:', len(imported), '; missing:', len(missing))
    for case_id, target, media in imported:
        print(f'IMPORTED {case_id}: {target.name} ({media["duration"]:.1f}s, audio={media["audio"]})')
    for row, case_id in missing:
        print(f'PENDING {case_id}: {row["file"]} | {row["page"]}')
    print('Browser checklist:', guide)
    print('NEXT: xdg-open "'+str(guide)+'"')
    if not missing:
        print('NEXT: python experiments/p4/p4e18_build.py --mode real')

if __name__ == '__main__':
    main()
