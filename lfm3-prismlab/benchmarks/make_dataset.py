"""PrismLab synthetic OCR challenge set: produces 10 PNGs and a ground-truth JSON.
All texts, dates, prices, credentials, and organizations are fictional sample data.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import json, math, random
ROOT = Path(__file__).resolve().parent
PROJECT_DIR = ROOT.parent
DATA_DIR = PROJECT_DIR / 'data' / 'synthetic_ocr'
IMDIR = DATA_DIR / 'images'
IMDIR.mkdir(parents=True, exist_ok=True)
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
MONO='/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
LATO='/usr/share/fonts/truetype/lato/Lato-Regular.ttf'

def f(n,bold=False,mono=False): return ImageFont.truetype(MONO if mono else BOLD if bold else LATO,int(n))
def txt(d,xy,s,size=28,color='#18253b',bold=False,mono=False,anchor=None):
    d.text(xy,s,font=f(size,bold,mono),fill=color,anchor=anchor)
def roundrect(d, xy, fill, radius=20, outline=None, width=2): d.rounded_rectangle(xy,radius=radius,fill=fill,outline=outline,width=width)
def bg(w=1200,h=760,color='#f5f7fb'): return Image.new('RGB',(w,h),color)
def save(im,name): im.save(IMDIR/f'{name}.png',optimize=True)
entries=[]
def rec(i,name,category,q,ans,phrases,complexity):
    entries.append(dict(id=f'{i:02}',filename=f'{name}.png',category=category,question=q,expected_answer=ans,required_phrases=phrases,difficulty=complexity))

# 01 high-contrast event poster
im=bg(color='#071c32'); d=ImageDraw.Draw(im)
d.ellipse((710,-260,1420,470),fill='#133e67'); d.ellipse((-180,510,420,1110),fill='#143957')
txt(d,(76,70),'CAMPUS INNOVATION WEEK',29,'#a2dffe',True)
txt(d,(72,155),'ROBOTICS',92,'#ffffff',True)
txt(d,(73,264),'OPEN LAB',92,'#6be1bd',True)
d.line((80,401,1100,401),fill='#315672',width=3)
txt(d,(82,448),'SATURDAY, 14 NOVEMBER 2026',42,'#ffffff',True)
txt(d,(82,529),'VENUE  /  HALL C-204',39,'#b9e0f2')
roundrect(d,(76,634,501,704),'#1d597b',16); txt(d,(101,653),'ENTRY CODE: RBL-42',28,'#ffffff',True)
save(im,'01_event_poster');rec(1,'01_event_poster','poster','What is the entry code?','RBL-42',['ROBOTICS OPEN LAB','14 NOVEMBER 2026','HALL C-204','RBL-42'],'easy')

# 02 receipt - dense lines
im=bg(820,1080,'#e5e8ee');d=ImageDraw.Draw(im);roundrect(d,(104,28,716,1048),'#fffef8',12)
txt(d,(169,81),'NORTH PIER CAFE',40,'#19232e',True)
txt(d,(205,143),'ORDER 0048  |  29 OCT 2026',21,'#263247',mono=True)
d.line((145,206,670,206),fill='#888',width=2)
items=[('Masala Sandwich','2 x 95.00','190.00'),('Cold Coffee','1 x 120.00','120.00'),('Lemon Tart','1 x 85.00','85.00'),('Bottled Water','1 x 30.00','30.00')]
for j,(name,qty,price) in enumerate(items):
 y=255+j*115;txt(d,(151,y),name,25,'#111');txt(d,(151,y+41),qty,21,'#56616a',mono=True);txt(d,(552,y+41),price,22,'#111',mono=True)
d.line((145,741,670,741),fill='#888',width=2)
txt(d,(152,782),'SUBTOTAL',26,'#111',True);txt(d,(530,782),'425.00',26,'#111',mono=True)
txt(d,(152,834),'SERVICE TAX',24,'#111');txt(d,(530,834),'21.25',24,'#111',mono=True)
d.line((145,889,670,889),fill='#333',width=3)
txt(d,(152,923),'GRAND TOTAL',30,'#111',True);txt(d,(525,921),'446.25',30,'#111',True,mono=True)
txt(d,(245,1012),'THANK YOU - VISIT AGAIN',19,'#555')
save(im,'02_cafe_receipt');rec(2,'02_cafe_receipt','receipt','What is the grand total amount?','446.25',['NORTH PIER CAFE','ORDER 0048','SERVICE TAX','446.25'],'medium')

# 03 classroom notice: poster on paper
im=bg(color='#e7edf8');d=ImageDraw.Draw(im);roundrect(d,(67,52,1134,702),'#ffffff',28)
roundrect(d,(67,52,1134,168),'#17496e',28);d.rectangle((67,134,1134,168),fill='#17496e')
txt(d,(102,93),'DEPARTMENT NOTICE',49,'#ffffff',True)
txt(d,(102,217),'AI / ML PROJECT REVIEW',46,'#172b3f',True)
txt(d,(105,301),'Submission deadline:',31,'#3e5268')
txt(d,(105,354),'07 DEC 2026, 5:30 PM',47,'#145b8c',True)
txt(d,(105,443),'Room: Innovation Studio 3',31,'#2b4058')
txt(d,(105,513),'Upload: report.pdf + demo.mp4',31,'#2b4058')
roundrect(d,(100,604,650,659),'#ecf3fa',14);txt(d,(126,620),'Coordinator: Dr. Sen',26,'#234')
save(im,'03_department_notice');rec(3,'03_department_notice','notice','What is the project submission deadline, including time?','07 DEC 2026, 5:30 PM',['AI / ML PROJECT REVIEW','07 DEC 2026','5:30 PM','Innovation Studio 3'],'medium')

# 04 lab schedule table
im=bg(1300,830,'#f7fbff');d=ImageDraw.Draw(im)
txt(d,(62,60),'WEEKLY LAB SCHEDULE',54,'#102540',True)
txt(d,(63,128),'Semester 5  /  Engineering Block',27,'#52667d')
rows=[('MON','09:30 - 11:00','Computer Networks','B-103'),('TUE','12:15 - 13:45','Data Mining','C-207'),('WED','14:00 - 15:30','Robotics Lab','D-412'),('THU','11:15 - 12:45','Signal Processing','B-211'),('FRI','15:45 - 17:00','Research Seminar','A-105')]
startx=[68,210,530,1045];sizes=[26,23,28,25]
roundrect(d,(57,205,1238,278),'#1d5577',16)
for x,hdr in zip(startx,['DAY','TIME','SESSION','ROOM']):txt(d,(x,228),hdr,26,'#fff',True)
for j,row in enumerate(rows):
 y=291+j*93;roundrect(d,(58,y,1237,y+79),'#ffffff' if j%2==0 else '#e9f1f8',11,outline='#d0dce8')
 for v,x,sz in zip(row,startx,sizes):txt(d,(x,y+21),v,sz,'#152b41',j==2)
save(im,'04_lab_schedule');rec(4,'04_lab_schedule','table','At what time is Robotics Lab scheduled?','14:00 - 15:30',['WEEKLY LAB SCHEDULE','Robotics Lab','14:00 - 15:30','D-412'],'hard')

# 05 shipping label with small text / barcode
im=bg(1200,750,'#efefec');d=ImageDraw.Draw(im);roundrect(d,(82,48,1115,694),'#fff',18,outline='#242424',width=3)
txt(d,(125,93),'ALPHA PARCEL  /  PRIORITY',39,'#151515',True)
txt(d,(125,170),'TRACKING ID',25,'#555',True);txt(d,(123,205),'AX-7049-2261',50,'#111',True,mono=True)
d.line((119,291,1083,291),fill='#555',width=2)
txt(d,(126,326),'FROM:   EAST DOCK 07',29,'#111')
txt(d,(126,384),'TO:     RIVERSTONE CAMPUS',29,'#111')
txt(d,(126,442),'ZONE:   WB-03',30,'#111',True)
random.seed(5)
for x in range(128,1080,5):
 if random.random()<0.72: d.rectangle((x,532,x+random.choice([1,2,3]),633),fill='#1d1d1d')
txt(d,(368,652),'HANDLE WITH CARE',22,'#333',True)
save(im,'05_shipping_label');rec(5,'05_shipping_label','shipping label','What is the full tracking ID?','AX-7049-2261',['ALPHA PARCEL','AX-7049-2261','RIVERSTONE CAMPUS','WB-03'],'medium')

# 06 terminal style technical screenshot
im=bg(color='#0d1320');d=ImageDraw.Draw(im);roundrect(d,(55,56,1143,713),'#161f30',22)
d.rectangle((55,57,1143,132),fill='#222d41');d.ellipse((87,86,104,103),fill='#fd777b');d.ellipse((116,86,133,103),fill='#f9bb69');d.ellipse((145,86,162,103),fill='#6ad0a6')
txt(d,(196,77),'runtime.log - LOCAL AGENT',25,'#bec7d6',mono=True)
lines=[('> initializing local inference service ...','#90c6d7'),('[INFO] backend = cpu','#b9c9d7'),('[INFO] binding = 127.0.0.1:8180','#c3e7bd'),('[INFO] model = lfm3-vision','#c3e7bd'),('[WARN] retrying tensor allocation','#ffcc8a'),('[ERROR] code = E_ALLOC_17','#ff8b92'),('[INFO] recovered after memory cleanup','#a3dba6'),('> status: READY','#d8e7f9')]
for j,(line,col) in enumerate(lines):txt(d,(101,170+j*65),line,28,col,mono=True)
save(im,'06_terminal_logs');rec(6,'06_terminal_logs','terminal screenshot','What is the exact error code?','E_ALLOC_17',['backend = cpu','127.0.0.1:8180','E_ALLOC_17','status: READY'],'hard')

# 07 stylized workshop invitation image mixed colors
im=bg(color='#f9eee5');d=ImageDraw.Draw(im)
d.polygon([(844,0),(1200,0),(1200,760),(608,760)],fill='#d9e9df')
d.ellipse((735,80,1170,515),fill='#94c2ae');d.ellipse((807,145,1100,440),fill='#f9eee5')
txt(d,(70,74),'WORKSHOP  /  2026',31,'#795f49',True)
txt(d,(65,162),'DESIGN',94,'#283d32',True)
txt(d,(66,273),'SYSTEMS',94,'#283d32',True)
d.line((72,404,701,404),fill='#8f9b82',width=3)
txt(d,(73,451),'Location: MAKER HUB 5',31,'#4b5144')
txt(d,(73,510),'Start: 10:45 AM',33,'#4b5144')
roundrect(d,(72,615,616,690),'#425b4e',18);txt(d,(104,638),'Registration: DS-218',31,'#ffffff',True)
save(im,'07_workshop_invite');rec(7,'07_workshop_invite','stylized poster','What is the registration code?','DS-218',['DESIGN SYSTEMS','MAKER HUB 5','10:45 AM','DS-218'],'medium')

# 08 fictional train ticket ticket-card graphic
im=bg(1200,750,'#dfeaf0');d=ImageDraw.Draw(im)
roundrect(d,(65,66,1134,673),'#f9fbfe',24)
roundrect(d,(66,67,1132,170),'#195d73',24);d.rectangle((66,140,1132,170),fill='#195d73')
txt(d,(106,102),'METROLINE  /  E-TICKET',40,'#ffffff',True)
txt(d,(104,218),'KOLKATA',52,'#16384b',True);txt(d,(730,218),'HOWRAH',52,'#16384b',True)
d.line((370,259,712,259),fill='#84afb6',width=5);d.polygon([(705,244),(736,259),(705,274)],fill='#84afb6')
txt(d,(108,329),'TRAIN: ML-209',29,'#2b4a5a')
txt(d,(700,329),'DATE: 18 NOV 2026',28,'#2b4a5a')
txt(d,(108,417),'DEPARTURE: 07:25',32,'#174e62',True)
txt(d,(700,417),'GATE: G-06',32,'#174e62',True)
roundrect(d,(101,529,1098,617),'#e1edf3',13)
txt(d,(129,554),'BOOKING REF: MLK-8652   /   COACH: C2',31,'#2c4553',True)
save(im,'08_train_ticket');rec(8,'08_train_ticket','transport ticket','Which gate is printed on the ticket?','G-06',['METROLINE','18 NOV 2026','G-06','MLK-8652'],'medium')

# 09 low contrast low-light instructions
im=bg(1200,770,'#d6d8d7');d=ImageDraw.Draw(im)
roundrect(d,(95,77,1090,698),'#e6e6e1',24,outline='#bcc2bc')
txt(d,(133,135),'NETWORK CONFIGURATION NOTE',45,'#66706a',True)
d.line((128,212,1045,212),fill='#b7bab6',width=2)
txt(d,(139,270),'SSID: PRISMLAB-TEST',34,'#818982')
txt(d,(139,340),'ACCESS KEY: PLB-7602',34,'#818982',True)
txt(d,(139,410),'MODE: OFFLINE ONLY',34,'#818982')
txt(d,(139,480),'VALID UNTIL: 02 DEC 2026',34,'#818982')
txt(d,(141,618),'Use on local demo devices only.',25,'#9a9f9b')
# subtle noise to resemble photo artifacts
random.seed(13)
for k in range(2600):
 x=random.randrange(100,1080);y=random.randrange(86,688);d.point((x,y),fill=random.choice(['#d9dbd8','#d3d5d2','#dddedb']))
save(im,'09_low_contrast_note');rec(9,'09_low_contrast_note','low contrast','What is the access key?','PLB-7602',['PRISMLAB-TEST','PLB-7602','OFFLINE ONLY','02 DEC 2026'],'hard')

# 10 dense two-column research brief
im=bg(1350,900,'#f3f5f8');d=ImageDraw.Draw(im)
roundrect(d,(52,43,1300,861),'#fff',20)
txt(d,(92,89),'EDGE SYSTEMS RESEARCH BRIEF',49,'#183657',True)
txt(d,(95,158),'Issue 08   |   Autumn 2026   |   Internal Demo',24,'#596d81')
d.line((93,217,1254,217),fill='#c9d3dd',width=3)
txt(d,(94,271),'EXPERIMENT SUMMARY',30,'#235b80',True)
txt(d,(94,334),'Model: LFM3-VL-2B',27,'#233a4d')
txt(d,(94,387),'Run ID: BENCH-074',27,'#233a4d')
txt(d,(94,440),'Resolution: 640 x 480',27,'#233a4d')
txt(d,(94,493),'Total latency: 18.7 s',27,'#233a4d')
txt(d,(94,546),'Status: REVIEW REQUIRED',26,'#955a1c',True)
d.line((672,265,672,748),fill='#d8e0e9',width=2)
txt(d,(715,271),'FOLLOW-UP ACTIONS',30,'#235b80',True)
txt(d,(715,334),'1. Check exact-string recall',25,'#233a4d')
txt(d,(715,390),'2. Repeat with new images',25,'#233a4d')
txt(d,(715,446),'3. Log CPU + memory load',25,'#233a4d')
txt(d,(715,502),'4. Compare text hand-off',25,'#233a4d')
roundrect(d,(711,622,1231,721),'#e9f4fc',13)
txt(d,(732,639),'Reviewer tag:',22,'#456179')
txt(d,(734,675),'RPT-06-DELTA',27,'#17496e',True)
txt(d,(95,787),'Demo data: not from production systems',21,'#768696')
save(im,'10_research_brief');rec(10,'10_research_brief','dense two-column document','What is the reviewer tag?','RPT-06-DELTA',['BENCH-074','18.7 s','REVIEW REQUIRED','RPT-06-DELTA'],'hard')

manifest={'title':'PrismLab controlled OCR challenge set','version':'1.0','origin':'Generated locally with Pillow; all content is fictional and synthetic','sample_count':len(entries),'notes':['Each image includes exact-answer question and reference OCR phrases.','Phrase recall is a limited proxy for transcription quality, not full character error rate.','All examples are synthetic; evaluate on real photos later for generalization.'],'cases':entries}
(DATA_DIR/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print('Created',len(entries),'images in',IMDIR)
