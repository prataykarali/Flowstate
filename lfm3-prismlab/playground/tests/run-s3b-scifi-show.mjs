import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const outDir = new URL('../visual-review/s3b/', import.meta.url);
mkdirSync(outDir, { recursive: true });

const chrome = spawn('google-chrome', [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--remote-debugging-port=9470',
  'about:blank'
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws;

try {
  await sleep(1500);
  const tabs = await (await fetch('http://127.0.0.1:9470/json')).json();
  const pageTab = tabs.find(t => t.type === 'page');
  assert.ok(pageTab, 'Chrome tab not found');

  ws = new WebSocket(pageTab.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));

  let seq = 0;
  const pending = new Map();
  const networkRequests = [];

  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      m.error ? p.reject(m.error) : p.resolve(m.result);
    }
    if (m.method === 'Network.requestWillBeSent' && /\/local-api\/(text\/stream|execute)$/.test(m.params?.request?.url || '')) {
      networkRequests.push({ url: m.params.request.url, at: Date.now() });
      console.log(`   [Network Request] ${m.params.request.url.split('/').pop()} at ${new Date().toISOString()}`);
    }
    if (m.method === 'Runtime.consoleAPICalled') {
      const text = m.params.args.map(a => a.value ?? a.description ?? '').join(' ');
      if (m.params.type === 'error' || m.params.type === 'warn') {
        console.log(`   [Browser ${m.params.type}]`, text.slice(0, 160));
      }
    }
  });

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

  const evaluate = async expression => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw Error(`${r.exceptionDetails.text}: ${expression}`);
    return r.result.value;
  };

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://127.0.0.1:5173/#chat' });
  await sleep(2500);

  console.log('Navigated to http://127.0.0.1:5173/#chat');

  // Open story panel
  const storyPanelOpen = await evaluate("!!document.querySelector('.chat-story-inline')");
  if (!storyPanelOpen) {
    await evaluate("document.querySelector('.chat-story-toggle').click()");
    await sleep(500);
  }

  // Clear slate if any existing shows exist
  await evaluate(`(() => {
    localStorage.removeItem('prismlab_auto_story_shows_v1');
  })()`);
  await send('Page.reload', { ignoreCache: true });
  await sleep(2000);

  // Re-open story panel after reload
  const storyPanelOpen2 = await evaluate("!!document.querySelector('.chat-story-inline')");
  if (!storyPanelOpen2) {
    await evaluate("document.querySelector('.chat-story-toggle').click()");
    await sleep(500);
  }

  // Select 'Science fiction'
  await evaluate(`(() => {
    const sel = document.querySelector('.chat-story-opening select');
    if (sel) {
      sel.value = 'Science fiction';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
  })()`);
  await sleep(300);

  // Configure 19 turns and full cast
  await evaluate(`(() => {
    const details = document.querySelector('.chat-story-adv-panel');
    if (details) details.open = true;
    const turnSelect = document.querySelector('.chat-story-setup-row select');
    if (turnSelect) {
      turnSelect.value = '19';
      turnSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
  })()`);
  await sleep(300);

  // Click Full Cast
  await evaluate(`(() => {
    const castBtns = Array.from(document.querySelectorAll('.chat-story-cast button'));
    const fullCastBtn = castBtns.find(b => b.textContent.includes('Full Cast'));
    if (fullCastBtn) fullCastBtn.click();
  })()`);
  await sleep(300);

  const noteText = await evaluate("document.querySelector('.chat-story-note')?.textContent || ''");
  console.log('Plan note:', noteText);

  // Click Start Story
  console.log('Starting 19-turn Science Fiction Show...');
  await evaluate("document.querySelector('.chat-story-start-random')?.click() || document.querySelector('.chat-story-primary')?.click()");
  await sleep(1500);

  let lastTurnsCount = -1;
  let completedRecord = null;

  // Poll until completed or timeout (max 450 iterations * 2s = 900s / 15 minutes)
  for (let i = 0; i < 450; i++) {
    await sleep(2000);
    const record = await evaluate("(()=>{const raw=localStorage.getItem('prismlab_auto_story_shows_v1');return raw?JSON.parse(raw)[0]:null})()");
    const turnsCount = record?.turns?.length || 0;
    const totalTurns = record?.turnOrder?.length || 19;
    const statusText = await evaluate("document.querySelector('.chat-story-running-top span')?.textContent || ''");

    if (turnsCount !== lastTurnsCount) {
      const latestTurn = record?.turns?.at(-1);
      console.log(`\n--- Completed Turn ${turnsCount}/${totalTurns} ---`);
      console.log(`  Model: ${latestTurn?.modelId} (${latestTurn?.role})`);
      console.log(`  Status: ${latestTurn?.status}`);
      console.log(`  Request ID: ${latestTurn?.requestId}`);
      console.log(`  Provenance: ${latestTurn?.stageTextProvenance || 'n/a'}`);
      console.log(`  Latency: ${latestTurn?.latencyS ? latestTurn.latencyS.toFixed(2) + 's' : 'n/a'}`);
      if (latestTurn?.output) {
        console.log(`  Prose (${latestTurn.output.length} chars): "${latestTurn.output.slice(0, 140)}..."`);
      }
      if (latestTurn?.stageText) {
        console.log(`  Stage Text: "${latestTurn.stageText.slice(0, 140)}..."`);
      }
      if (latestTurn?.rejectionReason) {
        console.log(`  Rejection Reason: ${latestTurn.rejectionReason}`);
      }
      if (latestTurn?.error) {
        console.log(`  Error: ${latestTurn.error}`);
      }
      if (latestTurn?.continuityIssues?.length) {
        console.log(`  Continuity Issues:`, latestTurn.continuityIssues);
      }
      if (latestTurn?.loopIssue) {
        console.log(`  Loop Issue:`, latestTurn.loopIssue);
      }
      lastTurnsCount = turnsCount;
    } else if (i % 5 === 0) {
      console.log(`   [Waiting turn ${turnsCount + 1}/${totalTurns}] ${statusText || 'processing...'}`);
    }

    if (['failed', 'stopped', 'completed'].includes(record?.status)) {
      completedRecord = record;
      break;
    }
  }

  assert.ok(completedRecord, 'Show did not finish within 15-minute timeout');
  console.log(`\n========================================================`);
  console.log(`=== Science Fiction 19-Turn Show Result: ${completedRecord.status.toUpperCase()} ===`);
  console.log(`========================================================`);
  console.log(`Total turns: ${completedRecord.turns.length}/${completedRecord.turnOrder.length}`);
  console.log(`Show ID: ${completedRecord.showId}`);
  console.log(`Theme: ${completedRecord.config.theme}`);
  console.log(`Director Conflict: ${completedRecord.directorPlan?.primaryConflict}`);
  console.log(`Ending Requirements: ${completedRecord.directorPlan?.endingRequirements}`);

  // Save screenshot and full JSON transcript
  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(new URL('scifi-19turn-stage.png', outDir), Buffer.from(screenshot.data, 'base64'));
  writeFileSync(new URL('scifi-19turn-transcript.json', outDir), JSON.stringify(completedRecord, null, 2));
  console.log('Saved screenshot to visual-review/s3b/scifi-19turn-stage.png');
  console.log('Saved transcript to visual-review/s3b/scifi-19turn-transcript.json');

} finally {
  ws?.close();
  chrome.kill();
}
