import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
const out=new URL('../visual-review/s3b/',import.meta.url);mkdirSync(out,{recursive:true});
const chrome=spawn('google-chrome',['--headless=new','--no-sandbox','--disable-gpu','--remote-debugging-port=9455','about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let ws;
try{
 await sleep(1000);const tabs=await (await fetch('http://127.0.0.1:9455/json')).json();ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let seq=0;const pending=new Map(),requests=[];
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}if(m.method==='Network.requestWillBeSent'&&/\/local-api\/(text\/stream|execute)$/.test(m.params.request.url))requests.push({url:m.params.request.url,at:Date.now()});});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(`${r.exceptionDetails.text}: ${expression}`);return r.result.value;};
 await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:'http://127.0.0.1:5173/#chat'});await sleep(1500);
 await evaluate("document.querySelector('.chat-story-toggle').click()");await sleep(200);
 await evaluate("document.querySelector('.chat-story-setup-row label:nth-child(2) select').value='5';document.querySelector('.chat-story-setup-row label:nth-child(2) select').dispatchEvent(new Event('change',{bubbles:true}))");
 await evaluate("Array.from(document.querySelectorAll('.chat-story-cast label')).find(e=>e.textContent.includes('Prism Thinker')).querySelector('input').click()");
 await evaluate("document.querySelector('.chat-story-setup-row label:nth-child(3) select').value='64';document.querySelector('.chat-story-setup-row label:nth-child(3) select').dispatchEvent(new Event('change',{bubbles:true}))");
 await sleep(100);assert.equal(await evaluate("document.querySelector('.chat-story-note').textContent.includes('5 sequential')"),true);
 await evaluate("document.querySelector('.chat-story-primary').click()");await sleep(900);await evaluate("Array.from(document.querySelectorAll('.chat-story-running-actions button')).find(b=>b.textContent==='Pause').click()");
 let resumed=false,intervened=false,sawSwitch=false,lastCount=-1,record;
 for(let i=0;i<350;i++){
  await sleep(2000);record=await evaluate("(()=>{const raw=localStorage.getItem('prismlab_auto_story_shows_v1');return raw?JSON.parse(raw)[0]:null})()");
  const status=await evaluate("document.querySelector('.chat-story-running-top span')?.textContent||''");
  if(record?.turns.length!==lastCount){console.log('progress',record?.turns.length||0,'/',record?.turnOrder?.length,record?.status,status,record?.turns.at(-1)?.error||'');lastCount=record?.turns.length||0;}
  if(record?.turns.length>=1&&!resumed){assert.ok(status.includes('paused'));await evaluate("Array.from(document.querySelectorAll('.chat-story-running-actions button')).find(b=>b.textContent==='Resume').click()");resumed=true;console.log('resumed after first completed turn');}
  if(record?.turns.length>=2&&!intervened&&record?.status==='active'){
   const enabled=await evaluate("!document.querySelector('#story-human-draft').disabled");
   if(enabled){await evaluate("document.querySelector('#story-human-draft').focus()");await send('Input.insertText',{text:'The star hums in blue.'});await sleep(100);assert.equal(await evaluate("!Array.from(document.querySelectorAll('.chat-story-compose button')).find(b=>b.textContent==='Add line').disabled"),true);await evaluate("Array.from(document.querySelectorAll('.chat-story-compose button')).find(b=>b.textContent==='Add line').click()");intervened=true;console.log('human line added between turns');}
  }
  if(record?.turns.length===3){const caption=await evaluate("document.querySelector('.chat-character-caption strong')?.textContent");if(caption==='Prism Thinker')sawSwitch=true;}
  if(['failed','stopped','completed'].includes(record?.status))break;
 }
 assert.equal(record?.status,'completed');assert.equal(resumed,true);assert.equal(intervened,true);assert.equal(sawSwitch,true);
 assert.equal(record.turns.length,5);assert.deepEqual(record.turns.map(t=>t.modelId),['text','text','d1','text','text']);assert.equal(record.humanTurns.length,1);assert.equal(record.humanTurns[0].text,'The star hums in blue.');
 assert.ok(record.turns.every(t=>t.status==='completed'&&t.requestId?.length===32&&t.route?.includes(t.modelId)&&t.output));assert.equal(requests.length,5);
 const ledger=await evaluate("JSON.parse(localStorage.getItem('prismlab_league_events_v1')||'[]')");assert.equal(ledger.filter(e=>e.sessionId===record.showId&&e.activity==='auto_story_turn').length,5);
 const before=requests.length;await evaluate("Array.from(document.querySelectorAll('.chat-story-running-actions button')).find(b=>b.textContent==='New story').click()");await sleep(100);await evaluate("document.querySelector('.chat-story-replays button').click()");await sleep(150);
 assert.equal(await evaluate("document.querySelector('.chat-story-running strong').textContent"),'Recorded story');assert.equal(requests.length,before);
 await evaluate("document.querySelector('.chat-history-side-toggle').click()");await sleep(200);assert.equal(await evaluate("document.querySelectorAll('.chat-story-history-turn').length"),5);assert.equal(await evaluate("document.querySelectorAll('.chat-story-human-line').length"),1);
 writeFileSync(new URL('live-chat-stage.png',out),Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 writeFileSync(new URL('live-acceptance-chat.json',out),JSON.stringify({show:record,requests,leagueEvents:ledger.filter(e=>e.sessionId===record.showId)},null,2));
 console.log('S3-B live Chat-stage acceptance passed: automatic character switch, five verified turns, human intervention, pause/resume, attribution, offline replay.');
}finally{ws?.close();chrome.kill();}
