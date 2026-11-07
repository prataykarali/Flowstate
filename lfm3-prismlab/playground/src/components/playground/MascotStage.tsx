import React from 'react';
import type { ModelMeta } from '../../data/models.ts';
import { Mascot } from '../mascots/Mascot.tsx';
import { IconChat, IconImage, IconAudio, IconDecision } from './Icons.tsx';

interface MascotStageProps {
  model: ModelMeta;
  reactionSignal: number;
  reactionState: 'happy' | 'sad' | 'thinking' | 'idle';
  isGenerating: boolean;
  currentSpeechLine?: string;
  routingMode: 'auto' | 'manual';
}

const PARAM_COUNTS: Record<string, string> = {
  text: '1.7B Parameters',
  vision: '2.0B Parameters',
  audio: '2.0B Parameters',
  omni: '2.0B Parameters',
  d1: '2.0B Parameters',
  d1_omni: '2.0B Parameters'
};

export const MascotStage: React.FC<MascotStageProps> = ({
  model,
  reactionSignal,
  reactionState,
  isGenerating,
  currentSpeechLine,
  routingMode
}) => {
  const speechText = isGenerating
    ? 'Thinking it through…'
    : currentSpeechLine || model.dialogueLines[0];

  const hasVision = model.inputModalities.includes('image') || model.inputModalities.includes('video');
  const hasAudio = model.inputModalities.includes('audio');
  const isDecision = model.outputModalities.includes('decision');

  return (
    <aside
      className="play-mascot-stage-panel"
      aria-label={`${model.characterName} companion stage`}
      style={{ '--model-color': model.themeColor } as React.CSSProperties}
    >
      {/* Upper Speech Balloon */}
      <div className="stage-speech-bubble" aria-live="polite">
        <div className="speech-bubble-header">
          <span className="speech-speaker">{model.characterName}</span>
          {isGenerating && <span className="speech-thinking-dots"><span>.</span><span>.</span><span>.</span></span>}
        </div>
        <p className="speech-content">"{speechText}"</p>
      </div>

      {/* Mascot Pedestal */}
      <div className="stage-pedestal-container">
        <span className="stage-orbit stage-orbit-one" aria-hidden="true" />
        <span className="stage-orbit stage-orbit-two" aria-hidden="true" />
        <div className="stage-halo" />
        <div className="stage-mascot-wrapper" key={model.id}>
          <Mascot
            model={model}
            isSelected
            reactionSignal={reactionSignal}
            reactionState={reactionState}
            showAuthoredLine={false}
          />
        </div>
        <div className="stage-pedestal-base" />
      </div>

      {/* Character Profile & Sourced Specs */}
      <div className="stage-profile-card">
        <div className="profile-header-row">
          <div>
            <h2 className="profile-character-name">{model.characterName}</h2>
            <div className="profile-model-pill">
              <span className="profile-color-dot" style={{ backgroundColor: model.themeColor }} />
              <strong>{model.name}</strong>
            </div>
          </div>
          <span className="profile-param-tag">
            {PARAM_COUNTS[model.id] || '2.0B Parameters'}
          </span>
        </div>

        <p className="profile-specialty">{model.specialty}</p>

        {/* Verified Capability Tags */}
        <div className="profile-capabilities-row" aria-label="Supported modalities">
          <span className="capability-pill is-supported" title="Language tokens">
            <IconChat size={13} />
            <span>Text</span>
          </span>
          <span className={`capability-pill ${hasVision ? 'is-supported' : 'is-unsupported'}`} title={hasVision ? 'Image & diagram analysis supported' : 'No vision encoder'}>
            <IconImage size={13} />
            <span>Vision</span>
          </span>
          <span className={`capability-pill ${hasAudio ? 'is-supported' : 'is-unsupported'}`} title={hasAudio ? 'Continuous speech & acoustic analysis supported' : 'No audio encoder'}>
            <IconAudio size={13} />
            <span>Audio</span>
          </span>
          {isDecision && (
            <span className="capability-pill is-decision" title="SystemOne slot classification">
              <IconDecision size={13} />
              <span>Decision</span>
            </span>
          )}
        </div>

        {/* Current Routing Status */}
        <div className="profile-mode-indicator">
          <span className="indicator-label">ROUTING CONTEXT</span>
          <span className="indicator-value">
            {routingMode === 'auto'
              ? 'Dynamic selection based on prompt and attachments'
              : `Locked to ${model.characterName} (no silent substitutions)`}
          </span>
        </div>
      </div>
    </aside>
  );
};
