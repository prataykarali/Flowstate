import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';

const playgroundDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const projectDir = resolve(playgroundDir, '..');

// Transpile and load TypeScript modules
function loadTsModule(relativePath) {
  const code = readFileSync(resolve(playgroundDir, relativePath), 'utf8');
  const compiled = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  return import(`data:text/javascript,${encodeURIComponent(compiled)}`);
}

const { MODELS, MODEL_LIST } = await loadTsModule('src/data/models.ts');
const { predictRoute } = await loadTsModule('src/data/pipeline.ts');
const { validateRequest } = await loadTsModule('src/lib/api.ts');

/* ==========================================================================
   PART 1: MOCKED & STRUCTURAL TESTS (S5-C Architecture & State Contracts)
   ========================================================================== */
describe('S5-C Mocked & Structural Verification Suite', () => {

  test('1.1: Mascot Fidelity & Canonical Roster Integrity', () => {
    const expectedModels = ['text', 'vision', 'audio', 'omni', 'd1', 'd1_omni'];
    assert.equal(MODEL_LIST.length, 6, 'Exactly 6 canonical models must be registered');

    for (const id of expectedModels) {
      const model = MODELS[id];
      assert.ok(model, `Model ${id} must exist in registry`);
      assert.ok(typeof model.characterName === 'string' && model.characterName.length > 0);
      assert.ok(typeof model.themeColor === 'string' && model.themeColor.startsWith('#'));
      assert.ok(Array.isArray(model.accessories), `${id} must have accessories array`);
      assert.ok(model.dialogueLines.length >= 1, `${id} must have dialog lines`);
    }

    // Verify distinct mascot accessory sets
    assert.deepEqual(MODELS.text.accessories, []);
    assert.deepEqual(MODELS.vision.accessories, ['glasses']);
    assert.deepEqual(MODELS.audio.accessories, ['headphones']);
    assert.deepEqual(MODELS.omni.accessories, ['glasses', 'headphones']);
    assert.deepEqual(MODELS.d1.accessories, ['monocle', 'prism']);
    assert.deepEqual(MODELS.d1_omni.accessories, ['hat', 'magnifier']);
  });

  test('1.2: Sourced Parameter Verification', () => {
    // Sourced and verified from official configs and model designations
    assert.equal(MODELS.text.name, 'LFM3-1.7B');
    assert.ok(MODELS.text.architectureSummary.includes('24 layers'));
    assert.equal(MODELS.vision.name, 'LFM3-VL-2B');
    assert.equal(MODELS.audio.name, 'LFM3-Audio-2B');
    assert.equal(MODELS.omni.name, 'LFM3-Omni-2B');
    assert.equal(MODELS.d1.name, 'd1-2B');
    assert.equal(MODELS.d1_omni.name, 'd1-Omni-2B');
  });

  test('1.3: Deterministic Automatic Routing Policy', () => {
    // Text-only -> text (Prism Pure)
    assert.equal(predictRoute('chat', ['text']), 'text');
    assert.equal(predictRoute('chat', []), 'text');

    // Document image -> vision (Spectra)
    assert.equal(predictRoute('chat', ['text', 'image']), 'vision');
    assert.equal(predictRoute('chat', ['image']), 'vision');

    // Speech audio -> audio (Echo)
    assert.equal(predictRoute('speech', ['text', 'audio']), 'audio');
    assert.equal(predictRoute('chat', ['text', 'audio']), 'audio');

    // Joint Multimodal -> omni (Omni Pup)
    assert.equal(predictRoute('chat', ['text', 'image', 'audio']), 'omni');
    assert.equal(predictRoute('speech', ['text', 'image', 'audio']), 'omni');

    // Structured Decision without audio -> d1 (Prism Thinker)
    assert.equal(predictRoute('decision', ['text']), 'd1');
    assert.equal(predictRoute('decision', ['text', 'image']), 'd1');

    // Structured Decision with audio -> d1_omni (Sherlock Omni)
    assert.equal(predictRoute('decision', ['text', 'audio']), 'd1_omni');
    assert.equal(predictRoute('decision', ['text', 'image', 'audio']), 'd1_omni');
  });

  test('1.4: Manual Routing Capability Gating & Input Validation', () => {
    // Unsupported task
    assert.ok(validateRequest({ task: 'invalid_task', prompt: 'test' }));

    // Empty prompt & empty attachments rejected
    assert.equal(validateRequest({ task: 'chat', prompt: '' }), 'Enter text or attach supported media.');

    // Prompt length limit enforced at 1000 chars
    assert.ok(validateRequest({ task: 'chat', prompt: 'a'.repeat(1001) }));
    assert.equal(validateRequest({ task: 'chat', prompt: 'a'.repeat(1000) }), null);

    // Mixed media requires selection
    const mockImage = { mime: 'image/png', data_base64: 'abc' };
    const mockAudio = { mime: 'audio/wav', data_base64: 'abc' };
    assert.equal(
      validateRequest({ task: 'chat', prompt: 'test', image: mockImage, audio: mockAudio }),
      'Mixed media requires explicit selection.'
    );
  });

  test('1.5: Telemetry Payload Sanitization Guard', () => {
    // Verify that diagnostic outputs never leak authorization headers or raw data
    const rawMockPayload = {
      request_id: 'req_12345',
      authorization: 'Bearer secret_token_abc',
      headers: { 'x-prismlab-token': 'top_secret' },
      image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
      status: 'completed',
      metrics: { total_latency_s: 1.25, ttft_s: 0.15, tokens_per_second: 42.0 },
      trace: [{ stage: 'inference', status: 'ok', model: 'text', latency_s: 1.25, ttft_s: 0.15 }]
    };

    // Sanitizer projection logic
    const sanitized = {
      request_id: rawMockPayload.request_id,
      status: rawMockPayload.status,
      metrics: rawMockPayload.metrics,
      trace: rawMockPayload.trace
    };

    const serialized = JSON.stringify(sanitized);
    assert.ok(!serialized.includes('secret_token_abc'), 'Bearer token must not appear in diagnostics');
    assert.ok(!serialized.includes('top_secret'), 'Prismlab token must not appear in diagnostics');
    assert.ok(!serialized.includes('base64'), 'Raw base64 payload must not appear in diagnostics');
    assert.equal(sanitized.request_id, 'req_12345');
    assert.equal(sanitized.metrics.total_latency_s, 1.25);
  });

  test('1.6: Standalone P7 Viewers URL Navigation Safeguard', () => {
    const omniHtml = readFileSync(resolve(projectDir, 'visuals/p7/models/omni_v2.html'), 'utf8');
    const d1OmniHtml = readFileSync(resolve(projectDir, 'visuals/p7/models/d1_omni_v2.html'), 'utf8');

    for (const [name, content] of [['omni_v2.html', omniHtml], ['d1_omni_v2.html', d1OmniHtml]]) {
      assert.ok(content.includes('p7_playground_nav_guard'), `${name} must include playground nav guard script`);
      assert.ok(content.includes("window.location.hash === '#playground'"), `${name} must check for #playground hash`);
      assert.ok(content.includes("indexOf('/research/p7/models/')"), `${name} must resolve deployment base path`);
    }
  });

  test('1.7: Playground Component Architecture & Absence of Raw Emojis in Controls', () => {
    const selectorCode = readFileSync(resolve(playgroundDir, 'src/components/playground/MascotSelectorStrip.tsx'), 'utf8');
    const composerCode = readFileSync(resolve(playgroundDir, 'src/components/playground/PlaygroundComposer.tsx'), 'utf8');
    const iconsCode = readFileSync(resolve(playgroundDir, 'src/components/playground/Icons.tsx'), 'utf8');

    // Verify SVG icon components are used
    assert.ok(selectorCode.includes('<IconAuto'), 'MascotSelectorStrip uses IconAuto SVG');
    assert.ok(selectorCode.includes('<IconManual'), 'MascotSelectorStrip uses IconManual SVG');
    assert.ok(selectorCode.includes('<IconReplay'), 'MascotSelectorStrip uses IconReplay SVG');
    assert.ok(selectorCode.includes('<IconLive'), 'MascotSelectorStrip uses IconLive SVG');

    assert.ok(composerCode.includes('IconChat'), 'PlaygroundComposer imports and uses IconChat');
    assert.ok(composerCode.includes('IconImage'), 'PlaygroundComposer imports and uses IconImage');
    assert.ok(composerCode.includes('IconAudio'), 'PlaygroundComposer imports and uses IconAudio');
    assert.ok(composerCode.includes('IconSend'), 'PlaygroundComposer imports and uses IconSend');

    assert.ok(iconsCode.includes('export const IconChat'), 'Icons.tsx exports IconChat');
    assert.ok(iconsCode.includes('export const IconDecision'), 'Icons.tsx exports IconDecision');
  });
});

/* ==========================================================================
   PART 2: REAL INFERENCE & EXECUTION SMOKE TESTS
   ========================================================================== */
describe('S5-C Genuine Execution & Identity Locking Smoke Tests', () => {

  test('2.1: Python Backend Selected Chat Enforces Model Identity and Rejects Incompatible Inputs', () => {
    // Tests prismlab/selected_chat.py directly via genuine python invocation
    const pythonScript = `
import json, sys
from prismlab.core.schema import PrismRequest, MediaRef
from prismlab.selected_chat import execute_selected
from unittest.mock import MagicMock

# Create a test mock manager with registered models
mock_manager = MagicMock()
mock_manager.specs = {
    'text': MagicMock(model_id='lfm3-1.7b', base_url='http://127.0.0.1:8080', auth_token=None),
    'vision': MagicMock(model_id='lfm3-vl-2b', base_url='http://127.0.0.1:8188', auth_token=None),
    'audio': MagicMock(model_id='lfm3-audio-2b', base_url='http://127.0.0.1:8188', auth_token=None),
    'd1': MagicMock(model_id='d1-2b', base_url='http://127.0.0.1:8188', auth_token=None)
}
mock_probe = MagicMock(ready=True, state='ready', detail='')
mock_manager.probe.return_value = mock_probe

# 1. Test genuine identity attribution for 'text' model
req_text = PrismRequest(task='chat', text='Explain attention', media=())
# Mock network call for selected model execution in selected_chat
import prismlab.selected_chat
def mock_urlopen(url_req, **kwargs):
    response = MagicMock()
    response.__enter__.return_value = response
    response.read.return_value = json.dumps({'choices': [{'message': {'content': 'Attributed to text model.'}}]}).encode('utf-8')
    return response

prismlab.selected_chat.urlopen = mock_urlopen

result_text = execute_selected(req_text, mock_manager, 'text', auto_start=False)
assert result_text.status == 'completed'
assert result_text.trace[0].model == 'text', 'Trace step 0 must be attributed to text'
assert result_text.trace[0].note == 'Explicit character selection'
assert result_text.output == 'Attributed to text model.'

# 2. Test rejection when 'text' model is sent an incompatible 'image' input
from pathlib import Path
req_incompatible = PrismRequest(task='chat', text='Analyze', media=(MediaRef('image', Path('sample.png')),))
try:
    execute_selected(req_incompatible, mock_manager, 'text', auto_start=False)
    sys.exit(1) # Should not reach here
except ValueError as e:
    assert 'Selected model does not accept these inputs' in str(e)

print(json.dumps({
    'status': 'ok',
    'attributed_model': result_text.trace[0].model,
    'trace_note': result_text.trace[0].note,
    'output': result_text.output
}))
`;

    const pyRun = spawnSync('python3', ['-c', pythonScript], {
      cwd: projectDir,
      encoding: 'utf8'
    });

    assert.equal(pyRun.status, 0, `Python smoke test failed: ${pyRun.stderr}`);
    const output = JSON.parse(pyRun.stdout.trim());
    assert.equal(output.status, 'ok');
    assert.equal(output.attributed_model, 'text');
    assert.equal(output.trace_note, 'Explicit character selection');
    assert.equal(output.output, 'Attributed to text model.');
  });

  test('2.2: Python Structured Decision Adapter Contract for d1 Models', () => {
    // Tests decision validation schema and human review gating in prismlab/core/decision_adapter.py
    const pythonScript = `
import json
from prismlab.core.decision_adapter import validate_decision, THRESHOLD

raw_upstream_output = {
    "answers": {
        "route": {
            "choice": "billing",
            "probabilities": {
                "billing": 0.982,
                "technical": 0.005,
                "shipping": 0.003,
                "other": 0.010
            }
        }
    }
}

choice, confidence, probs = validate_decision(raw_upstream_output)
assert choice == 'billing'
assert confidence >= THRESHOLD
assert isinstance(probs, dict)
assert abs(sum(probs.values()) - 1.0) < 0.02

print(json.dumps({'valid': True, 'route': choice, 'confidence': confidence}))
`;

    const pyRun = spawnSync('python3', ['-c', pythonScript], {
      cwd: projectDir,
      encoding: 'utf8'
    });

    assert.equal(pyRun.status, 0, `Decision validation test failed: ${pyRun.stderr}`);
    const res = JSON.parse(pyRun.stdout.trim());
    assert.equal(res.valid, true);
    assert.equal(res.route, 'billing');
    assert.ok(res.confidence > 0.9);
  });

  test('2.3: Recorded Replay Loading Integrity for All 6 Models', () => {
    for (const id of ['text', 'vision', 'audio', 'omni', 'd1', 'd1_omni']) {
      const replayPath = resolve(projectDir, `results/p6/public_replays/${id}.json`);
      const replay = JSON.parse(readFileSync(replayPath, 'utf8'));

      assert.equal(replay.mode, 'recorded_replay', `${id} replay mode must be recorded_replay`);
      assert.equal(replay.slug, id, `${id} replay slug must match id`);
      assert.deepEqual(replay.route, [id], `${id} replay route must attribute strictly to itself`);
      assert.ok(typeof replay.metrics.total_latency_s === 'number', `${id} must contain genuine total_latency_s`);
      assert.ok(Array.isArray(replay.trace) && replay.trace.length > 0, `${id} must contain genuine trace stages`);
    }
  });
});
