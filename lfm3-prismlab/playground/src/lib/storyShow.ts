import type { CanonicalModelId } from '../data/models.ts';
import type { LiveTask } from './api.ts';
import {
  initializeCanonicalWorldState,
  extractProposedEvents,
  validateProposedEvents,
  applyEventsToWorldState,
  auditStoryContinuity,
  isTruncatedOutput,
  hasMeaningfulEnding,
  detectNarrativeLoop,
  auditStoryQuality,
  type CanonicalWorldState,
  type NarrativeEvent,
  type ContinuityAuditResult,
  type StoryQualityAuditResult,
  type CharacterStatus,
  type CharacterState,
  type EntityState,
  type StoryConflict
} from './canonicalWorldState.ts';
import {
  createStoryDirectorPlan,
  type StoryDirectorPlan,
  type StoryDirectorBeat,
  type StoryEndingType
} from './storyDirector.ts';

export {
  initializeCanonicalWorldState,
  extractProposedEvents,
  validateProposedEvents,
  applyEventsToWorldState,
  auditStoryContinuity,
  isTruncatedOutput,
  hasMeaningfulEnding,
  detectNarrativeLoop,
  auditStoryQuality,
  createStoryDirectorPlan,
  type CanonicalWorldState,
  type NarrativeEvent,
  type ContinuityAuditResult,
  type StoryQualityAuditResult,
  type CharacterStatus,
  type CharacterState,
  type EntityState,
  type StoryConflict,
  type StoryDirectorPlan,
  type StoryDirectorBeat,
  type StoryEndingType
};

export const SHOW_STORAGE_KEY = 'prismlab_auto_story_shows_v1';
export const OPENING_MEMORY_KEY = 'prismlab_story_opening_memory_v1';
export const SHOW_VERSION = 's3b.2';
export type ShowPhase = 'idle' | 'configuring' | 'preparing' | 'loading_model' | 'requesting' | 'awaiting_result' | 'presenting_turn' | 'paused' | 'paused_rate_limit' | 'waiting_for_queue' | 'resuming' | 'completed' | 'failed' | 'stopped';
export type ShowRole = 'writer' | 'visual_interpreter' | 'audio_interpreter' | 'multimodal_interpreter' | 'decision_assistant';
export interface ShowCapability {
  modelId: CanonicalModelId;
  role: ShowRole;
  title: string;
  task: LiveTask;
  media: ('image' | 'audio')[];
  narrativeWriter: boolean;
  outputContract: string;
  limitation: string;
}

export const SHOW_CAPABILITIES: readonly ShowCapability[] = [
  { modelId:'text', role:'writer', title:'Story Writer', task:'chat', media:[], narrativeWriter:true, outputContract:'Generated narrative text', limitation:'Only verified narrative writer. Local text prompt ≤1,000 characters.' },
  { modelId:'vision', role:'visual_interpreter', title:'Visual Interpreter', task:'chat', media:['image'], narrativeWriter:false, outputContract:'Text observation of the scenario evidence image', limitation:'Scenario image required. Observation is factual context, not a narrative chapter.' },
  { modelId:'audio', role:'audio_interpreter', title:'Audio Interpreter', task:'audio_qa', media:['audio'], narrativeWriter:false, outputContract:'Text finding grounded in scenario evidence audio', limitation:'Scenario audio required. Findings describe acoustic events, not story prose.' },
  { modelId:'omni', role:'multimodal_interpreter', title:'Multimodal Interpreter', task:'chat', media:['image','audio'], narrativeWriter:false, outputContract:'Text synthesis from scenario image and audio', limitation:'Both scenario media inputs required; factual synthesis only.' },
  { modelId:'d1', role:'decision_assistant', title:'Text Triage', task:'decision', media:[], narrativeWriter:false, outputContract:'Structured incident-report classification', limitation:'Classifies a story-related service report using its real taxonomy; not a story writer.' },
  { modelId:'d1_omni', role:'decision_assistant', title:'Multimodal Decision Assistant', task:'decision', media:['image','audio'], narrativeWriter:false, outputContract:'Structured task-route decision JSON', limitation:'Multimodal triage classification; no narrative prose.' },
];

export const STORY_THEMES = [
  'Detective investigation', 'Comedy', 'Tragedy', 'Horror', 'Romance', 'Mystery', 'Fantasy', 'Science fiction', 'Adventure'
] as const;

export interface GenreContract {
  id: string;
  displayName: string;
  premiseRequirements: string;
  relationships: string;
  motivationsAndStakes: string;
  allowedSecondaryGenres: string[];
  centralConflict: string;
  acts: [string, string, string, string];
  requiredDevelopments: string;
  toneAndPacing: string;
  endingRequirements: string;
  coherenceChecks: string[];
  signals: string[];
}

export const GENRE_CONTRACT_VERSION = 's3b.3';
export const GENRE_CONTRACTS: Record<string, GenreContract> = {
  'Detective investigation': { id:'detective', displayName:'Detective investigation', premiseRequirements:'A specific incident, investigator, place and unanswered question.', relationships:'Investigator, witness and possible suspect must remain distinct.', motivationsAndStakes:'The investigator wants a supported answer; someone is affected by the incident.', allowedSecondaryGenres:['Mystery','Tragedy'], centralConflict:'Explain an incident using clues rather than guesses.', acts:['Establish the incident and investigator.','Test clues and accounts.','Confront a contradiction or suspect.','Give a clue-supported explanation.'], requiredDevelopments:'A clue changes the investigation.', toneAndPacing:'Clear, curious and grounded.', endingRequirements:'Resolve the incident with an established clue or name the remaining uncertainty.', coherenceChecks:['clue continuity','supported reveal'], signals:['detective','investigator','clue','evidence','witness','case','suspect','footprint','alibi'] },
  'Comedy': { id:'comedy', displayName:'Comedy', premiseRequirements:'A person, ordinary goal and funny complication.', relationships:'Reactions and misunderstandings between established people matter.', motivationsAndStakes:'A small but concrete goal becomes awkward; the cost is embarrassment or a harmless setback.', allowedSecondaryGenres:['Romance','Adventure'], centralConflict:'A comic mistake or mismatch keeps disrupting the goal.', acts:['Set up the goal and comic mismatch.','Escalate through a new consequence.','Force a surprising choice.','Pay off the mistake with a changed outcome.'], requiredDevelopments:'The joke causes a new consequence, not another telling of the same joke.', toneAndPacing:'Light, quick and simple.', endingRequirements:'Pay off the established comic situation or resolve the goal with a clear funny consequence.', coherenceChecks:['comic payoff','escalation'], signals:['laugh','funny','awkward','mistake','mix-up','joke','silly','ridiculous','embarrass'] },
  'Tragedy': { id:'tragedy', displayName:'Tragedy', premiseRequirements:'A valued relationship or goal threatened by a difficult choice.', relationships:'Show who matters to whom and why.', motivationsAndStakes:'A person tries to protect something important but risks a meaningful loss.', allowedSecondaryGenres:['Romance','Mystery'], centralConflict:'A choice or flaw creates an irreversible cost.', acts:['Establish what may be lost.','Increase the cost of a choice.','Force the decisive sacrifice or loss.','Show the human consequence.'], requiredDevelopments:'A choice raises the cost and changes a relationship.', toneAndPacing:'Sincere, restrained and consequential.', endingRequirements:'Acknowledge the cost and its effect; avoid an unearned reset.', coherenceChecks:['consequence continuity','earned loss'], signals:['loss','lost','sacrifice','grief','regret','farewell','cost','died','death','mourning'] },
  'Horror': { id:'horror', displayName:'Horror', premiseRequirements:'A person, unsafe place and specific source of dread.', relationships:'Established people respond differently to danger.', motivationsAndStakes:'The person wants safety or truth while danger closes in.', allowedSecondaryGenres:['Mystery','Science fiction'], centralConflict:'A threat grows clearer and forces survival choices.', acts:['Establish danger and vulnerability.','Reveal a new sign or consequence.','Force confrontation or escape.','Show survival, loss or a coherent lingering threat.'], requiredDevelopments:'A new sign of danger changes the available choices.', toneAndPacing:'Tense, concrete and spare.', endingRequirements:'Show the outcome of the threat and the protagonist’s choice.', coherenceChecks:['threat continuity','place continuity'], signals:['fear','danger','shadow','scream','terror','threat','blood','monster','haunt','dread'] },
  'Romance': { id:'romance', displayName:'Romance', premiseRequirements:'Two people with a meaningful connection and an emotional obstacle.', relationships:'The central relationship must change on the page.', motivationsAndStakes:'Each person wants closeness or trust but risks rejection or hurt.', allowedSecondaryGenres:['Comedy','Tragedy','Science fiction'], centralConflict:'A misunderstanding, value clash or fear strains the relationship.', acts:['Introduce both people and the attraction or bond.','Deepen trust while complicating it.','Force an honest emotional choice.','Address the conflict and show the relationship’s outcome.'], requiredDevelopments:'A meaningful exchange changes trust or closeness.', toneAndPacing:'Warm, personal and emotionally clear.', endingRequirements:'Address the emotional obstacle and show whether the relationship changes.', coherenceChecks:['two-person continuity','emotional resolution'], signals:['love','heart','kiss','trust','feel','together','date','affection','relationship','confess'] },
  'Mystery': { id:'mystery', displayName:'Mystery', premiseRequirements:'An unanswered question and a person who wants to solve it.', relationships:'Different accounts or interests affect the question.', motivationsAndStakes:'Finding the answer matters to at least one established person.', allowedSecondaryGenres:['Detective investigation','Horror','Fantasy'], centralConflict:'Clues appear to conflict until an explanation emerges.', acts:['Pose a clear question.','Find and compare clues.','Test a key explanation.','Reveal a supported answer or deliberate uncertainty.'], requiredDevelopments:'A clue narrows or changes the possible answer.', toneAndPacing:'Curious, precise and suspenseful.', endingRequirements:'Answer the main question with existing clues or clearly explain what remains unknown.', coherenceChecks:['question continuity','clue-supported reveal'], signals:['mystery','clue','secret','question','missing','disappear','discover','reveal','answer','trace'] },
  'Fantasy': { id:'fantasy', displayName:'Fantasy', premiseRequirements:'A magical world or rule, a person and a goal affected by it.', relationships:'Allies or rivals respond to the same magical rules.', motivationsAndStakes:'The goal has personal stakes and magic has a cost or limit.', allowedSecondaryGenres:['Adventure','Mystery','Romance'], centralConflict:'A magical obstacle or discovery tests a clear goal.', acts:['Establish the magical rule and goal.','Discover a limit or consequence.','Choose how to use or resist magic.','Resolve the goal within the established rules.'], requiredDevelopments:'Magic changes the goal and has a consequence.', toneAndPacing:'Wonder with clear, simple rules.', endingRequirements:'Resolve the magical conflict without inventing a new power at the end.', coherenceChecks:['magic-rule continuity','consequential magic'], signals:['magic','spell','witch','wizard','dragon','enchanted','charm','curse','kingdom','wand'] },
  'Science fiction': { id:'science_fiction', displayName:'Science fiction', premiseRequirements:'A speculative technology or setting, a person and a concrete problem.', relationships:'People disagree or cooperate around the speculative problem.', motivationsAndStakes:'A technological choice affects people or a mission.', allowedSecondaryGenres:['Adventure','Mystery','Romance'], centralConflict:'A technical or speculative obstacle blocks a clear objective.', acts:['Establish the technology and objective.','Reveal a limit or failure.','Make a consequential technical choice.','Resolve the objective within the established world.'], requiredDevelopments:'The speculative element changes what the characters can do.', toneAndPacing:'Concrete and accessible; avoid jargon piles.', endingRequirements:'Show the outcome of the central speculative problem using established capabilities.', coherenceChecks:['technology continuity','objective outcome'], signals:['ship','space','robot','station','planet','signal','engine','future','machine','AI'] },
  'Adventure': { id:'adventure', displayName:'Adventure', premiseRequirements:'A traveler or team, a destination or objective and an obstacle.', relationships:'Companions or rivals affect progress toward the goal.', motivationsAndStakes:'The journey has a clear reward or risk.', allowedSecondaryGenres:['Fantasy','Science fiction','Comedy'], centralConflict:'Obstacles block a physical goal or journey.', acts:['Name the goal and route.','Overcome a new obstacle.','Face the hardest choice or barrier.','Reach or lose the objective with consequences.'], requiredDevelopments:'Travel or action changes progress toward the goal.', toneAndPacing:'Active, clear and forward-moving.', endingRequirements:'Show whether the objective was reached and what changed.', coherenceChecks:['goal continuity','journey progress'], signals:['journey','travel','quest','cross','climb','escape','map','path','treasure','mountain','bridge','gorge','canyon','trail','trek','shelter','route'] }
};

export function getGenreContract(theme: string): GenreContract {
  const contract = GENRE_CONTRACTS[theme];
  if (!contract) throw new Error(`No narrative contract for ${theme}.`);
  return contract;
}

export interface ShowConfig {
  theme: string;
  opening: string;
  turnCount: number;
  modelIds: CanonicalModelId[];
  playback: 'automatic' | 'manual';
  maxTokens: 64 | 96 | 128 | 180 | 256;
  avoidOpenings?: string[];
  scenarioId?: string;
  openingSeed?: number;
  nameInitial?: string;
  cast?: StoryCast;
}

export interface ValidatedDecision {
  predicted_route: string;
  confidence: number;
  probabilities: Record<string, number>;
  valid: boolean;
  rawText: string;
  error?: string;
}

export interface ShowTurn {
  turnId: string;
  index: number;
  modelId: CanonicalModelId;
  role: ShowRole;
  status: 'completed' | 'failed' | 'skipped' | 'rejected';
  requestId?: string;
  route?: string[];
  output?: string;
  stageText?: string;
  stageTextProvenance?: 'raw' | 'template' | 'adaptation';
  rejectionReason?: string;
  evidencePackId?: string;
  mediaIds?: string[];
  storyPerspective?: boolean;
  isRelevant?: boolean;
  decisionData?: ValidatedDecision;
  storyFitPoints?: number;
  error?: string;
  promptLength: number;
  contextTruncated: boolean;
  startedAt: string;
  finishedAt: string;
  latencyS?: number | null;
  genreEvaluation?: GenreEvaluation;
  rawAttempts?: { requestId?: string; output: string; reason: string }[];
  decisionOptions?: Record<string, string>;
  proposedEvents?: NarrativeEvent[];
  acceptedEvents?: NarrativeEvent[];
  continuityIssues?: string[];
  loopIssue?: string;
  isTruncated?: boolean;
  finishReason?: string | null;
  activityReceipt?: string;
}

export interface GenreEvaluation {
  status: 'pass' | 'review';
  issues: string[];
  evidence: string[];
}

export function chooseRandomTurnCount(random = Math.random): number {
  return 10 + Math.floor(Math.min(0.999999999, Math.max(0, random())) * 11);
}

export interface HumanInterjection {
  id: string;
  text: string;
  afterTurn: number;
  createdAt: string;
}

export interface ShowRecord {
  version: typeof SHOW_VERSION;
  showId: string;
  createdAt: string;
  updatedAt: string;
  config: ShowConfig;
  turnOrder: CanonicalModelId[];
  turns: ShowTurn[];
  humanTurns?: HumanInterjection[];
  status: 'active' | 'completed' | 'failed' | 'stopped' | 'paused_rate_limit' | 'parked';
  mode: 'live_local_show' | 'recorded_show';
  canonicalWorldState?: CanonicalWorldState;
  continuityAudit?: ContinuityAuditResult;
  directorPlan?: StoryDirectorPlan;
  storyQualityAudit?: StoryQualityAuditResult;
}

export const DEFAULT_SHOW_CONFIG: ShowConfig = {
  theme: 'Detective investigation',
  opening: '',
  turnCount: 10,
  modelIds: ['text', 'vision', 'audio', 'omni', 'd1', 'd1_omni'],
  playback: 'automatic',
  maxTokens: 180
};

export type NarrativeAct = 'Act I — Beginning' | 'Act II — Discovery' | 'Act III — Confrontation' | 'Act IV — Resolution';

export function getTurnAct(turnIndex: number, totalTurns: number): NarrativeAct {
  const progress = turnIndex / Math.max(1, totalTurns - 1);
  if (progress <= 0.25) return 'Act I — Beginning';
  if (progress <= 0.6) return 'Act II — Discovery';
  if (progress <= 0.85) return 'Act III — Confrontation';
  return 'Act IV — Resolution';
}

export const BEAT_CUES: Record<string, string> = {
  'opening': 'The Story Begins!',
  'development': 'The Plot Thickens',
  'visual clue': 'A Visual Clue Emerges!',
  'audio clue': 'An Audio Clue Detected!',
  'combined observation': 'Clues Converge!',
  'decision analysis': 'Strategic Analysis!',
  'multimodal decision': 'The Critical Deduction!',
  'climax': 'The Climax!',
  'ending': 'The Grand Finale!',
  'support contribution': 'A New Clue Emerges!',
  'creative perspective': 'Another Voice Continues',
  'plot direction': 'A Plot Direction'
};

export function validateShowConfig(config: ShowConfig): string | null {
  if (!STORY_THEMES.includes(config.theme as typeof STORY_THEMES[number])) return 'Choose a supported story theme.';
  if (config.opening.length > 240) return 'Opening sentence must be at most 240 characters.';
  if (!Number.isInteger(config.turnCount) || config.turnCount < 10 || config.turnCount > 20) return 'Choose 10–20 turns for a complete story.';
  if (!config.modelIds.includes('text') || new Set(config.modelIds).size !== config.modelIds.length || config.modelIds.some(id => !SHOW_CAPABILITIES.some(cap => cap.modelId === id))) return 'Prism Pure must write; choose registered participants once each.';
  if (config.modelIds.length - 1 > config.turnCount - 2) return `Choose at least ${config.modelIds.length + 1} turns so all selected characters can participate.`;
  if (!['automatic','manual'].includes(config.playback) || ![64,96,128,180,256].includes(config.maxTokens)) return 'Invalid playback or output limit.';
  return null;
}

export function planShow(config: ShowConfig): CanonicalModelId[] {
  const invalid = validateShowConfig(config); if (invalid) throw new Error(invalid);
  if (['text', 'vision', 'audio', 'omni', 'd1', 'd1_omni'].every(id => config.modelIds.includes(id as CanonicalModelId))) {
    const order: CanonicalModelId[] = ['text', 'vision', 'text', 'audio', 'omni', 'd1', 'text', 'd1_omni', 'text', 'text'];
    const rotating: CanonicalModelId[] = ['vision', 'audio', 'omni', 'd1', 'd1_omni'];
    for (let extra = 0; extra < config.turnCount - 10; extra++) {
      order.splice(order.length - 2, 0, extra % 2 === 0 ? 'text' : rotating[Math.floor(extra / 2) % rotating.length]);
    }
    return order;
  }
  const support = config.modelIds.filter(id => id !== 'text');
  const count = config.turnCount;

  if (support.length === 0) {
    return Array.from({ length: count }, () => 'text' as CanonicalModelId);
  }

  const order: CanonicalModelId[] = ['text'];
  const climaxIdx = Math.max(2, Math.floor(count * 0.75));
  let supportIdx = 0;

  for (let i = 1; i < count - 1; i++) {
    if (i === climaxIdx) {
      order.push('text');
    } else if (supportIdx < support.length) {
      order.push(support[supportIdx++]);
    } else if (order[order.length - 1] !== 'text' && Math.random() < 0.6) {
      order.push('text');
    } else {
      const nextCandidate = support[(supportIdx++) % support.length];
      order.push(order[order.length - 1] === nextCandidate ? 'text' : nextCandidate);
    }
  }

  order.push('text');
  return order;
}

export function showBeat(show: Pick<ShowRecord, 'config' | 'turnOrder'>, index: number): string {
  const modelId = show.turnOrder[index];
  const isFirst = index === 0;
  const isLast = index === show.turnOrder.length - 1;
  const climaxIndex = show.turnOrder.lastIndexOf('text', show.turnOrder.length - 2);

  if (isFirst) return 'opening';
  if (isLast) return 'ending';
  if (modelId === 'text') {
    return index === climaxIndex ? 'climax' : 'development';
  }
  if (!show.config.scenarioId) return modelId === 'd1' || modelId === 'd1_omni' ? 'plot direction' : 'creative perspective';
  if (modelId === 'vision') return 'visual clue';
  if (modelId === 'audio') return 'audio clue';
  if (modelId === 'omni') return 'combined observation';
  if (modelId === 'd1') return 'decision analysis';
  if (modelId === 'd1_omni') return 'multimodal decision';
  return 'support contribution';
}

export function createShow(config: ShowConfig, showId = crypto.randomUUID(), now = new Date().toISOString(), _openingIndex?: number): ShowRecord {
  const effective = {
    ...config,
    opening: config.opening.trim(),
    modelIds: [...config.modelIds]
  };
  const turnOrder = planShow(effective);
  const canonicalWorldState = initializeCanonicalWorldState(effective.theme, effective.opening, effective.cast);
  return {
    canonicalWorldState,
    directorPlan: canonicalWorldState.directorPlan,
    version: SHOW_VERSION,
    showId,
    createdAt: now,
    updatedAt: now,
    config: effective,
    turnOrder,
    turns: [],
    humanTurns: [],
    status: 'active',
    mode: 'live_local_show'
  };
}

export function validateDecisionJson(rawOutput: string, labels: readonly string[] = ['billing', 'technical', 'shipping', 'other']): ValidatedDecision {
  let trimmed = rawOutput.trim();

  // Strip markdown code fence wrappers if present
  if (trimmed.startsWith('```')) {
    trimmed = trimmed.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '').trim();
  }

  // Extract outermost JSON object if enclosed within other text
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      trimmed = trimmed.slice(firstBrace, lastBrace + 1).trim();
    }
  }

  try {
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
      return { predicted_route: 'other', confidence: 0, probabilities: {}, valid: false, rawText: rawOutput, error: 'Output is not complete JSON (missing closing brace or truncated).' };
    }
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const route = parsed.predicted_route;
    if (typeof route !== 'string' || !labels.includes(route)) {
      return { predicted_route: 'other', confidence: 0, probabilities: {}, valid: false, rawText: rawOutput, error: `Invalid or missing predicted_route: ${String(route)}` };
    }
    const confidence = parsed.confidence;
    if (typeof confidence !== 'number' || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) return { predicted_route: route as ValidatedDecision['predicted_route'], confidence: 0, probabilities: {}, valid: false, rawText: rawOutput, error: 'Missing or invalid confidence.' };
    const rawProbs = parsed.probabilities;
    const probabilities: Record<string, number> = {};
    if (!rawProbs || typeof rawProbs !== 'object' || Array.isArray(rawProbs)) return { predicted_route: route as ValidatedDecision['predicted_route'], confidence, probabilities, valid: false, rawText: rawOutput, error: 'Missing probabilities object.' };
    for (const label of labels) {
      const value = (rawProbs as Record<string, unknown>)[label];
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) return { predicted_route: route as ValidatedDecision['predicted_route'], confidence, probabilities, valid: false, rawText: rawOutput, error: `Missing or invalid probability: ${label}.` };
      probabilities[label] = value;
    }
    if (Math.abs(Object.values(probabilities).reduce((sum, value) => sum + value, 0) - 1) > 0.05) return { predicted_route: route as ValidatedDecision['predicted_route'], confidence, probabilities, valid: false, rawText: rawOutput, error: 'Probabilities do not sum to approximately one.' };
    return {
      predicted_route: route as ValidatedDecision['predicted_route'],
      confidence,
      probabilities,
      valid: true,
      rawText: rawOutput
    };
  } catch (e) {
    return {
      predicted_route: 'other',
      confidence: 0,
      probabilities: {},
      valid: false,
      rawText: rawOutput,
      error: `JSON parsing failed: ${e instanceof Error ? e.message : 'Malformed JSON'}`
    };
  }
}

/**
 * Robust recovery for decision model votes that were truncated,
 * enclosed in commentary, or slightly malformed in closing braces.
 */
export function recoverDecisionData(rawOutput: string, labels: readonly string[] = ['billing', 'technical', 'shipping', 'other']): ValidatedDecision | null {
  if (!rawOutput || !labels.length) return null;

  // 1. Direct validation attempt
  const direct = validateDecisionJson(rawOutput, labels);
  if (direct.valid) return direct;

  let text = rawOutput.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '').trim();
  }

  // 2. Try closing unclosed braces
  const firstBrace = text.indexOf('{');
  if (firstBrace !== -1) {
    let candidate = text.slice(firstBrace).trim();
    candidate = candidate.replace(/,\s*$/, '');
    const opens = (candidate.match(/\{/g) || []).length;
    const closes = (candidate.match(/\}/g) || []).length;
    if (opens > closes) {
      const patched = candidate + '}'.repeat(opens - closes);
      const patchedCheck = validateDecisionJson(patched, labels);
      if (patchedCheck.valid) return patchedCheck;
    }
  }

  // 3. Regex extraction for predicted_route / choice
  let foundRoute: string | undefined;
  const routeMatch = text.match(/"(?:predicted_route|route|choice)"\s*:\s*"([^"]+)"/i);
  if (routeMatch && labels.includes(routeMatch[1])) {
    foundRoute = routeMatch[1];
  } else {
    for (const label of labels) {
      if (new RegExp(`"\\b${label}\\b"`, 'i').test(text) || new RegExp(`\\b${label}\\b`, 'i').test(text)) {
        foundRoute = label;
        break;
      }
    }
  }

  if (!foundRoute) return null;

  // Extract confidence if present
  let confidence = 0.7;
  const confMatch = text.match(/"confidence"\s*:\s*([0-9]*\.?[0-9]+)/i);
  if (confMatch) {
    const val = parseFloat(confMatch[1]);
    if (Number.isFinite(val) && val >= 0 && val <= 1) {
      confidence = Math.round(val * 100) / 100;
    }
  }

  // Synthesize normalized probabilities
  const remaining = Math.max(0, 1 - confidence);
  const otherCount = Math.max(1, labels.length - 1);
  const otherShare = Math.round((remaining / otherCount) * 100) / 100;
  const probabilities: Record<string, number> = {};

  let sum = 0;
  for (const label of labels) {
    if (label === foundRoute) {
      probabilities[label] = confidence;
    } else {
      probabilities[label] = otherShare;
    }
    sum += probabilities[label];
  }
  if (sum !== 1 && labels.length > 0) {
    const diff = 1 - sum;
    probabilities[foundRoute] = Math.max(0, Math.min(1, Math.round((confidence + diff) * 100) / 100));
  }

  return {
    predicted_route: foundRoute,
    confidence: probabilities[foundRoute] ?? confidence,
    probabilities,
    valid: true,
    rawText: rawOutput
  };
}

export function presentDecisionOutput(output: string, _theme = ''): string | null {
  const decision = validateDecisionJson(output);
  if (!decision.valid) return null;
  const scores = Object.entries(decision.probabilities).sort((a, b) => b[1] - a[1]).map(([label, score]) => `${label} ${Math.round(score * 100)}%`).join(' · ');
  return `Investigation route: ${decision.predicted_route} (${Math.round(decision.confidence * 100)}%). ${scores}.`;
}

export function formatStageDialogue(modelId: CanonicalModelId, rawOutput: string, _theme: string, storyPerspective = false, decisionLabels?: readonly string[]): { stageText: string; provenance: 'template' | 'raw' | 'adaptation' } {
  if (modelId === 'text') {
    return { stageText: compactStageText(rawOutput), provenance: 'raw' };
  }
  if (modelId === 'd1' || modelId === 'd1_omni') {
    const decision = validateDecisionJson(rawOutput, decisionLabels);
    if (decision.valid) {
      if (storyPerspective) return { stageText: `My vote: ${decision.predicted_route.replaceAll('_', ' ')} (${Math.round(decision.confidence * 100)}%).`, provenance: 'template' };
      const source = modelId === 'd1' ? 'The written report' : 'The report and media';
      return { stageText: `${source} route to ${decision.predicted_route} review. This is a queue choice, not a finding about the case.`, provenance: 'template' };
    }
    return { stageText: 'The incident report could not be classified.', provenance: 'template' };
  }
  if (storyPerspective) return { stageText: compactStageText(rawOutput), provenance: 'raw' };
  const prefix = modelId === 'vision' ? 'I see: ' : modelId === 'audio' ? 'I hear: ' : 'I notice: ';
  return { stageText: prefix + compactStageText(rawOutput), provenance: 'template' };
}

export function compactStageText(output: string): string {
  const clean = sanitizeTurnOutput(output).replace(/\s+/g, ' ').trim();
  if (clean.length <= 500) {
    const sentences = clean.match(/[^.!?]+[.!?]+(?:\s+|$)/g) || [];
    if (sentences.length > 5) {
      const trimmed5 = sentences.slice(0, 5).join('').trim();
      if (trimmed5.length >= 250 && trimmed5.length <= 500) return trimmed5;
    }
    return clean;
  }
  const sentenceMatches = clean.match(/[^.!?]+[.!?]+(?:\s+|$)/g) || [];
  let accumulated = '';
  let count = 0;
  for (const sentence of sentenceMatches) {
    if ((accumulated + sentence).trim().length <= 500 && count < 5) {
      accumulated += sentence;
      count++;
    } else {
      break;
    }
  }
  const candidate = accumulated.trim();
  if (candidate.length >= 250) return candidate;

  const boundary = Math.max(clean.lastIndexOf('.', 500), clean.lastIndexOf('!', 500), clean.lastIndexOf('?', 500));
  if (boundary >= 250) return clean.slice(0, boundary + 1).trim();

  const lastSpace = clean.lastIndexOf(' ', 498);
  const wordSafe = lastSpace > 250 ? clean.slice(0, lastSpace).trim() : clean.slice(0, 498).trim();
  return sanitizeTurnOutput(wordSafe);
}

export interface CharacterIdentity {
  name: string;
  role: string;
  pronouns: string;
}

export interface MediaObservation {
  source: CanonicalModelId;
  observation: string;
  relevant: boolean;
  intendedClue?: string;
}

export interface StoryWorldState {
  genreId: string;
  genreContractVersion: string;
  storyId: string;
  premise: string;
  setting: string;
  relationships: string[];
  characterRelationships: string[];
  motivations: string[];
  primaryConflict: string;
  secondaryConflicts: string[];
  recentEvents: string[];
  acceptedSpecialistContributions: { source: CanonicalModelId; text: string }[];
  genreProgress: string;
  endingRequirements: string;
  showId: string;
  scenarioId: string;
  theme: string;
  currentScene: string;
  characters: CharacterIdentity[];
  establishedNarrativeFacts: string[];
  imageObservations: MediaObservation[];
  audioObservations: MediaObservation[];
  multimodalObservations: MediaObservation[];
  creativeContributions: { source: CanonicalModelId; text: string }[];
  classificationResults: { modelId: CanonicalModelId; route: string; confidence: number; requestId?: string }[];
  unresolvedQuestions: string[];
  previousSignificantActions: string[];
  latestNarrativeSegment: string;
  completedTurns: number;
  upcomingTurnPlan: CanonicalModelId[];
  location: string;
  mainCharacters: CharacterIdentity[];
  currentSituation: string;
  mainConflict: string;
  establishedFacts: string[];
  mediaObservations: MediaObservation[];
  completedActions: string[];
  unresolvedMysteries: string[];
  mostRecentChange: string;
  currentAct: NarrativeAct;
}

// Backward-compatible NarrativeState alias
export type NarrativeState = StoryWorldState & {
  clues: string[];
  decisions: string[];
  recentAction: string;
  opening: string;
};

export function extractStoryWorldState(show: ShowRecord, upToTurn: number): StoryWorldState {
  const act = getTurnAct(upToTurn, show.turnOrder.length);
  const theme = show.config.theme;
  const contract = getGenreContract(theme);
  const mainCharacters: CharacterIdentity[] = [];
  let location = '';

  const establishedFacts: string[] = [show.config.opening];
  const mediaObservations: MediaObservation[] = [];
  const creativeContributions: StoryWorldState['creativeContributions'] = [];
  const completedActions: string[] = [];
  const unresolvedMysteries: string[] = [];
  const classificationResults: StoryWorldState['classificationResults'] = [];

  let mostRecentChange = show.config.opening;

  for (let i = 0; i < upToTurn && i < show.turns.length; i++) {
    const t = show.turns[i];
    if (t.status !== 'completed' || !t.output) continue;

    if (t.modelId === 'text') {
      completedActions.push(t.output);
      mostRecentChange = t.output;
      establishedFacts.push(t.output);
      if (!location) {
        const place = t.output.match(/\b(?:at|inside|outside|near|on|in)\s+(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/);
        if (place) location = place[0];
      }
      const named = t.output.match(/\b(?:Detective|Inspector|Captain|Dr\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
      if (named && !mainCharacters.some(character => character.name === named[0])) mainCharacters.push({ name: named[0], role: 'named character', pronouns: 'unspecified' });
      const nameCandidates = t.output.match(/\b[A-Z][a-z]{2,}\b/g) || [];
      const common = new Set(['The','Then','When','After','Before','But','And','She','He','They','Her','His','Their','This','That','With','Inside','Outside','Suddenly','At','In','On','A','An']);
      for (const name of nameCandidates) {
        if (common.has(name) || mainCharacters.some(character => character.name === name || character.name.endsWith(` ${name}`))) continue;
        const asPerson = new RegExp(`\\b${name}\\s+(?:said|asked|told|saw|heard|felt|held|wanted|looked|walked|ran|smiled|knew|tried|turned|found|met|loved|feared|opened|closed|gave|took)\\b`, 'i').test(t.output);
        if (asPerson) mainCharacters.push({ name, role: 'named character', pronouns: 'unspecified' });
      }
    } else if (t.role === 'decision_assistant') {
      const decision = validateDecisionJson(t.output, t.decisionOptions ? Object.keys(t.decisionOptions) : t.storyPerspective ? ['follow_action', 'shift_focus'] : undefined);
      if (decision.valid) {
        classificationResults.push({ modelId: t.modelId, route: decision.predicted_route, confidence: decision.confidence, requestId: t.requestId });
      }
    } else if (t.storyPerspective) {
      creativeContributions.push({ source: t.modelId, text: t.output });
      establishedFacts.push(`[Story contribution from ${t.modelId}]: ${t.output}`);
    } else {
      // Specialist observation
      const relevant = t.isRelevant !== false;
      mediaObservations.push({
        source: t.modelId,
        observation: t.output,
        relevant,
        intendedClue: t.evidencePackId
      });
      if (relevant) {
        establishedFacts.push(`[Forensic Observation from ${t.modelId}]: ${t.output}`);
      }
    }
  }

  const cast = show.config.cast;
  if (cast) {
    for (const name of [cast.companion, cast.protagonist]) {
      if (!mainCharacters.some(character => character.name === name)) mainCharacters.unshift({ name, role: name === cast.protagonist ? cast.role : 'companion', pronouns: 'unspecified' });
    }
    if (!location) location = cast.setting;
  }

  const firstNarrative = completedActions[0] || '';
  const relationships = completedActions.filter(text => /\b(?:friend|sister|brother|mother|father|wife|husband|partner|lover|trust|love|together)\b/i.test(text)).slice(-3);
  const motivations = completedActions.filter(text => /\b(?:want|need|hope|must|try|save|protect|find|reach)\b/i.test(text)).slice(-3);
  const primaryConflict = show.config.opening || firstNarrative;
  const recentEvents = completedActions.slice(-3);

  return {
    genreId: contract.id,
    genreContractVersion: GENRE_CONTRACT_VERSION,
    storyId: show.showId,
    premise: show.config.opening || firstNarrative,
    setting: location,
    relationships,
    characterRelationships: relationships,
    motivations,
    primaryConflict,
    secondaryConflicts: [],
    recentEvents,
    acceptedSpecialistContributions: creativeContributions,
    genreProgress: act,
    endingRequirements: contract.endingRequirements,
    showId: show.showId,
    scenarioId: show.config.scenarioId || '',
    currentScene: mostRecentChange,
    characters: mainCharacters,
    establishedNarrativeFacts: establishedFacts,
    imageObservations: mediaObservations.filter(observation => observation.source === 'vision'),
    audioObservations: mediaObservations.filter(observation => observation.source === 'audio'),
    multimodalObservations: mediaObservations.filter(observation => observation.source === 'omni'),
    creativeContributions,
    classificationResults,
    unresolvedQuestions: unresolvedMysteries,
    previousSignificantActions: completedActions,
    latestNarrativeSegment: mostRecentChange,
    completedTurns: Math.min(upToTurn, show.turns.length),
    upcomingTurnPlan: show.turnOrder.slice(upToTurn),
    theme,
    location,
    mainCharacters,
    currentSituation: mostRecentChange,
    mainConflict: primaryConflict,
    establishedFacts,
    mediaObservations,
    completedActions,
    unresolvedMysteries,
    mostRecentChange,
    currentAct: act
  };
}

export function extractNarrativeState(show: ShowRecord, upToTurn: number): NarrativeState {
  const world = extractStoryWorldState(show, upToTurn);
  const clues: string[] = world.mediaObservations.map(m => `[${m.source} clue]: ${m.observation}`);
  const decisions: string[] = world.classificationResults.map(result => `${result.modelId}: ${result.route} routing cue`);

  return {
    ...world,
    opening: show.config.opening,
    recentAction: world.mostRecentChange,
    clues,
    decisions
  };
}

export function truncateWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text.trim();
  return words.slice(0, maxWords).join(' ') + '…';
}

export function buildShowPrompt(show: ShowRecord, modelId: CanonicalModelId): { prompt: string; truncated: boolean } {
  const cap = SHOW_CAPABILITIES.find(item => item.modelId === modelId);
  if (!cap) throw new Error('Unsupported show model.');
  const index = show.turns.length;
  const beat = showBeat(show, index);
  const world = extractStoryWorldState(show, index);
  const canonical = show.canonicalWorldState || initializeCanonicalWorldState(show.config.theme, show.config.opening, show.config.cast);
  const creativeMode = !show.config.scenarioId;
  const genre = getGenreContract(show.config.theme);
  const actIndex = beat === 'opening' ? 0 : beat === 'ending' ? 3 : beat === 'climax' ? 2 : 1;

  const director = canonical.directorPlan || show.directorPlan || createStoryDirectorPlan(show.config.theme, show.config.cast, show.config.opening);
  const writerTurnsCount = show.turns.slice(0, index).filter(t => t.modelId === 'text' && t.status === 'completed').length;

  let intro = '';
  if (modelId === 'text') {
    if (beat === 'opening') {
      const cast = show.config.cast;
      const avoided = show.config.avoidOpenings?.slice(0, cast ? 5 : 10).map(value => truncateWords(value, cast ? 6 : 8)).join(' | ');
      intro = show.config.scenarioId
        ? `Open this ${show.config.theme} case in three concise sentences, about 400–500 characters total. Use the exact place and event in the premise; ${cast ? `the detective is named ${cast.protagonist} and the witness is ${cast.companion}` : 'invent only the detective\'s name'}. Do not move to another building or add new evidence. No title. ${show.config.opening}`
        : cast
          ? `Start a brand-new ${genre.displayName} story. ${genre.premiseRequirements} ${genre.acts[0]} Central conflict: ${director.primaryConflict} Main person: ${cast.protagonist}, a ${cast.role}. Other person: ${cast.companion}. Place: ${cast.setting}. Starting problem: ${cast.hook}. Use exactly these names. Write three concise sentences, about 400–500 characters total. No title. Do not reuse earlier openings${avoided ? `: ${avoided}` : ''}. ${show.config.opening ? `Premise: ${show.config.opening}` : ''}`
          : `Start a fresh ${genre.displayName} story. ${genre.premiseRequirements} ${genre.acts[0]} Central conflict: ${director.primaryConflict} Stakes: ${director.initialStakes} Main person's name begins with ${show.config.nameInitial || 'a letter you choose'}. Creative seed ${show.config.openingSeed ?? 'new'}. Write three concise sentences, about 400–500 characters total. No title. Avoid earlier openings${avoided ? `: ${avoided}` : ''}. ${show.config.opening ? `Premise: ${show.config.opening}` : ''}`;
    } else if (beat === 'ending') {
      intro = `Conclude this ${genre.displayName} story. Act IV Resolution. State the definitive outcome resolving the principal conflict: "${director.primaryConflict}". Required ending: ${director.endingRequirements} Show the final consequence and aftermath for the characters and world; do not leave the choice open, do not repeat the climax, and do not introduce new threats or cliffhangers. Write three concise sentences, about 400–500 characters total.`;
    } else if (beat === 'climax') {
      intro = `Continue this ${genre.displayName} story at its turning point. Act III Climax. Objective: "${director.climaxObjective}". Force a decisive choice or action with immediate stakes. Write three concise sentences, about 400–500 characters total. No recap.`;
    } else {
      const beatIdx = Math.min(director.developmentBeats.length - 1, Math.max(1, writerTurnsCount));
      const dirBeat = director.developmentBeats[beatIdx] || director.developmentBeats[1];
      const recentClues = world.mediaObservations.filter(m => m.relevant).slice(-2).map(m => m.observation).join('; ');
      intro = `Continue this ${genre.displayName} story. ${dirBeat.targetAct}. Objective: ${dirBeat.narrativeGoal}. Required progression: ${dirBeat.requiredProgression}. Do not repeat: ${dirBeat.avoidRepeating}. ${pendingDirection(show)}${recentClues ? `Clue: ${truncateWords(recentClues, 16)}.` : ''} Write three concise sentences, about 400–500 characters total. No recap.`;
    }
  } else if (creativeMode && cap.role !== 'decision_assistant') {
    intro = `${supportVoice(modelId)} Genre: ${genre.displayName}. Act: ${genre.acts[actIndex]}. Add one fresh observation or action from your perspective advancing the scene. DO NOT repeat or echo prior sentences or the story opening. Keep the same people, place and facts; preserve the conflict. Write three concise sentences, about 400–500 characters total. No recap or title.`;
  } else if (cap.role === 'decision_assistant') {
    intro = creativeMode
      ? `Read the ${show.config.theme} story so far and score the better next plot direction. Use only established people and actions. This is a suggestion, not a new story fact.`
      : `Classify the related incident report using the model's supported service-route labels. This is a routing cue, not proof of what happened in the story.`;
  } else {
    intro = modelId === 'vision'
      ? 'Look only at the attached image. In one short sentence, name visible details. Do not use story context or guess events.'
      : modelId === 'audio'
        ? 'Listen only to the attached audio. In one short sentence, report words or sounds you can clearly hear. If unclear, say so. Do not use story context.'
        : 'Use only the attached image and audio. In one short sentence, say what each contains and any possible link. Do not add names or events absent from the media.';
    return { prompt: intro, truncated: false };
  }

  // 10-Point Structured Bounded Context with Tiered Compaction
  // Tier 1: Canonical constraints (Never drop)
  const deadChars = canonical.characters.filter(c => c.status === 'dead').map(c => c.name);
  const missingChars = canonical.characters.filter(c => c.status === 'missing').map(c => c.name);
  const injuredChars = canonical.characters.filter(c => c.status === 'injured').map(c => c.name);
  const aliveChars = canonical.characters.filter(c => c.status === 'alive').map(c => c.name);
  const consumedEntities = canonical.entities.filter(e => e.status === 'consumed' || e.status === 'destroyed').map(e => e.name);
  const prohibitions = canonical.prohibitedContradictions.slice(-2);
  const lastAccepted = canonical.eventLog[canonical.eventLog.length - 1];

  const tier1Constraints: string[] = [];
  if (canonical.currentLocation) tier1Constraints.push(`Current location: ${canonical.currentLocation}`);
  if (canonical.completedMilestones?.length) tier1Constraints.push(`Completed (do not repeat): ${canonical.completedMilestones.slice(-6).join(', ')}`);
  if (canonical.discoveredClues?.length) tier1Constraints.push(`Known discoveries: ${canonical.discoveredClues.slice(-5).join(', ')}`);
  if (canonical.bridgeDamaged) tier1Constraints.push('Bridge damaged: crossing requires repair or another route.');
  if (deadChars.length) tier1Constraints.push(`DEAD (cannot act or speak): ${deadChars.join(', ')}`);
  if (missingChars.length) tier1Constraints.push(`MISSING: ${missingChars.join(', ')}`);
  if (injuredChars.length) tier1Constraints.push(`INJURED: ${injuredChars.join(', ')}`);
  if (consumedEntities.length) tier1Constraints.push(`CONSUMED/USED: ${consumedEntities.join(', ')}`);
  if (prohibitions.length) tier1Constraints.push(`PROHIBITED: ${prohibitions.join(' ')}`);
  if (canonical.setting?.establishedRules?.length) tier1Constraints.push(`World rules: ${canonical.setting.establishedRules.slice(-2).join('; ')}`);
  if (canonical.narrativeGoal && beat !== 'opening') tier1Constraints.push(`Main objective: ${truncateWords(canonical.narrativeGoal, 14)}`);
  if (aliveChars.length && beat !== 'opening') tier1Constraints.push(`Active people: ${aliveChars.join(', ')}`);
  
  const lastAcceptedTurn = show.turns.slice().reverse().find(t => t.status === 'completed' && t.isRelevant !== false && t.output);
  if (lastAcceptedTurn && beat !== 'opening') {
    tier1Constraints.push(`LATEST SCENE EVENT: ${truncateWords(stripEchoedPrefix(lastAcceptedTurn.stageText || lastAcceptedTurn.output || '', []), 20)}`);
    tier1Constraints.push(`MANDATORY: Advance forward with a brand new event. DO NOT repeat or quote earlier sentences, descriptions, or the story opening.`);
  } else if (lastAccepted && beat !== 'opening' && lastAccepted.turnIndex > 0) {
    tier1Constraints.push(`Continue from latest event: ${truncateWords(lastAccepted.description, 16)}`);
  }

const MODEL_CHARACTER_NAMES: Partial<Record<CanonicalModelId, string>> = {
  text: 'Prism Pure',
  vision: 'Spectra',
  audio: 'Echo',
  omni: 'Omni Pup',
  d1: 'Prism Thinker',
  d1_omni: 'Sherlock Omni'
};

  if (modelId === 'text' && beat !== 'opening') {
    const lastNonText = show.turns.slice().reverse().find(t => t.modelId !== 'text' && t.status === 'completed' && t.output);
    if (lastNonText) {
      const sourceName = MODEL_CHARACTER_NAMES[lastNonText.modelId] || lastNonText.modelId;
      tier1Constraints.push(`INCORPORATE COLLABORATION: Directly acknowledge and react to the latest finding reported by ${sourceName}.`);
    }
  }

  // Tier 2: Cast & Setting
  const tier2Foundation: string[] = [];
  const storyCast = show.config.cast;
  if (storyCast && beat !== 'opening') {
    tier2Foundation.push(`Cast: ${storyCast.protagonist} and ${storyCast.companion}; objective: ${storyCast.hook}`);
  } else if (show.config.opening && beat === 'opening') {
    tier2Foundation.push(`Premise: ${show.config.opening}`);
  }
  const firstNarrative = show.turns.find(turn => turn.modelId === 'text' && turn.status === 'completed' && turn.output);
  if (firstNarrative && beat !== 'opening') {
    tier2Foundation.push(`Opening: ${truncateWords(firstNarrative.output!, 24)}`);
  } else if (show.config.opening && beat !== 'opening') {
    tier2Foundation.push(`Opening: ${truncateWords(show.config.opening, 24)}`);
  }

  // Tier 3: Forensic Clues & Decision routing
  const tier3Clues: string[] = [];
  for (const decision of world.classificationResults.slice(-1)) {
    const described = creativeMode ? show.turns.find(turn => turn.requestId === decision.requestId && turn.decisionOptions)?.decisionOptions?.[decision.route] : undefined;
    tier3Clues.push(`[Routing cue]: ${described || `${decision.modelId} chose ${decision.route}`}`);
  }
  for (const obs of world.mediaObservations.filter(m => m.relevant).slice(-1)) {
    tier3Clues.push(`[Clue by ${obs.source}]: ${truncateWords(obs.observation, 18)}`);
  }

  // Tier 4: Recent Narrative Action
  const tier4Recent: string[] = [];
  if (show.humanTurns && show.humanTurns.length > 0) {
    const lastHuman = show.humanTurns[show.humanTurns.length - 1];
    tier4Recent.push(`[Human player directive]: "${truncateWords(lastHuman.text, 25)}"`);
  }
  const admitted = show.turns.filter(turn => turn.status === 'completed' && turn.isRelevant !== false && turn.output);
  for (const turn of admitted.slice(-3)) {
    if (turn.modelId === 'text') tier4Recent.push(`[recent action]: ${truncateWords(turn.output!, 26)}`);
    else if (turn.role !== 'decision_assistant') tier4Recent.push(`[${turn.storyPerspective ? 'beat' : 'observed'} by ${turn.modelId}]: ${truncateWords(turn.output!, 20)}`);
  }

  let truncated = false;
  const assemble = (t4: string[], t3: string[], t2: string[]) => {
    const parts = [intro];
    const data: string[] = [...tier1Constraints, ...t2, ...t3, ...t4];
    if (data.length) parts.push('Story constraints & facts:\n' + data.join('\n'));
    return parts.join('\n');
  };

  let prompt = assemble(tier4Recent, tier3Clues, tier2Foundation);

  // Tiered compaction if exceeding 980 chars
  if (prompt.length > 980 && tier4Recent.length > 1) {
    truncated = true;
    prompt = assemble(tier4Recent.slice(-1), tier3Clues, tier2Foundation);
  }
  if (prompt.length > 980 && tier3Clues.length > 0) {
    truncated = true;
    prompt = assemble(tier4Recent.slice(-1), [], tier2Foundation);
  }
  if (prompt.length > 980 && tier4Recent.length > 0) {
    truncated = true;
    prompt = assemble([], [], tier2Foundation);
  }
  if (prompt.length > 980) {
    truncated = true;
    const compactT2 = tier2Foundation.map(s => truncateWords(s, 12));
    prompt = assemble([], [], compactT2);
  }
  if (prompt.length > 980) {
    truncated = true;
    const compactT1 = tier1Constraints.map(s => s.replace(/DEAD \(cannot act or speak\):/, 'DEAD:').replace(/CONSUMED\/USED:/, 'CONSUMED:'));
    prompt = [intro, 'Story constraints:\n' + compactT1.join('\n')].join('\n');
  }
  if (prompt.length > 980) {
    truncated = true;
    prompt = `${intro.slice(0, 520)}\nCanonical facts: ${tier1Constraints.join(' ').slice(0, 420)}`;
  }

  return { prompt, truncated };
}
/** The plot direction chosen by a decision model since the writer last spoke. */
function pendingDirection(show: ShowRecord): string {
  for (let i = show.turns.length - 1; i >= 0; i--) {
    const turn = show.turns[i];
    if (turn.modelId === 'text' && turn.status === 'completed') return '';
    const chosen = turn.decisionData?.valid ? turn.decisionOptions?.[turn.decisionData.predicted_route] : undefined;
    if (chosen) return `Make this happen now: ${chosen} `;
  }
  return '';
}

export function evaluateGenreTurn(theme: string, beat: string, output: string, previousOutputs: string[] = []): GenreEvaluation {
  const contract = getGenreContract(theme);
  const issues: string[] = [];
  const evidence: string[] = [];
  const lower = output.toLowerCase();
  const matched = contract.signals.filter(signal => new RegExp(`\\b${signal}\\b`, 'i').test(lower));
  if (matched.length) evidence.push(`Genre cues: ${matched.slice(0, 3).join(', ')}`);
  else if (beat === 'opening') issues.push(`No clear ${theme} cue in this ${beat}.`);
  if (detectRepetition(output, previousOutputs)) issues.push('Repeated a previous passage or action.');
  if (output.trim().length > 500) issues.push('Turn exceeds the 500-character maximum.');
  const sentenceCount = (output.match(/[^.!?]+[.!?]+(?:\s+|$)/g) || []).length;
  if (sentenceCount > 5) issues.push('Turn exceeds the 5-sentence maximum.');
  if (isTruncatedOutput(output).truncated) issues.push('Turn output is truncated or incomplete.');
  if (output.trim().split(/\s+/).length > 130) issues.push('Turn is longer than the requested short format.');
  if (beat === 'ending' && /\b(?:suddenly|new stranger|unknown power|another mystery)\b/i.test(output)) issues.push('Ending may introduce an unsupported twist.');
  return { status: issues.length ? 'review' : 'pass', issues, evidence };
}

export function detectRepetition(candidate: string, previousOutputs: string[]): boolean {
  if (!candidate || previousOutputs.length === 0) return false;
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 3);
  const candWords = new Set(clean(candidate));
  if (candWords.size === 0) return false;

  for (const prev of previousOutputs) {
    const prevWords = clean(prev);
    if (prevWords.length === 0) continue;
    let match = 0;
    for (const w of prevWords) {
      if (candWords.has(w)) match++;
    }
    const ratio = match / Math.max(candWords.size, prevWords.length);
    if (ratio > 0.65) return true;
  }
  return false;
}

export function repeatsOpeningName(candidate: string, previousOpenings: string[]): boolean {
  const excluded = new Set(['the','then','when','after','before','but','and','she','he','they','her','his','their','this','that','with','inside','outside','suddenly','at','in','on','a','an','one','two','someone','while','once','as','it','i','we','you','every','under','today','tonight','during','late','early','despite','although','because','through','where','what','why','how','there','now','soon','finally','meanwhile','still','each','its','our','my','your','not','all','some','from','for','into','over','if','so','yet','just','even','only','last','first','next','three','years','nobody','everyone','nothing']);
  const anchors = (value: string) => [...value.matchAll(/\b[A-Z][a-z]{2,}\b/g)]
    .map(match => match[0].toLowerCase())
    .filter(word => !excluded.has(word));
  const oldNames = new Set(previousOpenings.flatMap(anchors));
  return anchors(candidate).some(name => oldNames.has(name));
}

export function openingReuseReason(candidate: string, previousOpenings: string[]): string | null {
  // Capitalized route and landmark names are often fixed by an evidence pack.
  // Cast reuse is checked against chosen people separately.
  if (detectRepetition(candidate, previousOpenings)) return 'The opening repeats an earlier passage.';
  const stop = new Set(['about','after','again','along','also','around','because','before','could','every','first','from','into','just','more','near','once','only','other','over','same','some','that','their','them','there','these','they','this','those','through','until','very','when','where','which','while','with','would']);
  const words = (text: string) => new Set(text.toLowerCase().replace(/[^a-z\s]/g,' ').split(/\s+/).filter(word => word.length > 3 && !stop.has(word)));
  const candidateWords = words(candidate);
  for (const previous of previousOpenings) {
    const earlier = words(previous);
    if (candidateWords.size < 5 || earlier.size < 5) continue;
    const shared = [...candidateWords].filter(word => earlier.has(word)).length;
    if (shared >= 5 && shared / Math.min(candidateWords.size, earlier.size) >= 0.55) return 'The opening reuses an earlier plot setup.';
  }
  return null;
}

export interface OpeningMemory { showId: string; theme: string; opening: string }

export function readOpeningMemory(storage: Pick<Storage, 'getItem'> = localStorage): OpeningMemory[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(OPENING_MEMORY_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is OpeningMemory => !!item && typeof item.showId === 'string' && typeof item.theme === 'string' && typeof item.opening === 'string').slice(0, 100) : [];
  } catch { return []; }
}

export function chooseFreshNameInitial(previousOpenings: string[], random = Math.random): string {
  const common = new Set(['The','Then','When','After','Before','But','And','She','He','They','Her','His','Their','This','That','With','Inside','Outside','Suddenly','At','In','On','One','Two','Someone','While','Once']);
  const used = new Set(previousOpenings.flatMap(text => [...text.matchAll(/\b[A-Z][a-z]{2,}\b/g)].filter(match => !common.has(match[0])).map(match => match[0][0])));
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const available = alphabet.filter(letter => !used.has(letter));
  const pool = available.length ? available : alphabet;
  return pool[Math.floor(Math.min(0.999999999, Math.max(0, random())) * pool.length)];
}

export function sanitizeTurnOutput(text: string): string {
  if (!text || typeof text !== 'string') return '';
  let trimmed = text.trim();

  // If the content is a JSON object or decision dictionary, preserve it intact without sentence clipping
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = trimmed.slice(firstBrace, lastBrace + 1);
    if (candidate.includes('predicted_route') || candidate.includes('probabilities') || candidate.includes('route')) {
      return candidate;
    }
  }

  // Strip code blocks and markdown headings
  trimmed = trimmed.replace(/^```[a-z]*\n/i, '').replace(/```$/i, '').trim();
  trimmed = trimmed.replace(/^#+\s+[^\n]+\n/g, '').trim();

  // Strip unwanted planning artifacts and titles (e.g. **Title: The Coat on the Boat**, Title: ...)
  trimmed = trimmed.replace(/^\s*\*{0,2}Title:\s*[^\n*]+\*{0,2}\s*/i, '');
  trimmed = trimmed.replace(/^\s*Title:\s*[^\n]+\n*/i, '');

  // Strip Act indicators (e.g. **Act IV – Resolution**, **Act I: The Beginning**, Act II - Discovery)
  trimmed = trimmed.replace(/^\s*\*{0,2}Act\s+[IVXLCDM]+(?:\s*[-–—:]\s*[^\n*]+)?\*{0,2}\s*/i, '');
  trimmed = trimmed.replace(/^\s*Act\s+[IVXLCDM]+(?:\s*[-–—:]\s*[^\n]+)?\n*/i, '');

  // Strip bracketed scene cues (e.g. [Scene: The Houseboat], [Setting: ...], [Chapter 1])
  trimmed = trimmed.replace(/^\s*\[(?:Scene|Setting|Act|Note|Chapter|Turn|Stage)[^\]]*\]\s*/i, '');

  // Clean raw speech disfluencies like trailing unclosed (um...)
  trimmed = trimmed.replace(/\s*\((?:um|uh|er|ah)[^)]*\)/gi, '').trim();

  // Clean leading punctuation, ellipses or dangling connective starts like "...where..." or "...but..."
  trimmed = trimmed.replace(/^[.…\s]*(?:where|and|but|then|so)\s*[.…]+/i, '');
  trimmed = trimmed.replace(/^[.…\s]+/, '');

  // Clean mid-sentence ellipsis before capital letter (e.g., "where… Lorcan was gone." -> "where. Lorcan was gone.")
  trimmed = trimmed.replace(/[.…]{2,}\s*([A-Z])/g, '. $1');

  // Fix dangling trailing ellipses before punct (e.g. "hand… He" -> "hand. He")
  trimmed = trimmed.replace(/[.…]{2,}\s*$/g, '.');

  const terminalPunct = /[.!?]"?$/;
  if (!terminalPunct.test(trimmed)) {
    const lastPunct = Math.max(trimmed.lastIndexOf('.'), trimmed.lastIndexOf('!'), trimmed.lastIndexOf('?'));
    if (lastPunct > trimmed.length * 0.5) {
      trimmed = trimmed.slice(0, lastPunct + 1).trim();
    } else {
      trimmed = trimmed + '.';
    }
  }

  // Ensure first character is capitalized
  if (trimmed.length > 0) {
    trimmed = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }

  return trimmed;
}

/**
 * Strips echoed opening lines, preceding turn sentences, or quoted prompt excerpts
 * from the beginning of candidate generation to prevent runaway repetition.
 */
export function stripEchoedPrefix(
  rawText: string,
  earlierTexts: string[] = [],
  promptText = ''
): string {
  const sanitized = sanitizeTurnOutput(rawText);
  if (!sanitized) return '';

  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  // Build reference pool of earlier sentences
  const refSentences: string[] = [];
  for (const t of earlierTexts) {
    if (!t) continue;
    const sents = t.split(/(?<=[.!?])\s+/);
    for (const s of sents) {
      const n = norm(s);
      if (n.split(' ').length >= 4) refSentences.push(n);
    }
  }

  // Also include quoted phrases from prompt
  const quotes = promptText.match(/"([^"]{15,})"/g) || [];
  for (const q of quotes) {
    const n = norm(q.replace(/"/g, ''));
    if (n.split(' ').length >= 4) refSentences.push(n);
  }

  const sentences = sanitized.split(/(?<=[.!?])\s+/);
  const kept: string[] = [];
  let dropping = true;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const nSent = norm(sentence);
    const sentWords = nSent.split(' ').filter(w => w.length > 2);

    if (dropping) {
      // 1. Check if whole sentence is an echo of any reference sentence
      const isFullEcho = refSentences.some(ref => {
        if (ref === nSent || ref.includes(nSent) || nSent.includes(ref)) return true;
        const refWords = new Set(ref.split(' ').filter(w => w.length > 2));
        if (refWords.size >= 4 && sentWords.length >= 4) {
          const overlap = sentWords.filter(w => refWords.has(w)).length;
          const ratio = overlap / Math.min(sentWords.length, refWords.size);
          if (ratio >= 0.70) return true;
        }
        return false;
      });

      if (isFullEcho) {
        continue; // drop echoed sentence
      }

      // 2. Check if the beginning of the sentence has a long repeated clause (e.g. "Bastian spotted a flicker of movement near the railing, where...")
      let trimmedSentence = sentence;
      for (const ref of refSentences) {
        const refParts = ref.split(' ');
        for (let len = Math.min(12, refParts.length); len >= 6; len--) {
          const prefix = refParts.slice(0, len).join(' ');
          if (nSent.startsWith(prefix) && nSent.length > prefix.length + 15) {
            const words = sentence.split(/\s+/);
            if (words.length > len + 2) {
              const remainder = words.slice(len).join(' ');
              if (remainder.length >= 20) {
                trimmedSentence = remainder.charAt(0).toUpperCase() + remainder.slice(1);
                break;
              }
            }
          }
        }
      }

      dropping = false;
      kept.push(trimmedSentence);
    } else {
      kept.push(sentence);
    }
  }

  const result = kept.join(' ').trim();
  return sanitizeTurnOutput(result);
}

export function appendShowTurn(show: ShowRecord, turn: ShowTurn): ShowRecord {
  if (show.turns.some(item => item.turnId === turn.turnId)) return show;
  const turns = [...show.turns, turn];
  return {
    ...show,
    turns,
    updatedAt: turn.finishedAt,
    status: turns.length === show.turnOrder.length && turns.every(item => item.status === 'completed') ? 'completed' : show.status
  };
}

export function sanitizeShow(show: ShowRecord): ShowRecord {
  const cleanTurns = show.turns.filter(t => t.status === 'completed' && !t.rejectionReason && !/unavailable:|returned no response/i.test(t.stageText || ''));
  return {
    ...show,
    turns: cleanTurns,
  };
}

export function readShows(storage: Pick<Storage, 'getItem'> = localStorage): ShowRecord[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(SHOW_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed
      .filter((item): item is ShowRecord => !!item && (item.version === SHOW_VERSION || item.version === 's3b.1') && typeof item.showId === 'string' && Array.isArray(item.turns) && Array.isArray(item.turnOrder))
      .map(sanitizeShow)
      .slice(0, 5) : [];
  } catch {
    return [];
  }
}

export function saveShow(show: ShowRecord, storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage): void {
  const others = readShows(storage).filter(item => item.showId !== show.showId);
  storage.setItem(SHOW_STORAGE_KEY, JSON.stringify([show, ...others].slice(0, 5)));
  const first = show.turns.find(turn => turn.modelId === 'text' && turn.status === 'completed' && turn.output);
  if (first?.output) {
    const memory = readOpeningMemory(storage).filter(item => item.showId !== show.showId);
    storage.setItem(OPENING_MEMORY_KEY, JSON.stringify([{ showId: show.showId, theme: show.config.theme, opening: first.output }, ...memory].slice(0, 100)));
  }
}

export function clearShows(storage: Pick<Storage, 'removeItem'> = localStorage): void {
  try {
    storage.removeItem(SHOW_STORAGE_KEY);
  } catch {}
}

export function asReplay(show: ShowRecord): ShowRecord {
  return { ...show, mode: 'recorded_show' };
}

export function getTurnModeLabel(modelId: CanonicalModelId, capability: ShowCapability, storyPerspective = false): string {
  if (capability.narrativeWriter) return 'Writing story';
  if (storyPerspective) return capability.role === 'decision_assistant' ? 'Choosing plot direction' : 'Continuing story';
  if (modelId === 'vision') return 'Inspecting image';
  if (modelId === 'audio') return 'Listening to audio';
  if (modelId === 'omni') return 'Combining evidence';
  if (modelId === 'd1') return 'Classifying report';
  if (modelId === 'd1_omni') return 'Classifying evidence';
  return 'Presenting result';
}

// ─── Fresh story casting ────────────────────────────────────────────────
// Small local writers fall back to the same default people (e.g. "Lena", "Hart")
// and arcs when asked to "invent" them. The app therefore picks a concrete,
// never-recently-used cast, place and starting problem for every new story.

export interface StoryCast {
  protagonist: string;
  companion: string;
  role: string;
  setting: string;
  hook: string;
}

export const CAST_MEMORY_KEY = 'prismlab_story_cast_memory_v1';

/** Names the local writer over-uses; never cast and treated as reuse in openings. */
export const OVERUSED_STORY_NAMES = ['Lena', 'Hart', 'Elara', 'Lily', 'Sarah', 'Emma', 'Ethan', 'Alex', 'John', 'Jane'];

export const FIRST_NAMES = [
  'Asha','Bruno','Chidi','Dalia','Emeka','Farah','Goran','Hana','Ivo','Jun','Kofi','Leila','Mateo','Nadia','Omar','Priya',
  'Quinn','Rafael','Sana','Tariq','Uma','Viktor','Wren','Ximena','Yusuf','Zara','Anouk','Bilal','Camila','Dmitri','Esi','Felix',
  'Gita','Hiro','Ines','Jalen','Kenji','Luca','Marisol','Nikhil','Odette','Pablo','Rhea','Soren','Tamsin','Ulric','Valeria','Wanjiru',
  'Yara','Zubin','Aiko','Bastian','Cyrus','Delphine','Ezra','Fatima','Gideon','Halima','Idris','Juno','Kavya','Lorcan','Malia','Niko',
  'Oona','Pilar','Ronan','Saoirse','Teo','Usha','Vikram','Willa','Yosef','Zainab','Arjun','Beatriz','Cormac','Darius','Eun','Freya',
  'Gael','Hamid','Ingrid','Jasper','Kiran','Lucia','Milan','Noor','Otto','Paloma','Rohan','Selin','Thabo','Ulla','Vera','Wes',
  'Ayo','Bodhi','Chiara','Dev','Elif','Fionn','Greta','Hugo','Isla','Jomo','Kalani','Linus','Meera','Nils','Orla','Piet',
  'Rosa','Sami','Tove','Valentin','Yuki','Zoltan','Amara','Bram','Cleo','Duncan','Emi','Faisal','Gemma','Haruto','Ilse','Joaquin'
].filter(name => !OVERUSED_STORY_NAMES.includes(name));

export const STORY_ROLES = [
  'night-shift baker','retired sailor','bike courier','museum guard','street musician','lighthouse keeper','school janitor','ferry pilot',
  'beekeeper','radio host','tailor','train conductor','florist','rock climber','librarian','taxi driver','glassblower','park ranger',
  'violin teacher','chess hustler','map maker','food-truck cook','clockmaker','junior nurse','stage magician','delivery drone tech',
  'farmer','street painter','swim coach','hotel porter','puppeteer','postal worker','apprentice chef','tour guide','locksmith','bookbinder'
];

export const GENRE_STORY_SEEDS: Record<string, { settings: string[]; hooks: string[] }> = {
  'Detective investigation': {
    settings: ['a rain-soaked fish market','a closed circus tent','a hilltop observatory','a night train to the coast','a crowded pawn shop','a lakeside boathouse','a theater after the final show','a rooftop greenhouse'],
    hooks: ['a prize violin vanished during a blackout','a shopkeeper was found asleep beside an empty safe','a stolen ledger reappeared with one page torn out','a witness swears she saw a man walk through a wall','every clock in the building stopped at the same minute','a dog keeps leading people to the same locked shed','a ring was swapped for a perfect fake','a letter arrived signed by someone missing for years']
  },
  'Comedy': {
    settings: ['a chaotic wedding rehearsal','a tiny cooking contest','a seaside talent show','a small-town job interview','a crowded laundromat','a school science fair','a yoga class in a park','a grandma\'s birthday party'],
    hooks: ['a borrowed parrot will only repeat secrets','a cake order was mixed up with a giant fish','a rented suit is three sizes too small','a goat escaped into the main event','a speech was swapped for a grocery list','a robot vacuum keeps stealing shoes','a fake mustache will not come off','an online date turns out to be the new boss']
  },
  'Tragedy': {
    settings: ['a flooding river village','a failing family orchard','a fishing town before a storm','a hospital night ward','a mountain mining camp','a closing piano bar','a border bus station','a burned-down bakery'],
    hooks: ['only one ticket remains to leave town','a promise to a dying parent cannot be kept','a best friend\'s secret could ruin both of them','the family home must be sold by morning','a medicine can save only one person','a brave lie starts to cost lives','a lost letter would have changed everything','a debt forces a choice between two people']
  },
  'Horror': {
    settings: ['an abandoned ice rink','a fog-covered campground','an old radio station','a sinking houseboat','a hotel with no other guests','a cornfield at midnight','a sealed subway tunnel','a children\'s museum after closing'],
    hooks: ['footsteps answer every knock','a phone keeps ringing from an empty room','mirrors show someone standing one step behind','the snowman outside moves closer each night','a lullaby plays from under the floor','every photo now shows an extra guest','the map shows a door that should not exist','something is wearing a neighbor\'s coat']
  },
  'Romance': {
    settings: ['a rainy bookshop café','a late-night ferry','a rooftop community garden','a winter train platform','a summer music festival','a pottery studio','a busy night market','a quiet seaside motel'],
    hooks: ['two rivals must share one booth','an old pen pal turns up unannounced','a wrong-number text starts a real friendship','a fake date for a party starts to feel real','one of them is moving away in a week','a lost umbrella keeps bringing them together','a shared recipe holds a hidden confession','a bet about the stars goes too far']
  },
  'Mystery': {
    settings: ['a fog-bound island village','a shuttered toy factory','a desert motel','a village bell tower','a university archive','a canal-side warehouse','a forgotten botanical garden','a cable-car station'],
    hooks: ['a map was drawn in invisible ink','the same stranger appears in old photos','a key arrived with no lock in town to fit it','a radio picks up messages from yesterday','someone leaves fresh flowers on an empty grave','a painting changes overnight','a diary predicts the next day exactly','the town clock chimes thirteen times']
  },
  'Fantasy': {
    settings: ['a floating market of lanterns','a forest where trees whisper names','a castle carved inside a glacier','a city built on a giant turtle','a desert of singing sand','a library that rearranges itself','a village under a frozen waterfall','a sky harbor for winged ships'],
    hooks: ['a spell that steals one memory for each wish','a dragon egg that hatches only for liars','a crown that makes its wearer forget their name','a talking cat who owes a debt to a witch','a river that flows backward when someone lies','a map that redraws itself toward danger','a curse that turns every song into silence','a wand that works only at sunrise']
  },
  'Science fiction': {
    settings: ['a mining base on a frozen moon','a generation ship\'s greenhouse deck','an underwater research dome','a city where it never gets dark','a repair dock orbiting the red planet','a desert solar farm run by robots','a crowded space elevator','a lab that studies time loops'],
    hooks: ['the ship AI starts asking to be set free','oxygen is running out after a strange signal','a cloned crew member arrives with new memories','a teleporter sends back two copies','the robots stop obeying orders at night','a message arrives from forty years in the future','the planet\'s gravity begins to shift','a memory chip holds a crime nobody remembers']
  },
  'Adventure': {
    settings: ['a jungle river with old stone bridges','a snowy mountain pass','a pirate island of hidden caves','a sandstorm-swept desert road','a sunken city reachable at low tide','a canyon full of rope bridges','a volcano village','a maze of ancient sea cliffs'],
    hooks: ['a torn treasure map points two ways','a rival team stole the only boat','a storm closes the path home','a promised guide never arrives','a sacred bell must be returned before the full moon','the bridge collapses behind them','a lost explorer\'s compass points only north-west','a cave fills with water at sunset']
  }
};

export function readCastMemory(storage: Pick<Storage, 'getItem'> = localStorage): StoryCast[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(CAST_MEMORY_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is StoryCast => !!item && typeof item.protagonist === 'string' && typeof item.companion === 'string').slice(0, 40) : [];
  } catch { return []; }
}

export function rememberCast(cast: StoryCast, storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage): void {
  try { storage.setItem(CAST_MEMORY_KEY, JSON.stringify([cast, ...readCastMemory(storage)].slice(0, 40))); } catch {}
}

/** Choose a cast, place and starting problem that were not used by recent stories. */
export function chooseStoryCast(theme: string, previousTexts: string[] = [], previousCasts: StoryCast[] = [], random = Math.random): StoryCast {
  const pick = <T,>(items: T[]): T => items[Math.floor(Math.min(0.999999999, Math.max(0, random())) * items.length)];
  const fresh = <T,>(items: T[], used: Set<T>): T[] => { const free = items.filter(item => !used.has(item)); return free.length ? free : items; };
  const usedWords = new Set(previousTexts.flatMap(text => [...text.matchAll(/\b[A-Z][a-z]{2,}\b/g)].map(match => match[0])));
  const usedNames = new Set<string>([...previousCasts.flatMap(cast => [cast.protagonist, cast.companion])]);
  let names = FIRST_NAMES.filter(name => !usedNames.has(name) && !usedWords.has(name));
  if (names.length < 2) names = FIRST_NAMES.filter(name => !usedNames.has(name));
  if (names.length < 2) names = [...FIRST_NAMES];
  const protagonist = pick(names);
  const others = names.filter(name => name !== protagonist);
  const preferred = others.filter(name => name[0] !== protagonist[0]);
  const companion = pick(preferred.length ? preferred : others);
  const seeds = GENRE_STORY_SEEDS[theme] || GENRE_STORY_SEEDS.Adventure;
  const recent = previousCasts.slice(0, 20);
  const role = pick(fresh(STORY_ROLES, new Set(recent.map(cast => cast.role))));
  const setting = pick(fresh(seeds.settings, new Set(recent.map(cast => cast.setting))));
  const hook = pick(fresh(seeds.hooks, new Set(recent.map(cast => cast.hook))));
  return { protagonist, companion, role, setting, hook };
}

export function generateFreshPremise(theme: string, cast: StoryCast): string {
  const hook = cast.hook;
  const setting = cast.setting;
  const p = cast.protagonist;
  const c = cast.companion;
  const role = cast.role;
  switch (theme) {
    case 'Romance':
      return `In ${setting}, ${hook}, bringing ${p} the ${role} and ${c} into an unexpected, delicate encounter.`;
    case 'Horror':
      return `At ${setting}, ${hook}, trapping ${p} the ${role} and ${c} in escalating dread.`;
    case 'Tragedy':
      return `At ${setting}, ${hook}, forcing ${p} the ${role} and ${c} to face an irreversible loss.`;
    case 'Adventure':
      return `Across ${setting}, ${hook}, driving ${p} the ${role} and ${c} on a perilous journey.`;
    case 'Mystery':
      return `At ${setting}, ${hook}, challenging ${p} the ${role} and ${c} to uncover the hidden truth.`;
    case 'Fantasy':
      return `Within ${setting}, ${hook}, testing ${p} the ${role} and ${c} against ancient magical rules.`;
    case 'Science fiction':
      return `Aboard ${setting}, ${hook}, forcing ${p} the ${role} and ${c} to solve a critical crisis.`;
    case 'Comedy':
      return `At ${setting}, ${hook}, entangling ${p} the ${role} and ${c} in ridiculous complications.`;
    case 'Detective investigation':
      return `At ${setting}, ${hook}, challenging ${p} the ${role} and ${c} to investigate the clues.`;
    default:
      return `${p} the ${role} and ${c} face a challenge at ${setting}: ${hook}.`;
  }
}

// ─── Plot-direction choices for the decision models ─────────────────────

const STORY_DIRECTIONS: Record<string, string> = {
  raise_stakes: '{P} faces a bigger risk as the problem suddenly gets worse.',
  reveal_secret: '{C} reveals a secret that changes what {P} believes.',
  hard_choice: '{P} must choose between two things that both matter.',
  new_clue: '{P} notices a small detail that points in a new direction.',
  ally_helps: '{C} steps in to help {P}, but it costs something.',
  setback: 'The plan fails, and {P} has to try another way.',
  confront: '{P} faces the source of the problem directly.',
  honest_moment: '{P} and {C} share an honest moment that changes their bond.'
};

const GENRE_CUSTOM_DIRECTIONS: Record<string, Record<string, string>> = {
  'Science fiction': {
    override_system: '{P} overrides the station mainframe to prevent catastrophic systemic failure.',
    secure_cryo_data: '{P} risks exposure in the vent corridor to extract the encrypted cryo-data chip.',
    seal_bulkhead: '{C} locks the emergency bulkhead doors to isolate the hazardous breach.',
    reroute_core: '{P} manually reroutes auxiliary power from the reactor to maintain life support.',
    trace_anomaly: '{P} and {C} follow the unexpected sensor telemetry deeper into the station.'
  },
  'Detective investigation': {
    analyze_evidence: '{P} isolates a forensic contradiction overlooked during initial inspection.',
    confront_witness: '{P} directly questions {C} regarding discrepancies in their statement.',
    secure_crime_scene: '{P} seals off the secondary passage before crucial physical traces vanish.',
    pursue_lead: '{P} follows an unexpected trail found along the perimeter.'
  },
  'Adventure': {
    scout_alternate_pass: '{P} spots a narrow, untested ledge bypassing the damaged crossing.',
    anchor_crossing: '{C} secures a lifeline across the fissure, allowing the crossing to proceed.',
    salvage_supplies: '{P} retrieves essential survival equipment just before it slips away.',
    push_through_storm: '{P} and {C} brace through the harsh weather to reach higher shelter.'
  },
  'Romance': {
    confess_feelings: '{P} admits their true feelings to {C}, risking emotional vulnerability.',
    misunderstanding_deepens: 'An awkward misunderstanding between {P} and {C} threatens to push them apart.',
    share_vulnerability: '{C} confides in {P} about the past hurt holding them back.',
    stand_together: '{P} and {C} choose each other over outside expectations.',
    tender_gesture: 'A quiet, honest gesture between {P} and {C} breaks the lingering tension.'
  },
  'Horror': {
    barricade_door: '{P} frantically reinforces the barrier as unnatural scratching starts outside.',
    flee_corridor: '{C} pulls {P} into a shadowed alcove just before the terrifying presence turns toward them.',
    examine_talisman: '{P} discovers the protective ward has been broken from the inside.',
    unmask_presence: '{P} raises the lantern, exposing the true nature of the lurking threat.',
    sever_binding: '{C} severs the cursed binding before the entity can cross the threshold.'
  },
  'Tragedy': {
    accept_sacrifice: '{P} steps forward to bear the irreversible cost so {C} can survive.',
    confront_inevitable: '{C} acknowledges that not everyone can be saved before the water rises.',
    parting_promise: '{P} and {C} exchange a solemn promise before the final farewell.',
    hold_the_line: '{P} stays behind to buy vital minutes for the evacuation.',
    solemn_remembrance: '{C} preserves the emblem of the fallen, determined that their memory endures.'
  },
  'Comedy': {
    absurd_disguise: '{P} hastily puts on an outrageous disguise to avoid being recognized by the mayor.',
    frantic_swap: '{C} tries to swap the ruined prop with a dessert while no one is looking.',
    topple_display: '{P} accidentally trips over the ribbon, sending the festive centerpiece flying.',
    double_down: '{C} invents a wildly preposterous excuse that everyone surprisingly believes.',
    clumsy_rescue: '{P} dives across the table to catch the falling trophy, landing face-first in icing.'
  },
  'Fantasy': {
    invoke_ancient_rune: '{P} channels the glowing glyph carved into the heartwood at great personal strain.',
    counter_curse: '{C} shatters the obsidian focal stone, releasing trapped spirit energy.',
    commune_guardian: '{P} offers a treasured memory to the forest guardian in exchange for safe passage.',
    shield_enchantment: '{C} weaves a barrier of woven light to repel the creeping corruption.',
    seal_rift: '{P} binds the shimmering tear between realms using the elemental reagent.'
  },
  'Mystery': {
    inspect_hidden_compartment: '{P} unlatches a false panel in the desk revealing a coded correspondence.',
    expose_timeline_gap: '{P} points out that {C} could not have heard the chime from across the courtyard.',
    trace_wax_seal: '{C} matches the unique crest on the torn letter to an unrecorded visitor.',
    interrogate_contradiction: '{P} corners the key witness with their conflicting statements.',
    reconstruct_sequence: '{P} piecing together the broken glass pattern, proves the latch was opened from inside.'
  }
};

export const LATE_DIRECTIONS = ['hard_choice', 'confront', 'reveal_secret', 'honest_moment', 'raise_stakes'];

export function chooseStoryDirections(show: ShowRecord, random = Math.random): { instructions: string; criteria: Record<string, string> } {
  const names = storyPeople(show);
  const fill = (text: string) => text.replaceAll('{P}', names[0] || 'The main person').replaceAll('{C}', names[1] || 'another person');
  const used = new Set(show.turns.flatMap(turn => turn.decisionData?.valid ? [turn.decisionData.predicted_route] : []));
  const genreSet = GENRE_CUSTOM_DIRECTIONS[show.config.theme];
  const sourceDict = genreSet ? { ...STORY_DIRECTIONS, ...genreSet } : STORY_DIRECTIONS;
  const keys = Object.keys(sourceDict);
  const pool = keys.filter(key => !used.has(key)).length >= 3 ? keys.filter(key => !used.has(key)) : keys;
  const shuffled = [...pool].sort(() => random() - 0.5).slice(0, 3);
  const criteria = Object.fromEntries(shuffled.map(key => [key, fill(sourceDict[key] || STORY_DIRECTIONS[key] || key).slice(0, 200)]));
  return { instructions: `Pick the next event that makes this ${show.config.theme} story more exciting while staying consistent.`.slice(0, 200), criteria };
}

/** Story-voice line for a valid plot-direction vote. */
export function presentStoryDirection(modelId: CanonicalModelId, decision: ValidatedDecision, options?: Record<string, string>): string | null {
  const description = options?.[decision.predicted_route];
  if (!decision.valid || !description) return null;
  if (modelId === 'd1') {
    return `Analyzing the active vectors, the crucial turn is: ${description}`;
  }
  return `Evaluating every thread of evidence, the decisive development here is: ${description}`;
}

/** Main people for the story: chosen cast first, then names the writer established. */
export function storyPeople(show: ShowRecord): string[] {
  const cast = show.config.cast;
  const names = cast ? [cast.protagonist, cast.companion] : [];
  for (const character of extractStoryWorldState(show, show.turns.length).characters) {
    if (!names.some(name => character.name.includes(name))) names.push(character.name);
  }
  return names.slice(0, 4);
}

/** True when the candidate copies a whole sentence (≥6 words) from an earlier turn. */
export function copiesPreviousSentence(candidate: string, previousOutputs: string[]): boolean {
  const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const earlier = previousOutputs.map(norm).filter(Boolean);
  return candidate.split(/(?<=[.!?])\s+/).map(norm).some(sentence => sentence.split(' ').length >= 6 && earlier.some(previous => previous.includes(sentence)));
}

const SUPPORT_VOICES: Partial<Record<CanonicalModelId, string>> = {
  vision: 'You are Spectra, observing the scene visually. Describe what unfolds in the environment that changes the situation, and how the characters respond.',
  audio: 'You are Echo, listening closely to the auditory environment. Describe the crucial sounds, transmissions, or spoken words heard and how they impact the characters.',
  omni: 'You are Omni Pup, perceiving both environmental details and sound. Add the next concrete development in the scene that advances the plot.'
};

export function supportVoice(modelId: CanonicalModelId): string {
  return SUPPORT_VOICES[modelId] || 'You are one voice in this story.';
}

/** A shorter, stricter second prompt for a creative support turn that copied earlier text. */
export function buildSupportRetryPrompt(show: ShowRecord, modelId: CanonicalModelId): string {
  const genre = getGenreContract(show.config.theme);
  const last = [...show.turns].reverse().find(turn => turn.status === 'completed' && turn.isRelevant !== false && turn.output && turn.role !== 'decision_assistant');
  const people = storyPeople(show).join(', ');
  return `${supportVoice(modelId)} Genre: ${genre.displayName}. People: ${people || 'the same people'}. The last thing that happened: "${truncateWords(last?.stageText || last?.output || show.config.opening, 30)}" Write what happens NEXT. Do not copy or restate that sentence; use different words and a new action. Three concise sentences, about 400–500 characters total.`.slice(0, 1000);
}
