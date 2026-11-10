/**
 * Canonical Story World State & Event Ledger (P7E S3-B.4 / S3-B.5)
 *
 * Authoritative tracking for character lifecycles, resources/quantities,
 * narrative events, causal consistency, loop prevention, and progression.
 */

import { createStoryDirectorPlan, type StoryDirectorPlan } from './storyDirector.ts';

export type CharacterStatus = 'alive' | 'injured' | 'missing' | 'dead' | 'unknown';

export interface CharacterState {
  id: string;
  name: string;
  role: string;
  status: CharacterStatus;
  location: string;
  motivations: string[];
  knowledge: string[];
  pastActions: string[];
  statusChangeReason?: string;
  statusChangeTurn?: number;
}

export type EntityStatus = 'available' | 'consumed' | 'destroyed' | 'lost';

export interface EntityState {
  id: string;
  name: string;
  description: string;
  quantity?: number;
  initialQuantity?: number;
  ownerOrLocation: string;
  status: EntityStatus;
  storyRules: string[];
  sourceEventId?: string;
  depletedTurn?: number;
}

export interface RelationshipState {
  sourceName: string;
  targetName: string;
  kind: string;
  state: string;
  changes: string[];
}

export interface CanonicalFact {
  id: string;
  text: string;
  turnIndex: number;
  confidence: number;
  sourceModelId: string;
  irreversible: boolean;
}

export interface StoryConflict {
  id: string;
  description: string;
  stakes: string;
  resolved: boolean;
  resolution?: string;
  resolvedTurn?: number;
}

export type NarrativeEventType =
  | 'CHARACTER_INTRODUCED'
  | 'CHARACTER_INJURED'
  | 'CHARACTER_DIED'
  | 'CHARACTER_MISSING'
  | 'CHARACTER_RETURNED'
  | 'OBJECT_INTRODUCED'
  | 'OBJECT_ACQUIRED'
  | 'OBJECT_CONSUMED'
  | 'OBJECT_DESTROYED'
  | 'LOCATION_CHANGED'
  | 'RELATIONSHIP_CHANGED'
  | 'CLUE_DISCOVERED'
  | 'DECISION_MADE'
  | 'CONFLICT_RESOLVED'
  | 'PROGRESSION_BEAT';

export interface NarrativeEvent {
  eventId: string;
  storyId: string;
  turnIndex: number;
  modelId: string;
  type: NarrativeEventType;
  actors: string[];
  target?: string;
  canonicalKey?: string;
  description: string;
  proposedChanges: string[];
  acceptedChanges: string[];
  irreversible: boolean;
  confidence: 'high' | 'probable' | 'uncertain';
  auditLog: string[];
  timestamp: string;
}

export interface CanonicalWorldState {
  storyId: string;
  genreId: string;
  theme: string;
  premise: string;
  currentAct: 1 | 2 | 3 | 4;
  setting: {
    location: string;
    establishedRules: string[];
  };
  characters: CharacterState[];
  entities: EntityState[];
  relationships: RelationshipState[];
  establishedFacts: CanonicalFact[];
  unresolvedConflicts: StoryConflict[];
  resolvedConflicts: StoryConflict[];
  eventLog: NarrativeEvent[];
  latestAcceptedEventIds: string[];
  narrativeGoal: string;
  endingRequirements: string[];
  prohibitedContradictions: string[];
  directorPlan?: StoryDirectorPlan;
  candidateObservations?: string[];
  currentLocation?: string;
  completedMilestones?: string[];
  discoveredClues?: string[];
  locationHistory?: Array<{ location: string; turnIndex: number }>;
  bridgeDamaged?: boolean;
}

export interface ValidationOutcome {
  valid: boolean;
  issues: string[];
  acceptedEvents: NarrativeEvent[];
  rejectedEvents: NarrativeEvent[];
  prohibitedDirectives: string[];
}

export interface ContinuityAuditResult {
  verdict: 'no_conflicts' | 'review_recommended';
  label: 'No detected continuity conflicts' | 'Continuity review recommended';
  issues: string[];
  characterSummaries: Array<{ name: string; status: CharacterStatus; detail: string }>;
  entitySummaries: Array<{ name: string; status: EntityStatus; quantity?: number }>;
  actSummaries: Record<number, number>;
}

export interface StoryQualityAuditResult {
  inferenceCompleted: boolean;
  outputComplete: boolean;
  canonConsistent: boolean;
  genreContractPassed: boolean;
  loopFree: boolean;
  reviewStatus: 'pass' | 'review_recommended';
  label: string;
  issues: string[];
  details: {
    truncatedTurnsCount: number;
    repairedTurnsCount: number;
    continuityViolationsCount: number;
    loopViolationsCount: number;
    endingFulfillment: {
      addressedCentralConflict: boolean;
      genreRequirementsMet: boolean;
      notes: string;
    };
  };
}

// ─── Initial State Factory ──────────────────────────────────────────────

export function initializeCanonicalWorldState(
  paramsOrTheme: string | {
    storyId?: string;
    genreId?: string;
    theme: string;
    premise?: string;
    cast?: { protagonist: string; companion: string; role: string; setting: string; hook: string };
    endingRequirements?: string;
  },
  premise = '',
  cast?: { protagonist: string; companion: string; role: string; setting: string; hook: string },
  storyId?: string
): CanonicalWorldState {
  const params = typeof paramsOrTheme === 'string'
    ? {
        theme: paramsOrTheme,
        genreId: paramsOrTheme.toLowerCase().replace(/\s+/g, '_'),
        premise,
        cast,
        storyId: storyId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `story_${Date.now()}`),
        endingRequirements: ''
      }
    : {
        storyId: paramsOrTheme.storyId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `story_${Date.now()}`),
        genreId: paramsOrTheme.genreId || paramsOrTheme.theme.toLowerCase().replace(/\s+/g, '_'),
        theme: paramsOrTheme.theme,
        premise: paramsOrTheme.premise || '',
        cast: paramsOrTheme.cast,
        endingRequirements: paramsOrTheme.endingRequirements || ''
      };
  const characters: CharacterState[] = [];
  const entities: EntityState[] = [];
  const settingLocation = params.cast?.setting || 'the established scene';
  const settingRules: string[] = [];

  if (params.cast) {
    characters.push({
      id: `char_${params.cast.protagonist.toLowerCase()}`,
      name: params.cast.protagonist,
      role: params.cast.role,
      status: 'alive',
      location: settingLocation,
      motivations: params.cast.hook ? [`Pursue the established objective: ${params.cast.hook}`] : [],
      knowledge: params.premise ? [`Opening premise: ${params.premise}`] : [],
      pastActions: []
    });

    characters.push({
      id: `char_${params.cast.companion.toLowerCase()}`,
      name: params.cast.companion,
      role: 'companion',
      status: 'alive',
      location: settingLocation,
      motivations: [],
      knowledge: params.premise ? [`Opening premise: ${params.premise}`] : [],
      pastActions: []
    });
  }

  const fullPremise = `${params.premise || ''} ${params.cast?.hook || ''}`.trim();
  const directorPlan = createStoryDirectorPlan(params.theme, params.cast, fullPremise);

  if (directorPlan.characters.length > 0) {
    for (const c of directorPlan.characters) {
      if (!characters.some(existing => existing.name.toLowerCase() === c.name.toLowerCase())) {
        characters.push({
          id: `char_${c.name.toLowerCase()}`,
          name: c.name,
          role: c.role,
          status: 'alive',
          location: settingLocation,
          motivations: [`Face the crisis: ${directorPlan.primaryConflict}`],
          knowledge: ['Initial situation'],
          pastActions: []
        });
      }
    }
  }

  // Detect explicit resource constraints from cast hook or premise
  const medMatch = fullPremise.match(/\b(medicine|vial|dose|serum|cure)\b.*?\b(?:only\s+one|save\s+only\s+one|single|one\s+person|last)\b/i) ||
                   fullPremise.match(/\b(?:only\s+one|single|last)\s+(?:dose|vial|unit)\s+of\s+(medicine|cure|serum)\b/i);
  if (medMatch) {
    entities.push({
      id: 'entity_medicine',
      name: 'medicine',
      description: 'Single dose of medicine capable of saving only one person',
      quantity: 1,
      initialQuantity: 1,
      ownerOrLocation: params.cast?.protagonist || characters[0]?.name || 'established scene',
      status: 'available',
      storyRules: ['Single dose: can save only one person; once used, it is completely depleted.']
    });
    settingRules.push('Medicine is limited to exactly one dose.');
  }

  const boatMatch = fullPremise.match(/\bonly\s+(?:one|a\s+single)\s+(boat|ticket|seat|raft)\b/i);
  if (boatMatch) {
    entities.push({
      id: `entity_${boatMatch[1].toLowerCase()}`,
      name: boatMatch[1].toLowerCase(),
      description: `Single ${boatMatch[1]} available`,
      quantity: 1,
      initialQuantity: 1,
      ownerOrLocation: settingLocation,
      status: 'available',
      storyRules: [`Only one ${boatMatch[1]} exists for evacuation/travel.`]
    });
    settingRules.push(`Only one ${boatMatch[1]} exists.`);
  }

  const initialConflict: StoryConflict = {
    id: 'conflict_primary',
    description: params.cast?.hook || params.premise || directorPlan.primaryConflict,
    stakes: directorPlan.initialStakes || 'Meaningful consequence if unresolved',
    resolved: false
  };

  const initialEvent: NarrativeEvent = {
    eventId: `evt_${params.storyId}_0`,
    storyId: params.storyId,
    turnIndex: 0,
    modelId: 'text',
    type: 'PROGRESSION_BEAT',
    actors: characters.map(c => c.name),
    description: `Story begins: ${params.cast?.hook || params.premise || directorPlan.primaryConflict}`,
    proposedChanges: ['Story initialized with active cast and premise'],
    acceptedChanges: ['Story initialized with active cast and premise'],
    irreversible: false,
    confidence: 'high',
    auditLog: ['Initialized via canonical story config and director plan'],
    timestamp: new Date().toISOString()
  };

  return {
    storyId: params.storyId,
    genreId: params.genreId,
    theme: params.theme,
    premise: fullPremise,
    currentAct: 1,
    setting: {
      location: settingLocation,
      establishedRules: settingRules
    },
    characters,
    entities,
    relationships: characters.length >= 2 ? [{
      sourceName: characters[0].name,
      targetName: characters[1].name,
      kind: 'companions',
      state: 'allied against crisis',
      changes: ['United by initial crisis']
    }] : [],
    establishedFacts: fullPremise ? [{
      id: 'fact_premise',
      text: fullPremise,
      turnIndex: 0,
      confidence: 1.0,
      sourceModelId: 'config',
      irreversible: false
    }] : [],
    unresolvedConflicts: [initialConflict],
    resolvedConflicts: [],
    eventLog: [initialEvent],
    latestAcceptedEventIds: [initialEvent.eventId],
    narrativeGoal: params.cast?.hook || params.premise || directorPlan.primaryConflict,
    prohibitedContradictions: [],
    endingRequirements: params.endingRequirements ? [params.endingRequirements] : [directorPlan.endingRequirements],
    directorPlan,
    candidateObservations: [],
    currentLocation: settingLocation || 'origin',
    completedMilestones: [],
    discoveredClues: [],
    locationHistory: [{ location: settingLocation || 'origin', turnIndex: 0 }]
  };
}

// ─── Event Extraction from Model Prose ──────────────────────────────────

export function extractProposedEvents(
  text: string,
  worldState: CanonicalWorldState,
  modelId: string,
  turnIndex: number
): NarrativeEvent[] {
  const events: NarrativeEvent[] = [];
  const clean = text.trim();
  if (!clean) return events;

  const characters = worldState.characters;
  const entities = worldState.entities;

  // Helper to check if a match is inside dialogue quotes or preceded by hypothetical/belief markers
  const isHypotheticalOrQuote = (text: string, pattern: RegExp): boolean => {
    const match = text.match(pattern);
    if (!match) return false;
    const matchedIdx = match.index ?? 0;
    const before = text.slice(0, matchedIdx);
    const quotesBefore = (before.match(/"/g) || []).length;
    if (quotesBefore % 2 !== 0) return true; // inside dialogue quotes
    const sentenceStart = Math.max(0, before.lastIndexOf('.'), before.lastIndexOf('!'), before.lastIndexOf('?'));
    const sentencePrefix = text.slice(sentenceStart, matchedIdx);
    return /\b(?:if|could|might|would|unless|risk\s+of|fear\s+that|worried\s+that|thought\s+that|claimed\s+that|alleged|pretended|rumored|threatened\s+to|seemed\s+to\s+think)\b/i.test(sentencePrefix);
  };

  // 1. Character Death / Irreversible Loss / Status Extraction
  for (const char of characters) {
    const nameRegex = new RegExp('\\b' + char.name + '\\b', 'i');
    if (!nameRegex.test(clean)) continue;

    // Check for reunion/return of missing or separated character first
    const reunionRegex = new RegExp('\\b' + char.name + '\\b.*?\\b(?:rejoined|returned|emerged\\s+from|rescued|found\\s+alive|was\\s+not\\s+dead|survived\\s+the|reappeared)\\b|\\b(?:rescued|found\\s+alive)\\s+' + char.name + '\\b', 'i');
    if (reunionRegex.test(clean) && (char.status === 'missing' || char.status === 'dead' || char.status === 'injured')) {
      events.push({
        eventId: `evt_${worldState.storyId}_${turnIndex}_reunion_${char.name.toLowerCase()}`,
        storyId: worldState.storyId,
        turnIndex,
        modelId,
        type: 'PROGRESSION_BEAT',
        actors: [char.name],
        description: `${char.name} returned or was reunited with the group.`,
        proposedChanges: [`Change status of ${char.name} to alive`],
        acceptedChanges: [],
        irreversible: false,
        confidence: 'high',
        auditLog: [`Matched return/reunion pattern for ${char.name}`],
        timestamp: new Date().toISOString()
      });
      continue;
    }

    // Explicit high-confidence death patterns
    const deathRegex = new RegExp('\\b' + char.name + '\\b.*?\\b(?:swallowed by the flood|drowned|died|perished|succumbed|killed|lifeless body|fell to (?:his|her|their) death|drew (?:his|her|their) last breath)\\b|\\b(?:death of|body of|mourned|lost forever)\\s+' + char.name + '\\b', 'i');
    if (deathRegex.test(clean) && !isHypotheticalOrQuote(clean, deathRegex)) {
      events.push({
        eventId: `evt_${worldState.storyId}_${turnIndex}_death_${char.name.toLowerCase()}`,
        storyId: worldState.storyId,
        turnIndex,
        modelId,
        type: 'CHARACTER_DIED',
        actors: [char.name],
        description: `${char.name} died or suffered irreversible loss in the scene.`,
        proposedChanges: [`Change status of ${char.name} from ${char.status} to dead`],
        acceptedChanges: [],
        irreversible: true,
        confidence: 'high',
        auditLog: [`Matched explicit death pattern for ${char.name}`],
        timestamp: new Date().toISOString()
      });
      continue;
    }

    // Missing / separated patterns
    const missingRegex = new RegExp('\\b' + char.name + '\\b.*?\\b(?:swept away|vanished into the|lost in the|disappeared into|separated by the|washed downriver|drifted into the dark)\\b', 'i');
    if (missingRegex.test(clean) && char.status !== 'dead' && !isHypotheticalOrQuote(clean, missingRegex)) {
      events.push({
        eventId: `evt_${worldState.storyId}_${turnIndex}_missing_${char.name.toLowerCase()}`,
        storyId: worldState.storyId,
        turnIndex,
        modelId,
        type: 'CHARACTER_MISSING',
        actors: [char.name],
        description: `${char.name} became missing or separated from the group.`,
        proposedChanges: [`Change status of ${char.name} from ${char.status} to missing`],
        acceptedChanges: [],
        irreversible: false,
        confidence: 'high',
        auditLog: [`Matched separation/missing pattern for ${char.name}`],
        timestamp: new Date().toISOString()
      });
      continue;
    }

    // Injury patterns
    const injuryRegex = new RegExp('\\b' + char.name + '\\b.*?\\b(?:bleeding|wounded|injured|collapsed in pain|unable to stand|fractured)\\b', 'i');
    if (injuryRegex.test(clean) && char.status === 'alive' && !isHypotheticalOrQuote(clean, injuryRegex)) {
      events.push({
        eventId: `evt_${worldState.storyId}_${turnIndex}_inj_${char.name.toLowerCase()}`,
        storyId: worldState.storyId,
        turnIndex,
        modelId,
        type: 'CHARACTER_INJURED',
        actors: [char.name],
        description: `${char.name} suffered an injury.`,
        proposedChanges: [`Change status of ${char.name} to injured`],
        acceptedChanges: [],
        irreversible: false,
        confidence: 'probable',
        auditLog: [`Matched injury pattern for ${char.name}`],
        timestamp: new Date().toISOString()
      });
    }
  }

  // 2. Entity / Resource Consumption
  for (const entity of entities) {
    const entityNameRegex = new RegExp('\\b' + entity.name + '\\b', 'i');
    if (!entityNameRegex.test(clean)) continue;

    const consumeRegex = new RegExp('\\b(?:drank|swallowed|injected|consumed|administered|used|gave|swallowing)\\s+(?:the\\s+)?(?:last\\s+)?(?:dose\\s+of\\s+)?' + entity.name + '\\b|\\b' + entity.name + '\\s+(?:was\\s+gone|ran\\s+out|emptied|was\\s+finished|depleted)\\b', 'i');
    if (consumeRegex.test(clean)) {
      events.push({
        eventId: `evt_${worldState.storyId}_${turnIndex}_consume_${entity.id}`,
        storyId: worldState.storyId,
        turnIndex,
        modelId,
        type: 'OBJECT_CONSUMED',
        actors: characters.filter(c => new RegExp(`\\b${c.name}\\b`, 'i').test(clean)).map(c => c.name),
        target: entity.name,
        description: `${entity.name} was consumed or depleted.`,
        proposedChanges: [`Set ${entity.name} status to consumed, quantity to 0`],
        acceptedChanges: [],
        irreversible: true,
        confidence: 'high',
        auditLog: [`Matched consumption pattern for ${entity.name}`],
        timestamp: new Date().toISOString()
      });
    }

    const destroyRegex = new RegExp('\\b(?:destroyed|smashed|shattered|burned|drowned|lost|dropped)\\s+(?:the\\s+)?' + entity.name + '\\b', 'i');
    if (destroyRegex.test(clean) && !consumeRegex.test(clean)) {
      events.push({
        eventId: `evt_${worldState.storyId}_${turnIndex}_destroy_${entity.id}`,
        storyId: worldState.storyId,
        turnIndex,
        modelId,
        type: 'OBJECT_DESTROYED',
        actors: characters.filter(c => new RegExp(`\\b${c.name}\\b`, 'i').test(clean)).map(c => c.name),
        target: entity.name,
        description: `${entity.name} was destroyed or lost.`,
        proposedChanges: [`Set ${entity.name} status to destroyed`],
        acceptedChanges: [],
        irreversible: true,
        confidence: 'probable',
        auditLog: [`Matched destruction pattern for ${entity.name}`],
        timestamp: new Date().toISOString()
      });
    }
  }

  // 3. Location and Milestone Transitions
  if (/\b(?:crossed|made\s+it\s+across)\s+(?:the\s+)?(?:rope\s+)?bridge\b/i.test(clean)) {
    events.push({
      eventId: `evt_${worldState.storyId}_${turnIndex}_cross_bridge`,
      storyId: worldState.storyId,
      turnIndex,
      modelId,
      type: 'LOCATION_CHANGED',
      actors: characters.filter(c => new RegExp(`\\b${c.name}\\b`, 'i').test(clean)).map(c => c.name),
      target: 'crossed_rope_bridge',
      description: 'Characters crossed the rope bridge to the opposite canyon ledge.',
      proposedChanges: ['Update location past the rope bridge', 'Mark bridge crossed'],
      acceptedChanges: [],
      irreversible: true,
      confidence: 'high',
      auditLog: ['Matched bridge crossing action'],
      timestamp: new Date().toISOString()
    });
  }

  if (/\b(?:reach(?:ed|ing)?|enter(?:ed|ing)?|arrived\s+at)\s+(?:the\s+)?(?:high\s+)?(?:plateau\s+)?shelter\b/i.test(clean)) {
    events.push({
      eventId: `evt_${worldState.storyId}_${turnIndex}_reach_shelter`,
      storyId: worldState.storyId,
      turnIndex,
      modelId,
      type: 'LOCATION_CHANGED',
      actors: characters.filter(c => new RegExp(`\\b${c.name}\\b`, 'i').test(clean)).map(c => c.name),
      target: 'high_plateau_shelter',
      description: 'Characters reached the high plateau shelter.',
      proposedChanges: ['Update location to high plateau shelter'],
      acceptedChanges: [],
      irreversible: false,
      confidence: 'high',
      auditLog: ['Matched plateau shelter arrival'],
      timestamp: new Date().toISOString()
    });
  }

  if (/\b(?:dr(?:ied|y(?:ing)?)|spread(?:ing)?)\s+(?:the\s+)?maps?\b/i.test(clean)) {
    events.push({
      eventId: `evt_${worldState.storyId}_${turnIndex}_dry_maps`,
      storyId: worldState.storyId,
      turnIndex,
      modelId,
      type: 'PROGRESSION_BEAT',
      actors: characters.filter(c => new RegExp(`\\b${c.name}\\b`, 'i').test(clean)).map(c => c.name),
      target: 'dried_maps',
      description: 'Characters dried maps by the fire.',
      proposedChanges: ['Mark maps dried and secured'],
      acceptedChanges: [],
      irreversible: true,
      confidence: 'high',
      auditLog: ['Matched map drying milestone'],
      timestamp: new Date().toISOString()
    });
  }

  // 4. Clue & Discovery Extraction (Loose Stone, Caves, Trail)
  const discoveryMatch = clean.match(/\b(?:discover(?:ed|ing)?|found|spot(?:ted)?|notic(?:ed|ing)?|uncover(?:ed|ing)?|revealed|saw)\s+(?:a\s+|the\s+)?(loose\s+stone|hidden\s+cave[s]?|fresh\s+trail|broken\s+plank[s]?|snapped\s+cable|secret\s+passage)\b/i);
  if (discoveryMatch) {
    const rawTarget = discoveryMatch[1].toLowerCase().replace(/\s+/g, '_');
    const normalizedTarget = rawTarget.endsWith('s') && rawTarget.includes('cave') ? 'hidden_caves' : rawTarget;
    events.push({
      eventId: `evt_${worldState.storyId}_${turnIndex}_disc_${normalizedTarget}`,
      storyId: worldState.storyId,
      turnIndex,
      modelId,
      type: 'CLUE_DISCOVERED',
      actors: characters.filter(c => new RegExp(`\\b${c.name}\\b`, 'i').test(clean)).map(c => c.name),
      target: normalizedTarget,
      description: `Discovered ${discoveryMatch[1]}.`,
      proposedChanges: [`Record discovery of ${normalizedTarget}`],
      acceptedChanges: [],
      irreversible: true,
      confidence: 'high',
      auditLog: [`Matched discovery of ${discoveryMatch[1]}`],
      timestamp: new Date().toISOString()
    });
  }

  // 4b. Dynamic Character Discovery / Introduction
  const introMatch = clean.match(/\b(?:introduced|approached|met|encountered|found|unmasked|spoke with|discovered)\s+(?:a\s+(?:man|woman|stranger|ranger|crewmate|detective|scientist)\s+named\s+|an?|the\s+)?([A-Z][a-z]+)\b/);
  if (introMatch) {
    const candidateName = introMatch[1];
    const commonWords = new Set(['The','Then','When','After','Before','But','And','She','He','They','Suddenly','Inside','Outside','Somewhere']);
    if (!commonWords.has(candidateName) && !characters.some(c => c.name.toLowerCase() === candidateName.toLowerCase())) {
      events.push({
        eventId: `evt_${worldState.storyId}_${turnIndex}_intro_${candidateName.toLowerCase()}`,
        storyId: worldState.storyId,
        turnIndex,
        modelId,
        type: 'CHARACTER_INTRODUCED',
        actors: [candidateName],
        description: `${candidateName} was introduced into the scene.`,
        proposedChanges: [`Add ${candidateName} to active characters`],
        acceptedChanges: [],
        irreversible: false,
        confidence: 'probable',
        auditLog: [`Matched introduction pattern for ${candidateName}`],
        timestamp: new Date().toISOString()
      });
    }
  }

  // 4c. Universal Location Transitions
  const universalLocMatch = clean.match(/\b(?:enter(?:ed|ing)?|walk(?:ed|ing)?\s+into|step(?:ped|ping)?\s+into|arriv(?:ed|ing)?\s+at|reach(?:ed|ing)?|return(?:ed|ing)?\s+to|fled\s+to|retreated\s+to)\s+(?:the\s+|an?\s+)?([a-z0-9\s'-]+?\b(?:room|chamber|hall|corridor|office|lab|station|deck|canyon|cave|cavern|vault|archive|library|courtyard|sanctuary|cabin|shuttle|hangar|tower|dock|cellar|street|alley|quarter|sector|camp|shelter|house|ruins|clearing|ledge|plateau|grove|garden))\b/i);
  if (universalLocMatch && !events.some(e => e.type === 'LOCATION_CHANGED')) {
    const locName = universalLocMatch[1].trim().toLowerCase();
    events.push({
      eventId: `evt_${worldState.storyId}_${turnIndex}_loc_${locName.replace(/\s+/g, '_')}`,
      storyId: worldState.storyId,
      turnIndex,
      modelId,
      type: 'LOCATION_CHANGED',
      actors: characters.filter(c => new RegExp(`\\b${c.name}\\b`, 'i').test(clean)).map(c => c.name),
      target: locName,
      description: `Moved to ${locName}.`,
      proposedChanges: [`Update location to ${locName}`],
      acceptedChanges: [],
      irreversible: false,
      confidence: 'probable',
      auditLog: [`Matched universal location transition: ${locName}`],
      timestamp: new Date().toISOString()
    });
  }

  // 4d. Universal Clue & Discovery Extraction
  const universalDiscMatch = clean.match(/\b(?:discover(?:ed|ing)?|found|spot(?:ted|ting)?|notic(?:ed|ing)?|uncover(?:ed|ing)?|reveal(?:ed|ing)?)\s+(?:a|an|the)\s+([a-z0-9\s'-]+?\b(?:key|note|letter|document|drive|chip|map|rune|crystal|vial|blade|footprint|mark|device|beacon|relic|journal|diary|ledger|record|casket|symbol|compartment))\b/i);
  if (universalDiscMatch && !events.some(e => e.type === 'CLUE_DISCOVERED')) {
    const discTarget = universalDiscMatch[1].trim().toLowerCase().replace(/\s+/g, '_');
    events.push({
      eventId: `evt_${worldState.storyId}_${turnIndex}_disc_${discTarget}`,
      storyId: worldState.storyId,
      turnIndex,
      modelId,
      type: 'CLUE_DISCOVERED',
      actors: characters.filter(c => new RegExp(`\\b${c.name}\\b`, 'i').test(clean)).map(c => c.name),
      target: discTarget,
      description: `Discovered ${universalDiscMatch[1]}.`,
      proposedChanges: [`Record discovery of ${discTarget}`],
      acceptedChanges: [],
      irreversible: true,
      confidence: 'high',
      auditLog: [`Matched universal discovery: ${universalDiscMatch[1]}`],
      timestamp: new Date().toISOString()
    });
  }

  // 5. General Progression Beat
  // Canonical identities are independent of the writer's choice of verbs.
  // Match completed actions only; mentions of old facts do not create events.
  const semanticPatterns: Array<{ key: string; type: NarrativeEventType; pattern: RegExp; description: string }> = [
    { key: 'discover:loose_stone', type: 'CLUE_DISCOVERED', pattern: /\b(?:found|discover\w*|notic\w*|spott?\w*|uncover\w*|revea\w*|came upon|caught sight of)\b[^.!?]{0,65}\b(?:loose|wobbl\w*|unsteady)\s+(?:stone|rock)\b|\b(?:loose|wobbl\w*|unsteady)\s+(?:stone|rock)\b[^.!?]{0,45}\b(?:revealed|appeared|came into view)\b/i, description: 'Found the loose stone' },
    { key: 'discover:hidden_caves', type: 'CLUE_DISCOVERED', pattern: /\b(?:found|discover\w*|notic\w*|spott?\w*|uncover\w*|revea\w*|came upon|caught sight of|opened onto)\b[^.!?]{0,65}\b(?:hidden|secret|concealed)?\s*(?:caves?|caverns?|cave mouths?)\b|\b(?:caves?|caverns?)\b[^.!?]{0,45}\b(?:appeared|came into view|were revealed)\b/i, description: 'Found the caves' },
    { key: 'action:dry_maps', type: 'PROGRESSION_BEAT', pattern: /\b(?:dr(?:ied|ying|y)|air(?:ed|ing)?|spread(?:ing)?\s+out|held)\b[^.!?]{0,45}\bmaps?\b[^.!?]{0,35}\b(?:fire|flames|heat|sun|dry|warm)\b|\bmaps?\b[^.!?]{0,45}\b(?:dr(?:ied|ying)|air(?:ed|ing)?\s+out)\b/i, description: 'Dried the maps' },
    { key: 'move:canyon_edge', type: 'LOCATION_CHANGED', pattern: /\b(?:moved|walked|went|headed|approached|advanced|stepped|returned|came)\b[^.!?]{0,55}\b(?:canyon|gorge|ravine)\s+(?:edge|rim|side|lip)\b|\b(?:neared|reached)\s+(?:the\s+)?(?:canyon|gorge|ravine)\b/i, description: 'Moved to the canyon edge' },
    { key: 'move:inside_caves', type: 'LOCATION_CHANGED', pattern: /\b(?:entered|went\s+into|stepped\s+into|moved\s+inside|climbed\s+into|ducked\s+into)\b[^.!?]{0,35}\b(?:cave|cavern|passage)\b/i, description: 'Entered the caves' },
    { key: 'move:trail', type: 'LOCATION_CHANGED', pattern: /\b(?:followed|took|walked|headed|moved|continued)\b[^.!?]{0,35}\b(?:trail|path)\b/i, description: 'Moved along the trail' },
    { key: 'cross:bridge', type: 'LOCATION_CHANGED', pattern: /\b(?:crossed|made\s+it\s+across|reached\s+the\s+far\s+side\s+of)\b[^.!?]{0,40}\b(?:bridge|gorge|canyon)\b|\b(?:bridge|gorge|canyon)\b[^.!?]{0,35}\b(?:crossed|behind\s+them)\b|\b(?:they|we|\w+\s+and\s+\w+)\s+cross\s+(?:safely|successfully)\b|\bcrossed\s+(?:safely|successfully)\b|\b(?:guides?|guided|leads?|led|walks?|walked)\b[^.!?]{0,50}\bacross\s+(?:the\s+)?(?:crumbling\s+)?(?:rope\s+)?bridge\b|\bbridge\b[\s\S]{0,140}\b(?:steers?|rides?|walks?|moves?|climbs?|leaps?|runs?)\b[^.!?]{0,50}\b(?:over|across)\s+it\b/i, description: 'Crossed the bridge to the far side' },
    { key: 'state:bridge_damaged', type: 'PROGRESSION_BEAT', pattern: /\b(?:bridge|planks?|cables?)\b[^.!?]{0,45}\b(?:broke|broken|snapped|collapsed|splintered|damaged|torn|gave\s+way|split|splits|crumbl\w*)\b|\b(?:broke|broken|snapped|collapsed|splintered|damaged|split|splits|crumbl\w*)\b[^.!?]{0,35}\bbridge\b/i, description: 'Bridge was damaged' },
    { key: 'discover:cryo_chip', type: 'CLUE_DISCOVERED', pattern: /\b(?:found|discover\w*|notic\w*|spott?\w*|uncover\w*|retriev\w*|secur\w*|extract\w*|held|locat\w*)\b[^.!?]{0,55}\b(?:cryo[- ]?chip|data[- ]?chip|memory[- ]?core|security[- ]?chip|access[- ]?key|keycard|drive)\b|\b(?:cryo[- ]?chip|data[- ]?chip|memory[- ]?core)\b[^.!?]{0,45}\b(?:gleamed|rested|contained|surfaced|was\s+in\s+hand)\b/i, description: 'Found and secured the cryo-chip' },
    { key: 'action:vent_emergency', type: 'PROGRESSION_BEAT', pattern: /\b(?:vent(?:s|ing)?|ventilation|coolant\s+leak|air\s+filter|ducts?)\b[^.!?]{0,55}\b(?:emergenc\w*|fail\w*|ruptur\w*|leak\w*|alarm|hazard|clog\w*|smoke)\b|\b(?:sealed?|repaired?|cleared?|purged?|shut\s+down)\b[^.!?]{0,45}\b(?:vent(?:s|ing)?|coolant|air\s+ducts?)\b/i, description: 'Addressed the vent emergency' },
    { key: 'move:airlock', type: 'LOCATION_CHANGED', pattern: /\b(?:reached|entered|went\s+to|cycled|stepped\s+into)\b[^.!?]{0,35}\bairlock\b/i, description: 'Moved to the airlock chamber' },
    { key: 'move:control_bridge', type: 'LOCATION_CHANGED', pattern: /\b(?:reached|entered|went\s+to|approached|stepped\s+into)\b[^.!?]{0,35}\b(?:control\s+room|main\s+bridge|command\s+center)\b/i, description: 'Moved to the central control room' },
    { key: 'move:reactor_core', type: 'LOCATION_CHANGED', pattern: /\b(?:reached|entered|went\s+to|approached|stepped\s+into)\b[^.!?]{0,35}\b(?:reactor|power\s+core|engineering\s+bay)\b/i, description: 'Moved to the reactor core' },
    { key: 'climax:self_destruct', type: 'PROGRESSION_BEAT', pattern: /\b(?:initiated?|triggered?|set|activated?|confirmed)\b[^.!?]{0,45}\b(?:self[- ]?destruct|station\s+destruct|overload|countdown)\b/i, description: 'Triggered station self-destruct' },
    { key: 'climax:recover_chip', type: 'PROGRESSION_BEAT', pattern: /\b(?:prioritized?|secured?|chose|decided\s+to\s+save|downloaded?|extracted?)\b[^.!?]{0,45}\b(?:cryo[- ]?chip|chip|data|memory\s+core)\b[^.!?]{0,35}\b(?:instead|rather\s+than|safely|in\s+pocket)\b/i, description: 'Secured the cryo-chip rather than destroying the station' },
    { key: 'climax:eject_module', type: 'PROGRESSION_BEAT', pattern: /\b(?:jettisoned?|ejected?|sealed\s+off|purged)\b[^.!?]{0,45}\b(?:module|pod|station\s+wing|infected\s+sector)\b/i, description: 'Ejected the compromised module' }
  ];
  for (const rule of semanticPatterns) {
    if (!rule.pattern.test(clean) || events.some(e => e.canonicalKey === rule.key)) continue;
    if (rule.type === 'CLUE_DISCOVERED') {
      const alreadyKnown = (worldState.discoveredClues || []).includes(rule.key.replace('discover:', '')) ||
        (worldState.eventLog || []).some(e => e.canonicalKey === rule.key);
      if (alreadyKnown && /\b(?:beyond|near|mouth\s+of|inside|toward|into|that\s+\w+\s+(?:had\s+)?found|already)\b/i.test(clean)) {
        continue;
      }
    }
    events.push({ eventId: `evt_${worldState.storyId}_${turnIndex}_${rule.key.replace(/\W/g, '_')}`,
      storyId: worldState.storyId, turnIndex, modelId, type: rule.type,
      actors: characters.filter(c => new RegExp(`\\b${c.name}\\b`, 'i').test(clean)).map(c => c.name),
      target: rule.key, canonicalKey: rule.key, description: rule.description,
      proposedChanges: [rule.description], acceptedChanges: [], irreversible: true,
      confidence: 'high', auditLog: ['Canonical semantic action match'], timestamp: new Date().toISOString() });
  }
  // Normalize legacy extractor events to the same stable identity.
  for (const event of events) {
    if (event.canonicalKey) continue;
    if (event.type === 'CLUE_DISCOVERED' && event.target) event.canonicalKey = `discover:${event.target}`;
    if (event.target === 'dried_maps') event.canonicalKey = 'action:dry_maps';
    if (event.target === 'crossed_rope_bridge') event.canonicalKey = 'cross:bridge';
  }
  const seen = new Set<string>();
  for (let i = events.length - 1; i >= 0; i--) {
    const key = events[i].canonicalKey;
    if (key && seen.has(key)) events.splice(i, 1);
    else if (key) seen.add(key);
  }
  if (events.length === 0) {
    events.push({
      eventId: `evt_${worldState.storyId}_${turnIndex}_prog`,
      storyId: worldState.storyId,
      turnIndex,
      modelId,
      type: 'PROGRESSION_BEAT',
      actors: characters.filter(c => new RegExp(`\\b${c.name}\\b`, 'i').test(clean)).map(c => c.name),
      description: clean.slice(0, 100),
      proposedChanges: ['Story progression step'],
      acceptedChanges: [],
      irreversible: false,
      confidence: 'probable',
      auditLog: ['General narrative progression without explicit character state trigger'],
      timestamp: new Date().toISOString()
    });
  }

  return events;
}

// ─── Causal Validation Engine ───────────────────────────────────────────

export function validateProposedEvents(
  proposedEvents: NarrativeEvent[],
  rawProse: string,
  worldState: CanonicalWorldState
): ValidationOutcome {
  const issues: string[] = [];
  const acceptedEvents: NarrativeEvent[] = [];
  const rejectedEvents: NarrativeEvent[] = [];
  const prohibitedDirectives: string[] = [];

  const priorKeys = new Set(worldState.eventLog.map(event => event.canonicalKey).filter(Boolean));
  for (const event of proposedEvents) {
    const key = event.canonicalKey;
    if (!key) continue;
    if (key !== 'move:trail' && key !== 'state:bridge_damaged' && priorKeys.has(key) && !/\b(?:back|returned|repaired|rebuilt|new|another)\b/i.test(rawProse)) {
      issues.push(`Repeated canonical event: ${event.description} already happened.`);
      prohibitedDirectives.push(`${event.description} is complete. Show a consequence or a new action.`);
    }
    if (key === 'move:canyon_edge' && worldState.completedMilestones?.includes('cross:bridge') && !/\b(?:back|returned|retreated)\b/i.test(rawProse)) {
      issues.push('Location regression: characters already crossed the canyon.');
    }
    if (key === 'cross:bridge' && worldState.bridgeDamaged && !/\b(?:repaired|rebuilt|alternate|other|new|patched|tied|secured|anchored|lifeline|raft)\b/i.test(rawProse)) {
      issues.push('Causal conflict: the bridge is damaged; crossing needs an explicit repair or alternate route.');
    }
  }

  // 1. Dead Character Contradiction Check
  const deadCharacters = worldState.characters.filter(c => c.status === 'dead');
  for (const deadChar of deadCharacters) {
    const deadName = deadChar.name;
    const nameRegex = new RegExp('\\b' + deadName + '\\b', 'i');
    if (nameRegex.test(rawProse)) {
      const activeAction = new RegExp('\\b' + deadName + '\\s+(?:grabbed|ran|walked|stepped|spoke|whispered|screamed|answered|smiled|decided|fought|opened|pushed|held|nodded|stood|shouted|helped|climbed|turned|noticed|reached|lifted|carried|jumped|attacked|examined|searched|fired|struck|leaned|pointed|sighed|laughed|asked|replied|crawled|pulled)\\b', 'i');
      const memoryMention = new RegExp('\\b(?:memory of|remembering|thinking of|grieving for|in memory of|mourning)\\s+' + deadName + '\\b', 'i');
      if (activeAction.test(rawProse) && !memoryMention.test(rawProse)) {
        issues.push(
          `Character '${deadName}' was confirmed dead in turn ${(deadChar.statusChangeTurn ?? 0) + 1} and cannot perform physical actions or dialogue.`
        );
        prohibitedDirectives.push(`${deadName} is dead. Do not show ${deadName} speaking, moving, or acting.`);
      }
    }
  }

  // 1b. Missing Character Contradiction Check
  const missingCharacters = worldState.characters.filter(c => c.status === 'missing');
  for (const missingChar of missingCharacters) {
    const missingName = missingChar.name;
    const nameRegex = new RegExp('\\b' + missingName + '\\b', 'i');
    if (nameRegex.test(rawProse)) {
      const activeAction = new RegExp('\\b' + missingName + '\\s+(?:grabbed|ran|walked|stepped|spoke|whispered|screamed|answered|smiled|decided|fought|opened|pushed|held|nodded|stood|shouted|helped|climbed|turned|noticed|reached|lifted|carried|jumped|attacked|examined|searched|fired|struck|leaned|pointed|sighed|laughed|asked|replied|crawled|pulled)\\b', 'i');
      const reunionOrThought = new RegExp('\\b(?:memory of|remembering|thinking of|wondering about|searching for|looking for|hoping for|rejoined|returned|rescued|emerged|found|reappeared)\\b', 'i');
      if (activeAction.test(rawProse) && !reunionOrThought.test(rawProse)) {
        issues.push(
          `Character '${missingName}' is currently separated or missing and cannot participate in the scene without an established reunion or return.`
        );
        prohibitedDirectives.push(`${missingName} is missing. Re-establish their return before they can actively participate.`);
      }
    }
  }

  // 2. Resource Depletion Contradiction Check
  const depletedEntities = worldState.entities.filter(e => e.status === 'consumed' || e.status === 'destroyed' || (e.quantity !== undefined && e.quantity <= 0));
  for (const entity of depletedEntities) {
    const entityRegex = new RegExp('\\b' + entity.name + '\\b', 'i');
    if (entityRegex.test(rawProse)) {
      const reuseAction = new RegExp('\\b(?:drank|gave|used|took|swallowed|administered|offered|shared)\\s+(?:the\\s+)?(?:another\\s+)?(?:remaining\\s+)?' + entity.name + '\\b|\\b' + entity.name + '\\s+(?:could\\s+save|saved|healed|cured)\\b', 'i');
      const emptyMention = new RegExp('\\b(?:empty|no\\s+more|ran\\s+out|depleted|no)\\s+' + entity.name + '\\b', 'i');
      if (reuseAction.test(rawProse) && !emptyMention.test(rawProse)) {
        issues.push(
          `Entity '${entity.name}' was consumed/depleted in turn ${(entity.depletedTurn ?? 0) + 1} and cannot be reused or save another person.`
        );
        prohibitedDirectives.push(`${entity.name} is completely consumed (0 remaining). It cannot be reused or save anyone else.`);
      }
    }
  }

  // 3. Repeated Sacrifices / Groundhog Day Check
  const pastEvents = worldState.eventLog;
  const isDecisiveSacrifice = /\b(?:ultimate sacrifice|decisive sacrifice|sacrificed (?:his|her|their) life|gave (?:his|her|their) life)\b/i.test(rawProse);
  if (isDecisiveSacrifice) {
    const priorSacrifice = pastEvents.some(e =>
      /\b(?:ultimate sacrifice|decisive sacrifice|sacrificed (?:his|her|their) life|gave (?:his|her|their) life)\b/i.test(e.description)
    );
    if (priorSacrifice) {
      issues.push('Repeated decisive sacrifice: an ultimate or decisive sacrifice was already made in an earlier turn.');
      prohibitedDirectives.push('Do not repeat the decisive sacrifice.');
    }
  }

  // 4. Unsupported Entity Mutation Check
  const mutationChecks = [
    { from: /\b(?:wooden stick|tree branch|stick|dry branch)\b/i, to: /\b(?:knife|dagger|blade|steel sword)\b/i, desc: 'a wooden stick became a knife or blade' },
    { from: /\b(?:simple stone|pebble|rock)\b/i, to: /\b(?:key|amulet|jewel|crystal|gem)\b/i, desc: 'a stone became a key or crystal' }
  ];
  for (const check of mutationChecks) {
    const hasInitialSimpleObject = worldState.establishedFacts.some(f => check.from.test(f.text)) ||
                                   worldState.entities.some(e => check.from.test(e.name) || check.from.test(e.description));
    if (hasInitialSimpleObject && check.to.test(rawProse)) {
      const hasExplanation = /\b(?:carved|sharpened|whittled|pulled out a|revealed a|found a|swapped|replaced with a|drew a|brought a)\b/i.test(rawProse);
      if (!hasExplanation) {
        issues.push(`Unsupported object mutation: ${check.desc} without narrative explanation.`);
        prohibitedDirectives.push(`Do not change objects without narrative explanation (${check.desc}).`);
      }
    }
  }

  // 5. Repeated Milestone / Action Checks
  const completedMilestones = worldState.completedMilestones || [];
  if (completedMilestones.includes('crossed_rope_bridge')) {
    if (/\b(?:crossed|made\s+their\s+way\s+across)\s+(?:the\s+)?(?:rope\s+)?bridge\b/i.test(rawProse) && !/\b(?:crossed\s+back|returned\s+across|retreated)\b/i.test(rawProse)) {
      issues.push("Repeated action: The rope bridge was already crossed in an earlier turn. Characters are already across the gorge.");
      prohibitedDirectives.push("The rope bridge is already crossed. Do not depict crossing it again.");
    }
  }

  if (completedMilestones.includes('dried_maps')) {
    if (/\b(?:dr(?:ied|y(?:ing)?)|spread(?:ing)?)\s+(?:the\s+)?maps?\s+(?:near|by)\s+(?:the\s+)?fire\b/i.test(rawProse)) {
      issues.push("Repeated action: Maps were already dried by the fire in an earlier turn.");
      prohibitedDirectives.push("The maps are already dried and packed. Move forward to the next objective.");
    }
  }

  // 6. Repeated Discovery Checks (Loose Stone, Caves, and Generalized Clues across all genres)
  const discoveredClues = worldState.discoveredClues || [];
  if (discoveredClues.includes('loose_stone')) {
    if (/\b(?:discover(?:ed|ing)?|found|spot(?:ted)?|notic(?:ed|ing)?)\s+(?:a\s+|the\s+)?loose\s+stone\b/i.test(rawProse)) {
      issues.push("Repeated discovery: The loose stone was already found in an earlier turn.");
      prohibitedDirectives.push("The loose stone was already found. Do not rediscover it; inspect what it conceals or move onward.");
    }
  }

  if (discoveredClues.includes('hidden_caves')) {
    if (/\b(?:discover(?:ed|ing)?|found|spot(?:ted)?|notic(?:ed|ing)?)\s+(?:a\s+|the\s+)?hidden\s+cave[s]?\b/i.test(rawProse)) {
      if (!/\b(?:that\s+\w+\s+(?:had\s+)?found|already\s+found|previously\s+found)\b/i.test(rawProse)) {
        issues.push("Repeated discovery: Hidden caves were already discovered in an earlier turn.");
        prohibitedDirectives.push("The hidden caves were already discovered. Explore inside or proceed rather than discovering them again.");
      }
    }
  }

  for (const clue of discoveredClues) {
    if (clue === 'loose_stone' || clue === 'hidden_caves') continue;
    const cleanClue = clue.replace(/_/g, ' ');
    const clueRegex = new RegExp('\\b(?:discover(?:ed|ing)?|found|spot(?:ted)?|notic(?:ed|ing)?|uncover(?:ed|ing)?)\\s+(?:a\\s+|the\\s+)?' + cleanClue + '\\b', 'i');
    if (clueRegex.test(rawProse)) {
      const acknowledged = new RegExp('\\b(?:that\\s+\\w+\\s+(?:had\\s+)?found|already\\s+found|previously\\s+found|remembered|the\\s+known|which\\s+was\\s+found)\\b', 'i');
      if (!acknowledged.test(rawProse)) {
        issues.push(`Repeated discovery: '${cleanClue}' was already discovered in an earlier turn.`);
        prohibitedDirectives.push(`'${cleanClue}' was already found. Advance the story rather than rediscovering it.`);
      }
    }
  }

  // 7. Abrupt Location Jump Check
  if (worldState.currentLocation && worldState.currentLocation !== 'established scene') {
    const abruptRegex = /\b(?:meanwhile,\s+at|miles\s+away\s+in|back\s+at\s+the|across\s+the\s+continent\s+in|suddenly\s+at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/i;
    const abruptMatch = rawProse.match(abruptRegex);
    if (abruptMatch) {
      const transitionPresent = /\b(?:traveled|journeyed|flew|walked|rode|after\s+hours|eventually|teleported|returned\s+to|fled\s+to)\b/i.test(rawProse);
      if (!transitionPresent) {
        issues.push(`Abrupt location transition: Jumped to '${abruptMatch[1]}' without established travel or narrative transition.`);
        prohibitedDirectives.push(`Provide a continuous transition or travel beat before changing to a distant setting.`);
      }
    }
  }

  // 8. Creative Plot Twist Preservation (Test F)
  const isIntentionalTwist = /\b(?:revealed\s+that|in\s+truth|a\s+disguise|faked\s+(?:his|her|their)\s+death|was\s+not\s+actually\s+dead|the\s+corpse\s+was\s+a\s+dummy|turned\s+out\s+to\s+be|an\s+illusion|unreliable\s+narrator|staged\s+the\s+death)\b/i.test(rawProse);
  if (isIntentionalTwist) {
    for (let i = issues.length - 1; i >= 0; i--) {
      if (issues[i].includes("was confirmed dead")) {
        issues.splice(i, 1);
      }
    }
  }

  const pastDeaths = pastEvents.filter(e => e.type === 'CHARACTER_DIED');
  for (const proposed of proposedEvents) {
    if (proposed.type === 'CHARACTER_DIED') {
      const alreadyDied = pastDeaths.some(e => e.actors.some(a => proposed.actors.includes(a)));
      if (alreadyDied) {
        issues.push(`Repeated sacrifice: ${proposed.actors.join(', ')} already suffered death/sacrifice in an earlier turn.`);
        prohibitedDirectives.push(`Do not repeat the sacrifice of ${proposed.actors.join(', ')}.`);
        rejectedEvents.push(proposed);
        continue;
      }
    }

    if (proposed.type === 'OBJECT_CONSUMED') {
      const alreadyConsumed = pastEvents.some(e => e.type === 'OBJECT_CONSUMED' && e.target === proposed.target);
      if (alreadyConsumed) {
        issues.push(`Repeated consumption: ${proposed.target} was already consumed.`);
        prohibitedDirectives.push(`${proposed.target} was already consumed.`);
        rejectedEvents.push(proposed);
        continue;
      }
    }

    if (issues.length === 0) {
      acceptedEvents.push(proposed);
    } else {
      rejectedEvents.push(proposed);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    acceptedEvents: issues.length === 0 ? proposedEvents : [],
    rejectedEvents: issues.length > 0 ? proposedEvents : [],
    prohibitedDirectives
  };
}

// ─── Canonical State Transition ─────────────────────────────────────────

export function applyEventsToWorldState(
  state: CanonicalWorldState,
  acceptedEvents: NarrativeEvent[],
  turnIndex: number,
  totalPlannedTurns = 9
): CanonicalWorldState {
  if (acceptedEvents.length === 0) return state;

  const nextCharacters = state.characters.map(c => ({ ...c, pastActions: [...c.pastActions] }));
  const nextEntities = state.entities.map(e => ({ ...e, storyRules: [...e.storyRules] }));
  const nextRelationships = state.relationships.map(r => ({ ...r, changes: [...r.changes] }));
  const nextConflicts = state.unresolvedConflicts.map(c => ({ ...c }));
  const resolvedConflicts = [...state.resolvedConflicts];
  const prohibitedContradictions = [...(state.prohibitedContradictions || [])];
  const acceptedIds: string[] = [];
  let nextLocation = state.currentLocation || state.setting.location;
  const nextLocationHistory = [...(state.locationHistory || [])];
  const nextMilestones = [...(state.completedMilestones || [])];
  const nextDiscoveries = [...(state.discoveredClues || [])];
  let bridgeDamaged = !!state.bridgeDamaged;

  for (const evt of acceptedEvents) {
    acceptedIds.push(evt.eventId);
    if (evt.canonicalKey) {
      if (evt.canonicalKey !== 'move:trail') nextMilestones.push(evt.canonicalKey);
      if (evt.canonicalKey.startsWith('discover:')) nextDiscoveries.push(evt.canonicalKey.slice(9));
      if (evt.canonicalKey === 'state:bridge_damaged') bridgeDamaged = true;
      if (evt.canonicalKey === 'move:canyon_edge') nextLocation = 'canyon edge';
      if (evt.canonicalKey === 'move:inside_caves') nextLocation = 'inside caves';
      if (evt.canonicalKey === 'move:trail') nextLocation = 'trail beyond the last location';
      if (evt.canonicalKey === 'cross:bridge') nextLocation = 'far side of canyon';
      if (evt.canonicalKey === 'move:airlock') nextLocation = 'airlock chamber';
      if (evt.canonicalKey === 'move:control_bridge') nextLocation = 'central control room';
      if (evt.canonicalKey === 'move:reactor_core') nextLocation = 'reactor core';
      if (evt.canonicalKey?.startsWith('move:') || evt.canonicalKey === 'cross:bridge') {
        nextLocationHistory.push({ location: nextLocation, turnIndex });
        for (const character of nextCharacters) character.location = nextLocation;
      }
    }

    if (evt.type === 'LOCATION_CHANGED' && evt.target && !evt.canonicalKey) {
      nextLocation = evt.target.replace(/_/g, ' ');
      nextLocationHistory.push({ location: nextLocation, turnIndex });
      for (const character of nextCharacters) character.location = nextLocation;
    }

    if (evt.type === 'CLUE_DISCOVERED' && evt.target) {
      if (!nextDiscoveries.includes(evt.target)) nextDiscoveries.push(evt.target);
    }

    if (evt.description.includes('returned') || evt.description.includes('reunited')) {
      for (const actor of evt.actors) {
        const found = nextCharacters.find(c => c.name.toLowerCase() === actor.toLowerCase());
        if (found) {
          found.status = 'alive';
          found.statusChangeReason = evt.description;
          found.statusChangeTurn = turnIndex;
          found.pastActions.push(`Turn ${turnIndex + 1}: Reunited / returned`);
          for (let p = prohibitedContradictions.length - 1; p >= 0; p--) {
            if (prohibitedContradictions[p].includes(found.name)) {
              prohibitedContradictions.splice(p, 1);
            }
          }
        }
      }
    }

    if (evt.type === 'CHARACTER_DIED') {
      for (const actor of evt.actors) {
        const found = nextCharacters.find(c => c.name.toLowerCase() === actor.toLowerCase());
        if (found) {
          found.status = 'dead';
          found.statusChangeReason = evt.description;
          found.statusChangeTurn = turnIndex;
          found.pastActions.push(`Turn ${turnIndex + 1}: ${evt.description}`);
          evt.acceptedChanges.push(`Character ${found.name} status updated to dead.`);
          prohibitedContradictions.push(`Do not have ${found.name} act or speak (deceased).`);
        }
      }
    } else if (evt.type === 'CHARACTER_MISSING') {
      for (const actor of evt.actors) {
        const found = nextCharacters.find(c => c.name.toLowerCase() === actor.toLowerCase());
        if (found && found.status !== 'dead') {
          found.status = 'missing';
          found.statusChangeReason = evt.description;
          found.statusChangeTurn = turnIndex;
          found.pastActions.push(`Turn ${turnIndex + 1}: Separated / missing`);
          evt.acceptedChanges.push(`Character ${found.name} status updated to missing.`);
        }
      }
    } else if (evt.type === 'CHARACTER_INJURED') {
      for (const actor of evt.actors) {
        const found = nextCharacters.find(c => c.name.toLowerCase() === actor.toLowerCase());
        if (found && found.status === 'alive') {
          found.status = 'injured';
          found.statusChangeReason = evt.description;
          found.statusChangeTurn = turnIndex;
          found.pastActions.push(`Turn ${turnIndex + 1}: Injured`);
          evt.acceptedChanges.push(`Character ${found.name} status updated to injured.`);
        }
      }
    } else if (evt.type === 'CHARACTER_INTRODUCED') {
      for (const actor of evt.actors) {
        if (!nextCharacters.some(c => c.name.toLowerCase() === actor.toLowerCase())) {
          nextCharacters.push({
            id: `char_${actor.toLowerCase()}`,
            name: actor,
            role: 'secondary',
            status: 'alive',
            location: nextLocation,
            motivations: ['Participate in the unfolding narrative'],
            knowledge: [`Introduced in turn ${turnIndex + 1}`],
            pastActions: [`Turn ${turnIndex + 1}: Introduced into the story`]
          });
          evt.acceptedChanges.push(`Character ${actor} introduced.`);
        }
      }
    } else if (evt.type === 'OBJECT_CONSUMED' && evt.target) {
      const foundEntity = nextEntities.find(e => e.name.toLowerCase() === evt.target!.toLowerCase() || e.id.toLowerCase() === evt.target!.toLowerCase());
      if (foundEntity) {
        foundEntity.status = 'consumed';
        foundEntity.quantity = 0;
        foundEntity.depletedTurn = turnIndex;
        evt.acceptedChanges.push(`Entity ${foundEntity.name} quantity set to 0 (consumed).`);
        prohibitedContradictions.push(`Do not reuse or find ${foundEntity.name} intact (consumed/used).`);
      }
    } else if (evt.type === 'OBJECT_DESTROYED' && evt.target) {
      const foundEntity = nextEntities.find(e => e.name.toLowerCase() === evt.target!.toLowerCase());
      if (foundEntity) {
        foundEntity.status = 'destroyed';
        foundEntity.quantity = 0;
        foundEntity.depletedTurn = turnIndex;
        evt.acceptedChanges.push(`Entity ${foundEntity.name} marked destroyed.`);
      }
    } else if (evt.type === 'LOCATION_CHANGED' && evt.target && !evt.canonicalKey) {
      nextLocation = evt.target === 'crossed_rope_bridge' ? 'opposite canyon ledge' : evt.target.replace(/_/g, ' ');
      nextLocationHistory.push({ location: nextLocation, turnIndex });
      if (evt.target === 'crossed_rope_bridge') nextMilestones.push('crossed_rope_bridge');
      for (const actor of evt.actors) {
        const found = nextCharacters.find(c => c.name.toLowerCase() === actor.toLowerCase());
        if (found) {
          found.location = nextLocation;
          found.pastActions.push(`Turn ${turnIndex + 1}: Moved to ${nextLocation}`);
        }
      }
      prohibitedContradictions.push(`Characters are currently at ${nextLocation}. Do not retreat or cross the bridge again without cause.`);
    } else if (evt.type === 'PROGRESSION_BEAT') {
      if (evt.target) nextMilestones.push(evt.target);
      for (const actor of evt.actors) {
        const found = nextCharacters.find(c => c.name.toLowerCase() === actor.toLowerCase());
        if (found) {
          found.pastActions.push(`Turn ${turnIndex + 1}: ${evt.description.slice(0, 40)}`);
        }
      }
      if (evt.target === 'dried_maps') {
        prohibitedContradictions.push('Maps are already dried and packed. Do not dry the maps again.');
      }
    } else if (evt.type === 'CLUE_DISCOVERED' && evt.target) {
      nextDiscoveries.push(evt.target);
      prohibitedContradictions.push(`Already discovered ${evt.target.replace(/_/g, ' ')}. Do not rediscover it.`);
    }
  }

  const progressRatio = (turnIndex + 1) / Math.max(1, totalPlannedTurns);
  let nextAct: 1 | 2 | 3 | 4 = 1;
  if (progressRatio <= 0.25) nextAct = 1;
  else if (progressRatio <= 0.65) nextAct = 2;
  else if (progressRatio <= 0.85) nextAct = 3;
  else nextAct = 4;

  return {
    ...state,
    currentLocation: nextLocation,
    bridgeDamaged,
    completedMilestones: Array.from(new Set(nextMilestones)),
    discoveredClues: Array.from(new Set(nextDiscoveries)),
    locationHistory: nextLocationHistory,
    currentAct: nextAct,
    characters: nextCharacters,
    entities: nextEntities,
    relationships: nextRelationships,
    unresolvedConflicts: nextConflicts,
    resolvedConflicts,
    eventLog: [...state.eventLog, ...acceptedEvents],
    latestAcceptedEventIds: acceptedIds,
    prohibitedContradictions: Array.from(new Set(prohibitedContradictions))
  };
}

// ─── End-of-Show Continuity Audit ───────────────────────────────────────

export function auditStoryContinuity(
  worldState: CanonicalWorldState,
  finalTurnProse = ''
): ContinuityAuditResult {
  const issues: string[] = [];

  const deadCharacters = worldState.characters.filter(c => c.status === 'dead');
  for (const deadChar of deadCharacters) {
    if (new RegExp('\\b' + deadChar.name + '\\s+(?:smiled|walked|cheered|survived|returned|held|laughed)\\b', 'i').test(finalTurnProse)) {
      issues.push(`Final turn depicts deceased character '${deadChar.name}' alive or acting without explanation.`);
    }
  }

  const depletedEntities = worldState.entities.filter(e => e.status === 'consumed');
  for (const entity of depletedEntities) {
    if (new RegExp('\\b(?:took|drank|used)\\s+(?:the\\s+)?' + entity.name + '\\b', 'i').test(finalTurnProse)) {
      issues.push(`Final turn depicts depleted resource '${entity.name}' being reused.`);
    }
  }

  const hasAliveOrDeadOutcome = worldState.characters.some(c => c.status === 'dead' || c.status === 'alive');
  if (!hasAliveOrDeadOutcome && worldState.characters.length > 0) {
    issues.push('Story ending lacks clear outcome for established characters.');
  }

  const actSummaries: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const evt of worldState.eventLog) {
    const act = evt.turnIndex <= 2 ? 1 : evt.turnIndex <= 5 ? 2 : evt.turnIndex <= 7 ? 3 : 4;
    actSummaries[act] = (actSummaries[act] || 0) + 1;
  }

  const verdict = issues.length === 0 ? 'no_conflicts' : 'review_recommended';
  const label = issues.length === 0 ? 'No detected continuity conflicts' : 'Continuity review recommended';

  return {
    verdict,
    label,
    issues,
    characterSummaries: worldState.characters.map(c => ({
      name: c.name,
      status: c.status,
      detail: c.statusChangeReason ? `${c.status} (${c.statusChangeReason})` : c.status
    })),
    entitySummaries: worldState.entities.map(e => ({
      name: e.name,
      status: e.status,
      quantity: e.quantity
    })),
    actSummaries
  };
}

// ─── Truncation & Output Quality Evaluation ──────────────────────────────

export function isTruncatedOutput(text: string): { truncated: boolean; reason?: string } {
  const trimmed = text.trim();
  if (!trimmed) return { truncated: true, reason: 'Empty output' };

  // If the output is a structured JSON decision object, validate schema rather than prose rules
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      JSON.parse(trimmed);
      return { truncated: false };
    } catch {
      return { truncated: true, reason: 'Malformed JSON object' };
    }
  }

  // 1. Ends with dangling conjunction or preposition
  if (/\b(?:and|but|or|because|although|while|hoping to|as|that|who|which)\s*$/i.test(trimmed)) {
    return { truncated: true, reason: 'Sentence ended with dangling conjunction or preposition' };
  }

  // 2. Ends with incomplete trailing phrase
  if (/\b(?:they share|in order to|trying to|ready to|started to|stopped to)\s*\.{0,3}$/i.test(trimmed)) {
    return { truncated: true, reason: 'Ended with incomplete trailing phrase' };
  }

  // 3. Ends mid-word or without terminal punctuation (strip trailing closing quotes first)
  const withoutQuotes = trimmed.replace(/["'”’»]+$/, '');
  const lastChar = withoutQuotes.slice(-1);
  if (/[a-zA-Z0-9,\-–—;:]/.test(lastChar)) {
    return { truncated: true, reason: `Ended mid-sentence or mid-word on '${lastChar}' without terminating punctuation` };
  }

  // 4. Unclosed double quotation mark
  const doubleQuotes = (trimmed.match(/"/g) || []).length;
  if (doubleQuotes % 2 !== 0) {
    return { truncated: true, reason: 'Unclosed quotation mark' };
  }

  return { truncated: false };
}

export function hasMeaningfulEnding(text: string, goal: string, theme?: string): boolean {
  if (!text || isTruncatedOutput(text).truncated) return false;
  const wordCount = text.trim().split(/\s+/).length;
  if (wordCount < 8) return false;

  if (/\b(?:to be continued|who could it be\??|sudden(?:ly)?(?:,\s*|\s+)(?:an?|the|something|someone|a shadow|another|a cold|icy)\b|grip tighten(?:ed)?|hand passed through|tighten(?:ed)? around (?:his|her|their) wrist|fingers were slick|lurking in the fog|whispered behind (?:him|her|them)|eyes glint(?:ing|ed)? with malice\b)/i.test(text.slice(-180))) {
    return false;
  }
  const outcome = /\b(?:reached|arrived|found|secured|saved|rescued|recovered|delivered|escaped|returned|won|lost|failed|succeeded|crossed|cross|made it|could not|never reached|abandoned|destroyed|resolved|confess|confessed|love|together|parted|promise|promised|forgave|forgiven|embraced|held|reconciled|separated|laughed|laugh|laughter|smiled|smile|joke|cheered|applauded|celebration|ridiculous|spectacle|absurd|amused|fun|funniest|delight|mourned|mourn|wept|grief|sorrow|accepted|acceptance|farewell|cost|lingering|memory|sacrifice|perished|died|loss|buried|survived|survivor|dread|nightmare|silence|banished|trapped|darkness|revealed|reveal|solved|solve|deduced|deduction|truth|culprit|proven|proved|explanation|unmasked|healed|restore|restored|spell|broken|shattered|peaceful|balance|stabilized|nominal|telemetry|repaired|anomaly|signal|calibrated|rebooted|jettisoned|ejected|purged|overrode|overridden|sacrificed|concluded|sealed|contained|aftermath|consequence|choice|chosen|clarity|understanding|alibi|testimony|motive|oath|escaped|safe|relief|dawn|horizon|finally|at last|never again|once more|rested|endured|decided)\b/i.test(text);
  const goalWords = goal ? goal.toLowerCase().match(/[a-z]{4,}/g)?.filter(word => !/^(their|there|after|before|because|story|about|would|could|should|through|where|which|these|those|start|brand|fresh|involving|original|situation|involve)$/.test(word)) || [] : [];
  const groundedInGoal = goalWords.length > 0 && goalWords.some(word => text.toLowerCase().includes(word));
  const groundedInStoryConcepts = /\b(?:destination|shelter|treasure|village|town|home|cure|journey|summit|temple|artifact|heart|love|truth|mystery|case|incident|secret|threat|danger|life|loss|festival|rehearsal|station|ship|magic|spell|curse|pastry|cake|bridge|canyon|memory|future|dawn|night|path|choice|bond|entity|nightmare|horror|shadow|creature|monster|dread|survivor|spectacle|joke|laughter|prank|misunderstanding|rumor|prop|chip|reactor|core|airlock|pod|clue|evidence|alibi|silence|ruin|room|study|garden|trail|gate)\b/i.test(text);
  const grounded = groundedInGoal || groundedInStoryConcepts;
  const routeResolved = !/\b(?:two ways|fork|split route|two paths)\b/i.test(goal) || /\b(?:chose|choose|selected|followed|took)\b[^.!?]{0,55}\b(?:route|path|way|map|trail)\b/i.test(text);
  const choiceResolved = !/\b(?:self[- ]?destruct\w*|choice between|destructing the station)\b/i.test(goal) || /\b(?:self[- ]?destruct|countdown|detonat\w*|overload\w*|eject\w*|jettison\w*|secur\w*|retriev\w*|escap\w*|chip|destroy\w*|surviv\w*|saved?|cho[os]\w*)\b/i.test(text);

  let genreContractSatisfied = true;
  if (theme) {
    const t = theme.toLowerCase();
    if (t.includes('detective')) {
      genreContractSatisfied = /\b(?:culprit|motive|evidence|solved|solve|confessed|confession|alibi|arrested|arrest|unmasked|truth|explanation|suspect|guilty|innocent|case closed)\b/i.test(text);
    } else if (t.includes('comedy')) {
      genreContractSatisfied = /\b(?:laughed|laugh|laughter|joke|ridiculous|absurd|amused|funniest|delight|cheered|smile|smiled|spectacle|embarrass|mistake|mix-up|awkward)\b/i.test(text);
    } else if (t.includes('tragedy')) {
      genreContractSatisfied = /\b(?:cost|loss|lost|sacrifice|sacrificed|grief|sorrow|mourned|wept|farewell|regret|consequence|perished|died|death|aftermath)\b/i.test(text);
    } else if (t.includes('horror')) {
      genreContractSatisfied = /\b(?:survived|survivor|escaped|safe|dawn|banished|contained|trapped|perished|darkness|silence|threat|monster|nightmare|dread)\b/i.test(text);
    } else if (t.includes('romance')) {
      genreContractSatisfied = /\b(?:together|parted|confessed|forgave|forgiven|embraced|held|reconciled|love|promise|promised|bond|trust|heart|separated)\b/i.test(text);
    } else if (t.includes('mystery')) {
      genreContractSatisfied = /\b(?:truth|revealed|reveal|uncovered|solved|solve|answer|secret|discovered|explanation|deduced|clarity|understood)\b/i.test(text);
    } else if (t.includes('fantasy')) {
      genreContractSatisfied = /\b(?:spell|magic|broken|lifted|curse|enchanted|restored|healed|peaceful|power|bound|sealed|cost|balance)\b/i.test(text);
    } else if (t.includes('science')) {
      genreContractSatisfied = /\b(?:stabilized|nominal|repaired|calibrated|rebooted|signal|telemetry|core|reactor|airlock|station|system|anomaly|containment|safe)\b/i.test(text);
    } else if (t.includes('adventure')) {
      genreContractSatisfied = /\b(?:reached|arrived|crossed|shelter|summit|safe|delivered|secured|journey|treasure|made it|destination|return|dawn)\b/i.test(text);
    }
  }

  return Boolean(outcome && grounded && routeResolved && choiceResolved && genreContractSatisfied);
}

export function detectNarrativeStagnation(
  rawOutput: string,
  modelId: string,
  pastTurns: Array<{ output?: string; modelId?: string; isRelevant?: boolean }>,
  _worldState?: CanonicalWorldState
): { hasStagnation: boolean; issues: string[]; retakePromptDirective?: string } {
  const issues: string[] = [];
  const clean = rawOutput.trim();
  if (!clean || pastTurns.length < 2) return { hasStagnation: false, issues: [] };

  if (modelId !== 'text') return { hasStagnation: false, issues: [] };

  const hasActionOrDiscovery = /\b(?:decided|chose|found|discovered|spoke|said|asked|shouted|whispered|stepped|ran|walked|opened|closed|took|grabbed|confronted|revealed|struck|pushed|pulled|climbed|crossed|entered|left|fled|unlocked|examined|read|tested|confront|strike|break|turn|action|moved|acted)\b/i.test(clean);
  const purelyObservational = !hasActionOrDiscovery && /\b(?:looked|seemed|appeared|hung|felt|was|were|remained|lingered|cast|shadows|fog|air|silence|glow|quiet|dust|gloom|chill)\b/i.test(clean);

  if (purelyObservational) {
    const previousWriterTurns = pastTurns.filter(t => t.modelId === 'text' && t.output && t.isRelevant !== false);
    const lastWriterTurn = previousWriterTurns[previousWriterTurns.length - 1];
    if (lastWriterTurn?.output) {
      const lastHadAction = /\b(?:decided|chose|found|discovered|spoke|said|asked|shouted|whispered|stepped|ran|walked|opened|closed|took|grabbed|confronted|revealed|struck|pushed|pulled|climbed|crossed|entered|left|fled|unlocked|examined|read|tested|confront|strike|break|turn|action|moved|acted)\b/i.test(lastWriterTurn.output);
      if (!lastHadAction) {
        issues.push('Narrative stagnation: scene has stalled on consecutive passive observations without character action or event progression.');
        return {
          hasStagnation: true,
          issues,
          retakePromptDirective: 'The scene is stalling on passive description. Advance the plot now: have characters take a concrete action, make a discovery, or speak.'
        };
      }
    }
  }

  const recentTurns = pastTurns.slice(-2).filter(t => t.output && t.isRelevant !== false);
  for (const prev of recentTurns) {
    if (!prev.output) continue;
    const extractNouns = (s: string) => (s.toLowerCase().match(/\b[a-z]{4,}\b/g) || []).filter(w => !NARRATIVE_STOPWORDS.has(w));
    const currNouns = new Set(extractNouns(clean));
    const prevNouns = extractNouns(prev.output);
    if (currNouns.size >= 6 && prevNouns.length >= 6) {
      const shared = prevNouns.filter(w => currNouns.has(w)).length;
      const ratio = shared / Math.min(currNouns.size, prevNouns.length);
      if (ratio > 0.70 && !hasActionOrDiscovery) {
        issues.push('Narrative stagnation: turn redescribes the previous scene without adding new development.');
        return {
          hasStagnation: true,
          issues,
          retakePromptDirective: 'Do not re-describe the same scene elements. Move the narrative forward to the next concrete action or consequence.'
        };
      }
    }
  }

  return { hasStagnation: false, issues: [] };
}

// ─── Narrative Loop Detection Engine ─────────────────────────────────────

const NARRATIVE_STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'from', 'up', 'about', 'into', 'over', 'after', 'beneath', 'under', 'above', 'is', 'was',
  'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'would',
  'should', 'could', 'he', 'she', 'they', 'it', 'his', 'her', 'their', 'its', 'him', 'them',
  'this', 'that', 'these', 'those', 'then', 'so', 'as', 'out', 'while', 'when', 'where'
]);

export function detectNarrativeLoop(
  rawOutput: string,
  proposedEvents: NarrativeEvent[],
  pastTurns: Array<{ output?: string; acceptedEvents?: NarrativeEvent[] }>,
  worldState: CanonicalWorldState
): { hasLoop: boolean; issues: string[]; retakePromptDirective?: string } {
  const issues: string[] = [];
  const clean = rawOutput.trim();
  if (!clean || pastTurns.length === 0) return { hasLoop: false, issues: [] };

  const priorKeys = new Set(worldState.eventLog.map(event => event.canonicalKey).filter(Boolean));
  for (const event of proposedEvents) {
    if (event.canonicalKey && event.canonicalKey !== 'move:trail' && event.canonicalKey !== 'state:bridge_damaged' && priorKeys.has(event.canonicalKey) && !/\b(?:back|returned|repaired|rebuilt|another)\b/i.test(clean)) {
      return { hasLoop: true, issues: [`Repeated event: ${event.description} already occurred.`],
        retakePromptDirective: `${event.description} is already complete. Continue from its consequence.` };
    }
  }

  const charNames = worldState.characters.map(c => c.name.toLowerCase());

  // Tokenize into content words filtering out character names & common grammatical stopwords
  const extractContentTokens = (text: string): string[] => {
    return text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !NARRATIVE_STOPWORDS.has(w) && !charNames.includes(w));
  };

  const currentTokens = extractContentTokens(clean);
  const currentTokenSet = new Set(currentTokens);

  // 1. Content Overlap Check (Jaccard similarity on content words only)
  for (let i = 0; i < pastTurns.length; i++) {
    const priorTurn = pastTurns[i];
    if (!priorTurn.output) continue;
    const priorTokens = extractContentTokens(priorTurn.output);
    if (priorTokens.length < 5 || currentTokens.length < 5) continue;

    const priorSet = new Set(priorTokens);
    let intersection = 0;
    for (const token of currentTokenSet) {
      if (priorSet.has(token)) intersection++;
    }
    const union = new Set([...currentTokens, ...priorTokens]).size;
    const similarity = union > 0 ? intersection / union : 0;

    if (similarity > 0.70) {
      issues.push(`Near-identical prose: turn has ${(similarity * 100).toFixed(0)}% content similarity with turn ${i + 1}.`);
      return {
        hasLoop: true,
        issues,
        retakePromptDirective: `Avoid repeating the phrasing from turn ${i + 1}. Introduce a brand new action or discovery.`
      };
    }
  }

  // 2. Sentence Duplication Check (> 6 content words) with prefix & fuzzy matching
  const currentSentences = clean.split(/[.!?]+/).map(s => s.trim().toLowerCase()).filter(s => s.split(/\s+/).length >= 6);
  for (let i = 0; i < pastTurns.length; i++) {
    const priorTurn = pastTurns[i];
    if (!priorTurn.output) continue;
    const priorSentences = priorTurn.output.split(/[.!?]+/).map(s => s.trim().toLowerCase()).filter(s => s.split(/\s+/).length >= 6);
    for (const cSent of currentSentences) {
      const match = priorSentences.find(pSent => {
        if (pSent === cSent) return true;
        const cLead = cSent.slice(0, 36);
        const pLead = pSent.slice(0, 36);
        if (cLead.length >= 25 && pLead.length >= 25 && cLead === pLead) return true;
        const cWords = cSent.split(/\s+/);
        const pWords = pSent.split(/\s+/);
        if (cWords.length >= 6 && pWords.length >= 6 && cWords.slice(0, 5).join(' ') === pWords.slice(0, 5).join(' ')) return true;
        return false;
      });
      if (match) {
        issues.push(`Duplicate sentence/prefix detected from turn ${i + 1}: "${cSent.slice(0, 60)}..."`);
        return {
          hasLoop: true,
          issues,
          retakePromptDirective: `Do not repeat sentences or opening phrases from earlier turns. Write a new sentence moving the scene forward.`
        };
      }
    }
  }

  // 3. Repeated Action / Object Discovery Loop
  for (const event of proposedEvents) {
    if (event.type === 'OBJECT_ACQUIRED' && event.target) {
      const alreadyKnown = worldState.entities.some(e => e.name.toLowerCase() === event.target!.toLowerCase() && e.status === 'available');
      if (alreadyKnown) {
        issues.push(`Loop: character repeatedly discovered or acquired ${event.target}, which is already in their possession.`);
        return {
          hasLoop: true,
          issues,
          retakePromptDirective: `The ${event.target} was already acquired. Use it or face the next obstacle instead of finding it again.`
        };
      }
    }
  }

  // 4. Repeated Completed Action Check
  for (const char of worldState.characters) {
    for (const pastAction of char.pastActions) {
      const actionKeywords = pastAction.split(':')[1]?.trim();
      if (actionKeywords && actionKeywords.length > 12 && new RegExp('\\b' + actionKeywords.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(clean)) {
        issues.push(`Character '${char.name}' repeated action already completed: "${actionKeywords}".`);
        return {
          hasLoop: true,
          issues,
          retakePromptDirective: `${char.name} already performed this action. Progress with a consequence or next step.`
        };
      }
    }
  }

  return { hasLoop: false, issues: [] };
}

// ─── Decoupled 5-Factor Story Quality Audit ──────────────────────────────

export function auditStoryQuality(
  worldState: CanonicalWorldState,
  turns: Array<{
    turnId: string;
    index: number;
    modelId: string;
    output?: string;
    status: string;
    isRelevant?: boolean;
    continuityIssues?: string[];
    loopIssue?: string;
    rawAttempts?: any[];
    acceptedEvents?: NarrativeEvent[];
    proposedEvents?: NarrativeEvent[];
    isTruncated?: boolean;
    finishReason?: string | null;
  }> = []
): StoryQualityAuditResult {
  const issues: string[] = [];
  const completedTurns = turns.filter(t => t.status === 'completed' && t.output);

  // 1. Inference Completed Check
  const inferenceCompleted = turns.length > 0 && turns.every(t => t.status === 'completed' || t.status === 'rejected');
  if (!inferenceCompleted) {
    issues.push('One or more turns failed model execution.');
  }

  // 2. Output Complete Check
  let truncatedCount = 0;
  for (const turn of completedTurns) {
    if (turn.output) {
      const trunc = isTruncatedOutput(turn.output);
      if (trunc.truncated || turn.isTruncated || turn.finishReason === 'length') {
        truncatedCount++;
        issues.push(`Turn ${turn.index + 1} output incomplete: ${trunc.reason || turn.finishReason || 'recorded truncation'}`);
      }
    }
  }
  const outputComplete = truncatedCount === 0;

  // 3. Canon Consistency Check
  const continuity = auditStoryContinuity(worldState, completedTurns[completedTurns.length - 1]?.output || '');
  const storedContinuity = turns.flatMap(t => (t.continuityIssues || []).map(issue => `Turn ${t.index + 1}: ${issue}`));
  const semanticIssues: string[] = [];
  const semanticLoops: string[] = [];
  const seenEvents = new Set<string>();
  let bridgeDamaged = false;
  let bridgeCrossed = false;
  for (const turn of completedTurns) {
    const events = extractProposedEvents(turn.output!, worldState, turn.modelId, turn.index);
    for (const event of events) {
      const key = event.canonicalKey;
      if (!key) continue;
      if (key !== 'move:trail' && key !== 'state:bridge_damaged' && seenEvents.has(key)) {
        const issue = `Turn ${turn.index + 1}: repeated ${event.description}.`;
        semanticIssues.push(issue);
        semanticLoops.push(issue);
      }
      if (key === 'move:canyon_edge' && bridgeCrossed && !/\b(?:back|returned|retreated)\b/i.test(turn.output!)) semanticIssues.push(`Turn ${turn.index + 1}: location regressed to canyon edge after crossing.`);
      if (key === 'cross:bridge' && bridgeDamaged && !/\b(?:repaired|rebuilt|alternate|other|new|patched|tied|secured|anchored|lifeline|raft)\b/i.test(turn.output!)) semanticIssues.push(`Turn ${turn.index + 1}: crossed a damaged bridge without repair or alternate route.`);
      if (key === 'cross:bridge') bridgeCrossed = true;
      if (key === 'state:bridge_damaged') bridgeDamaged = true;
      seenEvents.add(key);
    }
  }
  const canonConsistent = continuity.verdict === 'no_conflicts' && storedContinuity.length === 0 && semanticIssues.length === 0;
  if (!canonConsistent) {
    issues.push(...continuity.issues, ...storedContinuity, ...semanticIssues);
  }

  // 4. Loop Free Check
  const loopIssues = [...turns.filter(t => t.loopIssue).map(t => t.loopIssue!), ...semanticLoops];
  const loopFree = loopIssues.length === 0;
  if (!loopFree) {
    issues.push(...loopIssues);
  }

  // 5. Genre Contract & Ending Fulfillment
  const finalTurn = completedTurns[completedTurns.length - 1];
  const finalProse = finalTurn?.output || '';
  const addressedCentralConflict = hasMeaningfulEnding(finalProse, worldState.narrativeGoal, worldState.theme);
  if (!addressedCentralConflict) issues.push('Final turn does not resolve the original narrative goal.');
  const genreRequirementsMet = canonConsistent && addressedCentralConflict;
  const genreContractPassed = genreRequirementsMet;

  const reviewStatus: 'pass' | 'review_recommended' =
    (inferenceCompleted && outputComplete && canonConsistent && loopFree && genreContractPassed)
      ? 'pass'
      : 'review_recommended';

  const label = reviewStatus === 'pass'
    ? 'No detected continuity conflicts; genre contract satisfied'
    : 'Continuity review recommended';

  return {
    inferenceCompleted,
    outputComplete,
    canonConsistent,
    genreContractPassed,
    loopFree,
    reviewStatus,
    label,
    issues,
    details: {
      truncatedTurnsCount: truncatedCount,
      repairedTurnsCount: turns.filter(t => (t.rawAttempts || []).length > 0).length,
      continuityViolationsCount: continuity.issues.length + storedContinuity.length + semanticIssues.length,
      loopViolationsCount: loopIssues.length,
      endingFulfillment: {
        addressedCentralConflict,
        genreRequirementsMet,
        notes: genreRequirementsMet ? 'Ending addressed primary conflict.' : 'Ending requires manual review.'
      }
    }
  };
}
