import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import ts from 'typescript';

const cacheDir = path.resolve('node_modules/.cache/tests-v3');
mkdirSync(cacheDir, { recursive: true });

// Compile TypeScript files for ESM import
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
  appendShowTurn,
  sanitizeTurnOutput,
  isCommittedShowTurn,
  hasMeaningfulEnding,
  detectNarrativeStagnation,
  validateOpeningQuality,
  validateClimaxTurn,
  detectPromptLeakage,
  auditStoryQuality,
  chooseStoryCast,
  generateFreshPremise,
  chooseStoryDirections,
  presentStoryDirection,
  STORY_THEMES,
  showBeat
} = story;

console.log('=== PRISMLAB STORY MODE V3.1: MULTI-GENRE NARRATIVE SIMULATION ===\n');

let totalPassed = 0;

for (const theme of STORY_THEMES) {
  process.stdout.write(`Testing genre: [${theme}] ... `);
  const cast = chooseStoryCast(theme);
  const premise = generateFreshPremise(theme, cast);

  const show = createShow({
    ...DEFAULT_SHOW_CONFIG,
    theme,
    turnCount: 9,
    cast,
    opening: premise,
    modelIds: ['text', 'vision', 'audio', 'omni', 'd1', 'd1_omni']
  });

  const allSix = ['text', 'vision', 'audio', 'omni', 'd1', 'd1_omni'];
  for (const m of allSix) {
    assert.ok(show.turnOrder.includes(m), `${theme}: Must schedule ${m}`);
  }

  // Generate simulated high-quality narrative turns respecting genre contract
  const p = cast.protagonist;
  const c = cast.companion;
  const loc = cast.setting || 'the scene';

  let openingProse = '';
  let climaxProse = '';
  let endingProse = '';

  if (theme === 'Detective investigation') {
    openingProse = `${p} arrived at ${loc}, urgently tasked with solving the case of the vanished ledger before dawn. If ${p} failed to find the missing evidence before the inspector closed the docks, an innocent witness would take the blame.`;
    climaxProse = `${p} confronted the masked courier at the river edge, lunging forward to seize the hidden dispatch case. With a decisive strike, ${p} wrenched the ledger free just as the ship slipped its moorings.`;
    endingProse = `${p} unmasked the corrupt harbor master as the culprit, presenting the forged ledger and matching wax seals as conclusive evidence that proved the conspiracy and closed the investigation in safety until morning.`;
  } else if (theme === 'Comedy') {
    openingProse = `${p} rushed into ${loc} with a ridiculous objective: bake a grand three-tier celebration cake before the feast began. With ${c} dropping the powdered sugar everywhere, disaster loomed with every ticking minute.`;
    climaxProse = `${p} leaped across the slippery kitchen tiles and caught the teetering chocolate tier before it hit the floor, slipping into a barrel of dough with a loud squish.`;
    endingProse = `The guests erupted into roaring laughter as ${p} emerged covered in flour, amused by the absurd spectacle as the hilarious banquet turned into the funniest celebration of the year.`;
  } else if (theme === 'Tragedy') {
    openingProse = `${p} stood on the battlements of ${loc}, knowing the fortress could not withstand the siege without a grave sacrifice. With ${c} pleading to retreat, ${p} had to choose between personal survival and saving the city.`;
    climaxProse = `${p} stepped forward and severed the chains of the inner gate, confronting the advancing vanguard alone to seal the citadel courtyard.`;
    endingProse = `${p} accepted the ultimate sacrifice with quiet dignity, paying the irreversible cost to ensure the people survived, leaving the city in solemn mourning and eternal memory.`;
  } else if (theme === 'Horror') {
    openingProse = `${p} entered the decaying halls of ${loc}, desperate to locate the lost expedition before the shadows consumed them all. A terrifying dread pulsed through the walls, warning that anyone remaining after midnight would never return.`;
    climaxProse = `${p} confronted the crawling entity at the threshold, smashing the antique silver lantern to unleash a wall of blinding flame across the chamber.`;
    endingProse = `${p} escaped into the cold mountain air just as the first rays of dawn banished the nightmare, finding relief and survival as the ruined abbey collapsed into eternal silence.`;
  } else if (theme === 'Romance') {
    openingProse = `${p} met ${c} under the lanterns of ${loc}, determined to speak the truth before the evening train departed forever. If pride kept them silent tonight, their bond would be lost to years of regret.`;
    climaxProse = `${p} stepped forward through the crowd and caught ${c}'s hand, confessing the secret feelings that had lingered unspoken through all their travels.`;
    endingProse = `${c} embraced ${p} with tears of joy, forgiving past misunderstandings as they promised to face the future together in lasting devotion and peace.`;
  } else if (theme === 'Mystery') {
    openingProse = `${p} examined the sealed archives at ${loc}, determined to unravel the riddle of the missing charter before sunrise. If the ancient question remained unsolved, the estate would fall to the rival syndicate.`;
    climaxProse = `${p} uncovered the concealed compartment beneath the bronze dial, forcing the clockwork mechanism to spring open with a decisive click.`;
    endingProse = `${p} revealed the true charter and solved the central riddle, proving the historic secret and bringing clarity and justice to the rightful heirs.`;
  } else if (theme === 'Fantasy') {
    openingProse = `${p} climbed the winding tower at ${loc}, seeking the lost runestone to break the mountain curse before the eclipse struck. If magic failed before nightfall, the stone kingdom would crumble to dust.`;
    climaxProse = `${p} confronted the raging elemental at the crystal altar, channeling the ancient binding word with a decisive surge of raw power.`;
    endingProse = `The dark spell shattered into shimmering embers as the curse was lifted, restoring peaceful balance and healing the ancient kingdom under the glowing dawn.`;
  } else if (theme === 'Science fiction') {
    openingProse = `${p} boarded the damaged telemetry hub at ${loc}, racing to calibrate the cooling relays before the core breached containment. An orbital collision was imminent unless the primary reactor was stabilized within ten minutes.`;
    climaxProse = `${p} pushed through the searing steam corridor and manually locked the coolant override valve, cutting power to the runaway turbine with an irreversible command.`;
    endingProse = `Telemetry signals returned to nominal and the station reactor was successfully stabilized, securing the mission crew in complete safety as orbital communications reconnected.`;
  } else if (theme === 'Adventure') {
    openingProse = `${p} led the expedition toward ${loc}, determined to cross the stormy canyon and reach the high plateau shelter before nightfall. With supplies running low, failure to find shelter would leave them stranded in the blizzard.`;
    climaxProse = `${p} anchored the safety lifeline across the raging river torrent and leaped to the far bank, hauling ${c} through the freezing spray to safety.`;
    endingProse = `${p} and ${c} finally arrived at the high plateau shelter just as the blizzard struck, having crossed the gorge in triumph and secured the expedition until dawn.`;
  }

  // 1. Verify Opening Quality Gate
  const openCheck = validateOpeningQuality(openingProse, cast, theme);
  assert.equal(openCheck.valid, true, `${theme}: Opening must satisfy quality gate`);

  // 2. Verify Climax Turning Point Gate
  const climCheck = validateClimaxTurn(climaxProse, show.canonicalWorldState?.directorPlan?.climaxObjective, theme);
  assert.equal(climCheck.valid, true, `${theme}: Climax must satisfy turning point gate`);

  // 3. Verify Genre Ending Gate
  const endCheck = hasMeaningfulEnding(endingProse, show.canonicalWorldState?.narrativeGoal || premise, theme);
  assert.equal(endCheck, true, `${theme}: Ending must satisfy genre contract`);

  // 4. Verify Director Directions Grounding
  const directions = chooseStoryDirections(show);
  const keys = Object.keys(directions.criteria);
  assert.equal(keys.length, 3, `${theme}: Director must provide 3 candidates`);
  for (const k of keys) {
    const desc = directions.criteria[k];
    assert.ok(!desc.includes('openThread'), `${theme}: Direction must not leak variable openThread`);
    assert.ok(!desc.includes('the latest accepted contribution'), `${theme}: Direction must not leak fallback text`);
  }

  // 5. Verify Director Presenter Voice
  const d1Voice = presentStoryDirection('d1', { predicted_route: 'character_choice', confidence: 0.9, probabilities: { character_choice: 0.9 }, valid: true, rawText: '' }, directions.criteria);
  assert.ok(d1Voice?.startsWith('Prism Thinker directs the tactical priority:'), `${theme}: d1 must speak in Prism Thinker persona`);
  assert.ok(!detectPromptLeakage(d1Voice).leaked, `${theme}: d1 voice must be free of prompt leakage`);

  const d1OmniVoice = presentStoryDirection('d1_omni', { predicted_route: 'causal_development', confidence: 0.85, probabilities: { causal_development: 0.85 }, valid: true, rawText: '' }, directions.criteria);
  assert.ok(d1OmniVoice?.startsWith('Sherlock Omni synthesizes the threads and directs the next turn:'), `${theme}: d1_omni must speak in Sherlock Omni persona`);
  assert.ok(!detectPromptLeakage(d1OmniVoice).leaked, `${theme}: d1_omni voice must be free of prompt leakage`);

  // 6. Simulate the full 9-turn show
  let currentShow = show;
  const turns = [];

  for (let turnIdx = 0; turnIdx < currentShow.turnOrder.length; turnIdx++) {
    const modelId = currentShow.turnOrder[turnIdx];
    const beat = showBeat(currentShow, turnIdx);
    let output = '';
    let stageText = '';

    if (beat === 'opening') {
      output = openingProse;
      stageText = openingProse;
    } else if (beat === 'climax') {
      output = climaxProse;
      stageText = climaxProse;
    } else if (beat === 'ending') {
      output = endingProse;
      stageText = endingProse;
    } else if (modelId === 'text') {
      const devSteps = [
        `${p} and ${c} uncovered a secret passage behind the wall at ${loc}, moving forward to inspect the signs.`,
        `${p} discovered an ancient iron mechanism beside the door and pulled the lever to reveal the inner path.`,
        `${p} advanced past the stone archway into the darkened corridor, searching for the central chamber.`,
        `${p} located the hidden vault beneath the floor stones, preparing for the decisive confrontation.`
      ];
      output = devSteps[turnIdx % devSteps.length];
      stageText = output;
    } else if (modelId === 'vision') {
      output = `A tarnished brass inscription is visible on the doorway frame at ${loc}.`;
      stageText = `I see: ${output}`;
    } else if (modelId === 'audio') {
      output = `Faint rhythmic tapping echoes from beyond the iron partition.`;
      stageText = `I hear: ${output}`;
    } else if (modelId === 'omni') {
      output = `The scraping sounds align with the fresh scratch marks along the floor threshold.`;
      stageText = `I notice: ${output}`;
    } else if (modelId === 'd1') {
      output = JSON.stringify({ predicted_route: 'character_choice', confidence: 0.88, probabilities: { character_choice: 0.88, causal_development: 0.08, genre_payoff: 0.04 } });
      stageText = d1Voice;
    } else if (modelId === 'd1_omni') {
      output = JSON.stringify({ predicted_route: 'causal_development', confidence: 0.85, probabilities: { character_choice: 0.1, causal_development: 0.85, genre_payoff: 0.05 } });
      stageText = d1OmniVoice;
    }

    const cleanOutput = sanitizeTurnOutput(output);
    assert.ok(!detectPromptLeakage(cleanOutput).leaked, `${theme} Turn ${turnIdx + 1}: Output must be free of prompt leakage`);

    const turnRecord = {
      turnId: `t${turnIdx + 1}`,
      index: turnIdx,
      modelId,
      role: modelId === 'text' ? 'writer' : modelId.startsWith('d1') ? 'decision_assistant' : 'visual_interpreter',
      status: 'completed',
      output: cleanOutput,
      stageText: stageText || cleanOutput,
      isRelevant: true,
      decisionData: modelId.startsWith('d1') ? { predicted_route: 'character_choice', confidence: 0.88, probabilities: { character_choice: 0.88 }, valid: true, rawText: output } : undefined,
      promptLength: 200,
      contextTruncated: false,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString()
    };

    assert.equal(isCommittedShowTurn(turnRecord), true, `${theme} Turn ${turnIdx + 1}: Must be valid committed turn`);
    turns.push(turnRecord);
    currentShow = appendShowTurn(currentShow, turnRecord);
  }

  // 7. Verify Narrative Stagnation is 0
  for (let i = 2; i < turns.length; i++) {
    if (turns[i].modelId === 'text') {
      const stag = detectNarrativeStagnation(turns[i].output, 'text', turns.slice(0, i));
      assert.equal(stag.hasStagnation, false, `${theme} Turn ${i + 1}: Stagnation must not be detected in valid story`);
    }
  }

  // 8. Quality Audit Result
  const audit = auditStoryQuality(currentShow.canonicalWorldState, turns);
  assert.equal(audit.inferenceCompleted, true, `${theme}: All inferences must be complete`);
  assert.equal(audit.outputComplete, true, `${theme}: Outputs must be complete`);
  assert.equal(audit.loopFree, true, `${theme}: Story must be loop-free`);
  assert.equal(audit.genreContractPassed, true, `${theme}: Genre contract must be passed`);
  assert.equal(audit.reviewStatus, 'pass', `${theme}: Final audit reviewStatus must be 'pass'`);

  totalPassed++;
  console.log('PASSED (8/8 quality checks passed)');
}

console.log(`\n======================================================`);
console.log(`ALL ${totalPassed}/9 GENRES SUCCESSFULLY SIMULATED & PASSED QUALITY AUDIT!`);
console.log(`======================================================\n`);
