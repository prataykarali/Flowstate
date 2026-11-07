import React, { useEffect, useRef, useState } from 'react';
import { MODELS, type CanonicalModelId, type ModelMeta } from '../../data/models.ts';
import type { LiveResult, LiveTask } from '../../lib/api.ts';
import { MascotAvatar } from '../mascots/MascotAvatar.tsx';
import {
  IconCopy,
  IconCheck,
  IconTelemetry,
  IconImage,
  IconAudio,
  IconDecision,
  IconWarning
} from './Icons.tsx';

export interface DecisionPayload {
  predicted_route: string;
  confidence: number;
  probabilities?: Record<string, number>;
  human_review_required?: boolean;
  exploratory_gate_passed?: boolean;
  external_action_executed?: boolean;
}

export interface PlaygroundMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  modelId: CanonicalModelId;
  task?: LiveTask;
  isStructuredDecision?: boolean;
  decisionData?: DecisionPayload;
  imagePreview?: string;
  imageName?: string;
  audioPreview?: string;
  audioName?: string;
  result?: LiveResult;
  isStreaming?: boolean;
  isReplay?: boolean;
  incompatibilityNotice?: string;
  timestamp: number;
}

interface PlaygroundConversationProps {
  messages: PlaygroundMessage[];
  activeModel: ModelMeta;
  routingMode: 'auto' | 'manual';
  isGenerating: boolean;
  streamingText: string;
  streamingModelId?: CanonicalModelId;
  onInspectResult: (result: LiveResult) => void;
}

export const PlaygroundConversation: React.FC<PlaygroundConversationProps> = ({
  messages,
  activeModel,
  routingMode,
  isGenerating,
  streamingText,
  streamingModelId,
  onInspectResult
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const followLatestRef = useRef(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Auto-scroll to bottom on new messages or streaming tokens
  useEffect(() => {
    if (scrollRef.current && followLatestRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingText, isGenerating]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderDecisionCard = (decision: DecisionPayload) => {
    const confidencePct = (decision.confidence * 100).toFixed(1);
    const sortedProbs = decision.probabilities
      ? Object.entries(decision.probabilities).sort((a, b) => b[1] - a[1])
      : [];

    return (
      <div className="structured-decision-card">
        <div className="decision-header">
          <div className="decision-icon-badge">
            <IconDecision size={16} />
            <span>Structured Decision Output</span>
          </div>
          <span className="confidence-pill">{confidencePct}% Confidence</span>
        </div>

        <div className="decision-main-row">
          <div className="predicted-slot-box">
            <span className="slot-label">PREDICTED CATEGORY</span>
            <strong className="slot-value">{decision.predicted_route}</strong>
          </div>
          {decision.human_review_required && (
            <div className="review-badge-warning">
              <IconWarning size={14} />
              <span>Consequential Gate: Human Review Required</span>
            </div>
          )}
        </div>

        {/* Probability Distribution */}
        {sortedProbs.length > 0 && (
          <div className="decision-distribution-section">
            <span className="distribution-label">Probability Distribution:</span>
            <div className="distribution-grid">
              {sortedProbs.map(([slot, prob]) => {
                const pct = (prob * 100).toFixed(1);
                return (
                  <div key={slot} className="prob-bar-row">
                    <span className="prob-slot-name">{slot}</span>
                    <div className="prob-bar-track">
                      <div className="prob-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="prob-slot-pct">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="play-conversation-container" aria-label="Conversation history">
      <div className="play-messages-scroll" ref={scrollRef} onScroll={event => {
        const element = event.currentTarget;
        followLatestRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
      }}>
        {/* Welcome Empty State */}
        {messages.length === 0 && (
          <div className="conversation-standby">
            <span className="standby-radar" aria-hidden="true"><span className="radar-circle circle-1" /><span className="radar-circle circle-2" /><span className="radar-sweep" /></span>
            <strong>Console standby</strong>
            <p>{routingMode === 'auto' ? `Your current task routes to ${activeModel.characterName}.` : `${activeModel.characterName} is selected.`} Run a request to see its output here.</p>
          </div>
        )}

        {/* Message Stream */}
        {messages.map(msg => {
          const isUser = msg.role === 'user';
          const msgModel = MODELS[msg.modelId] || activeModel;

          return (
            <div
              key={msg.id}
              className={`chat-bubble-row ${isUser ? 'is-user-row' : 'is-assistant-row'}`}
            >
              {/* Message Content Bubble */}
              <div
                className={`chat-bubble ${isUser ? 'user-bubble' : 'assistant-bubble'}`}
                style={!isUser ? ({ '--model-color': msgModel.themeColor } as React.CSSProperties) : undefined}
              >
                {/* Assistant Header */}
                {!isUser && (
                  <div className="bubble-header-row">
                    <div className="bubble-mascot-badge">
                      <div className="bubble-avatar-micro">
                        <MascotAvatar model={msgModel} />
                      </div>
                      <strong className="bubble-character-name">{msgModel.characterName}</strong>
                      <span className="bubble-model-tag">{msgModel.name}</span>
                    </div>

                    <span className={`bubble-mode-pill ${msg.isReplay ? 'is-replay' : 'is-live'}`}>
                      {msg.isReplay ? 'Prerecorded Replay' : 'Local Live'}
                    </span>
                  </div>
                )}

                {/* User Attachments Preview (if any) */}
                {isUser && (msg.imagePreview || msg.audioPreview) && (
                  <div className="bubble-attachments-row">
                    {msg.imagePreview && (
                      <div className="bubble-attachment-thumb">
                        <img src={msg.imagePreview} alt="Attached image preview" />
                        <span className="attachment-label">
                          <IconImage size={12} /> {msg.imageName || 'Image attachment'}
                        </span>
                      </div>
                    )}
                    {msg.audioPreview && (
                      <div className="bubble-attachment-audio">
                        <IconAudio size={14} />
                        <span className="attachment-label">{msg.audioName || 'Audio attachment (WAV)'}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Incompatibility Advisory Notice (if any) */}
                {msg.incompatibilityNotice && (
                  <div className="bubble-incompatibility-notice">
                    <IconWarning size={16} />
                    <p>{msg.incompatibilityNotice}</p>
                  </div>
                )}

                {/* Main Message Text / Structured Decision */}
                {msg.isReplay && <p className="bubble-replay-note">Archived example from a previous run. It is not a response to this prompt.</p>}
                {msg.isStructuredDecision && msg.decisionData ? (
                  renderDecisionCard(msg.decisionData)
                ) : (
                  <div className="bubble-text-content">
                    <p>{msg.text}</p>
                  </div>
                )}

                {/* Assistant Footer Telemetry & Actions */}
                {!isUser && msg.result && (
                  <div className="bubble-footer-row">
                    <div className="bubble-telemetry-summary">
                      {msg.result.metrics?.total_latency_s != null && (
                        <span className="telemetry-item">
                          Latency: <strong>{msg.result.metrics.total_latency_s.toFixed(2)}s</strong>
                        </span>
                      )}
                      {msg.result.metrics?.ttft_s != null && (
                        <span className="telemetry-item">
                          TTFT: <strong>{(msg.result.metrics.ttft_s * 1000).toFixed(0)}ms</strong>
                        </span>
                      )}
                      {msg.result.metrics?.tokens_per_second != null && (
                        <span className="telemetry-item">
                          Speed: <strong>{msg.result.metrics.tokens_per_second.toFixed(1)} tok/s</strong>
                        </span>
                      )}
                    </div>

                    <div className="bubble-actions-group">
                      <button
                        type="button"
                        className="btn-bubble-action"
                        onClick={() => handleCopy(msg.id, msg.text)}
                        title="Copy message text"
                      >
                        {copiedId === msg.id ? <IconCheck size={13} /> : <IconCopy size={13} />}
                        <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                      </button>

                      <button
                        type="button"
                        className="btn-bubble-action"
                        onClick={() => msg.result && onInspectResult(msg.result)}
                        title="Inspect full execution telemetry"
                      >
                        <IconTelemetry size={13} />
                        <span>Inspect</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Live Streaming Response Bubble */}
        {isGenerating && (
          <div className="chat-bubble-row is-assistant-row">
            <div
              className="chat-bubble assistant-bubble is-generating-bubble"
              style={{ '--model-color': (MODELS[streamingModelId || activeModel.id] || activeModel).themeColor } as React.CSSProperties}
            >
              <div className="bubble-header-row">
                <div className="bubble-mascot-badge">
                  <div className="bubble-avatar-micro">
                    <MascotAvatar model={MODELS[streamingModelId || activeModel.id] || activeModel} />
                  </div>
                  <strong className="bubble-character-name">
                    {(MODELS[streamingModelId || activeModel.id] || activeModel).characterName}
                  </strong>
                  <span className="bubble-model-tag">
                    {(MODELS[streamingModelId || activeModel.id] || activeModel).name}
                  </span>
                </div>
                <span className="bubble-mode-pill is-live">Generating…</span>
              </div>

              <div className="bubble-text-content">
                <p>
                  {streamingText}
                  <span className="streaming-cursor">▌</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
