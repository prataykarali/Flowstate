import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const GATEWAY = 'http://127.0.0.1:8000';
const PREVIEW_URL = 'https://prismlab-playground-jpst5m8o1-archipelago-6383.vercel.app';

// 1. Get session token from preview deployment
async function getSessionToken() {
  const p = new Promise((resolve, reject) => {
    const proc = spawn('npx', ['vercel', 'curl', `${PREVIEW_URL}/api/session`], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    proc.stdout.on('data', d => { out += d; });
    proc.on('close', code => {
      try {
        const jsonMatch = out.match(/\{"token":"[^"]+.*?\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return resolve(parsed.token);
        }
        reject(new Error(`Could not parse token: ${out}`));
      } catch (e) {
        reject(e);
      }
    });
  });
  return await p;
}

import { writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

// 2. Load compiled story modules
const cacheDir = path.resolve('node_modules/.cache/tests');
mkdirSync(cacheDir, { recursive: true });

const sdTs = readFileSync(new URL('./src/lib/storyDirector.ts', import.meta.url), 'utf8');
const sdJs = ts.transpileModule(sdTs, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
writeFileSync(path.join(cacheDir, 'storyDirector.js'), sdJs);

let cwsTs = readFileSync(new URL('./src/lib/canonicalWorldState.ts', import.meta.url), 'utf8');
cwsTs = cwsTs.replace('./storyDirector.ts', './storyDirector.js');
const cwsJs = ts.transpileModule(cwsTs, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
writeFileSync(path.join(cacheDir, 'canonicalWorldState.js'), cwsJs);

let storyTs = readFileSync(new URL('./src/lib/storyShow.ts', import.meta.url), 'utf8');
storyTs = storyTs.replace('./canonicalWorldState.ts', './canonicalWorldState.js');
storyTs = storyTs.replace('./storyDirector.ts', './storyDirector.js');
const storyJs = ts.transpileModule(storyTs, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
writeFileSync(path.join(cacheDir, 'storyShow.js'), storyJs);

const story = await import(pathToFileURL(path.join(cacheDir, 'storyShow.js')).href);
const {
  createShow,
  DEFAULT_SHOW_CONFIG,
  buildShowPrompt,
  appendShowTurn,
  sanitizeTurnOutput,
  stripEchoedPrefix,
  hasMeaningfulEnding,
  auditStoryQuality,
  chooseStoryDirections,
  formatStageDialogue,
  validateDecisionJson,
  SHOW_CAPABILITIES,
  extractProposedEvents,
  validateProposedEvents,
  applyEventsToWorldState,
  detectNarrativeLoop
} = story;

async function executeModel(token, modelId, prompt, decisionQuestion) {
  const url = modelId === 'text' ? `${GATEWAY}/local-api/text` : `${GATEWAY}/local-api/execute`;
  const body = modelId === 'text'
    ? { prompt, max_tokens: 120 }
    : {
        model: modelId,
        task: modelId === 'd1' || modelId === 'd1_omni' ? 'decision' : 'chat',
        prompt,
        decision_question: decisionQuestion,
        max_tokens: modelId === 'd1' || modelId === 'd1_omni' ? 160 : 120
      };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Inference error HTTP ${res.status}: ${text}`);
  }

  const data = await res.json();
  const raw = typeof data.output === 'string' ? data.output : JSON.stringify(data.output);
  return { output: raw, finish_reason: data.finish_reason || 'stop', request_id: data.request_id || `req_${Date.now()}` };
}

async function runGenreLiveStory(token, genre, turnCount = 10) {
  console.log(`\n======================================================`);
  console.log(`RUNNING LIVE STORY: ${genre} (${turnCount} turns across models)`);
  console.log(`======================================================`);

  let show = createShow({
    ...DEFAULT_SHOW_CONFIG,
    theme: genre,
    turnCount,
    modelIds: ['text', 'vision', 'audio', 'omni', 'd1', 'd1_omni']
  });

  for (let i = 0; i < turnCount; i++) {
    const modelId = show.turnOrder[i];
    const isDecision = modelId === 'd1' || modelId === 'd1_omni';
    const decisionQuestion = isDecision ? chooseStoryDirections(show) : undefined;
    const promptObj = buildShowPrompt(show, modelId);

    console.log(`\n--- Turn ${i + 1}/${turnCount}: Model '${modelId}' ---`);
    const resp = await executeModel(token, modelId, promptObj.prompt, decisionQuestion);

    // Sanitize and de-echo
    let clean = resp.output;
    if (!isDecision) {
      clean = sanitizeTurnOutput(resp.output);
      const priorOutputs = [show.config.opening, ...show.turns.map(t => t.output)].filter(Boolean);
      const deEchoed = stripEchoedPrefix(clean, priorOutputs, promptObj.prompt);
      if (deEchoed) clean = deEchoed;
    }

    let decisionData;
    if (isDecision) {
      const decisionLabels = decisionQuestion ? Object.keys(decisionQuestion.criteria) : undefined;
      decisionData = validateDecisionJson(clean, decisionLabels);
      if (!decisionData.valid && story.recoverDecisionData) {
        const rec = story.recoverDecisionData(clean, decisionLabels);
        if (rec && rec.valid) decisionData = rec;
      }
    }

    const formatted = formatStageDialogue(modelId, clean, genre, true, decisionQuestion ? Object.keys(decisionQuestion.criteria) : undefined);
    console.log(`Output: "${clean.slice(0, 160)}${clean.length > 160 ? '...' : ''}"`);

    // Canonical events
    let cws = show.canonicalWorldState;
    if (cws) {
      const proposed = extractProposedEvents(clean, cws, modelId, i);
      const val = validateProposedEvents(proposed, clean, cws);
      if (val.valid) {
        cws = applyEventsToWorldState(cws, val.acceptedEvents, i, turnCount);
        show.canonicalWorldState = cws;
      }
    }

    const turn = {
      turnId: `turn_${i + 1}`,
      index: i,
      modelId,
      role: SHOW_CAPABILITIES.find(c => c.modelId === modelId)?.role || 'writer',
      status: 'completed',
      requestId: resp.request_id,
      route: [modelId],
      output: clean,
      stageText: formatted.stageText,
      decisionData,
      isRelevant: true,
      promptLength: promptObj.prompt.length,
      contextTruncated: false,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString()
    };

    show = appendShowTurn(show, turn);
  }

  // Verification checks on the completed story
  console.log(`\nVerifying ${genre} story...`);
  assert.equal(show.turns.length, turnCount, `Expected ${turnCount} turns`);

  // 1. Verify no repeated openings
  for (let i = 1; i < show.turns.length; i++) {
    const t = show.turns[i];
    const prev = show.turns[i - 1];
    assert.ok(
      !t.output.toLowerCase().startsWith(show.turns[0].output.toLowerCase().slice(0, 40)),
      `Turn ${i + 1} echoed story opening!`
    );
  }

  // 2. Audit quality
  const quality = auditStoryQuality(show.canonicalWorldState, show.turns);
  console.log(`Quality audit for ${genre}:`, JSON.stringify(quality));
  assert.equal(quality.loopFree, true, `${genre}: loopFree failed`);
  assert.equal(quality.canonConsistent, true, `${genre}: canonConsistent failed: ${quality.issues.join(', ')}`);

  console.log(`✅ ${genre} live story session PASSED all checks!`);
  return show;
}

// 3. Multi-player arcade scoring verification across 2 independent visitors
async function testMultiPlayerArcadeScoring() {
  console.log(`\n======================================================`);
  console.log(`TESTING MULTI-PLAYER ARCADE SCORING (2 independent visitors)`);
  console.log(`======================================================`);

  const visitorA = `vis_player_A_${Date.now()}`;
  const visitorB = `vis_player_B_${Date.now()}`;

  async function submitArcade(visitorId, modelId, score, points) {
    const runId = `run_${visitorId}_${Date.now()}`;
    const p = new Promise((resolve, reject) => {
      const payload = JSON.stringify({
        event_id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        visitor_id: visitorId,
        model_id: modelId,
        activity_type: 'runner_completed',
        points,
        source_receipt_id: `runner:${runId}:score:${score}`
      });

      const proc = spawn('npx', [
        'vercel', 'curl', `${PREVIEW_URL}/api/league/event`,
        '--',
        '-X', 'POST',
        '-H', 'Content-Type: application/json',
        '-d', payload
      ], { stdio: ['ignore', 'pipe', 'pipe'] });

      let out = '';
      proc.stdout.on('data', d => { out += d; });
      proc.on('close', code => {
        try {
          const jsonMatch = out.match(/\{.*?\}/s);
          if (jsonMatch) return resolve(JSON.parse(jsonMatch[0]));
          reject(new Error(`Failed to parse response: ${out}`));
        } catch (e) {
          reject(e);
        }
      });
    });
    return await p;
  }

  // Player A plays with 'text' (Prism Pure), scores 160 -> +25 points
  console.log(`Submitting game for Player A (visitor: ${visitorA}, model: text, score: 160)...`);
  const resA = await submitArcade(visitorA, 'text', 160, 25);
  console.log('Player A result:', resA);
  assert.equal(resA.points, 25, 'Player A should earn 25 points');
  assert.ok(resA.status === 'success' || resA.status === 'recorded_transient');

  // Player B plays with 'vision' (Spectra), scores 85 -> +15 points
  console.log(`Submitting game for Player B (visitor: ${visitorB}, model: vision, score: 85)...`);
  const resB = await submitArcade(visitorB, 'vision', 85, 15);
  console.log('Player B result:', resB);
  assert.equal(resB.points, 15, 'Player B should earn 15 points');
  assert.ok(resB.status === 'success' || resB.status === 'recorded_transient');

  console.log(`✅ Multi-player Arcade scoring contributed points from both players successfully!`);
}

async function main() {
  const token = await getSessionToken();
  console.log(`Acquired valid session token from preview: ${token.slice(0, 20)}...`);

  // Test live models across Horror, Romance, and Mystery
  await runGenreLiveStory(token, 'Horror', 10);
  await runGenreLiveStory(token, 'Romance', 10);
  await runGenreLiveStory(token, 'Mystery', 10);

  // Test multi-player arcade scoring
  await testMultiPlayerArcadeScoring();

  console.log(`\n🎉 ALL LIVE VERIFICATION CHECKS PASSED SUCCESSFULLY!`);
}

main().catch(err => {
  console.error('Fatal live test failure:', err);
  process.exit(1);
});
