import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const out = new URL('../visual-review/s3a/', import.meta.url); mkdirSync(out,{recursive:true});
const chrome=spawn('google-chrome',['--headless=new','--no-sandbox','--disable-gpu','--remote-debugging-port=9453','about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));let ws;
try{
 await sleep(1000);const tabs=await (await fetch('http://127.0.0.1:9453/json')).json();ws=new WebSocket(tabs.find(tab=>tab.type==='page').webSocketDebuggerUrl);await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));
 let seq=0;const pending=new Map(),errors=[];
 ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params.args.map(arg=>arg.value||arg.description).join(' '));});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(`${result.exceptionDetails.text}: ${expression}`);return result.result.value;};
 const shot=async name=>writeFileSync(new URL(name,out),Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 const visit=async route=>{await send('Page.navigate',{url:`http://127.0.0.1:5173/#${route}`});for(let i=0;i<30;i++){await sleep(100);if(await evaluate("!!document.querySelector('.page-title,.chat-character-caption strong')"))return;}throw Error(`Missing ${route}`);};
 await send('Runtime.enable');await send('Page.enable');
 for(const [width,height] of [[1440,900],[390,844]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});
  await visit('chat');
  await evaluate("document.querySelector('.chat-history').innerHTML='<article class=\"chat-message chat-message--model\"><p>Here is a brief response from Prism Pure. The complete answer is available in the character history.</p><button class=\"chat-read-history\">Full reply in history →</button></article>'");
  assert.equal(await evaluate("(()=>{const bubble=document.querySelector('.chat-conversation').getBoundingClientRect(),mascot=document.querySelector('.chat-stage-mascot').getBoundingClientRect();return bubble.bottom<mascot.top})()"),true,`bubble clears mascot at ${width}`);
  assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false,`chat overflow ${width}`);
  await shot(`chat-bubble-${width}.png`);
  await visit('championship');assert.equal(await evaluate("document.querySelectorAll('.league-card').length"),6);assert.equal(await evaluate("document.querySelectorAll('.league-points').length"),6);assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false,`league overflow ${width}`);await shot(`league-empty-${width}.png`);
  await visit('research');assert.equal(await evaluate("document.querySelectorAll('.research-chart-tabs button').length"),5);assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false,`research overflow ${width}`);await shot(`research-${width}.png`);
  await evaluate("Array.from(document.querySelectorAll('.research-chart-tabs button')).find(b=>b.textContent.includes('P4')).click()");assert.equal(await evaluate("document.querySelector('.research-chart-note').textContent.includes('p=0.25')"),true);await shot(`research-p4-${width}.png`);
 }
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await visit('trivia');await evaluate("document.querySelectorAll('.trivia-option')[1].click()");await sleep(120);await evaluate("document.querySelector('.trivia-actions button').click()");await sleep(250);
 assert.equal(await evaluate("JSON.parse(localStorage.getItem('prismlab_league_events_v1')).length"),1);
 await visit('championship');assert.equal(await evaluate("document.querySelector('.league-card .league-points').textContent.includes('8')"),true);await shot('league-earned-1440.png');
 await visit('research');assert.deepEqual(errors,[]);console.log('S3-A browser audit passed: Chat bubble clear of mascot, six local standings, verified Trivia award, Research charts, desktop/mobile overflow and screenshots.');
}finally{ws?.close();chrome.kill();}
