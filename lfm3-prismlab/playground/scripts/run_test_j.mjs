import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { pathToFileURL } from 'node:url';

const cacheDir = path.resolve('playground/node_modules/.cache/tests');
fs.mkdirSync(cacheDir, { recursive: true });

const cwsTs = fs.readFileSync('playground/src/lib/canonicalWorldState.ts', 'utf8');
const cwsJs = ts.transpileModule(cwsTs, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
fs.writeFileSync(path.join(cacheDir, 'canonicalWorldState.js'), cwsJs);

let storyTs = fs.readFileSync('playground/src/lib/storyShow.ts', 'utf8');
storyTs = storyTs.replace('./canonicalWorldState.ts', './canonicalWorldState.js');
const storyJs = ts.transpileModule(storyTs, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
fs.writeFileSync(path.join(cacheDir, 'storyShow.js'), storyJs);

const story = await import(pathToFileURL(path.join(cacheDir, 'storyShow.js')).href);
const {
  createShow,
  buildShowPrompt,
  appendShowTurn,
  extractProposedEvents,
  validateProposedEvents,
  applyEventsToWorldState,
  auditStoryContinuity,
  formatStageDialogue,
  validateDecisionJson
} = story;

const API_BASE = 'http://127.0.0.1:5173/local-api';

async function callText(prompt) {
  const res = await fetch(`${API_BASE}/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: prompt.slice(0, 990) })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return await res.json();
}

async function callDecision(model, prompt, criteria) {
  const res = await fetch(`${API_BASE}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      task: 'decision',
      model,
      prompt: prompt.slice(0, 990),
      decision_question: {
        instructions: 'Select next plot event',
        criteria
      }
    })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return await res.json();
}

async function callSpecialist(model, prompt) {
  const res = await fetch(`${API_BASE}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      task: 'chat',
      model,
      prompt: prompt.slice(0, 990)
    })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return await res.json();
}

console.log('--- STARTING TEST J: REAL LOCAL INFERENCE STORIES ---');

// STORY 1: TRAGEDY WITH IRREVERSIBLE RESOURCE & LOSS
console.log('\n================ STORY 1: TRAGEDY ================');
const show1 = createShow({
  theme: 'Tragedy',
  opening: '',
  turnCount: 9,
  modelIds: ['text', 'vision', 'audio', 'omni', 'd1', 'd1_omni'],
  playback: 'automatic',
  maxTokens: 128,
  cast: {
    protagonist: 'Bruno',
    companion: 'Hana',
    role: 'junior nurse',
    setting: 'a hospital night ward',
    hook: 'a medicine can save only one person'
  }
}, 'show_tragedy_real_01');

console.log('Story 1 initialized with Cast:', show1.config.cast);
console.log('Initial Canonical Entities:', show1.canonicalWorldState.entities.map(e => `${e.name} (qty: ${e.quantity})`));

let current1 = show1;
const tragedySchedule = [
  { model: 'text', role: 'writer' },
  { model: 'vision', role: 'visual_interpreter' },
  { model: 'text', role: 'writer' },
  { model: 'd1', role: 'decision_assistant' },
  { model: 'text', role: 'writer' }
];

for (let i = 0; i < tragedySchedule.length; i++) {
  const item = tragedySchedule[i];
  const built = buildShowPrompt(current1, item.model);
  console.log(`\n[Turn ${i + 1}] Model: ${item.model} (${item.role}) - Prompt length: ${built.prompt.length}`);
  
  let result;
  if (item.model === 'text') {
    result = await callText(built.prompt);
  } else if (item.model === 'd1') {
    result = await callDecision('d1', built.prompt, {
      hard_choice: 'Bruno administers the final vial to Hana, sacrificing his own recovery.',
      raise_stakes: 'The emergency ward power drops to zero.',
      confront: 'Bruno seeks additional medical supplies in the flooded basement.'
    });
  } else {
    result = await callSpecialist('vision', built.prompt);
  }

  const rawOutput = typeof result.output === 'string' ? result.output : JSON.stringify(result.output);
  console.log(`  -> Output (${result.metrics?.total_latency_s?.toFixed(2)}s, req ${result.request_id}): ${rawOutput.slice(0, 100)}...`);

  // Event extraction and validation
  const proposed = extractProposedEvents(rawOutput, current1.canonicalWorldState, item.model, i);
  const validation = validateProposedEvents(proposed, rawOutput, current1.canonicalWorldState);
  console.log(`  -> Proposed events: ${proposed.length}, Valid: ${validation.valid}, Issues: ${validation.issues.join('; ') || 'None'}`);

  if (validation.valid && proposed.length > 0) {
    current1.canonicalWorldState = applyEventsToWorldState(current1.canonicalWorldState, validation.acceptedEvents, i, 5);
  }

  const formatted = formatStageDialogue(item.model, rawOutput, 'Tragedy', false);
  const turn = {
    turnId: `t1:${i + 1}`,
    index: i,
    modelId: item.model,
    role: item.role,
    status: 'completed',
    requestId: result.request_id,
    route: result.route,
    output: rawOutput,
    stageText: formatted.stageText,
    promptLength: built.prompt.length,
    contextTruncated: built.truncated,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    latencyS: result.metrics?.total_latency_s,
    proposedEvents: proposed,
    acceptedEvents: validation.acceptedEvents,
    continuityIssues: validation.issues.length ? validation.issues : undefined
  };
  current1 = appendShowTurn(current1, turn);
}

const audit1 = auditStoryContinuity(current1.canonicalWorldState, current1.turns.map(t => t.output).join(' '));
console.log('\n--- TRAGEDY AUDIT RESULT ---');
console.log('Verdict:', audit1.verdict);
console.log('Label:', audit1.label);
console.log('Issues:', audit1.issues);
console.log('Character summaries:', audit1.characterSummaries);
console.log('Entity summaries:', audit1.entitySummaries);


// STORY 2: SCIENCE FICTION WITH TECHNICAL PROGRESSION
console.log('\n================ STORY 2: SCIENCE FICTION ================');
const show2 = createShow({
  theme: 'Science fiction',
  opening: '',
  turnCount: 9,
  modelIds: ['text', 'vision', 'audio', 'omni', 'd1', 'd1_omni'],
  playback: 'automatic',
  maxTokens: 128,
  cast: {
    protagonist: 'Tariq',
    companion: 'Leila',
    role: 'repair dock technician',
    setting: 'a mining base on a frozen moon',
    hook: 'oxygen is running out after a strange signal'
  }
}, 'show_scifi_real_02');

console.log('Story 2 initialized with Cast:', show2.config.cast);
let current2 = show2;
const scifiSchedule = [
  { model: 'text', role: 'writer' },
  { model: 'vision', role: 'visual_interpreter' },
  { model: 'text', role: 'writer' },
  { model: 'd1_omni', role: 'decision_assistant' },
  { model: 'text', role: 'writer' }
];

for (let i = 0; i < scifiSchedule.length; i++) {
  const item = scifiSchedule[i];
  const built = buildShowPrompt(current2, item.model);
  console.log(`\n[Turn ${i + 1}] Model: ${item.model} (${item.role}) - Prompt length: ${built.prompt.length}`);
  
  let result;
  if (item.model === 'text') {
    result = await callText(built.prompt);
  } else if (item.model === 'd1_omni') {
    result = await callDecision('d1_omni', built.prompt, {
      technical_repair: 'Tariq reroutes secondary life support through the auxiliary drill cell.',
      emergency_beacon: 'Leila activates the long-range transmitter despite signal interference.',
      manual_override: 'Both technicians suit up to manually seal the breached airlock.'
    });
  } else {
    result = await callSpecialist('vision', built.prompt);
  }

  const rawOutput = typeof result.output === 'string' ? result.output : JSON.stringify(result.output);
  console.log(`  -> Output (${result.metrics?.total_latency_s?.toFixed(2)}s, req ${result.request_id}): ${rawOutput.slice(0, 100)}...`);

  const proposed = extractProposedEvents(rawOutput, current2.canonicalWorldState, item.model, i);
  const validation = validateProposedEvents(proposed, rawOutput, current2.canonicalWorldState);
  console.log(`  -> Proposed events: ${proposed.length}, Valid: ${validation.valid}, Issues: ${validation.issues.join('; ') || 'None'}`);

  if (validation.valid && proposed.length > 0) {
    current2.canonicalWorldState = applyEventsToWorldState(current2.canonicalWorldState, validation.acceptedEvents, i, 5);
  }

  const formatted = formatStageDialogue(item.model, rawOutput, 'Science fiction', false);
  const turn = {
    turnId: `t2:${i + 1}`,
    index: i,
    modelId: item.model,
    role: item.role,
    status: 'completed',
    requestId: result.request_id,
    route: result.route,
    output: rawOutput,
    stageText: formatted.stageText,
    promptLength: built.prompt.length,
    contextTruncated: built.truncated,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    latencyS: result.metrics?.total_latency_s,
    proposedEvents: proposed,
    acceptedEvents: validation.acceptedEvents,
    continuityIssues: validation.issues.length ? validation.issues : undefined
  };
  current2 = appendShowTurn(current2, turn);
}

const audit2 = auditStoryContinuity(current2.canonicalWorldState, current2.turns.map(t => t.output).join(' '));
console.log('\n--- SCIENCE FICTION AUDIT RESULT ---');
console.log('Verdict:', audit2.verdict);
console.log('Label:', audit2.label);
console.log('Issues:', audit2.issues);
console.log('Character summaries:', audit2.characterSummaries);

// Save full results for report
const outDir = path.resolve('playground/visual-review/s3b');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'test_j_results.json'), JSON.stringify({
  tragedy: { show: current1, audit: audit1 },
  scifi: { show: current2, audit: audit2 }
}, null, 2));

console.log('\nTest J results saved to playground/visual-review/s3b/test_j_results.json');
