#!/usr/bin/env python3
"""PrismLab P4-E 18-clip dataset builder. Stdlib + ffmpeg/ffprobe; offline-safe."""
import argparse, copy, datetime, hashlib, json, math, os, random, subprocess, time, urllib.error, urllib.parse, urllib.request, wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'data/p4/validation_18'
SRC = DATA / 'sources'
MANIFEST = DATA / 'manifest_draft.json'

CATALOG = [
  dict(id='cars', file='Cars_Passing_by_at_Night.webm', page='https://commons.wikimedia.org/wiki/File:Cars_Passing_by_at_Night.webm', category='traffic', credit='Maximilian Schönherr, CC BY-SA 4.0'),
  dict(id='train', file='China_Railway_High-speed_train_passing_through_station.webm', page='https://commons.wikimedia.org/wiki/File:China_Railway_High-speed_train_passing_through_station.webm', category='train', credit='Anna Frodesiak, CC BY-SA 3.0'),
  dict(id='ball', file='Bouncing_Ball.webm', page='https://commons.wikimedia.org/wiki/File:Bouncing_Ball.webm', category='moving object', credit='See source file license and author'),
  dict(id='metro', file='7train_arriving.ogv', page='https://commons.wikimedia.org/wiki/File:7train_arriving.ogv', category='station', credit='See source file license and author'),
  dict(id='waterfall', file='Front_view_video_of_Kawaida_Waterfall,_Cianda,_Kiambu_County.webm', page='https://commons.wikimedia.org/wiki/File:Front_view_video_of_Kawaida_Waterfall,_Cianda,_Kiambu_County.webm', category='waterfall', credit='Lebu Ayiga; confirm Creative Commons terms on source page'),
  dict(id='stream', file='StreamOfFlowingWater.webm', page='https://commons.wikimedia.org/wiki/File:StreamOfFlowingWater.webm', category='stream', credit='Patjos.scot; verify terms on source page'),
  dict(id='bell', file='Bell_Ringing_in_Tower_of_Přibyslav_(video).webm', page='https://commons.wikimedia.org/wiki/File:Bell_Ringing_in_Tower_of_P%C5%99ibyslav_(video).webm', category='bell', credit='Vojtěch Dostál, CC BY 3.0'),
  dict(id='guitar', file='Guitar_Decacorde.webm', page='https://commons.wikimedia.org/wiki/File:Guitar_Decacorde.webm', category='guitar performance', credit="St Cecilia's Hall; Commons states CC BY 3.0, source license review required"),
  dict(id='clock', file='Comtoise-Uhr.webm', page='https://commons.wikimedia.org/wiki/File:Comtoise-Uhr.webm', category='clock', credit='Rhetos; verify terms on source page'),
  dict(id='applause', file='Clap_for_NHS_Thousands_clap_hands_together_in_round_of_applause_for_NHS_workers_Metro.webm', page='https://commons.wikimedia.org/wiki/File:Clap_for_NHS_Thousands_clap_hands_together_in_round_of_applause_for_NHS_workers_Metro.webm', category='applause', credit='Metro / Wikimedia Commons, CC BY 3.0; attribution on page'),
  dict(id='tick', file='Tick_Tock_Clock.webm', page='https://commons.wikimedia.org/wiki/File:Tick_Tock_Clock.webm', category='clock ticking', credit='See source file license and author'),
  dict(id='fall', file='Waterfall_on_Santo_Antao.webm', page='https://commons.wikimedia.org/wiki/File:Waterfall_on_Santo_Antao.webm', category='waterfall', credit='Patrick Savalle; verify CC BY terms on source page'),
]
SYNTH = [
  ('S01', [3.0], 6.0, 'BEFORE'),
  ('S02', [9.0], 6.0, 'AFTER'),
  ('S03', [], 6.0, 'UNKNOWN'),
  ('S04', [2.0], 8.0, 'BEFORE'),
  ('S05', [10.0], 4.0, 'AFTER'),
  ('S06', [3.0,9.0], 6.0, 'BOTH'),
]
HYBRID = [
 ('H01','cars','BEFORE'),('H02','train','AFTER'),('H03','ball','UNKNOWN'),
 ('H04','metro','BEFORE'),('H05','waterfall','AFTER'),('H06','stream','BOTH')]
NATURAL = [
 ('N01','bell','BELL'),('N02','guitar','GUITAR'),('N03','clock','CLOCK'),
 ('N04','applause','APPLAUSE'),('N05','tick','CLOCK'),('N06','fall','WATER')]
QUESTION_TIMING = ('Relative to the corner marker changing from RED to BLUE, when does the audible electronic beep occur? '
                   'Answer exactly BEFORE, AFTER, BOTH, or UNKNOWN. BOTH means beeps on both sides of the change; '
                   'UNKNOWN means no audible beep or insufficient evidence.')
QUESTION_NATURAL = ('Listen to the ORIGINAL soundtrack and examine the video. Which is the main audible source? '
                    'Answer exactly one of BELL, GUITAR, CLOCK, APPLAUSE, WATER, OTHER, UNKNOWN. '
                    'Use UNKNOWN if audible evidence is insufficient; do not infer sound solely from visible objects.')

def sha(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
    return h.hexdigest()

def cmd(args):
    return subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,check=True)

def probe(path):
    obj=json.loads(cmd(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(path)]).stdout)
    return {'duration_s':float(obj['format']['duration']),
            'video':any(st.get('codec_type')=='video' for st in obj['streams']),
            'audio':any(st.get('codec_type')=='audio' for st in obj['streams'])}

def beep_wav(path, seconds, centers):
    fs=16000;n=int(seconds*fs)
    with wave.open(str(path),'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(fs)
        import struct
        buf=bytearray()
        for i in range(n):
            t=i/fs
            env=0.0
            for center in centers:
                x=abs(t-center)
                if x<.25: env=max(env,min(1.0,(.25-x)/.025))
            sample=int(10000*env*math.sin(2*math.pi*850*t))
            buf+=struct.pack('<h',sample)
        w.writeframes(buf)

def vf_mark(t,width=320,height=180):
    return (f'scale={width}:{height}:force_original_aspect_ratio=decrease,'
            f'pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:color=white,fps=8,'
            f"drawbox=x=14:y=14:w=58:h=58:color=red:t=fill:enable='lt(t,{t:.3f})',"
            f"drawbox=x=14:y=14:w=58:h=58:color=blue:t=fill:enable='gte(t,{t:.3f})',"
            'format=yuv420p')

def make_synthetic(out,centers,change):
    wav=DATA / '.temporary_beep.wav'
    beep_wav(wav,12,centers)
    try:
      cmd(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=c=white:s=320x180:r=8:d=12',
           '-i',str(wav),'-vf',vf_mark(change),'-t','12','-map','0:v:0','-map','1:a:0',
           '-c:v','libx264','-preset','veryfast','-crf','28','-c:a','aac','-ar','16000','-ac','1',str(out)])
    finally: wav.unlink(missing_ok=True)

def make_hybrid(src,out,label):
    p=probe(src)
    if not p['video'] or p['duration_s']<8:raise ValueError(f'Source too short (<8s) or no video: {src} {p}')
    dur=min(12.0,p['duration_s']-0.2)
    change=dur*.5
    centers={'BEFORE':[dur*.25],'AFTER':[dur*.75],'BOTH':[dur*.25,dur*.75],'UNKNOWN':[]}[label]
    wav=DATA / '.temporary_beep.wav'
    beep_wav(wav,dur,centers)
    try:
      cmd(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(src),'-i',str(wav),'-t',f'{dur:.3f}',
           '-map','0:v:0','-map','1:a:0','-vf',vf_mark(change),'-c:v','libx264','-preset','veryfast','-crf','28',
           '-pix_fmt','yuv420p','-c:a','aac','-ar','16000','-ac','1',str(out)])
    finally:wav.unlink(missing_ok=True)
    return {'duration_s':dur,'change_s':round(change,3),'beeps_s':[round(t,3) for t in centers]}

def make_natural(src,out):
    p=probe(src)
    if not p['video'] or not p['audio'] or p['duration_s']<8:
        raise ValueError(f'Natural source requires actual video+audio and >=8 seconds: {src} {p}')
    dur=min(12.0,p['duration_s']-.2)
    cmd(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(src),'-t',f'{dur:.3f}',
         '-map','0:v:0','-map','0:a:0',
         '-vf','scale=320:180:force_original_aspect_ratio=decrease,pad=320:180:(ow-iw)/2:(oh-ih)/2,fps=8',
         '-c:v','libx264','-preset','veryfast','-crf','28','-pix_fmt','yuv420p',
         '-c:a','aac','-ar','16000','-ac','1',str(out)])
    return {'duration_s':dur}

def find_existing(row):
    name=row['file']
    locations=[SRC/name,ROOT/'data/p4/temporal_pilot/sources'/name]
    # Prior P4 pilot sources named with spaces, not underscores
    locations += [ROOT/'data/p4/temporal_pilot/sources'/name.replace('_',' ')]
    for p in locations:
        if p.is_file() and p.stat().st_size>1000:return p
    return None

def download(row):
    SRC.mkdir(parents=True,exist_ok=True)
    dst=SRC/row['file']
    if dst.is_file() and dst.stat().st_size>1000:return dst
    url='https://commons.wikimedia.org/wiki/Special:Redirect/file/'+urllib.parse.quote(row['file'],safe='')
    req=urllib.request.Request(url,headers={'User-Agent':'PrismLabResearch/0.1 (academic reproducibility experiment; follow Wikimedia Commons licensing)','Accept':'video/webm,video/ogg,application/octet-stream;q=0.9,*/*;q=0.1'})
    partial=dst.with_name(dst.name+'.part')
    try:
      with urllib.request.urlopen(req,timeout=45) as resp,partial.open('wb') as f:
          typ=resp.headers.get('Content-Type','')
          if 'text/html' in typ:raise ValueError('Retrieved HTML rather than video')
          while True:
              block=resp.read(1024*1024)
              if not block:break
              f.write(block)
          if f.tell()<1000:raise ValueError('File unexpectedly small')
      partial.rename(dst)
      return dst
    except Exception as exc:
      partial.unlink(missing_ok=True)
      print(f'  DOWNLOAD BLOCKED: {row["id"]} ({type(exc).__name__}: {exc}).')
      print('  Manual source page:',row['page'])
      print('  Save original into:',dst)
      return None

def build(mode='all',with_download=False):
    DATA.mkdir(parents=True,exist_ok=True)
    SRC.mkdir(parents=True,exist_ok=True)
    catalog={x['id']:x for x in CATALOG}
    cases=[]
    def record(case_id,category,file,label,question,source=None,derived=None):
        path=DATA/file
        ready=path.is_file() and path.stat().st_size>1000
        info=probe(path) if ready else None
        cases.append({'id':case_id,'category':category,'file':file,'expected':label,'question':question,
                      'source_id':source,'source_page':catalog[source]['page'] if source else None,
                      'source_credit':catalog[source]['credit'] if source else 'Generated by PrismLab builder',
                      'intervention':derived,'status':'ready_review_required' if ready else 'missing_media',
                      'sha256':sha(path) if ready else None,'media':info,
                      'human_reviewed':False})
    for id_,beeps,change,label in SYNTH:
        file=f'{id_}_synthetic.mp4'; out=DATA/file
        if mode in ('synthetic','all') and not out.exists():
            print('Build',id_);make_synthetic(out,beeps,change)
        record(id_,'synthetic',file,label,QUESTION_TIMING,derived={'beeps_s':beeps,'color_change_s':change})
    for id_,source,label in HYBRID:
        file=f'{id_}_hybrid.mp4';out=DATA/file
        meta={'beep_order':label,'soundtrack':'REPLACED WITH CONTROLLED BEEPS'}
        if mode in ('real','all') and not out.exists():
            row=catalog[source]; src=find_existing(row)
            if src is None and with_download:src=download(row)
            if src:
              try:meta.update(make_hybrid(src,out,label));print('Build',id_,'from',src.name)
              except Exception as exc:print('  BUILD FAILED:',id_,exc)
            else:print('  PENDING source for',id_,row['page'])
        record(id_,'hybrid',file,label,QUESTION_TIMING,source=source,derived=meta)
    for id_,source,label in NATURAL:
        file=f'{id_}_natural.mp4';out=DATA/file
        meta={'soundtrack':'ORIGINAL AUDIO; label based on file description, needs human verification'}
        if mode in ('real','all') and not out.exists():
            row=catalog[source];src=find_existing(row)
            if src is None and with_download:src=download(row)
            if src:
              try:meta.update(make_natural(src,out));print('Build',id_,'from',src.name)
              except Exception as exc:print('  BUILD FAILED:',id_,exc)
            else:print('  PENDING source for',id_,row['page'])
        record(id_,'natural',file,label,QUESTION_NATURAL,source=source,derived=meta)
    ready=sum(r['status']=='ready_review_required' for r in cases)
    obj={'dataset':'PrismLab P4-E 18 distinct validation clip conditions','status':'DRAFT_NOT_FROZEN',
         'purpose':'18 validation clips with 6 synthetic, 6 hybrid and 6 natural original soundtracks',
         'sample_unit':'clip condition; matched variants and shared template are correlated',
         'created_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
         'requirements':'Complete 18/18, inspect human labels and audible content, then freeze using p4e18_review.py',
         'cases':cases,'source_catalog':CATALOG}
    MANIFEST.write_text(json.dumps(obj,indent=2,ensure_ascii=False))
    print(f'READY {ready}/18; MISSING {18-ready}/18; manifest={MANIFEST}')
    if ready<18:print('Not frozen. DO NOT claim full validation complete.')

if __name__=='__main__':
    ap=argparse.ArgumentParser()
    ap.add_argument('--mode',choices=['synthetic','real','all'],default='all')
    ap.add_argument('--download',action='store_true',help='Try one authorized Commons download per missing source; respect 429, otherwise use manual download')
    args=ap.parse_args()
    build(args.mode,args.download)
