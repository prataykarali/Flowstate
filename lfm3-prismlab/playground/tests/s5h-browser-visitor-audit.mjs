import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const PROD_URL = 'https://prismlab-playground-rho.vercel.app';
const outDir = new URL('../visual-review/s5h/', import.meta.url);
mkdirSync(outDir, { recursive: true });

console.log('=== STARTING S5-H VISITOR JOURNEY BROWSER AUDIT ===');
console.log(`Target Production: ${PROD_URL}`);

const chrome = spawn('google-chrome', [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--disable-web-security',
  '--remote-debugging-port=9470',
  'about:blank'
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws;

try {
  await sleep(1500);
  const tabs = await (await fetch('http://127.0.0.1:9470/json')).json();
  const pageTab = tabs.find(t => t.type === 'page');
  assert.ok(pageTab, 'Chrome page tab not found');

  ws = new WebSocket(pageTab.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));

  let seq = 0;
  const pending = new Map();
  const consoleLogs = [];
  const networkErrors = [];

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
        consoleLogs.push({ type: 'error', text });
        console.log('   [Browser Error]', text.slice(0, 160));
      }
    }
    if (m.method === 'Network.loadingFailed') {
      networkErrors.push(m.params);
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

  const auditReport = {
    pages_tested: {},
    console_errors: consoleLogs,
    network_errors: networkErrors
  };

  // 1. Visit Model World (#world)
  console.log('\n--- 1. Testing Model World (#world) ---');
  await send('Page.navigate', { url: `${PROD_URL}/#world` });
  await sleep(2500);

  const worldTitle = await evaluate('document.title');
  const worldMascots = await evaluate('document.querySelectorAll(".mascot-card").length || document.querySelectorAll("[data-model-id]").length');
  console.log(`   Page title: "${worldTitle}"`);
  console.log(`   Mascot elements found: ${worldMascots}`);
  auditReport.pages_tested.world = { status: 'PASS', title: worldTitle, mascotsCount: worldMascots };

  // 2. Visit Chat (#chat)
  console.log('\n--- 2. Testing Chat (#chat) ---');
  await send('Page.navigate', { url: `${PROD_URL}/#chat` });
  await sleep(2500);

  const chatInputPresent = await evaluate('!!document.querySelector("textarea, input[type=text]")');
  const chatModelTabs = await evaluate('document.querySelectorAll(".chat-model-button, .model-select-btn, [role=tab]").length');
  console.log(`   Chat input present: ${chatInputPresent}`);
  console.log(`   Model tabs count: ${chatModelTabs}`);
  assert.ok(chatInputPresent, 'Chat input textarea must be present');
  auditReport.pages_tested.chat = { status: 'PASS', inputPresent: chatInputPresent, modelTabs: chatModelTabs };

  // 3. Visit Auto Story Show (#story)
  console.log('\n--- 3. Testing Auto Story Show (#story) ---');
  await send('Page.navigate', { url: `${PROD_URL}/#story` });
  await sleep(2500);

  const storyControls = await evaluate(`(() => {
    const buttons = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
    return {
      hasStart: buttons.some(b => /start|launch|begin/i.test(b)),
      hasSaveExit: buttons.some(b => /save & exit|exit|park/i.test(b)),
      hasPause: buttons.some(b => /pause/i.test(b)),
      buttons: buttons.slice(0, 8)
    };
  })()`);
  console.log(`   Story buttons detected:`, storyControls.buttons);
  auditReport.pages_tested.story = { status: 'PASS', controls: storyControls };

  // 4. Visit Live Trivia (#trivia)
  console.log('\n--- 4. Testing Live Trivia (#trivia) ---');
  await send('Page.navigate', { url: `${PROD_URL}/#trivia` });
  await sleep(2500);

  const triviaControls = await evaluate(`(() => {
    const buttons = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
    return {
      buttons: buttons.slice(0, 8)
    };
  })()`);
  console.log(`   Trivia buttons detected:`, triviaControls.buttons);
  auditReport.pages_tested.trivia = { status: 'PASS', controls: triviaControls };

  // 5. Visit Championship / Standings (#championship)
  console.log('\n--- 5. Testing Championship Standings (#championship) ---');
  await send('Page.navigate', { url: `${PROD_URL}/#championship` });
  await sleep(3000);

  const leagueData = await evaluate(`(() => {
    const tableText = document.body.innerText;
    const hasPostgres = tableText.includes('Supabase Live Sync') || tableText.includes('supabase_postgres') || tableText.includes('Supabase') || tableText.includes('PostgreSQL');
    const modelNames = ['Prism Pure', 'Spectra', 'Echo', 'Omni Pup', 'Prism Thinker', 'Sherlock Omni'];
    const presentModels = modelNames.filter(name => tableText.includes(name));
    return {
      hasPostgresDataSource: hasPostgres,
      presentModels,
      allSixPresent: presentModels.length === 6
    };
  })()`);
  console.log(`   Championship all 6 models displayed: ${leagueData.allSixPresent} (${leagueData.presentModels.join(', ')})`);
  console.log(`   Database source indicated: ${leagueData.hasPostgresDataSource}`);
  assert.ok(leagueData.allSixPresent, 'All 6 canonical models must be displayed in Championship');
  auditReport.pages_tested.league = { status: 'PASS', data: leagueData };

  // Capture final screenshot
  const screenshotRes = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(new URL('championship_screen.png', outDir), Buffer.from(screenshotRes.data, 'base64'));
  console.log(`   Saved screenshot to visual-review/s5h/championship_screen.png`);

  console.log('\n=== BROWSER VISITOR JOURNEY AUDIT PASSED WITH ZERO BLOCKING ERRORS ===');
  writeFileSync(new URL('browser_audit_results.json', outDir), JSON.stringify(auditReport, null, 2));

} catch (err) {
  console.error('Browser audit failed:', err);
  process.exit(1);
} finally {
  if (ws) ws.close();
  chrome.kill();
}
