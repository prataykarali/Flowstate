import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const outDir = new URL('../visual-review/s3b5/', import.meta.url);
mkdirSync(outDir, { recursive: true });

const chrome = spawn('google-chrome', [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--remote-debugging-port=9460',
  'about:blank'
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws;

try {
  await sleep(1500);
  const tabs = await (await fetch('http://127.0.0.1:9460/json')).json();
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
        console.log(`   [Browser ${m.params.type}]`, text.slice(0, 120));
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

  // Helper to run a complete 10-turn show for a given genre
  async function runGenreShow(genreName, screenshotName) {
    console.log(`\n========================================================`);
    console.log(`=== Starting Live Acceptance Show: ${genreName} (10 turns) ===`);
    console.log(`========================================================`);
    
    // Check if story panel is open, if not open it
    const storyPanelOpen = await evaluate("!!document.querySelector('.chat-story-inline')");
    if (!storyPanelOpen) {
      await evaluate("document.querySelector('.chat-story-toggle').click()");
      await sleep(500);
    }

    // If an existing completed/stopped show is visible, click 'New story'
    const hasRunningActions = await evaluate("!!document.querySelector('.chat-story-running-actions button')");
    if (hasRunningActions) {
      await evaluate("Array.from(document.querySelectorAll('.chat-story-running-actions button')).find(b => b.textContent.toLowerCase().includes('new story'))?.click()");
      await sleep(600);
    }

    // Ensure setup form is ready
    for (let wait = 0; wait < 10; wait++) {
      const hasSelect = await evaluate("!!document.querySelector('.chat-story-opening select')");
      if (hasSelect) break;
      await sleep(300);
    }

    // Select genre
    await evaluate(`(() => {
      const sel = document.querySelector('.chat-story-opening select');
      if (sel) {
        sel.value = '${genreName}';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()`);
    await sleep(300);

    // Explicitly configure 10 turns
    await evaluate(`(() => {
      const details = document.querySelector('.chat-story-adv-panel');
      if (details) details.open = true;
      const turnSelect = document.querySelector('.chat-story-setup-row select');
      if (turnSelect) {
        turnSelect.value = '10';
        turnSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()`);
    await sleep(200);

    const noteText = await evaluate("document.querySelector('.chat-story-inline-head span')?.textContent || ''");
    console.log('Setup verified:', noteText);

    // Click Start Story
    await evaluate("document.querySelector('.chat-story-start-random')?.click() || document.querySelector('.chat-story-primary')?.click()");
    await sleep(1000);

    let lastTurnsCount = -1;
    let completedRecord = null;

    // Poll until completed or timeout (max 300 iterations * 2s = 600s)
    for (let i = 0; i < 300; i++) {
      await sleep(2000);
      const record = await evaluate("(()=>{const raw=localStorage.getItem('prismlab_auto_story_shows_v1');return raw?JSON.parse(raw)[0]:null})()");
      const turnsCount = record?.turns?.length || 0;
      const totalTurns = record?.turnOrder?.length || 10;
      const statusText = await evaluate("document.querySelector('.chat-story-running-top span')?.textContent || ''");

      if (turnsCount !== lastTurnsCount) {
        const latestTurn = record?.turns?.at(-1);
        console.log(`[${genreName}] Completed Turn ${turnsCount}/${totalTurns}: [${latestTurn?.modelId || 'none'}] status=${latestTurn?.status} route=${latestTurn?.route}`);
        if (latestTurn?.output) {
          console.log(`   Prose (${latestTurn.output.length}c, ${latestTurn.latencyS ? latestTurn.latencyS.toFixed(2) + 's' : 'n/a'}): "${latestTurn.output.slice(0, 95)}..."`);
        }
        if (latestTurn?.continuityIssues?.length) {
          console.log(`   Continuity issues:`, latestTurn.continuityIssues);
        }
        if (latestTurn?.loopIssue) {
          console.log(`   Loop issue:`, latestTurn.loopIssue);
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

    assert.ok(completedRecord, `Show for ${genreName} did not finish within timeout`);
    console.log(`\n[${genreName}] Show Status: ${completedRecord.status}`);
    console.log(`[${genreName}] Quality Audit:`, JSON.stringify(completedRecord.storyQualityAudit, null, 2));
    assert.equal(completedRecord.status, 'completed', `Show status was ${completedRecord.status}`);
    assert.equal(completedRecord.turns.length, 10, `Show turns was ${completedRecord.turns.length}, expected 10`);

    // Capture screenshot and immediate JSON record
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(new URL(screenshotName, outDir), Buffer.from(screenshot.data, 'base64'));
    writeFileSync(new URL(`${genreName.toLowerCase()}-show.json`, outDir), JSON.stringify(completedRecord, null, 2));
    console.log(`Captured screenshot to ${screenshotName} and saved ${genreName.toLowerCase()}-show.json`);

    return completedRecord;
  }

  // Check if horrorShow is already saved from prior run
  let horrorShow;
  const horrorPath = new URL('horror-show.json', outDir);
  const { existsSync, readFileSync } = await import('node:fs');
  if (existsSync(horrorPath)) {
    console.log('Loading completed Horror show from disk (Show ID: 302e7c32-c341-45fd-bb40-56b4eab4cdd5)...');
    horrorShow = JSON.parse(readFileSync(horrorPath, 'utf8'));
  } else {
    horrorShow = await runGenreShow('Horror', 'live-horror-show.png');
  }

  // Run Genre 2: Romance (10 turns)
  const romanceShow = await runGenreShow('Romance', 'live-romance-show.png');

  // Write acceptance results
  const reportData = {
    timestamp: new Date().toISOString(),
    horrorShow,
    romanceShow,
    totalNetworkRequests: networkRequests.length
  };
  writeFileSync(new URL('live-acceptance-s3b5.json', outDir), JSON.stringify(reportData, null, 2));

  console.log('\n========================================================');
  console.log('=== All Live Acceptance Stories Finished Successfully! ===');
  console.log('========================================================');
  console.log(`Horror Primary Conflict: "${horrorShow.directorPlan?.primaryConflict}"`);
  console.log(`Horror Quality Audit Verdict: "${horrorShow.storyQualityAudit?.label}"`);
  console.log(`Romance Primary Conflict: "${romanceShow.directorPlan?.primaryConflict}"`);
  console.log(`Romance Quality Audit Verdict: "${romanceShow.storyQualityAudit?.label}"`);
  console.log(`Total live requests recorded: ${networkRequests.length}`);

} finally {
  ws?.close();
  chrome.kill();
}
