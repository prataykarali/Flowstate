import React, { useState, useEffect } from 'react';
import { MODELS } from '../data/models.ts';
import { executeLocal, generateTextStream, readMedia, type LiveResult, type MediaPayload } from '../lib/api.ts';
import { cancelActiveInference } from '../lib/inferenceLock.ts';

export interface DecisionStudioProps {
  model: 'd1' | 'd1_omni';
  isBusy: boolean;
  onSwitchToPure: () => void;
  onDecisionCompleted: (result: LiveResult, rawDisplay: string) => void;
}

interface ChoiceItem {
  id: string;
  label: string;
  description: string;
}

const PRESET_TEMPLATES: Record<string, { title: string; instruction: string; choices: ChoiceItem[] }> = {
  binary: {
    title: 'Yes / No Approval',
    instruction: 'Should this requested change or mitigation be approved immediately?',
    choices: [
      { id: 'approve', label: 'Approve', description: 'Immediate authorization to proceed' },
      { id: 'reject', label: 'Reject / Hold', description: 'Deny authorization or hold for review' },
    ]
  },
  priority: {
    title: 'Severity & Priority',
    instruction: 'What is the operational priority level for this incident?',
    choices: [
      { id: 'p1_critical', label: 'P1 Critical', description: 'Outage, severe data loss, or blocking customer impact' },
      { id: 'p2_elevated', label: 'P2 Elevated', description: 'Degraded performance or partial component failure' },
      { id: 'p3_routine', label: 'P3 Routine', description: 'Minor non-blocking issue or scheduled observation' },
    ]
  },
  action: {
    title: 'System Mitigation',
    instruction: 'Which automated failover or mitigation procedure should be triggered?',
    choices: [
      { id: 'failover', label: 'Failover to Replica', description: 'Promote hot standby replica and drain primary' },
      { id: 'throttle', label: 'Rate-Limit Traffic', description: 'Apply upstream traffic shedding and shed load' },
      { id: 'restart', label: 'Restart Worker Group', description: 'Rolling restart of backend compute workers' },
      { id: 'maintain', label: 'Maintain State', description: 'No automated action; continue passive monitoring' },
    ]
  },
  custom: {
    title: 'Custom Evaluation',
    instruction: 'Which candidate choice best satisfies the operational criteria?',
    choices: [
      { id: 'choice_a', label: 'Choice A', description: 'Primary candidate option' },
      { id: 'choice_b', label: 'Choice B', description: 'Alternative candidate option' },
    ]
  }
};

const STORAGE_KEY = 'prismlab_decision_studio_v1';

export const DecisionStudio: React.FC<DecisionStudioProps> = ({
  model,
  isBusy,
  onSwitchToPure,
  onDecisionCompleted,
}) => {
  const [templateKey, setTemplateKey] = useState<string>('binary');
  const [instruction, setInstruction] = useState<string>(PRESET_TEMPLATES.binary.instruction);
  const [situationText, setSituationText] = useState<string>('High write volume on replica cluster detected with query latency spiking to 450ms.');
  const [choices, setChoices] = useState<ChoiceItem[]>(PRESET_TEMPLATES.binary.choices);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Explanation state
  const [latestResult, setLatestResult] = useState<LiveResult | null>(null);
  const [explanationDraft, setExplanationDraft] = useState<string>('');
  const [explaining, setExplaining] = useState<boolean>(false);

  // Load saved state
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data && typeof data === 'object') {
          if (data.instruction) setInstruction(data.instruction);
          if (data.situationText) setSituationText(data.situationText);
          if (Array.isArray(data.choices) && data.choices.length >= 2) setChoices(data.choices);
        }
      }
    } catch {}
  }, []);

  const saveState = (inst: string, sit: string, ch: ChoiceItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ instruction: inst, situationText: sit, choices: ch }));
    } catch {}
  };

  const handleTemplateChange = (key: string) => {
    const tmpl = PRESET_TEMPLATES[key];
    if (!tmpl) return;
    setTemplateKey(key);
    setInstruction(tmpl.instruction);
    setChoices(tmpl.choices);
    saveState(tmpl.instruction, situationText, tmpl.choices);
  };

  const updateChoice = (index: number, field: 'id' | 'label' | 'description', val: string) => {
    const next = [...choices];
    next[index] = { ...next[index], [field]: val };
    setChoices(next);
    saveState(instruction, situationText, next);
  };

  const addChoice = () => {
    if (choices.length >= 4) return;
    const nextId = `choice_${String.fromCharCode(97 + choices.length)}`;
    const next = [...choices, { id: nextId, label: `Choice ${String.fromCharCode(65 + choices.length)}`, description: 'Candidate description' }];
    setChoices(next);
    saveState(instruction, situationText, next);
  };

  const removeChoice = (index: number) => {
    if (choices.length <= 2) return;
    const next = choices.filter((_, i) => i !== index);
    setChoices(next);
    saveState(instruction, situationText, next);
  };

  // Heuristic conversational check: is the situation open-ended chat rather than an evaluation state?
  const isConversational = /^(hi|hello|hey|what's up|tell me a joke|who are you|how are you|how do you feel|what is the meaning of life)/i.test(situationText.trim());

  // Heuristic choices extraction from text e.g. "should we A or B"
  const extractableMatch = situationText.match(/should (?:we|i|it) (.*?) or (.*?)[\?\.]?$/i);

  const applyExtractedChoices = (opt1: string, opt2: string) => {
    const clean1 = opt1.replace(/^(either\s+)/i, '').trim();
    const clean2 = opt2.replace(/[\?\.]*$/, '').trim();
    const slug1 = clean1.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 20) || 'option_1';
    const slug2 = clean2.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 20) || 'option_2';
    const next: ChoiceItem[] = [
      { id: slug1, label: clean1.slice(0, 30), description: clean1 },
      { id: slug2, label: clean2.slice(0, 30), description: clean2 }
    ];
    setTemplateKey('custom');
    setChoices(next);
    setInstruction(`Which choice should be selected?`);
    saveState(`Which choice should be selected?`, situationText, next);
  };

  const runDecision = async () => {
    if (isBusy || evaluating) return;
    setError(null);
    setEvaluating(true);
    setExplanationDraft('');
    setLatestResult(null);

    // Validate choices
    const criteria: Record<string, string> = {};
    for (const c of choices) {
      const key = c.id.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_') || `opt_${Math.random().toString(36).slice(2, 6)}`;
      criteria[key] = c.description.trim() || c.label.trim();
    }

    if (Object.keys(criteria).length < 2) {
      setError('At least two valid choices are required.');
      setEvaluating(false);
      return;
    }

    try {
      let audioPayload: MediaPayload | undefined;
      if (model === 'd1_omni' && audioFile) {
        audioPayload = await readMedia(audioFile, 'audio');
      }

      const res = await executeLocal({
        task: 'decision',
        model,
        prompt: situationText.trim() || instruction,
        audio: audioPayload,
        decision_question: {
          instructions: instruction.trim(),
          criteria
        },
        max_tokens: 48,
      });

      setLatestResult(res);
      const rawText = JSON.stringify(res.output, null, 2);
      onDecisionCompleted(res, rawText);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Decision evaluation failed.');
    } finally {
      setEvaluating(false);
    }
  };

  const explainWithPure = async () => {
    if (!latestResult || explaining) return;
    setExplaining(true);
    setExplanationDraft('');

    const outputObj = typeof latestResult.output === 'object' ? latestResult.output : null;
    const predicted = (outputObj as any)?.predicted_route || 'the selected choice';
    const prompt = `You are Prism Pure (LFM3-1.7B). Explain concisely in two sentences why a system decision evaluator chose '${predicted}' for this situation:\nSituation: "${situationText}"\nInstruction: "${instruction}"\nKeep your explanation objective and grounded strictly in the criteria.`;

    try {
      await generateTextStream(prompt, update => {
        if (update.kind === 'token') {
          setExplanationDraft(prev => prev + update.text);
        }
      }, 96);
    } catch (err) {
      setExplanationDraft('Could not generate explanation with Prism Pure: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setExplaining(false);
    }
  };

  const character = MODELS[model];

  return (
    <div className="decision-studio" style={{
      background: 'rgba(23, 23, 23, 0.94)',
      border: '1px solid var(--prismlab-panel-border, #27272a)',
      borderRadius: '16px',
      padding: '16px 20px',
      margin: '12px 0',
      color: 'var(--prismlab-panel-text, #fafafa)',
      backdropFilter: 'blur(16px)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
    }}>
      {/* Studio Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--prismlab-panel-border, #27272a)', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>⚖️</span>
          <div>
            <strong style={{ fontSize: '14px', letterSpacing: '0.02em', color: 'var(--prismlab-panel-text, #fafafa)' }}>
              {character.characterName} Decision Studio
            </strong>
            <span style={{ fontSize: '11px', color: 'var(--prismlab-panel-muted, #a1a1aa)', display: 'block' }}>
              Native System-1 Logit Probability Evaluation · Zero Autoregressive Hallucination
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {Object.entries(PRESET_TEMPLATES).map(([key, t]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleTemplateChange(key)}
              style={{
                background: templateKey === key ? 'rgba(246, 137, 74, 0.2)' : 'var(--prismlab-panel-surface-subtle, #232323)',
                border: templateKey === key ? '1px solid var(--prismlab-panel-accent, #f6894a)' : '1px solid var(--prismlab-panel-border, #27272a)',
                color: templateKey === key ? '#fff' : 'var(--prismlab-panel-muted, #a1a1aa)',
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: templateKey === key ? 700 : 500,
                transition: 'all 0.15s'
              }}
            >
              {t.title}
            </button>
          ))}
        </div>
      </div>

      {/* Socratic Intent Guidance if User Inputs Chat Query */}
      {isConversational && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.15)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: '10px',
          padding: '10px 14px',
          marginBottom: '12px',
          fontSize: '12px',
          color: '#fef3c7',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div>
            <strong>Conversational Query Detected:</strong> {character.characterName} is a discrete System-1 decision evaluator, not an open-ended conversational generator.
          </div>
          <button
            type="button"
            onClick={onSwitchToPure}
            style={{
              background: '#f59e0b',
              color: '#000',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              fontWeight: 700,
              fontSize: '11px',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Switch to Prism Pure (Chat) →
          </button>
        </div>
      )}

      {/* Choice Extraction Proposal */}
      {!isConversational && extractableMatch && templateKey !== 'custom' && (
        <div style={{
          background: 'rgba(56, 189, 248, 0.15)',
          border: '1px solid rgba(56, 189, 248, 0.4)',
          borderRadius: '10px',
          padding: '8px 12px',
          marginBottom: '12px',
          fontSize: '12px',
          color: '#e0f2fe',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>
            Detected choice comparison: <em>"{extractableMatch[1]}"</em> vs <em>"{extractableMatch[2]}"</em>.
          </span>
          <button
            type="button"
            onClick={() => applyExtractedChoices(extractableMatch[1], extractableMatch[2])}
            style={{
              background: '#38bdf8',
              color: '#000',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 10px',
              fontWeight: 700,
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            Extract Choices
          </button>
        </div>
      )}

      {/* Situation & Instruction Inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
        <div>
          <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#c4b5fd', display: 'block', marginBottom: '4px', fontWeight: 700 }}>
            Situation Context / Input State
          </label>
          <textarea
            rows={3}
            value={situationText}
            onChange={e => { setSituationText(e.target.value); saveState(instruction, e.target.value, choices); }}
            placeholder="Describe the operational incident, alert, or situation…"
            style={{
              width: '100%',
              background: 'var(--prismlab-panel-surface-subtle, #232323)',
              border: '1px solid var(--prismlab-panel-border, #27272a)',
              borderRadius: '8px',
              padding: '8px 10px',
              color: 'var(--prismlab-panel-text, #fafafa)',
              fontSize: '12px',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        </div>
        <div>
          <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#c4b5fd', display: 'block', marginBottom: '4px', fontWeight: 700 }}>
            Evaluation Question / Directive
          </label>
          <textarea
            rows={3}
            value={instruction}
            onChange={e => { setInstruction(e.target.value); saveState(e.target.value, situationText, choices); }}
            placeholder="Formulate the precise decision directive…"
            style={{
              width: '100%',
              background: 'var(--prismlab-panel-surface-subtle, #232323)',
              border: '1px solid var(--prismlab-panel-border, #27272a)',
              borderRadius: '8px',
              padding: '8px 10px',
              color: 'var(--prismlab-panel-text, #fafafa)',
              fontSize: '12px',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        </div>
      </div>

      {/* Multimodal Audio Option for d1_omni */}
      {model === 'd1_omni' && (
        <div style={{ marginBottom: '12px', padding: '8px 12px', background: 'var(--prismlab-panel-surface-subtle, #232323)', border: '1px solid var(--prismlab-panel-border, #27272a)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', color: '#f0abfc', fontWeight: 600 }}>🎙️ Multimodal Audio Evidence:</span>
          <input
            type="file"
            accept="audio/wav,audio/x-wav,.wav"
            onChange={e => setAudioFile(e.target.files?.[0] || null)}
            style={{ fontSize: '11px' }}
          />
          {audioFile && <span style={{ fontSize: '11px', color: '#a7f3d0' }}>✓ {audioFile.name} attached</span>}
        </div>
      )}

      {/* Candidate Choices Configuration */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#c4b5fd', fontWeight: 700 }}>
            Candidate Choices ({choices.length}/4)
          </label>
          {choices.length < 4 && (
            <button
              type="button"
              onClick={addChoice}
              style={{
                background: 'var(--prismlab-panel-surface-subtle, #232323)',
                border: '1px solid var(--prismlab-panel-border, #27272a)',
                color: 'var(--prismlab-panel-text, #fafafa)',
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              + Add Choice
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: choices.length === 2 ? '1fr 1fr' : choices.length === 3 ? '1fr 1fr 1fr' : '1fr 1fr 1fr 1fr', gap: '8px' }}>
          {choices.map((c, i) => (
            <div key={i} style={{ background: 'var(--prismlab-panel-surface-raised, #1c1c1c)', border: '1px solid var(--prismlab-panel-border, #27272a)', borderRadius: '8px', padding: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <input
                  type="text"
                  value={c.label}
                  onChange={e => updateChoice(i, 'label', e.target.value)}
                  placeholder="Label"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid rgba(255,255,255,0.2)',
                    color: '#67e8f9',
                    fontSize: '12px',
                    fontWeight: 700,
                    width: '80%',
                    padding: '2px 0'
                  }}
                />
                {choices.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeChoice(i)}
                    style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '12px' }}
                    title="Remove choice"
                  >
                    ✕
                  </button>
                )}
              </div>
              <textarea
                rows={2}
                value={c.description}
                onChange={e => updateChoice(i, 'description', e.target.value)}
                placeholder="Criteria / description…"
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  color: '#e2e8f0',
                  fontSize: '11px',
                  fontFamily: 'inherit',
                  resize: 'none'
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Action Strip */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
          Evaluates logit forward passes at <code>/v1/systemone</code> without autoregressive tokens.
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isBusy && (
            <button
              type="button"
              onClick={() => cancelActiveInference()}
              style={{
                background: 'rgba(239, 68, 68, 0.25)',
                border: '1px solid #ef4444',
                color: '#fca5a5',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Cancel Inference
            </button>
          )}
          <button
            type="button"
            disabled={isBusy || evaluating}
            onClick={runDecision}
            style={{
              background: 'linear-gradient(135deg, #a855f7 0%, #06b6d4 100%)',
              border: 'none',
              borderRadius: '8px',
              padding: '7px 18px',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 700,
              cursor: isBusy || evaluating ? 'not-allowed' : 'pointer',
              opacity: isBusy || evaluating ? 0.6 : 1,
              boxShadow: '0 4px 14px rgba(168, 85, 247, 0.4)'
            }}
          >
            {evaluating ? 'Evaluating Logits…' : `Evaluate with ${character.characterName} ➔`}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ marginTop: '10px', padding: '8px 12px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', color: '#fca5a5', fontSize: '12px' }}>
          {error}
        </div>
      )}

      {/* Explanatory Overlay if result is available */}
      {latestResult && (
        <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: '#a7f3d0', fontWeight: 600 }}>
              ✓ Native decision logits received in {latestResult.metrics?.total_latency_s?.toFixed(2) || '2.0'}s
            </span>
            <button
              type="button"
              disabled={explaining}
              onClick={explainWithPure}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffd77b',
                borderRadius: '6px',
                padding: '4px 12px',
                fontSize: '11px',
                cursor: explaining ? 'wait' : 'pointer',
                fontWeight: 600
              }}
            >
              {explaining ? '✦ Requesting Explanation…' : '✦ Explain with Prism Pure (LFM3-1.7B)'}
            </button>
          </div>

          {explanationDraft && (
            <div style={{
              background: 'var(--prismlab-panel-surface-raised, #1c1c1c)',
              border: '1px solid var(--prismlab-panel-border, #27272a)',
              borderRadius: '10px',
              padding: '10px 14px',
              fontSize: '12px',
              color: '#fef08a',
              lineHeight: 1.5
            }}>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--prismlab-panel-accent, #f6894a)', fontWeight: 700, marginBottom: '4px' }}>
                ✦ Autoregressive Explanation (LFM3-1.7B) — Separately generated reasoning, not d1 native logits
              </div>
              <p style={{ margin: 0, color: 'var(--prismlab-panel-text, #fafafa)' }}>{explanationDraft}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
