import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
const out = new URL('../visual-review/s2/', import.meta.url); mkdirSync(out, {recursive:true});
const chrome = spawn('google-chrome', ['--headless=new','--no-sandbox','--disable-gpu','--remote-debugging-port=9445','about:blank'], {stdio:'ignore'});
const sleep = ms => new Promise(resolve => setTimeout(resolve,ms)); let ws;
try {
 await sleep(1000); const tabs = await (await fetch('http://127.0.0.1:9445/json')).json(); ws = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl); await new Promise(resolve => ws.addEventListener('open',resolve,{once:true}));
 let seq=0; const pending=new Map(), errors=[];
 ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params.args.map(a=>a.value||a.description).join(' '));});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(`${result.exceptionDetails.text}: ${expression}`);return result.result.value;};
 const shot=async name=>writeFileSync(new URL(name,out),Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 const visit=async route=>{await send('Page.navigate',{url:`http://127.0.0.1:5173/#${route}`});for(let i=0;i<20;i++){await sleep(150);if(await evaluate("!!document.querySelector('.page-title,.chat-character-caption strong')"))return;}throw Error(`Route ${route} did not render: ${String(await evaluate('document.body.innerText')).slice(0,200)}`);};
 await send('Runtime.enable'); await send('Page.enable');
 for(const [width,height] of [[1440,900],[1024,768],[390,844]]) {
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});
  for(const route of ['world','playground','chat','trivia','arcade','research','architecture','championship','settings']) {await visit(route);assert.ok(await evaluate("!!document.querySelector('.page-title,.chat-character-caption strong')"),`${route} heading`);assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false,`${route} horizontal overflow at ${width}`);}
  await visit('chat'); await shot(`chat-${width}.png`);
  assert.equal(await evaluate("document.querySelectorAll('.chat-stage-mascot .mascot-card').length"),1);
  assert.equal(await evaluate("document.querySelectorAll('.chat-side-roster button').length"),5);
  assert.equal(await evaluate("Math.abs(document.querySelector('.chat-stage-mascot').getBoundingClientRect().left + document.querySelector('.chat-stage-mascot').getBoundingClientRect().width/2 - innerWidth/2) < 3"),true);
  assert.equal(await evaluate("document.querySelector('.chat-scene-video')?.getAttribute('src')"),'/assets/chat_loop.mp4');
  assert.equal(await evaluate("document.querySelector('.chat-compose').getBoundingClientRect().bottom <= innerHeight"),true);
  assert.equal(await evaluate("Math.abs(document.querySelector('.page-chat').getBoundingClientRect().height + document.querySelector('.header-bar').getBoundingClientRect().height - innerHeight) < 2"),true);
  assert.equal(await evaluate("document.querySelector('.chat-send-button').disabled"),true);
 }
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await visit('chat');
 await evaluate("document.querySelector('.chat-side-roster button').click()");await sleep(760);assert.ok((await evaluate("document.querySelector('.chat-character-caption strong').textContent")).includes('Spectra'));
 await evaluate("document.querySelector('.chat-stage-mascot .mascot-card').click()");await sleep(60);assert.equal(await evaluate("document.querySelector('.chat-stage-mascot .mascot-card').dataset.emotion"),'surprised');
 const frameDir=new URL('frames/',out);mkdirSync(frameDir,{recursive:true});
 for(let i=0;i<5;i++){await evaluate("document.querySelector('.chat-switcher button:last-child').click()");await shot(`frames/f${String(i*3).padStart(3,'0')}.png`);await sleep(120);await shot(`frames/f${String(i*3+1).padStart(3,'0')}.png`);await sleep(120);await shot(`frames/f${String(i*3+2).padStart(3,'0')}.png`);}
 await sleep(800);assert.equal(await evaluate("document.querySelectorAll('.chat-stage-mascot .mascot-card').length"),1);assert.equal(await evaluate("document.querySelector('.chat-stage-mascot').dataset.phase"),'idle');await shot('chat-switched.png');
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await sleep(100);await evaluate("document.querySelector('.chat-switcher button:last-child').click()");await sleep(30);assert.equal(await evaluate("document.querySelector('.chat-stage-mascot').dataset.phase"),'idle');await shot('chat-reduced-motion.png');
 await evaluate("document.querySelector('#chat-draft').value='Hello from the offline acceptance test';document.querySelector('#chat-draft').dispatchEvent(new Event('input',{bubbles:true}))");assert.equal(await evaluate("document.querySelector('.chat-send-button').disabled"),true);assert.equal(await evaluate("document.querySelectorAll('.chat-message').length"),0);
 await send('Emulation.setEmulatedMedia',{features:[]});
 await shot('chat-offline-draft.png');
 await evaluate("localStorage.setItem('prismlab_character_chats_v2',JSON.stringify({text:Array.from({length:30},(_,i)=>({role:i%2?'model':'you',text:'History turn '+i+' '.repeat(120)}))}))");
 await visit('world');await visit('chat');assert.equal(await evaluate("document.querySelectorAll('.chat-message').length"),0);
 await evaluate("document.querySelector('.chat-history-side-toggle').click()");await sleep(80);
 assert.equal(await evaluate("(()=>{const body=document.querySelector('.chat-drawer-body');return body.scrollTop+body.clientHeight>=body.scrollHeight-2})()"),true);
 await evaluate("document.querySelector('button[aria-label=\"Close chat history\"]').click();document.querySelector('.chat-switcher').focus()");await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});await sleep(760);
 assert.equal(await evaluate("document.querySelector('.chat-character-caption strong')?.textContent"),'Spectra');
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await evaluate("document.querySelector('.chat-switcher').focus()");await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});await sleep(760);
 assert.equal(await evaluate("document.querySelector('.chat-character-caption strong')?.textContent"),'Echo');
 await visit('world');await visit('chat');assert.equal(await evaluate("document.querySelector('.chat-scene-video')!==null"),true);
 await evaluate("document.querySelector('.chat-scene-video').dispatchEvent(new Event('error'))");await sleep(80);
 assert.equal(await evaluate("document.querySelector('.chat-scene-video')===null && getComputedStyle(document.querySelector('.chat-world')).backgroundImage.includes('chat-stage-v2.webp')"),true);
 await send('Page.addScriptToEvaluateOnNewDocument',{source:"Object.defineProperty(navigator,'connection',{configurable:true,value:{saveData:true}})"});
 await send('Page.navigate',{url:'http://127.0.0.1:5173/?s21=save-data#world'});await sleep(800);assert.equal(await evaluate("document.querySelectorAll('video').length===0 && document.querySelectorAll('.scene-poster').length>0"),true);
 await visit('chat');assert.equal(await evaluate("document.querySelectorAll('.chat-scene-video').length"),0);
 assert.deepEqual(errors,[]); console.log('S2 browser audit passed: 9 routes × 3 viewports; single mascot, video, composer, rapid switching, reduced motion and offline state.');
 try {execFileSync('ffmpeg',['-y','-framerate','3','-pattern_type','glob','-i',new URL('frames/*.png',out).pathname,'-vf','scale=960:-2','-c:v','libx264','-pix_fmt','yuv420p',new URL('chat-switch-demo.mp4',out).pathname],{stdio:'ignore'});}catch{}
 rmSync(frameDir,{recursive:true,force:true});
} finally {ws?.close();chrome.kill();}
