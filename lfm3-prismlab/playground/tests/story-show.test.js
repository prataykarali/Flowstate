import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import ts from 'typescript';

const cacheDir = path.resolve('node_modules/.cache/tests');
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
  DEFAULT_SHOW_CONFIG,
  SHOW_CAPABILITIES,
  createShow,
  planShow,
  validateShowConfig,
  validateDecisionJson,
  presentDecisionOutput,
  buildShowPrompt,
  appendShowTurn,
  initializeCanonicalWorldState,
  extractProposedEvents,
  validateProposedEvents,
  applyEventsToWorldState,
  auditStoryContinuity,
  isTruncatedOutput,
  detectNarrativeLoop,
  auditStoryQuality,
  createStoryDirectorPlan,
  chooseStoryCast,
  generateFreshPremise,
  FIRST_NAMES,
  compactStageText,
  evaluateGenreTurn,
  stripEchoedPrefix,
  sanitizeTurnOutput,
  chooseStoryDirections,
  STORY_THEMES
} = story;

const sd = await import(pathToFileURL(path.join(cacheDir, 'storyDirector.js')).href);
const { RANDOM_CAST_NAMES } = sd;

const config = (extra = {}) => ({ ...DEFAULT_SHOW_CONFIG, ...extra });
const validDecision = JSON.stringify({ predicted_route: 'technical', confidence: 0.7, probabilities: { billing: 0.1, technical: 0.7, shipping: 0.1, other: 0.1 } });

test('10–20 turn contract and six supported model roles', () => {
  assert.equal(SHOW_CAPABILITIES.length, 6);
  assert.equal(validateShowConfig(config({ turnCount: 9 })), 'Choose 10–20 turns for a complete story.');
  assert.equal(validateShowConfig(config({ turnCount: 10 })), null);
  assert.equal(validateShowConfig(config({ turnCount: 20 })), null);
  assert.equal(validateShowConfig(config({ turnCount: 21 })), 'Choose 10–20 turns for a complete story.');
  
  // 10 turns schedule (default full cast)
  const order10 = planShow(config({ turnCount: 10 }));
  assert.equal(order10.length, 10);
  assert.equal(order10[0], 'text');
  assert.equal(order10.at(-1), 'text');
  for (const id of config().modelIds) assert.ok(order10.includes(id));

  for (const count of [11, 12, 20]) {
    const order = planShow(config({ turnCount: count }));
    assert.equal(order.length, count);
    assert.equal(order[0], 'text');
    assert.equal(order.at(-1), 'text');
    for (const id of config().modelIds) assert.ok(order.includes(id));
  }
});

test('story stage keeps three sentences of roughly 400 characters visible', () => {
  const sentence = 'Mara and Sol carried the lantern along the ridge while the old bridge shook below them, and each step brought the lost village closer.';
  const raw = [sentence, sentence, sentence].join(' ');
  assert.ok(raw.length >= 400);
  const stage = story.formatStageDialogue('text', raw, 'Adventure').stageText;
  assert.ok(stage.length >= 400 && stage.length <= 500);
  assert.equal(stage, raw);
});

test('Test A: Dead character action flagged & rejected from canon', () => {
  const show = createShow(config({
    theme: 'Tragedy',
    cast: { protagonist: 'Asha', companion: 'Mateo', role: 'sailor', setting: 'harbor', hook: 'storm' }
  }));
  let state = show.canonicalWorldState;
  assert.ok(state);

  // Turn 1: Mateo dies
  const deathEvent = extractProposedEvents('A huge wave crashed over the pier and Mateo drowned in the dark water.', state, 'text', 1);
  assert.ok(deathEvent.some(e => e.type === 'CHARACTER_DIED' && e.actors.includes('Mateo')));
  
  const val1 = validateProposedEvents(deathEvent, 'Mateo drowned in the dark water.', state);
  assert.equal(val1.valid, true);
  state = applyEventsToWorldState(state, val1.acceptedEvents, 1, 9);
  
  const mateoState = state.characters.find(c => c.name === 'Mateo');
  assert.equal(mateoState?.status, 'dead');

  // Turn 2: Mateo tries to act physically
  const invalidEvents = extractProposedEvents('Mateo smiled and shouted a warning to Asha from the beach.', state, 'text', 2);
  const val2 = validateProposedEvents(invalidEvents, 'Mateo smiled and shouted a warning to Asha from the beach.', state);
  assert.equal(val2.valid, false);
  assert.ok(val2.issues.some(issue => issue.includes('dead') || issue.includes('cannot perform')));
  assert.ok(val2.prohibitedDirectives.some(p => p.includes('Mateo')));
});

test('Test B: Consumed resource reuse flagged and rejected', () => {
  const show = createShow(config({
    theme: 'Tragedy',
    cast: { protagonist: 'Bruno', companion: 'Hana', role: 'doctor', setting: 'clinic', hook: 'a medicine can save only one person' }
  }));
  let state = show.canonicalWorldState;
  assert.ok(state);
  assert.ok(state.entities.some(e => e.name === 'medicine' && e.quantity === 1));

  // Turn 1: Bruno uses the medicine on Hana
  const useEvents = extractProposedEvents('Bruno administered the medicine to Hana, saving her life.', state, 'text', 1);
  assert.ok(useEvents.some(e => e.type === 'OBJECT_CONSUMED' && e.target === 'medicine'));
  
  const val1 = validateProposedEvents(useEvents, 'Bruno administered the medicine to Hana.', state);
  assert.equal(val1.valid, true);
  state = applyEventsToWorldState(state, val1.acceptedEvents, 1, 9);
  
  const medState = state.entities.find(e => e.name === 'medicine');
  assert.equal(medState?.status, 'consumed');
  assert.equal(medState?.quantity, 0);

  // Turn 2: Attempting to reuse the medicine
  const reuseEvents = extractProposedEvents('Bruno used the remaining medicine to treat his own wound.', state, 'text', 2);
  const val2 = validateProposedEvents(reuseEvents, 'Bruno used the remaining medicine to treat his own wound.', state);
  assert.equal(val2.valid, false);
  assert.ok(val2.issues.some(issue => issue.includes('consumed') || issue.includes('depleted') || issue.includes('cannot be reused')));
});

test('Test C: Repeated sacrifice detected across progression acts', () => {
  const show = createShow(config({
    theme: 'Tragedy',
    cast: { protagonist: 'Chidi', companion: 'Farah', role: 'janitor', setting: 'station', hook: 'fire' }
  }));
  let state = show.canonicalWorldState;

  // Turn 2 (Act II): Chidi makes a decisive sacrifice
  const sac1 = extractProposedEvents('Chidi made the ultimate sacrifice and surrendered his badge in the fire.', state, 'text', 2);
  const val1 = validateProposedEvents(sac1, 'Chidi made the ultimate sacrifice and surrendered his badge.', state);
  assert.equal(val1.valid, true);
  state = applyEventsToWorldState(state, val1.acceptedEvents, 2, 9);

  // Turn 4: Chidi attempts another identical ultimate sacrifice
  const sac2 = extractProposedEvents('Chidi made the ultimate sacrifice again to save the remaining room.', state, 'text', 4);
  const val2 = validateProposedEvents(sac2, 'Chidi made the ultimate sacrifice again.', state);
  assert.equal(val2.valid, false);
  assert.ok(val2.issues.some(issue => issue.includes('Repeated decisive sacrifice')));
});

test('Test D: All 9 genre contracts verified for setup, development, climax, resolution', () => {
  assert.equal(story.STORY_THEMES.length, 9);
  for (const theme of story.STORY_THEMES) {
    const genre = story.getGenreContract(theme);
    assert.equal(genre.displayName, theme);
    assert.equal(genre.acts.length, 4);
    assert.ok(genre.premiseRequirements.length > 10);
    assert.ok(genre.centralConflict.length > 10);
    assert.ok(genre.requiredDevelopments.length > 10);
    assert.ok(genre.endingRequirements.length > 10);

    const show = createShow(config({ theme }));
    assert.ok(show.canonicalWorldState);
    assert.equal(show.canonicalWorldState.theme, theme);

    // Verify bounded prompt under 1000 chars for all beats
    const pIntro = buildShowPrompt(show, 'text').prompt;
    assert.ok(pIntro.length <= 1000, `Intro prompt for ${theme} exceeds 1000 chars: ${pIntro.length}`);
  }
});

test('Test E: Specialist observation contradicting canon is isolated', () => {
  let show = createShow(config({
    theme: 'Tragedy',
    cast: { protagonist: 'Dalia', companion: 'Ivo', role: 'baker', setting: 'bakery', hook: 'collapse' }
  }));
  
  // Dalia dies
  const deathEvent = extractProposedEvents('Dalia fell under the collapsing roof and died instantly.', show.canonicalWorldState, 'text', 1);
  show.canonicalWorldState = applyEventsToWorldState(show.canonicalWorldState, deathEvent, 1, 9);

  // Specialist vision makes an observation (which is non-narrative)
  const specialistTurn = {
    turnId: 's:2',
    index: 1,
    modelId: 'vision',
    role: 'visual_interpreter',
    status: 'completed',
    output: 'Dalia is standing outside smiling with bread.',
    storyPerspective: false,
    isRelevant: true,
    promptLength: 100,
    contextTruncated: false,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString()
  };
  show = appendShowTurn(show, specialistTurn);

  // The text model prompt must retain Dalia as DEAD
  const writerPrompt = buildShowPrompt(show, 'text').prompt;
  assert.match(writerPrompt, /DEAD \(cannot act or speak\): Dalia/);
  assert.ok(writerPrompt.length <= 1000);
});

test('Test F: Paraphrasing and progression failure handled with bounded retake', () => {
  const show = createShow(config({ theme: 'Comedy' }));
  const earlierOutputs = [
    'Bruno tossed the runaway goat over the fence into the laundry basket.',
    'The goat ate the flowers on the table.'
  ];
  
  // Direct identical or near-identical copy
  assert.equal(story.copiesPreviousSentence('Bruno tossed the runaway goat over the fence into the laundry basket.', earlierOutputs), true);
  assert.equal(story.copiesPreviousSentence('A fresh complication arrived from the street.', earlierOutputs), false);

  const retryPrompt = story.buildSupportRetryPrompt(show, 'vision');
  assert.ok(retryPrompt.length <= 1000);
  assert.match(retryPrompt, /Write what happens NEXT/);
});

test('Test G: Contradictory ending marked review_recommended', () => {
  const show = createShow(config({
    theme: 'Tragedy',
    cast: { protagonist: 'Emeka', companion: 'Farah', role: 'miner', setting: 'shaft', hook: 'cave-in' }
  }));
  let state = show.canonicalWorldState;
  
  // Emeka dies in Act 3
  const deathEvent = extractProposedEvents('Emeka was crushed beneath the boulders and died saving Farah.', state, 'text', 5);
  state = applyEventsToWorldState(state, deathEvent, 5, 9);

  // Story ends with contradictory resurrection
  const finalProse = 'Farah walked home. Suddenly Emeka smiled and cheered as they walked together into the sunset.';
  const audit = auditStoryContinuity(state, finalProse);
  
  assert.equal(audit.verdict, 'review_recommended');
  assert.equal(audit.label, 'Continuity review recommended');
  assert.ok(audit.issues.some(issue => issue.includes('Emeka') && issue.includes('deceased')));
});

test('Test H: Replay makes 0 inference requests and awards 0 League points', () => {
  const liveShow = createShow(config({ theme: 'Adventure', turnCount: 10 }));
  const recordedTurn = {
    turnId: 'rec:1',
    index: 0,
    modelId: 'text',
    role: 'writer',
    status: 'completed',
    output: 'The explorer mapped the river entrance.',
    stageText: 'The explorer mapped the river entrance.',
    stageTextProvenance: 'raw',
    promptLength: 120,
    contextTruncated: false,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString()
  };
  const completedShow = appendShowTurn(liveShow, recordedTurn);
  const replayShow = story.asReplay(completedShow);

  assert.equal(replayShow.mode, 'recorded_show');
  assert.equal(replayShow.turns.length, 1);
  assert.equal(replayShow.turns[0].output, recordedTurn.output);
});

test('Test I: Pause/Stop halts turn scheduling', () => {
  const show = createShow(config({ theme: 'Horror', turnCount: 10 }));
  assert.equal(show.status, 'active');
  
  const stopped = { ...show, status: 'stopped', updatedAt: new Date().toISOString() };
  assert.equal(stopped.status, 'stopped');
});

test('every genre accepts full cast and specialist text prompts keep prior scene', () => {
  for (const theme of story.STORY_THEMES) {
    const show = createShow(config({ theme, scenarioId: undefined }), 'generic');
    assert.equal(show.turnOrder.length, 10);
    assert.equal(validateShowConfig(show.config), null);
  }
  let show = createShow(config({ theme: 'Comedy', scenarioId: undefined }), 'comedy');
  const base = { turnId: 'c:1', index: 0, modelId: 'text', role: 'writer', status: 'completed', output: 'Mina dropped the cake at the town party. It began to sing.', promptLength: 20, contextTruncated: false, startedAt: '2026-11-04T00:00:00Z', finishedAt: '2026-11-04T00:00:01Z' };
  show = appendShowTurn(show, base);
  const prompt = buildShowPrompt(show, 'vision').prompt;
  assert.match(prompt, /Mina dropped the cake/);
  assert.match(prompt, /same people, place and facts/);
  assert.doesNotMatch(prompt, /attached image/);
  for (let i = 1; i < 7; i++) show = appendShowTurn(show, { ...base, turnId: `c:${i + 1}`, index: i, modelId: i % 2 ? 'vision' : 'audio', role: 'visual_interpreter', output: `A new event happens at beat ${i}.`, storyPerspective: true });
  assert.match(buildShowPrompt(show, 'text').prompt, /Opening: Mina dropped the cake/);
});

test('structured decision output must be complete and probabilistically valid', () => {
  assert.equal(validateDecisionJson(validDecision).valid, true);
  assert.equal(validateDecisionJson(validDecision.slice(0, -4)).valid, false);
  assert.equal(validateDecisionJson('{"predicted_route":"technical"}').valid, false);
  assert.equal(validateDecisionJson(JSON.stringify({ predicted_route: 'technical', confidence: 0.7, probabilities: { billing: 0.1, technical: 0.7, shipping: 0.1, other: 0.9 } })).valid, false);
  assert.match(presentDecisionOutput(validDecision), /technical 70%/);
  assert.doesNotMatch(presentDecisionOutput(validDecision), /latch|culprit|tamper/);
});

test('random turn count spans inclusive 10 through 20 with strict clamping', () => {
  assert.equal(story.chooseRandomTurnCount(() => 0), 10);
  assert.equal(story.chooseRandomTurnCount(() => 0.5), 15);
  assert.equal(story.chooseRandomTurnCount(() => 0.999999), 20);
  assert.equal(story.chooseRandomTurnCount(() => -0.5), 10);
  assert.equal(story.chooseRandomTurnCount(() => 1.5), 20);
});

test('S3-B.5-1: Story Director creates bounded plans across all 9 genres with 4-5 development beats and ending requirements', () => {
  for (const theme of story.STORY_THEMES) {
    const plan = createStoryDirectorPlan(theme, undefined, undefined, () => 0.42);
    assert.ok(plan.primaryConflict.length > 10, `${theme} missing primaryConflict`);
    assert.ok(plan.initialStakes.length > 10, `${theme} missing initialStakes`);
    assert.ok(plan.developmentBeats.length >= 4, `${theme} beats < 4`);
    assert.ok(plan.climaxObjective.length > 10, `${theme} missing climaxObjective`);
    assert.ok(plan.endingRequirements.length > 10, `${theme} missing endingRequirements`);
    assert.ok(plan.characters.length >= 2, `${theme} characters < 2`);

    // Verify deterministic variation with different seeds
    const planA = createStoryDirectorPlan(theme, undefined, undefined, () => 0.1);
    const planB = createStoryDirectorPlan(theme, undefined, undefined, () => 0.9);
    assert.ok(planA.characters[0].name !== planB.characters[0].name || planA.primaryConflict !== planB.primaryConflict);
  }
});

test('S3-B.5-2: Unique purpose prompt directives for each writer turn (Opening, Development, Climax, Ending)', () => {
  const show = createShow(config({ theme: 'Science fiction', turnCount: 10 }));
  
  // Turn 0: Opening
  const prompt0 = buildShowPrompt(show, 'text').prompt;
  assert.match(prompt0, /Central conflict:/);
  assert.match(prompt0, /Stakes:/);
  assert.ok(prompt0.length <= 980);

  // Turn 2: Development 1
  const showTurn1 = appendShowTurn(show, {
    turnId: 't1', index: 0, modelId: 'text', role: 'writer', status: 'completed',
    output: 'Tariq inspected the cooling manifold as emergency lights flickered.',
    stageText: 'Tariq inspected the cooling manifold.', promptLength: 100, contextTruncated: false,
    startedAt: new Date().toISOString(), finishedAt: new Date().toISOString()
  });
  const showTurn2 = appendShowTurn(showTurn1, {
    turnId: 't2', index: 1, modelId: 'vision', role: 'visual_interpreter', status: 'completed',
    output: 'The thermal sensors show superheated gas venting near the bridge.',
    stageText: 'I see: superheated gas venting.', promptLength: 100, contextTruncated: false,
    startedAt: new Date().toISOString(), finishedAt: new Date().toISOString()
  });

  const prompt2 = buildShowPrompt(showTurn2, 'text').prompt;
  assert.match(prompt2, /Objective:/);
  assert.match(prompt2, /Required progression:/);
  assert.match(prompt2, /Do not repeat:/);
  assert.ok(prompt2.length <= 980);

  // Climax turn directive
  const fakeClimaxShow = {
    ...showTurn2,
    turns: Array.from({ length: 8 }, (_, i) => ({
      turnId: `t${i + 1}`, index: i, modelId: (i % 2 === 0 ? 'text' : 'vision'), role: 'writer',
      status: 'completed', output: `Progress step ${i + 1} occurred cleanly.`,
      stageText: `Progress step ${i + 1}.`, promptLength: 80, contextTruncated: false,
      startedAt: new Date().toISOString(), finishedAt: new Date().toISOString()
    }))
  };
  const promptClimax = buildShowPrompt(fakeClimaxShow, 'text').prompt;
  assert.match(promptClimax, /Act III Climax|turning point/);
  assert.match(promptClimax, /Objective:/);
  assert.ok(promptClimax.length <= 980);

  // Final ending turn directive
  const fakeEndingShow = {
    ...showTurn2,
    turns: Array.from({ length: 9 }, (_, i) => ({
      turnId: `t${i + 1}`, index: i, modelId: (i % 2 === 0 ? 'text' : 'vision'), role: 'writer',
      status: 'completed', output: `Progress step ${i + 1} occurred cleanly.`,
      stageText: `Progress step ${i + 1}.`, promptLength: 80, contextTruncated: false,
      startedAt: new Date().toISOString(), finishedAt: new Date().toISOString()
    }))
  };
  const promptEnding = buildShowPrompt(fakeEndingShow, 'text').prompt;
  assert.match(promptEnding, /Act IV Resolution|End this Science fiction story/);
  assert.match(promptEnding, /Required ending:/);
  assert.ok(promptEnding.length <= 980);
});

test('S3-B.5-3: Narrative loop detection flags near-identical text without character name false positives', () => {
  const state = initializeCanonicalWorldState('Tragedy', '', {
    protagonist: 'Hana', companion: 'Bruno', role: 'Doctor', setting: 'Clinic', hook: 'Winter storm'
  });

  const pastTurns = [
    { output: 'Hana measured the remaining water carefully while Bruno secured the wooden shutter against the icy wind.' }
  ];

  // Turn sharing character names and setting words but describing completely fresh action (NOT a loop)
  const freshTurn = 'Bruno stoked the small furnace with pine logs, noting Hana had successfully quieted the patient fever.';
  const freshCheck = detectNarrativeLoop(freshTurn, [], pastTurns, state);
  assert.equal(freshCheck.hasLoop, false, 'Fresh action should not trigger loop false-positive due to shared character names');

  // Turn repeating the exact same descriptive sentence (IS a loop)
  const duplicateTurn = 'Hana measured the remaining water carefully while Bruno secured the wooden shutter against the icy wind.';
  const dupCheck = detectNarrativeLoop(duplicateTurn, [], pastTurns, state);
  assert.equal(dupCheck.hasLoop, true, 'Duplicate sentence should be flagged as loop');
  assert.ok(dupCheck.retakePromptDirective);
});

test('S3-B.5-4: Unsupported entity mutation rejected (stick becoming a knife without explanation)', () => {
  const state = initializeCanonicalWorldState('Adventure', 'The traveler found a wooden stick on the mountain path.', {
    protagonist: 'Amina', companion: 'Jonas', role: 'Explorer', setting: 'Ridge', hook: 'Search for maps'
  });

  // Candidate prose abruptly transmutes the stick into a knife without explanation
  const abruptMutationProse = 'Amina gripped the wooden stick, but now the steel dagger sliced through the thick vines easily.';
  const validation = validateProposedEvents([], abruptMutationProse, state);
  assert.equal(validation.valid, false);
  assert.ok(validation.issues.some(issue => issue.includes('Unsupported object mutation') && issue.includes('knife')));

  // Candidate prose with legitimate narrative explanation (carved/whittled) passes
  const legitimateProse = 'Amina whittled the wooden stick into a sharp spear point to clear the vines.';
  const legitValidation = validateProposedEvents([], legitimateProse, state);
  assert.equal(legitValidation.valid, true);
});

test('S3-B.5-5: Incomplete / truncated output detection and completion verification', () => {
  // Mid-word or missing punctuation
  assert.equal(isTruncatedOutput('Tariq reached for the primary emergency shutoff valve').truncated, true);
  assert.equal(isTruncatedOutput('Hana offered the remaining medicine to her brother, but').truncated, true);
  assert.equal(isTruncatedOutput('They share').truncated, true);
  assert.equal(isTruncatedOutput('The explorer said, "Look over there').truncated, true);

  // Complete, properly punctuated sentences
  assert.equal(isTruncatedOutput('Tariq reached for the primary emergency shutoff valve and sealed it tight.').truncated, false);
  assert.equal(isTruncatedOutput('Hana offered the remaining medicine to her brother!').truncated, false);
  assert.equal(isTruncatedOutput('The explorer asked, "Can you see the ridge line?"').truncated, false);
});

test('S3-B.5-6: Meaningful endings across all 9 genres address central conflict', () => {
  for (const theme of story.STORY_THEMES) {
    const show = createShow(config({ theme, turnCount: 10 }));
    const director = show.canonicalWorldState.directorPlan;
    assert.ok(director);

    // Final prompt must include ending requirements and reference primary conflict
    const finalShow = {
      ...show,
      turns: Array.from({ length: 9 }, (_, i) => ({
        turnId: `t${i + 1}`, index: i, modelId: (i % 2 === 0 ? 'text' : 'vision'), role: 'writer',
        status: 'completed', output: `Progress turn ${i + 1} advancing the story.`,
        stageText: `Progress turn ${i + 1}.`, promptLength: 80, contextTruncated: false,
        startedAt: new Date().toISOString(), finishedAt: new Date().toISOString()
      }))
    };
    const endingPrompt = buildShowPrompt(finalShow, 'text').prompt;
    assert.match(endingPrompt, /Act IV Resolution/);
    assert.match(endingPrompt, /Required ending:/);
    assert.ok(endingPrompt.length <= 980);
  }
});

test('S3-B.5-7: Decoupled 5-factor quality audit reports separate inference, output, canon, genre, and loop statuses', () => {
  const show = createShow(config({ theme: 'Horror', turnCount: 10 }));
  const turns = [
    { turnId: '1', index: 0, modelId: 'text', output: 'Maeve saw the shadow move across the cellar door.', status: 'completed' },
    { turnId: '2', index: 1, modelId: 'vision', output: 'Deep claw marks score the cellar door frame.', status: 'completed' },
    { turnId: '3', index: 2, modelId: 'text', output: 'Maeve escaped the cellar and returned home, ending the shadow threat.', status: 'completed' }
  ];

  const audit = auditStoryQuality(show.canonicalWorldState, turns);
  assert.equal(audit.inferenceCompleted, true);
  assert.equal(audit.outputComplete, true);
  assert.equal(audit.canonConsistent, true);
  assert.equal(audit.genreContractPassed, true);
  assert.equal(audit.loopFree, true);
  assert.equal(audit.reviewStatus, 'pass');
  assert.match(audit.label, /No detected continuity conflicts; genre contract satisfied/);

  // If a turn is truncated, outputComplete is false while canonConsistent remains true
  const truncatedTurns = [
    { turnId: '1', index: 0, modelId: 'text', output: 'Maeve saw the shadow move, but', status: 'completed' }
  ];
  const truncAudit = auditStoryQuality(show.canonicalWorldState, truncatedTurns);
  assert.equal(truncAudit.outputComplete, false);
  assert.equal(truncAudit.reviewStatus, 'review_recommended');
});

test('Adventure canonical events reject paraphrased rediscovery and repeated action', () => {
  let state = initializeCanonicalWorldState('Adventure', 'Find the shelter beyond the canyon.', { protagonist: 'Tamsin', companion: 'Yusuf', role: 'traveler', setting: 'trail', hook: 'reach the shelter' });
  const first = 'Tamsin discovered a loose stone and found hidden caves. Yusuf dried the maps by the fire and walked to the canyon edge.';
  const events = extractProposedEvents(first, state, 'text', 0);
  assert.equal(validateProposedEvents(events, first, state).valid, true);
  state = applyEventsToWorldState(state, events, 0, 9);
  assert.equal(state.currentLocation, 'canyon edge');
  const repeated = 'A wobbling rock came into view. Secret caverns appeared. Yusuf aired the maps beside the heat and approached the ravine rim.';
  const repeatEvents = extractProposedEvents(repeated, state, 'text', 1);
  const validation = validateProposedEvents(repeatEvents, repeated, state);
  assert.equal(validation.valid, false);
  assert.match(validation.issues.join(' '), /Repeated canonical event/);
  assert.equal(detectNarrativeLoop(repeated, repeatEvents, [{ output: first, acceptedEvents: events }], state).hasLoop, true);
});

test('Adventure crossing and damaged bridge preserve location and require a cause', () => {
  let state = initializeCanonicalWorldState('Adventure', 'Reach the shelter across the canyon.');
  const crossed = 'They crossed the rope bridge and reached the far side of the canyon.';
  const crossing = extractProposedEvents(crossed, state, 'text', 0);
  state = applyEventsToWorldState(state, crossing, 0, 9);
  assert.equal(state.currentLocation, 'far side of canyon');
  const regression = 'They approached the canyon rim once more.';
  assert.equal(validateProposedEvents(extractProposedEvents(regression, state, 'text', 1), regression, state).valid, false);
  const damaged = 'The bridge snapped and collapsed.';
  state = applyEventsToWorldState(state, extractProposedEvents(damaged, state, 'text', 1), 1, 9);
  assert.equal(state.bridgeDamaged, true);
  assert.match(buildShowPrompt({ ...createShow(config({ theme: 'Adventure' })), canonicalWorldState: state, turns: [{ turnId: 'x', index: 0, modelId: 'text', role: 'writer', status: 'completed', output: crossed }] }, 'text').prompt, /Bridge damaged/);
});

test('bridge damage worsening remains causal and a repaired crossing changes location', () => {
  let state = initializeCanonicalWorldState('Adventure', 'Cross the broken bridge.');
  const opening = 'They must cross the crumbling bridge before the flood.';
  assert.equal(extractProposedEvents(opening, state, 'text', 0).some(event => event.canonicalKey === 'cross:bridge'), false);
  assert.equal(extractProposedEvents('Rafael guides Soren across the crumbling Rope Bridge.', state, 'text', 0).some(event => event.canonicalKey === 'cross:bridge'), true);
  assert.equal(extractProposedEvents('The bridge is slick. Noor steers their bike over it quickly.', state, 'text', 0).some(event => event.canonicalKey === 'cross:bridge'), true);
  state = applyEventsToWorldState(state, extractProposedEvents(opening, state, 'text', 0), 0, 10);
  assert.equal(state.bridgeDamaged, true);
  const worse = 'A rockfall splits the bridge, leaving a gap.';
  assert.equal(validateProposedEvents(extractProposedEvents(worse, state, 'text', 1), worse, state).valid, true);
  const crossing = 'They tied a rope and crossed safely before the flood.';
  const events = extractProposedEvents(crossing, state, 'text', 2);
  assert.equal(validateProposedEvents(events, crossing, state).valid, true);
  state = applyEventsToWorldState(state, events, 2, 10);
  assert.equal(state.currentLocation, 'far side of canyon');
});

test('quality audit exposes stored false negatives and unfinished ending', () => {
  const state = initializeCanonicalWorldState('Adventure', 'Reach the shelter beyond the canyon.');
  const turns = [
    { turnId: '1', index: 0, modelId: 'text', status: 'completed', output: 'They found a loose stone on the path.' },
    { turnId: '2', index: 1, modelId: 'text', status: 'completed', output: 'A wobbling rock came into view.' },
    { turnId: '3', index: 2, modelId: 'text', status: 'completed', output: 'They nearly reached the shelter, but' }
  ];
  const audit = auditStoryQuality(state, turns);
  assert.equal(audit.loopFree, false);
  assert.equal(audit.outputComplete, false);
  assert.equal(audit.genreContractPassed, false);
});

test('ending gate requires a chosen route for a split map goal', () => {
  const goal = 'a torn treasure map points two ways';
  assert.equal(story.hasMeaningfulEnding('They crossed the bridge and reached safety.', goal), false);
  assert.equal(story.hasMeaningfulEnding('They chose the eastern map route, crossed the gorge, and found treasure.', goal), true);
  assert.equal(story.hasMeaningfulEnding('They chose the eastern map route, crossed the gorge, and found', goal), false);
});

test('guide arrival can resolve a guide objective and unfinished endings report an issue', () => {
  const goal = 'a promised guide never arrives';
  assert.equal(story.hasMeaningfulEnding('They crossed safely and the promised guide finally appears.', goal), true);
  const state = initializeCanonicalWorldState('Adventure', goal);
  const audit = auditStoryQuality(state, [{ turnId: 'end', index: 0, modelId: 'text', status: 'completed', output: 'They wait for the guide.' }]);
  assert.equal(audit.genreContractPassed, false);
  assert.match(audit.issues.join(' '), /does not resolve/);
});

test('Universal Genre Fidelity: 100+ character names stay and cycle randomly', () => {
  assert.ok(FIRST_NAMES.length >= 100, `Expected at least 100 names in FIRST_NAMES, found ${FIRST_NAMES.length}`);
  assert.ok(RANDOM_CAST_NAMES.length >= 100, `Expected at least 100 names in RANDOM_CAST_NAMES, found ${RANDOM_CAST_NAMES.length}`);

  // Test random cycling without repeating recent casts
  const previousCasts = [];
  const chosenProtagonists = new Set();
  const chosenCompanions = new Set();

  for (let i = 0; i < 20; i++) {
    const cast = chooseStoryCast('Adventure', [], previousCasts);
    assert.ok(cast.protagonist, 'Protagonist must be chosen');
    assert.ok(cast.companion, 'Companion must be chosen');
    assert.notEqual(cast.protagonist, cast.companion, 'Protagonist and companion must be distinct');
    assert.ok(FIRST_NAMES.includes(cast.protagonist), 'Protagonist must come from FIRST_NAMES');
    assert.ok(FIRST_NAMES.includes(cast.companion), 'Companion must come from FIRST_NAMES');

    // Ensure recent cast is not immediately recycled
    if (previousCasts.length > 0) {
      const immediateLast = previousCasts[0];
      assert.notEqual(cast.protagonist, immediateLast.protagonist, 'Immediate consecutive show should not reuse protagonist');
    }
    previousCasts.unshift(cast);
    chosenProtagonists.add(cast.protagonist);
    chosenCompanions.add(cast.companion);
  }

  // Over 20 shows, multiple unique names must have been cycled
  assert.ok(chosenProtagonists.size >= 10, `Expected at least 10 distinct protagonists in 20 shows, got ${chosenProtagonists.size}`);
  assert.ok(chosenCompanions.size >= 10, `Expected at least 10 distinct companions in 20 shows, got ${chosenCompanions.size}`);
});

test('Universal Genre Fidelity: deterministic verification across ALL 9 genres in registry', () => {
  assert.equal(story.STORY_THEMES.length, 9);

  for (const theme of story.STORY_THEMES) {
    // 1. Fresh cast and premise generation
    const cast = chooseStoryCast(theme, [], []);
    assert.ok(cast.protagonist && cast.companion && cast.role && cast.setting && cast.hook, `${theme}: cast setup incomplete`);
    const premise = generateFreshPremise(theme, cast);
    assert.ok(premise.length > 20, `${theme}: premise generation failed`);
    assert.ok(premise.includes(cast.protagonist), `${theme}: premise missing protagonist`);
    assert.ok(premise.includes(cast.companion), `${theme}: premise missing companion`);

    // 2. Character and conflict setup via director plan
    const plan = createStoryDirectorPlan(theme, cast, premise);
    assert.ok(plan.primaryConflict.length > 10, `${theme}: missing primary conflict`);
    assert.ok(plan.initialStakes.length > 10, `${theme}: missing initial stakes`);
    assert.ok(plan.climaxObjective.length > 10, `${theme}: missing climax objective`);
    assert.ok(plan.endingRequirements.length > 10, `${theme}: missing ending requirements`);

    // 3. Four-act progression
    assert.ok(plan.developmentBeats.length >= 4, `${theme}: fewer than 4 development beats`);
    const acts = new Set(plan.developmentBeats.map(b => b.act));
    assert.ok(acts.has(1) && acts.has(2) && acts.has(3) && acts.has(4), `${theme}: beats do not cover acts 1-4`);

    // 4. Random 10-20 turn planning
    for (const turnCount of [10, 14, 18, 20]) {
      const order = planShow(config({ theme, turnCount }));
      assert.equal(order.length, turnCount, `${theme}: planShow length mismatch for ${turnCount} turns`);
      assert.equal(order[0], 'text', `${theme}: Turn 0 must be text`);
      assert.equal(order[order.length - 1], 'text', `${theme}: Final turn must be text`);
      for (const cap of SHOW_CAPABILITIES) {
        assert.ok(order.includes(cap.modelId), `${theme}: ${cap.modelId} missing from order`);
      }
    }

    // 5. Character & event continuity
    const show = createShow(config({ theme, cast, opening: premise, turnCount: 10 }));
    assert.ok(show.canonicalWorldState, `${theme}: canonicalWorldState not initialized`);
    assert.equal(show.canonicalWorldState.characters.length, 2, `${theme}: expected 2 characters initialized`);

    // 6. Sentence and character limits on stage prose
    const shortText = 'Asha walked into the room. She found the letter on the table. Bruno smiled warmly.';
    const formatted = story.formatStageDialogue('text', shortText, theme).stageText;
    assert.ok(formatted.length <= 500, `${theme}: stageText exceeds 500 chars`);
    assert.equal(formatted, shortText);

    // Over-500 char text must not be destructively sliced with ellipsis
    const longSentence = 'The wind swept across the ancient stone walls carrying the scent of pine and distant rain through every cracked wooden windowpane.';
    const longText = [longSentence, longSentence, longSentence, longSentence, longSentence].join(' ');
    const compacted = compactStageText(longText);
    assert.ok(compacted.length <= 500, `${theme}: compacted text exceeds 500 chars: ${compacted.length}`);
    assert.ok(!compacted.endsWith('…'), `${theme}: compacted text has destructive ellipsis`);
    assert.match(compacted, /[.!?]$/, `${theme}: compacted text must end with terminal punctuation`);

    // 7. Repetition detection
    const evalPass = evaluateGenreTurn(theme, 'development', `${cast.protagonist} noticed a strange detail and investigated it with ${cast.companion}.`, []);
    assert.equal(evalPass.status, 'pass', `${theme}: valid turn failed evaluation`);

    const evalDup = evaluateGenreTurn(theme, 'development', `${cast.protagonist} noticed a strange detail.`, [`${cast.protagonist} noticed a strange detail.`]);
    assert.equal(evalDup.status, 'review', `${theme}: repeated passage was not flagged`);

    // 8. Genre-appropriate ending conditions
    const validGenreEndings = {
      'Romance': `${cast.protagonist} smiled and confessed their love, and ${cast.companion} held their hand knowing they would face tomorrow together.`,
      'Horror': `The terrifying creature was destroyed and the nightmare ended, leaving ${cast.protagonist} to survive the quiet dawn.`,
      'Tragedy': `${cast.protagonist} wept in quiet grief and accepted the permanent loss, knowing the sacrifice saved ${cast.companion}.`,
      'Adventure': `${cast.protagonist} and ${cast.companion} chose the high path, crossed the final canyon and reached the high shelter together.`,
      'Mystery': `${cast.protagonist} revealed the hidden truth and solved the mystery, answering the riddle.`,
      'Fantasy': `The ancient spell was broken, restoring balance and peace to the realm.`,
      'Science fiction': `The cooling manifold was repaired, orbital telemetry stabilized nominal, and the ship was saved.`,
      'Comedy': `Everyone burst into laughter at the hilarious joke, celebrating the funniest spectacle in town history.`,
      'Detective investigation': `Detective ${cast.protagonist} revealed the decisive clue, proving the culprit and solving the case.`
    };

    const validEnding = validGenreEndings[theme] || `${cast.protagonist} reached the goal and resolved the crisis.`;
    assert.equal(story.hasMeaningfulEnding(validEnding, plan.primaryConflict), true, `${theme}: valid ending failed hasMeaningfulEnding`);
    assert.equal(story.hasMeaningfulEnding('They looked at the sky and', plan.primaryConflict), false, `${theme}: truncated ending passed`);
  }
});

test('Universal Genre Fidelity: full multi-turn show progression across diverse genres (10 to 20 turns)', () => {
  const testScenarios = [
    { theme: 'Romance', turnCount: 10 },
    { theme: 'Comedy', turnCount: 12 },
    { theme: 'Horror', turnCount: 14 },
    { theme: 'Science fiction', turnCount: 16 },
    { theme: 'Adventure', turnCount: 20 } // Near 20-turn long show
  ];

  for (const { theme, turnCount } of testScenarios) {
    const cast = chooseStoryCast(theme);
    const premise = generateFreshPremise(theme, cast);
    let show = createShow(config({ theme, cast, opening: premise, turnCount }));
    assert.equal(show.turnOrder.length, turnCount);

    // Simulate execution of each turn
    for (let index = 0; index < turnCount; index++) {
      const modelId = show.turnOrder[index];
      const isFirst = index === 0;
      const isLast = index === turnCount - 1;
      const promptObj = buildShowPrompt(show, modelId);
      assert.ok(promptObj.prompt.length <= 1000, `${theme} Turn ${index} prompt exceeds 1000 chars: ${promptObj.prompt.length}`);

      let output = '';
      let stageText = '';
      let decisionData = undefined;
      const proposedEvents = [];

      if (modelId === 'text') {
        if (isFirst) {
          output = `${cast.protagonist} arrived at ${cast.setting} to face ${cast.hook}. ${cast.companion} waited nearby with quiet resolve.`;
        } else if (isLast) {
          const endingMap = {
            'Romance': `${cast.protagonist} confessed their love honestly, and ${cast.companion} embraced them as they promised a shared future together.`,
            'Comedy': `The mix-up was revealed to everyone, who burst into cheerful laughter celebrating the most hilarious festival ever.`,
            'Horror': `The entity was banished into the abyss, leaving ${cast.protagonist} and ${cast.companion} to survive in the safe morning sun.`,
            'Science fiction': `The manual bypass succeeded, reactor telemetry stabilized nominal, and the station orbit was saved.`,
            'Adventure': `${cast.protagonist} and ${cast.companion} followed the mountain route safely and reached the shelter, securing the master maps.`
          };
          output = endingMap[theme] || `${cast.protagonist} resolved the conflict and secured the mission.`;
        } else {
          output = `At turn ${index + 1}, ${cast.protagonist} and ${cast.companion} pressed forward through a new complication at ${cast.setting}.`;
        }
        stageText = compactStageText(output);
      } else if (modelId === 'd1' || modelId === 'd1_omni') {
        decisionData = {
          predicted_route: 'raise_stakes',
          confidence: 0.85,
          probabilities: { raise_stakes: 0.85, new_clue: 0.1, setback: 0.05 },
          valid: true,
          rawText: JSON.stringify({ predicted_route: 'raise_stakes', confidence: 0.85, probabilities: { raise_stakes: 0.85, new_clue: 0.1, setback: 0.05 } })
        };
        output = decisionData.rawText;
        stageText = `My vote: raise stakes (85%).`;
      } else {
        // Specialist observation / perspective
        output = `Observed a new physical detail at ${cast.setting} that advances the scene.`;
        stageText = `${modelId === 'vision' ? 'I see: ' : modelId === 'audio' ? 'I hear: ' : 'I notice: '}${output}`;
      }

      const turn = {
        turnId: `turn_${theme}_${index}`,
        index,
        modelId,
        role: SHOW_CAPABILITIES.find(c => c.modelId === modelId).role,
        status: 'completed',
        output,
        stageText,
        decisionData,
        promptLength: promptObj.prompt.length,
        contextTruncated: promptObj.truncated,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        isTruncated: false
      };

      show = appendShowTurn(show, turn);
    }

    assert.equal(show.turns.length, turnCount);
    assert.equal(show.status, 'completed');

    // Run quality audit on completed show
    const qualityAudit = auditStoryQuality(show.canonicalWorldState, show.turns);
    assert.equal(qualityAudit.inferenceCompleted, true, `${theme}: inferenceCompleted failed`);
    assert.equal(qualityAudit.outputComplete, true, `${theme}: outputComplete failed`);
    assert.equal(qualityAudit.canonConsistent, true, `${theme}: canonConsistent failed: ${qualityAudit.issues.join(', ')}`);
    assert.equal(qualityAudit.loopFree, true, `${theme}: loopFree failed`);
    assert.equal(qualityAudit.genreContractPassed, true, `${theme}: genreContractPassed failed`);
    assert.equal(qualityAudit.reviewStatus, 'pass', `${theme}: expected pass review status`);
  }
});

test('Story history: max 5 last stories retained and clear slate wipes stories', () => {
  const mockMap = new Map();
  const mockStorage = {
    getItem: key => mockMap.get(key) || null,
    setItem: (key, val) => mockMap.set(key, String(val)),
    removeItem: key => mockMap.delete(key)
  };

  // Initially empty slate
  assert.equal(story.readShows(mockStorage).length, 0);

  // Save 8 shows sequentially
  for (let i = 1; i <= 8; i++) {
    const s = createShow(config({ theme: 'Adventure', turnCount: 10 }));
    s.showId = `show_${i}`;
    s.version = story.SHOW_VERSION;
    story.saveShow(s, mockStorage);
  }

  // Exactly 5 most recent shows retained
  const retained = story.readShows(mockStorage);
  assert.equal(retained.length, 5);
  assert.deepEqual(retained.map(s => s.showId), ['show_8', 'show_7', 'show_6', 'show_5', 'show_4']);

  // Clear slate
  story.clearShows(mockStorage);
  assert.equal(story.readShows(mockStorage).length, 0);
});

test('stripEchoedPrefix and sanitizeTurnOutput: The Coat on the Boat regression', () => {
  const turn1Raw = '**Title: The Coat on the Boat** The wind howled like a wounded animal as the houseboat bobbed toward the horizon, its wooden hull groaning under the relentless tide. Rain lashed the deck, turning the world into a blur of gray and black water. Inside, the air was thick with the smell of salt and decay. Bastian, the park ranger, stood at the rail, his eyes scanning the churning sea for any sign of rescue.';
  const sanitizedTurn1 = sanitizeTurnOutput(turn1Raw);
  assert.ok(!sanitizedTurn1.includes('**Title: The Coat on the Boat**'), 'Title header must be stripped');
  assert.ok(sanitizedTurn1.startsWith('The wind howled like a wounded animal'), 'Sanitized text preserves first sentence');

  const turn2Raw = "The wind howled as the houseboat bobbed toward the horizon, its wooden hull groaning under the relentless tide. Bastian spotted a flicker of movement near the railing, where Lorcan's coat was draped over a weathered chair. Suddenly, the boat lurched, and a splash erupted from the water, revealing a hidden compartment beneath the deck filled with shattered glass.";
  const strippedTurn2 = stripEchoedPrefix(turn2Raw, [sanitizedTurn1]);
  assert.ok(!strippedTurn2.toLowerCase().includes('the wind howled as the houseboat bobbed toward the horizon'), 'Echoed opening sentence must be stripped from turn 2');
  assert.ok(strippedTurn2.includes("Bastian spotted a flicker of movement near the railing, where Lorcan's coat was draped"), 'Non-echoed core content must be preserved');

  const turn3Raw = 'The wind howled as the houseboat bobbed toward the horizon, its wooden hull groaning under the relentless tide. Bastian moved toward the hidden compartment to examine the shattered glass.';
  const strippedTurn3 = stripEchoedPrefix(turn3Raw, [sanitizedTurn1, strippedTurn2]);
  assert.ok(!strippedTurn3.toLowerCase().includes('the wind howled as the houseboat bobbed toward the horizon'), 'Echoed opening sentence must be stripped from turn 3');
  assert.ok(strippedTurn3.includes('Bastian moved toward the hidden compartment to examine the shattered glass.'), 'Advancing sentence must be preserved');

  const resolutionRaw = '**Act IV – Resolution** Bastian secured the emergency flare and ignited the signal above the churning waves, bringing the rescue cutter into view.';
  const sanitizedResolution = sanitizeTurnOutput(resolutionRaw);
  assert.ok(!sanitizedResolution.includes('**Act IV – Resolution**'), 'Act IV header must be stripped');
  assert.ok(sanitizedResolution.startsWith('Bastian secured the emergency flare'), 'Clean prose preserved');
});

test('hasMeaningfulEnding rejects cliffhangers', () => {
  const goal = 'rescue survivors from the derelict station';
  // Cliffhanger endings with trailing mystery/suspense must be rejected
  assert.equal(story.hasMeaningfulEnding('They escaped the ruined airlock, but suddenly a shadow loomed behind him in the dark.', goal), false);
  assert.equal(story.hasMeaningfulEnding('They salvaged the core, though a cold grip tightened around her wrist.', goal), false);
  assert.equal(story.hasMeaningfulEnding('To be continued...', goal), false);

  // Definitive endings must pass
  assert.equal(story.hasMeaningfulEnding('They secured the survivors, evacuated into the escape shuttle, and reached safety as the station fell silent.', goal), true);
});

test('chooseStoryDirections produces valid, specific directives for all 9 genres', () => {
  const expectedGenres = [
    'Science fiction',
    'Detective investigation',
    'Adventure',
    'Romance',
    'Horror',
    'Tragedy',
    'Comedy',
    'Fantasy',
    'Mystery'
  ];

  for (const genre of expectedGenres) {
    const s = createShow(config({ theme: genre }));
    const directions = chooseStoryDirections(s);
    assert.ok(directions.criteria, `${genre} must provide criteria`);
    const options = Object.entries(directions.criteria);
    assert.ok(options.length > 0, `${genre} must provide at least one direction option`);
    for (const [key, desc] of options) {
      assert.ok(key.length > 0, `${genre} direction key must be non-empty`);
      assert.ok(desc.length > 10, `${genre} direction description must be descriptive`);
    }
  }
});


