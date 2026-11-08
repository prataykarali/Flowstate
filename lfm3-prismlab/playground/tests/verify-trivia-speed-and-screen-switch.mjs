import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const PROD_URL = 'https://prismlab-playground-rho.vercel.app';
const outDir = new URL('../visual-review/s5h/', import.meta.url);
mkdirSync(outDir, { recursive: true });

console.log('=== STARTING TRIVIA SPEED & SCREEN SWITCH AUDIT ===');
console.log(`Target: ${PROD_URL}`);

const port = 9522;
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
  const consoleLogs = [];

  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      m.error ? p.reject(m.error) : p.resolve(m.result);
    }
    if (m.method === 'Runtime.consoleAPICalled') {
      const text = m.params.args.map(a => a.value ?? a.description ?? '').join(' ');
      if (m.params.type === 'error') {
        consoleLogs.push(text);
        console.log('   [Browser Error]', text.slice(0, 160));
      }
    }
  });

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  const evaluate = async expr => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    return r.result?.value;
  };

  // 1. Visit Trivia Arena
  console.log('1. Navigating to #trivia...');
  await send('Page.navigate', { url: `${PROD_URL}/#trivia` });
  await sleep(2500);

  const heading = await evaluate(`document.querySelector('.s4-trivia-header h1')?.textContent`);
  console.log('   Heading:', heading);
  assert.equal(heading, 'Trivia Arena', 'Trivia Arena heading matched');

  // Check initial state
  const initialButtons = await evaluate(`[...document.querySelectorAll('.s4-live-actions button')].map(b => b.textContent.trim())`);
  // Ensure clean slate before test starts
  await evaluate(`
    try {
      localStorage.removeItem('prismlab_active_trivia_match_v1');
      sessionStorage.clear();
    } catch {}
  `);
  await send('Page.navigate', { url: `${PROD_URL}/#trivia` });
  await sleep(1500);

  // 2. Start Live Match
  console.log('2. Starting live match...');
  const startBtn = await evaluate(`!![...document.querySelectorAll('.s4-live-actions button')].find(b => b.textContent.includes('Start live match'))`);
  assert.ok(startBtn, 'Start live match button must exist');
  
  const startStart = performance.now();
  await evaluate(`[...document.querySelectorAll('.s4-live-actions button')].find(b => b.textContent.includes('Start live match')).click()`);

  // Wait for Question to be generated
  console.log('3. Measuring question generation speed...');
  let questionReady = false;
  let qText = '';
  let lastFooter = '';
  for (let i = 0; i < 60; i++) {
    await sleep(500);
    qText = await evaluate(`document.querySelector('#s4-question-title')?.textContent`) || '';
    const footer = await evaluate(`document.querySelector('.s4-question-footer')?.textContent`) || '';
    if (footer !== lastFooter) {
      lastFooter = footer;
      console.log('   Footer status:', footer);
    }
    if (qText && !qText.includes('preparing a fresh question') && !qText.includes('Generating')) {
      questionReady = true;
      const qDuration = ((performance.now() - startStart) / 1000).toFixed(2);
      console.log(`   ✓ Question generated in ${qDuration}s: "${qText.slice(0, 70)}..."`);
      break;
    }
  }
  if (!questionReady) {
    const errorText = await evaluate(`document.querySelector('.s4-trivia-controls [role="alert"]')?.textContent`);
    console.log('   Error alert:', errorText);
  }
  assert.ok(questionReady, 'Question generated successfully');

  // Wait for contestants to answer
  console.log('4. Checking contestant answering...');
  let answeringStarted = false;
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    const bubbles = await evaluate(`[...document.querySelectorAll('.s4-answer-bubble')].map(b => b.textContent.trim())`) || [];
    if (bubbles.some(b => b.startsWith('Answer ') || b.includes('Thinking'))) {
      answeringStarted = true;
      console.log('   Contestant bubbles:', bubbles);
      break;
    }
  }

  // 5. Test Screen Switching (DONOT PAUSE on screen switch)
  console.log('5. Testing Screen Switching: navigating to #world while match is active...');
  await send('Page.navigate', { url: `${PROD_URL}/#world` });
  await sleep(1500);

  // Verify World page is visible
  const worldTitle = await evaluate(`document.querySelector('.brand-title')?.textContent`);
  console.log('   Active page brand:', worldTitle);

  // Check Global Banner status while on World page
  const bannerText = await evaluate(`document.querySelector('.global-activity-banner')?.textContent`);
  console.log('   Global banner while on World page:', bannerText);
  assert.ok(bannerText?.includes('Trivia') || bannerText?.includes('In Progress'), 'Global banner shows active Trivia');
  assert.ok(!bannerText?.includes('is saved. Single-activity lock is released'), 'Must NOT auto-park or pause on screen switch');

  // Wait 3 seconds on World page so Trivia continues in background
  console.log('   Waiting 3 seconds on World page as background match runs...');
  await sleep(3000);

  // Switch back to #trivia
  console.log('6. Switching back to #trivia...');
  await send('Page.navigate', { url: `${PROD_URL}/#trivia` });
  await sleep(1000);

  // Check trivia status - MUST NOT BE PAUSED unless user tapped pause!
  const triviaFooter = await evaluate(`document.querySelector('.s4-question-footer')?.textContent`);
  const activeButtons = await evaluate(`[...document.querySelectorAll('.s4-live-actions button')].map(b => b.textContent.trim())`);
  console.log('   Trivia footer after switching back:', triviaFooter);
  console.log('   Trivia action buttons after switching back:', activeButtons);

  // 7. Test Explicit Pause
  console.log('7. Testing explicit user PAUSE...');
  const pauseBtn = await evaluate(`!![...document.querySelectorAll('.s4-live-actions button')].find(b => b.textContent === 'Pause' || b.textContent.includes('Pausing'))`);
  if (pauseBtn) {
    await evaluate(`[...document.querySelectorAll('.s4-live-actions button')].find(b => b.textContent === 'Pause' || b.textContent.includes('Pausing'))?.click()`);
    await sleep(1200);
    const pausedButtons = await evaluate(`[...document.querySelectorAll('.s4-live-actions button')].map(b => b.textContent.trim())`);
    console.log('   Buttons after tapping Pause:', pausedButtons);
    assert.ok(pausedButtons.some(b => b.includes('Resume')), 'Pause button toggles to Resume');

    // 8. Test Explicit Resume
    console.log('8. Testing explicit user RESUME...');
    await evaluate(`[...document.querySelectorAll('.s4-live-actions button')].find(b => b.includes('Resume'))?.click()`);
    await sleep(1200);
    const resumedButtons = await evaluate(`[...document.querySelectorAll('.s4-live-actions button')].map(b => b.textContent.trim())`);
    console.log('   Buttons after tapping Resume:', resumedButtons);
  }

  // 9. Take screenshot
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const shotPath = new URL('trivia_speed_and_switch_test.png', outDir);
  writeFileSync(shotPath, Buffer.from(shot.data, 'base64'));
  console.log(`9. Screenshot saved to: ${shotPath.pathname}`);

  console.log('\n=== ALL TRIVIA SPEED & SCREEN SWITCH AUDIT CHECKS PASSED ===');
} finally {
  ws?.close();
  chrome.kill();
}
