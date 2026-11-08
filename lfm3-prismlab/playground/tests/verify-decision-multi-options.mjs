import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const PROD_URL = 'https://prismlab-playground-rho.vercel.app/#chat';
const screenshotPath = '/home/pratay-karali/.gemini/antigravity/brain/0adcea67-d597-48e8-b840-2e9c43291d33/decision_multi_options.png';

console.log('=== STARTING MULTI-OPTION DECISION CHAT AUDIT ===');
console.log(`Target: ${PROD_URL}`);

const port = 9560;
const chrome = spawn('google-chrome', [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--disable-web-security',
  `--remote-debugging-port=${port}`,
  'about:blank'
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws;

try {
  await sleep(1500);
  const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const pageTab = tabs.find(t => t.type === 'page');
  assert.ok(pageTab, 'Chrome page tab not found');

  ws = new WebSocket(pageTab.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));

  let seq = 0;
  const pending = new Map();

  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      m.error ? p.reject(m.error) : p.resolve(m.result);
    }
  });

  const run = (expr) => new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    try {
      ws.send(JSON.stringify({
        id,
        method: 'Runtime.evaluate',
        params: { expression: expr, returnByValue: true, awaitPromise: true }
      }));
    } catch (e) {
      pending.delete(id);
      reject(e);
    }
  }).then(res => res?.result?.value);

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });

  console.log('1. Navigating to Chat...');
  await send('Page.navigate', { url: PROD_URL });
  await sleep(3000);

  // Clear any existing active activity lock
  console.log('2. Ensuring lock is released...');
  await run(`(()=>{
    const btn = document.querySelector('button[aria-label="Stop activity"], .chat-stop-btn') ||
                Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Stop Session') || b.textContent === 'Stop');
    if (btn) btn.click();
  })()`);
  await sleep(1000);

  // Switch to Prism Thinker (d1-2B)
  console.log('3. Switching to Prism Thinker...');
  await run(`(()=>{
    const btn = document.querySelector('button[aria-label*="Switch to Prism Thinker"]');
    if (btn) btn.click();
  })()`);
  await sleep(1000);

  // Clear previous conversation
  await run(`(()=>{
    const newBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('New conversation'));
    if (newBtn) newBtn.click();
  })()`);
  await sleep(500);

  // Set prompt
  const prompt = 'choose : biriyani, pizza, fried rice or pasta';
  console.log(`4. Setting prompt: "${prompt}"...`);
  await run(`(()=>{
    const input = document.querySelector('#chat-draft');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input, ${JSON.stringify(prompt)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await sleep(200);

  const isBtnDisabled = await run(`document.querySelector('button[aria-label="Send message"]').disabled`);
  console.log(`   Send button disabled: ${isBtnDisabled}`);
  assert.equal(isBtnDisabled, false, 'Send button must be enabled');

  console.log('5. Clicking Send message button...');
  await run(`document.querySelector('button[aria-label="Send message"]').click()`);

  // Wait for reply
  console.log('6. Waiting for decision evaluation response...');
  let latestText = '';
  let completed = false;
  for (let i = 0; i < 30; i++) {
    await sleep(1000);
    latestText = await run(`document.querySelector('.chat-message--model')?.textContent || ''`);
    const isPending = await run(`document.querySelector('button[aria-label="Send message"]')?.textContent === '···'`);
    console.log(`   [${i + 1}s] pending=${isPending}, modelTextLength=${latestText.length}`);
    if (latestText.length > 0 && !isPending) {
      completed = true;
      break;
    }
  }

  console.log('\n=== LATEST MODEL TEXT ===\n' + latestText + '\n=========================\n');

  // Also open history drawer to inspect rich decision card
  console.log('7. Opening chat history drawer...');
  await run(`document.querySelector('.chat-read-history, button[aria-label*="Toggle Prism Thinker"]')?.click()`);
  await sleep(1000);

  // Capture screenshot
  console.log('8. Capturing screenshot...');
  const snap = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(screenshotPath, Buffer.from(snap.data, 'base64'));
  console.log(`   Saved screenshot to: ${screenshotPath}`);

  // Assertions
  assert.ok(completed, 'Model reply must be generated');
  assert.ok(!latestText.includes("I couldn't identify the specific decision options"), 'Must not reject with clarification error');
  assert.ok(latestText.includes('Biriyani') || latestText.includes('Pizza') || latestText.includes('Fried rice') || latestText.includes('Pasta'), 'Must include decision alternatives');

  console.log('=== MULTI-OPTION DECISION TEST PASSED! ===');
} finally {
  if (ws) ws.close();
  chrome.kill('SIGKILL');
}
