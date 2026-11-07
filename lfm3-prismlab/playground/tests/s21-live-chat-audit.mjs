import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const chrome = spawn('google-chrome', ['--headless=new', '--no-sandbox', '--disable-gpu', '--remote-debugging-port=9660', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let ws;
try {
  await sleep(1000);
  const tabs = await (await fetch('http://127.0.0.1:9660/json')).json();
  ws = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
  let seq = 0;
  const pending = new Map();
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const promise = pending.get(message.id);
    pending.delete(message.id);
    message.error ? promise.reject(message.error) : promise.resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const run = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw Error(`${result.exceptionDetails.text}: ${expression}`);
    return result.result.value;
  };
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://127.0.0.1:5173/#chat' });
  for (let i = 0; i < 30 && !await run("!!document.querySelector('.chat-character-caption strong')"); i++) await sleep(100);
  for (let i = 0; i < 30 && !await run("document.querySelector('.chat-runtime')?.classList.contains('is-ready')"); i++) await sleep(100);
  assert.equal(await run("document.querySelector('.chat-runtime')?.classList.contains('is-ready')"), true);

  const cases = process.argv.includes('--text-only') ? [
    { name: 'Prism Pure', alias: 'text', prompt: 'What is a garden? Answer in one short sentence.', files: [] },
  ] : process.argv.includes('--video-only') ? [
    { name: 'Spectra', alias: 'vision', prompt: 'Describe the visual scene in this short video.', files: ['video'] },
    { name: 'Omni Pup', alias: 'omni', prompt: 'Describe the visual scene in this short video.', files: ['video'] },
    { name: 'Prism Thinker', alias: 'd1', prompt: 'Classify this video for human review.', files: ['video'] },
    { name: 'Sherlock Omni', alias: 'd1_omni', prompt: 'Classify this video for human review.', files: ['video'] },
  ] : [
    { name: 'Spectra', alias: 'vision', prompt: 'Read the main word in the attached image.', files: ['image'] },
    { name: 'Echo', alias: 'audio', prompt: 'Transcribe or describe the attached speech.', files: ['audio'] },
    { name: 'Omni Pup', alias: 'omni', prompt: 'Describe the supplied image and audio.', files: ['image', 'audio'] },
    { name: 'Prism Thinker', alias: 'd1', prompt: 'A customer was billed twice. Choose the review route.', files: [] },
    { name: 'Sherlock Omni', alias: 'd1_omni', prompt: 'Classify this recorded request for human review.', files: ['audio'] },
  ];
  const errorsOnly = process.argv.includes('--errors-only');
  for (const item of cases) {
    if (await run("document.querySelector('.chat-character-caption strong')?.textContent") !== item.name) await run(`document.querySelector(${JSON.stringify(`button[aria-label^="Switch to ${item.name},"]`)}).click()`);
    for (let i = 0; i < 20 && await run("document.querySelector('.chat-character-caption strong')?.textContent") !== item.name; i++) await sleep(100);
    assert.equal(await run("document.querySelector('.chat-character-caption strong')?.textContent"), item.name);
    if (errorsOnly) {
      const kind = item.files.includes('image') || item.name === 'Prism Thinker' ? 'image' : 'audio';
      const type = kind === 'image' ? 'image/png' : 'audio/wav';
      await run("document.querySelector('button[aria-label=\"Attachments\"]').click()");
      await run(`(()=>{const input=document.querySelector(${JSON.stringify(`input[type=file][accept*="${type}"]`)});if(!input)throw Error('Missing ${kind} input');const transfer=new DataTransfer();transfer.items.add(new File(['bad media'],${JSON.stringify(`invalid.${kind === 'image' ? 'png' : 'wav'}`)},{type:${JSON.stringify(type)}}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}))})()`);
      await run(`(()=>{const input=document.querySelector('#chat-draft');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,${JSON.stringify(`Check invalid ${kind} for ${item.name}`)});input.dispatchEvent(new Event('input',{bubbles:true}))})()`);
      await sleep(70);
      await run("document.querySelector('button[aria-label=\"Send message\"]').click()");
      for (let i = 0; i < 20 && !await run("document.querySelector('.chat-error')?.textContent"); i++) await sleep(100);
      const error = await run("document.querySelector('.chat-error')?.textContent || ''");
      assert.ok(error.includes('file signature'), `${item.name}: ${error}`);
      console.log(JSON.stringify({ model: item.name, error }));
      continue;
    }
    if (item.files.length) {
      await run("document.querySelector('button[aria-label=\"Attachments\"]').click()");
      for (const kind of item.files) {
        const path = kind === 'image' ? '/samples/sample.png' : kind === 'audio' ? '/samples/sample.wav' : '/samples/sample.mp4';
        const type = kind === 'image' ? 'image/png' : kind === 'audio' ? 'audio/wav' : 'video/mp4';
        await run(`(async()=>{const blob=await (await fetch(${JSON.stringify(path)})).blob();const input=document.querySelector(${JSON.stringify(`input[type=file][accept*="${type}"]`)});if(!input)throw Error('Missing ${kind} input');const transfer=new DataTransfer();transfer.items.add(new File([blob],${JSON.stringify(`s21-sample.${kind === 'image' ? 'png' : kind === 'audio' ? 'wav' : 'mp4'}`)},{type:${JSON.stringify(type)}}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}))})()`);
      }
    }
    await run(`(()=>{const input=document.querySelector('#chat-draft');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,${JSON.stringify(item.prompt)});input.dispatchEvent(new Event('input',{bubbles:true}))})()`);
    await sleep(70);
    assert.equal(await run("document.querySelector('button[aria-label=\"Send message\"]').disabled"), false);
    const started = Date.now();
    await run("document.querySelector('button[aria-label=\"Send message\"]').click()");
    let state = '';
    for (let i = 0; i < 180; i++) {
      await sleep(1000);
      state = await run("document.querySelector('.chat-last-execution')?'done':document.querySelector('.chat-error')?'error':'pending'");
      if (state !== 'pending') break;
    }
    assert.equal(state, 'done', `${item.name}: ${await run("document.querySelector('.chat-error')?.textContent")}`);
    const execution = await run("document.querySelector('.chat-last-execution')?.textContent");
    assert.ok(execution.includes(item.alias), `${item.name}: ${execution}`);
    await run("document.querySelector('.chat-history-side-toggle').click()");
    await sleep(100);
    const history = await run("document.querySelector('.chat-drawer-turns')?.innerText || ''");
    assert.ok(history.includes(item.prompt), `${item.name}: input missing from history`);
    assert.ok(await run("document.querySelectorAll('.chat-drawer-turn--model').length") > 0);
    const result = { model: item.name, route: item.alias, elapsed_s: (Date.now() - started) / 1000, execution, reply: history.slice(-700) };
    console.log(JSON.stringify(result));
    await run("document.querySelector('button[aria-label=\"Close chat history\"]').click()");
  }
  console.log(errorsOnly ? 'S2.1 invalid media UI states passed for five non-text models.' : `S2.1 live Chat pathways passed for ${cases.length} model${cases.length === 1 ? '' : 's'}.`);
} finally { ws?.close(); chrome.kill(); }
