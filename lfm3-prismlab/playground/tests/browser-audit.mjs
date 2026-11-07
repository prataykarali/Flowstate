/**
 * Browser Acceptance Audit Script for PrismLab S0
 * Connects directly to Headless Chrome via native DevTools Protocol (CDP) WebSocket.
 */

import { spawn } from 'node:child_process';

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runAudit() {
  console.log('--- STARTING PRISMLAB S0 BROWSER ACCEPTANCE AUDIT ---');

  // 1. Launch Chrome
  const chrome = spawn('google-chrome', [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    'http://localhost:5173/#world'
  ]);

  await delay(1500);

  // 2. Fetch WebSocket URL
  const versionRes = await fetch('http://localhost:9222/json');
  const tabs = await versionRes.json();
  const pageTab = tabs.find((t) => t.type === 'page') || tabs[0];
  const wsUrl = pageTab.webSocketDebuggerUrl;

  const ws = new WebSocket(wsUrl);

  const consoleLogs = [];
  const networkErrors = [];

  let nextId = 1;
  const pending = new Map();

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await new Promise((res) => (ws.onopen = res));

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }

    if (msg.method === 'Runtime.consoleAPICalled') {
      const text = msg.params.args.map((a) => a.value || a.description).join(' ');
      consoleLogs.push({ type: msg.params.type, text });
    }

    if (msg.method === 'Network.loadingFailed') {
      networkErrors.push(msg.params);
    }
  };

  // Enable events
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');

  console.log('✓ Chrome CDP connected successfully');

  // --- CHECK 1: Navigate to #world and inspect DOM ---
  await send('Page.navigate', { url: 'http://localhost:5173/#world' });
  await delay(1200);

  // Check mascot count
  const mascotCountRes = await send('Runtime.evaluate', {
    expression: 'document.querySelectorAll(".mascot-card").length'
  });
  const mascotCount = mascotCountRes.result.value;
  console.log(`[Check 1] Mascots rendered on Model World: ${mascotCount} (Expected: 6)`);

  // --- CHECK 2: Inspect SVG ID uniqueness & collision prevention ---
  const idCollisionRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const allIds = Array.from(document.querySelectorAll("[id]")).map(el => el.id);
      const counts = {};
      const duplicates = [];
      allIds.forEach(id => {
        counts[id] = (counts[id] || 0) + 1;
        if (counts[id] === 2) duplicates.push(id);
      });
      return { totalIds: allIds.length, duplicates };
    })()`,
    returnByValue: true
  });
  console.log(
    `[Check 2] SVG ID Collision check: ${idCollisionRes.result.value.totalIds} total IDs, Duplicates: ${JSON.stringify(
      idCollisionRes.result.value.duplicates
    )} (Expected: 0 duplicates)`
  );

  // --- CHECK 3: Test click reaction & speech bubble ---
  await send('Runtime.evaluate', {
    expression: 'document.querySelectorAll(".mascot-card")[0].click()'
  });
  await delay(250);

  const bubbleCheckRes = await send('Runtime.evaluate', {
    expression: 'document.querySelector(".mascot-bubble") ? document.querySelector(".mascot-bubble").textContent : null'
  });
  console.log(`[Check 3] Click reaction triggered speech bubble: "${bubbleCheckRes.result.value}"`);

  // --- CHECK 4: Test character selection & drawer sync ---
  await send('Runtime.evaluate', {
    expression: 'document.querySelectorAll(".mascot-card")[1].click()'
  });
  await delay(200);

  const selectedModelSpec = await send('Runtime.evaluate', {
    expression: 'document.querySelector(".model-spec-card h3").textContent'
  });
  console.log(`[Check 4] Selected card in drawer: "${selectedModelSpec.result.value}" (Expected: LFM3-VL-2B)`);

  // --- CHECK 5: Verify all 8 routes switch cleanly ---
  const routes = ['playground', 'trivia', 'arcade', 'research', 'architecture', 'championship', 'settings', 'world'];
  console.log('[Check 5] Navigating all 8 routes:');
  for (const r of routes) {
    await send('Page.navigate', { url: `http://localhost:5173/#${r}` });
    await delay(300);
    const title = await send('Runtime.evaluate', {
      expression: 'document.querySelector(".page-title") ? document.querySelector(".page-title").textContent.trim() : "None"'
    });
    console.log(`   Route #${r} -> "${title.result.value}"`);
  }

  // --- CHECK 6: Console logs & Network failures ---
  console.log(`[Check 6] Browser Console Logs recorded: ${consoleLogs.length}`);
  const errors = consoleLogs.filter((l) => l.type === 'error');
  console.log(`   Console Errors: ${errors.length}`);
  if (errors.length > 0) {
    console.error('   ERRORS:', errors);
  }
  console.log(`   Network Failed Requests: ${networkErrors.length}`);

  // Cleanup
  ws.close();
  chrome.kill();

  console.log('--- BROWSER AUDIT COMPLETED ---');
}

runAudit().catch(console.error);
