import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
const out=new URL('../visual-review/s3b/',import.meta.url);mkdirSync(out,{recursive:true});
const chrome=spawn('google-chrome',['--headless=new','--no-sandbox','--disable-gpu','--remote-debugging-port=9454','about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let ws;
try{
 await sleep(1000);const tabs=await (await fetch('http://127.0.0.1:9454/json')).json();ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let seq=0;const pending=new Map(),requests=[],errors=[];
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}if(m.method==='Network.requestWillBeSent'&&/\/local-api\/(text\/stream|execute)$/.test(m.params.request.url))requests.push(m.params.request.url);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params.args.map(a=>a.value||a.description).join(' '));});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(`${r.exceptionDetails.text}: ${expression}`);return r.result.value;};const shot=async name=>writeFileSync(new URL(name,out),Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Page.navigate',{url:'http://127.0.0.1:5173/#chat'});await sleep(1500);
 assert.equal(await evaluate("!!document.querySelector('.chat-story-toggle')"),true);await evaluate("document.querySelector('.chat-story-toggle').click()");await sleep(250);
 assert.equal(await evaluate("!!document.querySelector('.chat-world .chat-story-inline')"),true);assert.equal(await evaluate("!!document.querySelector('.chat-story-overlay')"),false);
 await evaluate("Array.from(document.querySelectorAll('.chat-story-cast button')).find(b=>b.textContent.includes('All six')).click()");assert.equal(await evaluate("document.querySelectorAll('.chat-story-cast input:checked').length"),6);assert.equal(await evaluate("document.querySelector('.chat-story-note').textContent.includes('9 sequential')"),true);
 await evaluate("Array.from(document.querySelectorAll('.chat-story-cast button')).find(b=>b.textContent.includes('Prism Pure only')).click()");
 const sample={version:'s3b.1',showId:'browser-fixture',createdAt:'2026-11-04T10:00:00Z',updatedAt:'2026-11-04T10:01:00Z',config:{theme:'Celestial mystery',opening:'A star appeared.',turnCount:4,modelIds:['text'],playback:'automatic',maxTokens:64},turnOrder:['text','text','text','text'],turns:[0,1,2,3].map(i=>({turnId:`browser-fixture:${i+1}`,index:i,modelId:'text',role:'writer',status:'completed',requestId:String(i+1).padStart(32,'0'),route:['text'],output:`Fixture segment ${i+1}`,promptLength:110,contextTruncated:false,startedAt:'2026-11-04T10:00:00Z',finishedAt:'2026-11-04T10:00:01Z',latencyS:1})),humanTurns:[],status:'completed',mode:'live_local_show'};
 await evaluate(`localStorage.setItem('prismlab_auto_story_shows_v1',${JSON.stringify(JSON.stringify([sample]))})`);
 for(const [width,height,label] of [[1440,900,'desktop'],[800,900,'tablet'],[390,844,'mobile']]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});await send('Page.reload',{ignoreCache:true});await sleep(1400);
  await evaluate("document.querySelector('.chat-story-toggle').click()");await sleep(250);await evaluate("document.querySelector('.chat-story-replays button').click()");await sleep(200);
  assert.equal(await evaluate("document.querySelector('.chat-story-running strong').textContent"),'Recorded story');assert.equal(await evaluate("document.querySelector('.chat-world .chat-stage-mascot svg')!==null"),true);assert.equal(await evaluate("document.querySelector('.chat-conversation').textContent.includes('Fixture segment 4')"),true);assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,`${label} overflow`);
  await evaluate("document.querySelector('.chat-history-side-toggle').click()");await sleep(250);assert.equal(await evaluate("document.querySelectorAll('.chat-story-history-turn').length"),4);await shot(`chat-stage-${label}.png`);
 }
 assert.deepEqual(requests,[]);assert.deepEqual(errors,[]);console.log('S3-B Chat-stage browser audit passed: same Chat stage, six-cast preset, saved replay, full history, no inference, three viewport sizes.');
}finally{ws?.close();chrome.kill();}
