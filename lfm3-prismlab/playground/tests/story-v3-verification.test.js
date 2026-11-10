const memStorage = new Map();
globalThis.localStorage = {
  getItem: k => memStorage.get(k) || null,
  setItem: (k, v) => memStorage.set(k, String(v)),
  removeItem: k => memStorage.delete(k),
  clear: () => memStorage.clear()
};
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import ts from 'typescript';

const cacheDir = path.resolve('node_modules/.cache/tests-v3');
mkdirSync(cacheDir, { recursive: true });

const sdTs = readFileSync(new URL('../src/lib/storyDirector.ts', import.meta.url), 'utf8');
const sdJs = ts.transpileModule(sdTs, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
writeFileSync(path.join(cacheDir, 'storyDirector.js'), sdJs);

let cwsTs = readFileSync(new URL('../src/lib/canonicalWorldState.ts', import.meta.url), 'utf8');
cwsTs = cwsTs.replace('./storyDirector.ts', './storyDirector.js');
const cwsJs = ts.transpileModule(cwsTs, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
writeFileSync(path.join(cacheDir, 'canonicalWorldState.js'), cwsJs);

let storyTs = readFileSync(new URL('../src/lib/storyShow.ts', import.meta.url), 'utf8');
storyTs = storyTs.replace('./canonicalWorldState.ts', './canonicalWorldState.js');
storyTs = storyTs.replace('./storyDirector.ts', './storyDirector.js');
const storyJs = ts.transpileModule(storyTs, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
writeFileSync(path.join(cacheDir, 'storyShow.js'), storyJs);

const story = await import(pathToFileURL(path.join(cacheDir, 'storyShow.js')).href);
const {
  createShow,
  DEFAULT_SHOW_CONFIG,
  planShow,
  validateShowConfig,
  buildShowPrompt,
  appendShowTurn,
  sanitizeTurnOutput,
  isCommittedShowTurn,
  getCommittedShowTurnCount,
  hasMeaningfulEnding,
  auditStoryQuality,
  chooseStoryDirections,
  formatStageDialogue,
  validateDecisionJson,
  SHOW_CAPABILITIES,
  STORY_THEMES,
  showBeat
} = story;

const leagueTs = readFileSync(new URL('../src/lib/league.ts', import.meta.url), 'utf8');
const leagueJs = ts.transpileModule(leagueTs, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
writeFileSync(path.join(cacheDir, 'league.js'), leagueJs);
const league = await import(pathToFileURL(path.join(cacheDir, 'league.js')).href);
const { scoreEvent } = league;

const adaptersTs = readFileSync(new URL('../src/lib/leagueAdapters.ts', import.meta.url), 'utf8');
const adaptersJs = ts.transpileModule(adaptersTs.replace('./league.ts', './league.js'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
writeFileSync(path.join(cacheDir, 'leagueAdapters.js'), adaptersJs);
const adapters = await import(pathToFileURL(path.join(cacheDir, 'leagueAdapters.js')).href);
const {
  awardTriviaCorrect,
  awardRunnerCompleted,
  awardChatSession,
  awardAutoStoryTurn,
  awardAutoStorySession
} = adapters;

test('V3.1: Every turn length 8 through 12 guarantees all six models', () => {
  const allSix = ['text', 'vision', 'audio', 'omni', 'd1', 'd1_omni'];
  for (const length of [8, 9, 10, 11, 12]) {
    const config = { ...DEFAULT_SHOW_CONFIG, turnCount: length, modelIds: allSix };
    const order = planShow(config);
    assert.equal(order.length, length, `Length ${length} mismatch`);
    assert.equal(order[0], 'text', 'Turn 0 must be primary narrator (opening)');
    assert.equal(order[length - 2], 'text', 'Turn N-2 must be primary narrator (climax)');
    assert.equal(order[length - 1], 'text', 'Turn N-1 must be primary narrator (resolution)');
    for (const modelId of allSix) {
      assert.ok(order.includes(modelId), `Model ${modelId} must be scheduled in length ${length}`);
    }
  }
});

test('V3.2: Specialist scheduling order varies across sessions while preserving narrative rules', () => {
  const allSix = ['text', 'vision', 'audio', 'omni', 'd1', 'd1_omni'];
  const variants = new Set();
  for (let seed = 0; seed < 10; seed++) {
    const config = { ...DEFAULT_SHOW_CONFIG, turnCount: 10, modelIds: allSix, openingSeed: seed };
    const order = planShow(config);
    const specialists = order.filter(id => id !== 'text').join('->');
    variants.add(specialists);
  }
  assert.ok(variants.size > 1, 'Specialist orders must vary across sessions');
});

test('V3.3: Incomplete outputs rejected even if >= 20 characters', () => {
  const incompleteEnding = {
    turnId: 't:1',
    index: 7,
    modelId: 'text',
    role: 'writer',
    status: 'completed',
    output: 'They walked toward the gate because',
    finishReason: 'length'
  };
  assert.equal(isCommittedShowTurn(incompleteEnding), false, 'Must reject dangling conjunction despite length');

  const incompleteDialogue = {
    turnId: 't:2',
    index: 1,
    modelId: 'vision',
    role: 'specialist',
    status: 'completed',
    output: '"We cannot go in there, whispered the scout',
    finishReason: 'length'
  };
  assert.equal(isCommittedShowTurn(incompleteDialogue), false, 'Must reject unclosed dialogue');

  const validShortTurn = {
    turnId: 't:3',
    index: 2,
    modelId: 'vision',
    role: 'specialist',
    status: 'completed',
    output: 'A tarnished silver key lay half-buried beneath the stone stairs.',
    finishReason: 'stop'
  };
  assert.equal(isCommittedShowTurn(validShortTurn), true, 'Must accept complete, properly punctuated observation');
});

test('V3.4: Trivia Round 0 scores locally and idempotency prevents duplication', () => {
  // Round 0 (index = 0)
  const round0 = awardTriviaCorrect('text', 'match-test-1', 0, 1, 1, 'https://example.com/source');
  assert.ok(round0.event, 'Round 0 must score locally without rejection');
  assert.equal(round0.event.pointsEarned, 100);

  // Duplicate submission for same question on same day must be rejected
  const dup = awardTriviaCorrect('text', 'match-test-1', 0, 1, 1, 'https://example.com/source');
  assert.equal(dup.event, null, 'Duplicate trivia answer must be rejected');
});

test('V3.5: Story request IDs normalize UUIDs with hyphens and score turns and sessions', () => {
  const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const turnAward = awardAutoStoryTurn('text', 'show-1', 'turn-1', uuid, 'writer');
  assert.ok(turnAward.event, 'Turn with hyphenated UUID must score locally');
  assert.equal(turnAward.event.pointsEarned, 100);

  const uuid2 = 'b1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const turnAward2 = awardAutoStoryTurn('vision', 'show-1', 'turn-2', uuid2, 'support');
  assert.ok(turnAward2.event, 'Specialist turn must score locally');
  assert.equal(turnAward2.event.pointsEarned, 100);

  const uuid3 = 'c1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const turnAward3 = awardAutoStoryTurn('text', 'show-1', 'turn-3', uuid3, 'writer');
  assert.ok(turnAward3.event, 'Second writer turn must score locally');

  const sessionAward = awardAutoStorySession('show-1', [uuid, uuid2, uuid3]);
  assert.ok(sessionAward.event, 'Story session completion must score');
  assert.equal(sessionAward.event.pointsEarned, 100);
});

test('V3.6: Arcade runner awards points for score >= 25 and enforces daily cap', () => {
  const runFail = awardRunnerCompleted('vision', 'run-fail', 20, true);
  assert.equal(runFail.event, null, 'Score < 25 must not earn points');

  const run25 = awardRunnerCompleted('vision', 'run-25', 28, true);
  assert.ok(run25.event, 'Score >= 25 must earn points');
  assert.equal(run25.event.pointsEarned, 100);

  const run150 = awardRunnerCompleted('text', 'run-150', 160, true);
  assert.ok(run150.event, 'Score >= 150 must earn 100 points');
  assert.equal(run150.event.pointsEarned, 100);

  const runCapped = awardRunnerCompleted('omni', 'run-capped', 80, true);
  assert.equal(runCapped.event, null, 'Third run on same day must be rejected by daily cap');
});

test('V3.7: Multi-turn show execution across ALL 9 GENRES with all 6 models', () => {
  const allSix = ['text', 'vision', 'audio', 'omni', 'd1', 'd1_omni'];

  for (const theme of STORY_THEMES) {
    const show = createShow({
      ...DEFAULT_SHOW_CONFIG,
      theme,
      turnCount: 8,
      modelIds: allSix
    });

    assert.equal(show.turnOrder.length, 8, `${theme}: Turn order must be 8`);
    for (const m of allSix) {
      assert.ok(show.turnOrder.includes(m), `${theme}: Model ${m} must have scheduled turn`);
    }

    // Verify prompt generation for each model in this genre
    for (let i = 0; i < show.turnOrder.length; i++) {
      const modelId = show.turnOrder[i];
      const built = buildShowPrompt(show, modelId);
      assert.ok(built.prompt.length > 50, `${theme} turn ${i} (${modelId}) prompt must be generated`);
      assert.ok(built.prompt.length <= 1000, `${theme} turn ${i} (${modelId}) prompt must fit 1000 char limit`);
      assert.doesNotMatch(built.prompt, /INCORPORATE COLLABORATION: Directly acknowledge and react to the latest finding reported by/, `${theme}: No internal model name leaking`);
    }

    // Verify ending verification for this genre
    const contract = story.getGenreContract(theme);
    assert.ok(contract.centralConflict, `${theme} must have central conflict`);
    assert.ok(contract.endingRequirements, `${theme} must have ending requirements`);
  }
});

// ─── V3.1 Universal Behavior Tests (Tests A–F) ─────────────────────────

test('Test A: Missing or separated character cannot participate without established return/reunion', async () => {
  const cwsModule = await import(pathToFileURL(path.join(cacheDir, 'canonicalWorldState.js')).href);
  const state = cwsModule.initializeCanonicalWorldState('Adventure', 'Two explorers set out into the wild.', {
    protagonist: 'Mateo',
    companion: 'Bruno',
    role: 'scout',
    setting: 'canyon trail',
    hook: 'find the lost path'
  });

  // Mark Bruno as missing
  state.characters.find(c => c.name === 'Bruno').status = 'missing';

  // Attempt active physical participation without return
  const invalidProse = 'Bruno grabbed the heavy cable and shouted across the gorge.';
  const proposed = cwsModule.extractProposedEvents(invalidProse, state, 'text', 1);
  const outcome = cwsModule.validateProposedEvents(proposed, invalidProse, state);
  assert.equal(outcome.valid, false, 'Missing character acting without return must be rejected');
  assert.ok(outcome.issues.some(i => i.includes("is currently separated or missing")), 'Must specify missing character issue');

  // Participation with reunion beat
  const validReunionProse = 'Bruno emerged from the mist and rejoined the group. He grabbed the heavy cable to secure the anchor.';
  const validProposed = cwsModule.extractProposedEvents(validReunionProse, state, 'text', 1);
  const validOutcome = cwsModule.validateProposedEvents(validProposed, validReunionProse, state);
  assert.equal(validOutcome.valid, true, 'Character rejoining should be accepted');
});

test('Test B: Repeated discovery is flagged across diverse genres', async () => {
  const cwsModule = await import(pathToFileURL(path.join(cacheDir, 'canonicalWorldState.js')).href);
  const state = cwsModule.initializeCanonicalWorldState('Detective investigation', 'An investigator examines the scene.', {
    protagonist: 'Nadia',
    companion: 'Omar',
    role: 'inspector',
    setting: 'old archives',
    hook: 'find the missing ledger'
  });

  state.discoveredClues = ['brass_key'];

  // Rediscovering the exact same clue as if new
  const repeatProse = 'Nadia discovered a brass key hidden inside the hollowed volume.';
  const proposed = cwsModule.extractProposedEvents(repeatProse, state, 'text', 2);
  const outcome = cwsModule.validateProposedEvents(proposed, repeatProse, state);
  assert.equal(outcome.valid, false, 'Rediscovering an already discovered clue must be flagged');
  assert.ok(outcome.issues.some(i => i.includes("was already discovered")), 'Must report repeated discovery issue');

  // Acknowledging prior discovery
  const acknowledgedProse = 'Nadia examined the brass key that she had found earlier, testing it against the iron lock.';
  const ackProposed = cwsModule.extractProposedEvents(acknowledgedProse, state, 'text', 2);
  const ackOutcome = cwsModule.validateProposedEvents(ackProposed, acknowledgedProse, state);
  assert.equal(ackOutcome.valid, true, 'Acknowledging previous discovery must pass');
});

test('Test C: Abrupt location jump without narrative bridge is flagged', async () => {
  const cwsModule = await import(pathToFileURL(path.join(cacheDir, 'canonicalWorldState.js')).href);
  const state = cwsModule.initializeCanonicalWorldState('Science fiction', 'Crew investigates an orbital anomaly.', {
    protagonist: 'Asha',
    companion: 'Viktor',
    role: 'engineer',
    setting: 'telemetry relay',
    hook: 'stabilize the power core'
  });
  state.currentLocation = 'telemetry relay station';

  const abruptProse = 'Miles away in the mountain fortress, Asha examined the ancient relic.';
  const proposed = cwsModule.extractProposedEvents(abruptProse, state, 'text', 2);
  const outcome = cwsModule.validateProposedEvents(proposed, abruptProse, state);
  assert.equal(outcome.valid, false, 'Abrupt location jump without transit must be flagged');
  assert.ok(outcome.issues.some(i => i.includes('Abrupt location transition')), 'Must report abrupt location issue');
});

test('Test D: Invalid director contribution is rejected cleanly', () => {
  const options = ['character_choice', 'causal_development', 'genre_payoff'];
  const malformed = 'I suggest we take the character choice route.';
  const parsed = validateDecisionJson(malformed, options);
  assert.equal(parsed.valid, false, 'Plain text director output must not validate as JSON');

  const validJson = JSON.stringify({
    predicted_route: 'causal_development',
    confidence: 0.85,
    probabilities: { character_choice: 0.1, causal_development: 0.85, genre_payoff: 0.05 }
  });
  const validParsed = validateDecisionJson(validJson, options);
  assert.equal(validParsed.valid, true, 'Properly structured JSON director output must validate');
});

test('Test E: Weak ending detected and substantive outcome accepted', () => {
  const goal = 'Reach the high plateau shelter before the blizzard hits and protect the medical supplies.';
  const emptyEnding = 'The grass was green.';
  assert.equal(hasMeaningfulEnding(emptyEnding, goal), false, 'Empty or non-concluding ending must be rejected');

  const cliffhangerEnding = 'They reached the gate, but suddenly a cold shadow rose with eyes glinting with malice.';
  assert.equal(hasMeaningfulEnding(cliffhangerEnding, goal), false, 'Cliffhanger ending must be rejected');

  const completeEnding = 'Mateo and Bruno reached the high plateau shelter just as the blizzard struck, securing the medical supplies and saving the expedition in safety until dawn.';
  assert.equal(hasMeaningfulEnding(completeEnding, goal), true, 'Complete outcome resolving goal must pass');
});

test('Test F: Valid creative twist (faked death or disguise) is preserved', async () => {
  const cwsModule = await import(pathToFileURL(path.join(cacheDir, 'canonicalWorldState.js')).href);
  const state = cwsModule.initializeCanonicalWorldState('Mystery', 'A family gathers after an unexpected death.', {
    protagonist: 'Elena',
    companion: 'Julian',
    role: 'solicitor',
    setting: 'manor study',
    hook: 'read the sealed will'
  });

  // Mark Julian as dead earlier
  state.characters.find(c => c.name === 'Julian').status = 'dead';

  // Faked death twist
  const twistProse = 'In truth, Julian had faked his death with a staged dummy, and now stepped forward to reveal the real culprit.';
  const proposed = cwsModule.extractProposedEvents(twistProse, state, 'text', 3);
  const outcome = cwsModule.validateProposedEvents(proposed, twistProse, state);
  assert.equal(outcome.valid, true, 'Explicitly explained plot twist (faked death) must be preserved');
});

test('V3.1: Dynamic premise generation and cast generation across all 9 genres', () => {
  for (const theme of STORY_THEMES) {
    const cast = story.chooseStoryCast(theme);
    assert.ok(cast.protagonist, `${theme}: Protagonist must exist`);
    assert.ok(cast.companion, `${theme}: Companion must exist`);
    assert.notEqual(cast.protagonist, cast.companion, `${theme}: Cast members must be distinct`);
    assert.ok(cast.setting, `${theme}: Setting must be non-empty`);
    assert.ok(cast.hook, `${theme}: Hook must be non-empty`);

    const premise = story.generateFreshPremise(theme, cast);
    assert.ok(premise.length > 20, `${theme}: Premise must be substantial`);
    assert.ok(premise.includes(cast.protagonist), `${theme}: Premise must feature protagonist`);
  }
});

test('V3.1: Dynamic story directions generate three distinct actionable candidates', () => {
  const show = createShow({
    ...DEFAULT_SHOW_CONFIG,
    theme: 'Detective investigation',
    turnCount: 9,
    modelIds: ['text', 'vision', 'audio', 'omni', 'd1', 'd1_omni']
  });
  const directions = chooseStoryDirections(show);
  const keys = Object.keys(directions.criteria);
  assert.equal(keys.length, 3, 'Must provide 3 direction candidates');
  assert.ok(keys.includes('character_choice'), 'Must have character_choice candidate');
  assert.ok(keys.includes('causal_development'), 'Must have causal_development candidate');
  assert.ok(keys.includes('genre_payoff'), 'Must have genre_payoff candidate');
});

test('V3.1: Role-aware prompt leakage detection distinguishes instructions from fiction', () => {
  const leakedText = 'Story constraints:\nDEAD: Bruno\nLATEST SCENE EVENT: moved along trail';
  assert.equal(story.detectPromptLeakage(leakedText).leaked, true, 'Must detect internal constraint block');

  const fictionalText = 'The canyon winds began to echo through the limestone arches as dusk settled over the ridge.';
  assert.equal(story.detectPromptLeakage(fictionalText).leaked, false, 'Legitimate fictional prose with "echo" must not be flagged');
});
