import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/lib/triviaLive.ts', import.meta.url), 'utf8')
  .replace(/import\s*\{\s*executeLocal[^;]+;\n?/, 'const executeLocal = (...args) => globalThis.__triviaExecute(...args);\n');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const live = await import(`data:text/javascript,${encodeURIComponent(compiled)}`);
const question = n => ({ topic: 'Computer Science', difficulty: 'easy', question: `What is the correct value for alpha${n} beta${n} gamma${n}?`, options: { A: 'one', B: 'two', C: 'three', D: 'four' }, correct_option: 'B', explanation: 'The second option is two.' });
const result = (model, output, id) => ({ status: 'completed', route: [model], requested_model: model, backend_model_id: live.BACKEND_IDS[model], request_id: id, output, trace: [{ stage: 'inference', status: 'ok', model }], metrics: { total_latency_s: 1 } });
const makeQuestion = (n, previous = []) => live.validateQuestion(question(n), previous, 'text', result('text', '', `host-${n}`));

test('question schema, duplicate detection, and host attribution reject malformed live output', () => {
  const first = makeQuestion(1);
  assert.equal(first.correct_option, 'B');
  assert.equal(first.backendModelId, 'lfm3-1.7b');
  assert.throws(() => makeQuestion(1, [first]), /Repeated/);
  assert.throws(() => live.validateQuestion({ ...question(2), options: { A: 'same', B: 'same', C: 'three', D: 'four' } }, [], 'text', result('text', '', 'host')), /distinct/);
  assert.throws(() => live.validateQuestion({ ...question(2), correct_option: 'E' }, [], 'text', result('text', '', 'host')), /key/);
});

test('contestant prompts exclude the private host key and require distinct attributed inference', () => {
  const q = makeQuestion(3);
  const text = live.contestantRequest('vision', q);
  assert.equal(text.model, 'vision');
  assert.equal(text.prompt.includes('correct_option'), false);
  assert.equal(text.prompt.includes(q.explanation), false);
  const decision = live.contestantRequest('d1', q);
  assert.deepEqual(decision.decision_question.criteria, q.options);
  assert.equal(decision.prompt, q.question);
  assert.throws(() => live.assertIdentity(result('text', 'B', 'wrong'), 'vision'), /mismatch/);
  assert.throws(() => live.assertIdentity({ ...result('vision', 'B', 'wrong'), backend_model_id: 'lfm3-1.7b' }, 'vision'), /identity/);
});

test('only strict A-D output earns points, and duplicate attempts cannot score twice', async () => {
  const q = makeQuestion(4);
  globalThis.__triviaExecute = async request => result(request.model, request.model === 'd1' ? { predicted_route: 'B' } : 'B', `req-${request.model}`);
  const a = await live.answerQuestion('vision', q);
  const b = await live.answerQuestion('d1', q);
  assert.equal(a.points, 100);
  assert.equal(b.points, 100);
  assert.equal(live.validateAnswer('The answer is B', 'vision'), null);
  assert.equal(live.validateAnswer('A or B', 'vision'), null);
  let round = { index: 0, question: q, attempts: [] };
  round = live.upsertAttempt(round, a);
  round = live.upsertAttempt(round, a);
  assert.equal(round.attempts.length, 1);
});

test('20-round orchestration contract makes 20 fresh host and 60 independent contestant calls', async () => {
  let hostCalls = 0, answerCalls = 0;
  const seenIds = new Set();
  globalThis.__triviaExecute = async request => {
    const id = `call-${++hostCalls + answerCalls}`;
    seenIds.add(id);
    return result(request.model, JSON.stringify(question(hostCalls)), id);
  };
  const generated = [];
  for (let n = 0; n < 20; n++) generated.push(await live.generateQuestion('text', 'Computer Science', 'easy', generated));
  assert.equal(generated.length, 20);
  assert.equal(hostCalls, 20);
  globalThis.__triviaExecute = async request => {
    const id = `answer-${++answerCalls}`;
    seenIds.add(id);
    return result(request.model, request.model === 'd1' ? { predicted_route: 'B' } : 'B', id);
  };
  const rounds = [];
  for (const [index, q] of generated.entries()) {
    const cast = ['vision', 'audio', 'd1'];
    const attempts = [];
    for (const id of cast) attempts.push(await live.answerQuestion(id, q));
    rounds.push({ index, question: q, attempts });
  }
  assert.equal(answerCalls, 60);
  assert.equal(seenIds.size, 80);
  const match = { id: 'real-contract-fixture', mode: 'live', status: 'completed', length: 20, startedAt: '2026-11-05', rounds };
  assert.equal(live.triviaStandings([match]).find(row => row.modelId === 'vision').points, 2000);
  assert.equal(live.triviaStandings([{ ...match, status: 'cancelled' }]).every(row => row.rank === null), true);
  delete globalThis.__triviaExecute;
});

test('P2 response normalization: accepts harmlessly wrapped letters and rejects ambiguous output', () => {
  const acceptedCases = [
    { raw: 'A', expected: 'A' },
    { raw: 'a', expected: 'A' },
    { raw: 'A.', expected: 'A' },
    { raw: '(B)', expected: 'B' },
    { raw: '**C**', expected: 'C' },
    { raw: '"D"', expected: 'D' },
    { raw: 'B)', expected: 'B' },
    { raw: '   C   ', expected: 'C' },
    { raw: 'Option B', expected: 'B' },
    { raw: 'Option B.', expected: 'B' },
    { raw: 'Choice C', expected: 'C' },
    { raw: '{"answer": "A"}', expected: 'A' },
    { raw: '{"answer": "d"}', expected: 'D' }
  ];

  for (const { raw, expected } of acceptedCases) {
    assert.equal(live.validateAnswer(raw, 'vision'), expected, `Expected ${raw} to normalize to ${expected}`);
  }

  // Question option matching
  const testQ = makeQuestion(99);
  assert.equal(live.validateAnswer('two', 'audio', testQ), 'B');
  assert.equal(live.validateAnswer('Four', 'audio', testQ), 'D');

  // Decision models return object with predicted_route
  assert.equal(live.validateAnswer({ predicted_route: 'B' }, 'd1'), 'B');
  assert.equal(live.validateAnswer({ predicted_route: 'c' }, 'd1_omni'), 'C');

  const rejectedCases = [
    'A or B',
    'I think A but maybe C',
    'AB',
    'Option A and B',
    '',
    '   ',
    'E',
    'z',
    'The correct answer is B because of...',
    '{"answer": "A", "extra": "B"}',
    '{"answer": "E"}',
    null,
    undefined,
    123
  ];

  for (const raw of rejectedCases) {
    assert.equal(live.validateAnswer(raw, 'vision'), null, `Expected ${raw} to be rejected`);
  }
});
