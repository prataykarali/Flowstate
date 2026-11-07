import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const compile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const league = await import(`data:text/javascript,${encodeURIComponent(compile(readFileSync(new URL('../src/lib/league.ts', import.meta.url), 'utf8')))}`);
const liveSource = readFileSync(new URL('../src/lib/triviaLive.ts', import.meta.url), 'utf8').replace(/import\s*\{\s*executeLocal[^;]+;\n?/, 'const executeLocal = () => { throw new Error("No inference in this test"); };\n');
const live = await import(`data:text/javascript,${encodeURIComponent(compile(liveSource))}`);
globalThis.__championshipIds = league.LEAGUE_MODEL_IDS;
globalThis.__championshipTrivia = live.triviaStandings;
const scoreSource = readFileSync(new URL('../src/lib/championshipScore.ts', import.meta.url), 'utf8')
  .replace("import { LEAGUE_MODEL_IDS, type LeagueEvent } from './league.ts';", 'const LEAGUE_MODEL_IDS = globalThis.__championshipIds;')
  .replace("import { triviaStandings, type LiveMatch } from './triviaLive.ts';", 'const triviaStandings = globalThis.__championshipTrivia;');
const score = await import(`data:text/javascript,${encodeURIComponent(compile(scoreSource))}`);

test('Championship combines genuine completed Trivia and validated Chat, Story, and rating points', () => {
  const requestIds = ['a'.repeat(32), 'b'.repeat(32)];
  const base = { modelId: 'text', sessionId: 'session-1', completionStatus: 'completed', validationStatus: 'validated', evidenceRef: 'completed-model-requests', timestamp: '2026-11-05T10:00:00Z' };
  const chat = league.scoreEvent([], { ...base, activity: 'chat_session', requestIds }).events;
  const events = league.scoreEvent(chat, { ...base, activity: 'story_contribution', requestId: 'c'.repeat(32) }).events;
  const complete = { id: 'live-1', mode: 'live', status: 'completed', rounds: [{ index: 0, attempts: [{ modelId: 'vision', status: 'correct', points: 100, timestamp: '2026-11-05T11:00:00Z' }] }] };
  const cancelled = { ...complete, id: 'cancelled', status: 'cancelled' };
  const ratings = { text: { stars: 5, updatedAt: '2026-11-05T12:00:00Z' } };
  const rows = score.championshipStandings(events, [complete, cancelled], ratings);
  const text = rows.find(row => row.modelId === 'text');
  const vision = rows.find(row => row.modelId === 'vision');
  assert.equal(text.chatPoints, 4);
  assert.equal(text.storyPoints, 6);
  assert.equal(text.ratingPoints, 10);
  assert.equal(text.points, 20);
  assert.equal(vision.triviaPoints, 100);
  assert.equal(vision.points, 100);
  assert.equal(vision.rank, 1);
  assert.equal(vision.attempts, 1);
  assert.equal(rows.find(row => row.modelId === 'audio').rank, null);
});

test('A local rating replaces its prior value instead of stacking points', () => {
  const data = new Map();
  const storage = { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value) };
  score.saveRating('omni', 5, storage);
  score.saveRating('omni', 2, storage);
  assert.equal(score.readRatings(storage).omni.stars, 2);
  assert.equal(score.championshipStandings([], [], score.readRatings(storage)).find(row => row.modelId === 'omni').ratingPoints, 4);
  assert.throws(() => score.saveRating('omni', 6, storage), /1 to 5/);
});
