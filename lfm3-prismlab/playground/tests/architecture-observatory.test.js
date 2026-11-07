import { test, describe } from 'node:test';
import assert from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('PrismLab S5-B Architecture Observatory - Dataset & Schema Validation', () => {
  const jsonPath = resolve(__dirname, '../src/data/architecture/architectureData.json');

  test('canonical architectureData.json exists and is valid JSON', () => {
    assert.ok(existsSync(jsonPath), 'architectureData.json must exist');
    const content = readFileSync(jsonPath, 'utf-8');
    const data = JSON.parse(content);
    assert.ok(data.metadata, 'Dataset must contain metadata');
    assert.strictEqual(typeof data.metadata.generatedAt, 'string');
    assert.ok(data.metadata.generator.endsWith('build-architecture-data.mjs'));
  });

  test('registers all six canonical models with required fields', () => {
    const data = JSON.parse(readFileSync(jsonPath, 'utf-8'));
    const expectedModels = ['text', 'vision', 'audio', 'omni', 'd1', 'd1_omni'];

    for (const modelId of expectedModels) {
      const model = data.models[modelId];
      assert.ok(model, `Model ${modelId} must exist in dataset`);
      assert.strictEqual(model.id, modelId);
      assert.ok(model.name && model.name.length > 0, `Model ${modelId} must have name`);
      assert.ok(model.characterName, `Model ${modelId} must have mascot characterName`);
      assert.ok(model.repo, `Model ${modelId} must have repo`);
      assert.ok(Array.isArray(model.supportedModalities), `Model ${modelId} must list modalities`);
      assert.ok(Array.isArray(model.components), `Model ${modelId} must have component list`);
      assert.ok(Array.isArray(model.edges), `Model ${modelId} must have edges`);
      assert.ok(Array.isArray(model.schedule), `Model ${modelId} must have layer schedule`);
    }
  });
});

describe('PrismLab S5-B Operator Schedule & Layer Sequences', () => {
  const jsonPath = resolve(__dirname, '../src/data/architecture/architectureData.json');
  const data = JSON.parse(readFileSync(jsonPath, 'utf-8'));

  test('text backbone has exactly 24 layers in verified canonical sequence', () => {
    const textModel = data.models.text;
    assert.strictEqual(textModel.totalLayers, 24, 'Text model must report 24 total layers');
    assert.strictEqual(textModel.schedule.length, 24, 'Text backbone schedule must contain 24 layers');

    // Count operator types
    const convLayers = textModel.schedule.filter(l => l.type === 'conv');
    const fullAttnLayers = textModel.schedule.filter(l => l.type === 'full_attention');
    const slidingAttnLayers = textModel.schedule.filter(l => l.type === 'sliding_attention');

    assert.strictEqual(convLayers.length, 13, 'Must have exactly 13 GatedDeltaNet conv layers');
    assert.strictEqual(fullAttnLayers.length, 6, 'Must have exactly 6 full attention layers');
    assert.strictEqual(slidingAttnLayers.length, 5, 'Must have exactly 5 sliding window attention layers');

    // Sequence verification matching text_config.json
    assert.strictEqual(textModel.schedule[0].type, 'conv', 'Layer 0 must be conv');
    assert.strictEqual(textModel.schedule[1].type, 'conv', 'Layer 1 must be conv');
    assert.strictEqual(textModel.schedule[2].type, 'full_attention', 'Layer 2 must be full attention');
    assert.strictEqual(textModel.schedule[3].type, 'conv', 'Layer 3 must be conv');
    assert.strictEqual(textModel.schedule[4].type, 'sliding_attention', 'Layer 4 must be sliding attention');
    assert.strictEqual(textModel.schedule[23].type, 'conv', 'Layer 23 must be conv');
  });

  test('sharedBackboneLayers matches textModel schedule', () => {
    assert.strictEqual(data.sharedBackboneLayers.length, 24);
    assert.strictEqual(data.sharedBackboneLayers[2].type, 'full_attention');
    assert.strictEqual(data.sharedBackboneLayers[4].type, 'sliding_attention');
  });

  test('multimodal encoder layer counts match canonical configs', () => {
    const visionModel = data.models.vision;
    assert.strictEqual(visionModel.componentCounts.visionLayers, 14, 'Vision encoder must have 14 layers');
    assert.strictEqual(visionModel.totalLayers, 38, 'Vision total layers must be 24 + 14 = 38');

    const audioModel = data.models.audio;
    assert.strictEqual(audioModel.componentCounts.audioLayers, 17, 'Audio encoder must have 17 layers');
    assert.strictEqual(audioModel.componentCounts.depthformerLayers, 3, 'Depthformer must have 3 layers');
    assert.strictEqual(audioModel.totalLayers, 44, 'Audio total layers must be 24 + 17 + 3 = 44');

    const omniModel = data.models.omni;
    assert.strictEqual(omniModel.componentCounts.visionLayers, 14);
    assert.strictEqual(omniModel.componentCounts.audioLayers, 17);
    assert.strictEqual(omniModel.componentCounts.depthformerLayers, 3);
    assert.strictEqual(omniModel.totalLayers, 58, 'Omni total layers must be 24 + 14 + 17 + 3 = 58');
  });
});

describe('PrismLab S5-B Provenance Integrity & Audit Flagging', () => {
  const jsonPath = resolve(__dirname, '../src/data/architecture/architectureData.json');
  const data = JSON.parse(readFileSync(jsonPath, 'utf-8'));
  const validTiers = ['CONFIRMED_CONFIG', 'SOURCE_TRACED', 'CONCEPTUAL_FLOW', 'MEASURED_RUNTIME', 'UNDER_AUDIT'];

  test('every component node has a recognized provenance tier', () => {
    for (const [modelId, model] of Object.entries(data.models)) {
      for (const comp of model.components) {
        assert.ok(
          validTiers.includes(comp.provenance),
          `Component ${comp.id} in model ${modelId} has invalid provenance: ${comp.provenance}`
        );
        assert.ok(comp.sourceFile, `Component ${comp.id} must declare source file reference`);
      }
    }
  });

  test('d1 and d1_omni decision readout components are flagged as UNDER_AUDIT', () => {
    const d1 = data.models.d1;
    const d1Omni = data.models.d1_omni;

    const d1DecisionComp = d1.components.find(c => c.id === 'decision_head' || c.group === 'decision_head');
    assert.ok(d1DecisionComp, 'd1 must have a decision interface component');
    assert.strictEqual(d1DecisionComp.provenance, 'UNDER_AUDIT', 'd1 decision component must be flagged as UNDER_AUDIT');
    assert.ok(d1DecisionComp.caveat, 'd1 decision component must state an academic audit caveat');

    const d1OmniDecisionComp = d1Omni.components.find(c => c.id === 'decision_head' || c.group === 'decision_head');
    assert.ok(d1OmniDecisionComp, 'd1_omni must have a decision interface component');
    assert.strictEqual(d1OmniDecisionComp.provenance, 'UNDER_AUDIT', 'd1_omni decision component must be flagged as UNDER_AUDIT');
  });

  test('no fake line numbers in source traces', () => {
    // Provenance rule: Only reference source files and verified config keys, never fabricate line numbers like 'file.py:123'
    for (const [modelId, model] of Object.entries(data.models)) {
      for (const comp of model.components) {
        assert.doesNotMatch(comp.sourceFile, /:\d+$/, `Source file for ${comp.id} should not fabricate line numbers: ${comp.sourceFile}`);
      }
    }
  });
});
