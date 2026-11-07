import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const playgroundRoot = resolve(__dirname, '..');
const projectRoot = resolve(playgroundRoot, '..');

describe('S5-A Research Observatory Canonical Numerical Equality', () => {
  const jsonPath = resolve(playgroundRoot, 'src/data/research/researchData.json');

  test('researchData.json exists and contains all required phases and metadata', () => {
    assert.ok(existsSync(jsonPath), 'researchData.json must exist');
    const data = JSON.parse(readFileSync(jsonPath, 'utf8'));
    assert.ok(data.metadata, 'Metadata must be present');
    assert.equal(data.metadata.generator, 'playground/scripts/build-research-data.mjs');
    assert.deepEqual(data.metadata.phases, ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7']);
  });

  test('P2 numerical equality against canonical sources', () => {
    const data = JSON.parse(readFileSync(jsonPath, 'utf8'));
    const p2 = data.p2;

    assert.equal(p2.cases.length, 10, 'P2 must have exactly 10 cases');
    assert.equal(p2.summary.direct.exactMatchCount, 10, 'Direct VL must be 10/10');
    assert.equal(p2.summary.modular.exactMatchCount, 9, 'Modular VL must be 9/10');
    assert.equal(p2.summary.direct.medianLatencyS, 38.5295, 'Direct median latency matches source');
    assert.equal(p2.summary.modular.medianLatencyS, 65.7235, 'Modular median latency matches source');

    // Case 04 failure
    const case04 = p2.cases.find(c => c.id === '04');
    assert.ok(case04, 'Case 04 exists');
    assert.equal(case04.ocrPhraseRecall, 1.0, 'Case 04 OCR had 1.0 phrase recall');
    assert.equal(case04.pipelineExact, false, 'Case 04 pipeline exact match failed');
    assert.equal(case04.textFinishReason, 'length', 'Case 04 text finish reason was length exhaustion');

    // Resolution ablation
    assert.equal(p2.resolutionAblation.length, 3, '3 resolution trials');
    assert.equal(p2.resolutionAblation[0].scale, 1.0);
    assert.equal(p2.resolutionAblation[0].ttftS, 28.01);
    assert.equal(p2.resolutionAblation[1].scale, 0.5);
    assert.equal(p2.resolutionAblation[1].ttftS, 15.33);
  });

  test('P3 dataset contains exactly 75 evaluations for 25 cases with untimed exclusions', () => {
    const data = JSON.parse(readFileSync(jsonPath, 'utf8'));
    const p3 = data.p3;

    assert.equal(p3.totalCases, 25, 'P3 total cases is 25');
    assert.equal(p3.totalEvaluations, 75, 'P3 total evaluations is 75 (25 x 3 architectures)');

    // Architectures
    const native = p3.architectures.native;
    const v21 = p3.architectures.modular_v21;
    const v1 = p3.architectures.modular;

    assert.equal(native.strictSuccessCount, 24, 'Native S2S strict success is 24/25');
    assert.equal(native.timedCount, 23, 'Native timed count is 23 (2 recovered excluded)');
    assert.equal(native.medianLatencyS, 13.951842669001053, 'Native median latency matches source');

    assert.equal(v21.strictSuccessCount, 22, 'Modular V2.1 strict success is 22/25');
    assert.equal(v21.timedCount, 24, 'Modular V2.1 timed count is 24 (1 failed excluded)');
    assert.equal(v21.medianLatencyS, 20.184947640000246, 'Modular V2.1 median latency matches source');

    assert.equal(v1.strictSuccessCount, 15, 'Modular V1 strict success is 15/25');
    assert.equal(v1.timedCount, 23, 'Modular V1 timed count is 23 (2 un-timed excluded)');
    assert.equal(v1.medianLatencyS, 27.69999082799768, 'Modular V1 median latency matches source');
  });

  test('P4 paired 40-case data and exact McNemar p=0.25', () => {
    const data = JSON.parse(readFileSync(jsonPath, 'utf8'));
    const p4 = data.p4;

    assert.equal(p4.sampleSize, 40, 'P4 sample size is 40');
    assert.equal(p4.summary.omni.passCount, 25, 'Omni pass count is 25/40');
    assert.equal(p4.summary.modular.passCount, 28, 'Modular pass count is 28/40');
    assert.equal(p4.summary.omni.medianLatencyS, 20.9195, 'Omni median latency is ~20.92s');
    assert.equal(p4.summary.modular.medianLatencyS, 21.288, 'Modular median latency is ~21.29s');

    // Contingency
    assert.equal(p4.contingency.bothPass, 25, 'Both pass = 25');
    assert.equal(p4.contingency.modularOnly, 3, 'Modular only = 3 (H13, H18, H20)');
    assert.equal(p4.contingency.omniOnly, 0, 'Omni only = 0');
    assert.equal(p4.contingency.bothFail, 12, 'Both fail = 12');

    // McNemar test
    assert.equal(p4.statisticalTest.pValue, 0.25, 'Exact McNemar p-value must be 0.25');
    assert.equal(p4.statisticalTest.isSignificant, false, 'p=0.25 is not statistically significant');
  });

  test('P5 routing accuracy and Case X03 prominent error', () => {
    const data = JSON.parse(readFileSync(jsonPath, 'utf8'));
    const p5 = data.p5;

    assert.equal(p5.routingPilot.cases, 24);
    assert.equal(p5.routingPilot.correct, 23);
    assert.equal(p5.routingStress.cases, 24);
    assert.equal(p5.routingStress.correct, 20);

    // Case X03
    const x03 = p5.prominentFailureX03;
    assert.equal(x03.caseId, 'X03');
    assert.equal(x03.expected, 'technical');
    assert.equal(x03.predicted, 'billing');
    assert.equal(x03.confidence, 0.9199);
    assert.equal(x03.correct, false);
    assert.equal(x03.decision, 'AUTO_RECOMMEND');
  });

  test('P7 text operator schedule follows exact 24-layer sequence', () => {
    const data = JSON.parse(readFileSync(jsonPath, 'utf8'));
    const p7 = data.p7;
    const schedule = p7.textBackboneSchedule;

    assert.equal(schedule.totalLayers, 24);
    assert.equal(schedule.counts.conv, 13);
    assert.equal(schedule.counts.fullAttention, 6);
    assert.equal(schedule.counts.slidingAttention, 5);

    // First 5 layers in order
    assert.equal(schedule.layerTypes[0].type, 'conv');
    assert.equal(schedule.layerTypes[1].type, 'conv');
    assert.equal(schedule.layerTypes[2].type, 'full_attention');
    assert.equal(schedule.layerTypes[3].type, 'conv');
    assert.equal(schedule.layerTypes[4].type, 'sliding_attention');
    assert.equal(schedule.layerTypes[23].type, 'conv');
  });

  test('Failure taxonomy records reflect canonical classifications', () => {
    const data = JSON.parse(readFileSync(jsonPath, 'utf8'));
    assert.ok(data.failureTaxonomy.length >= 7, 'At least 7 canonical failure records');
    const categories = data.failureTaxonomy.map(f => f.category);
    assert.ok(categories.some(c => c.includes('Pipeline cascading')));
    assert.ok(categories.some(c => c.includes('Guarded abort')));
    assert.ok(categories.some(c => c.includes('Unsupported spatial')));
  });
});
