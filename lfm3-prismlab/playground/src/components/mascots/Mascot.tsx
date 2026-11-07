import React, { useId, useRef } from 'react';
import { ModelMeta } from '../../data/models.ts';
export type MascotMotion = 'idle'|'running'|'jumping'|'falling'|'landing'|'ducking'|'switching'|'collision'|'happy'|'sad'|'celebrating';
import { MascotDefs } from './MascotDefs.tsx';
import { MascotAccessories } from './MascotAccessories.tsx';
import { useMascotAnimation } from '../../hooks/useMascotAnimation.ts';

interface MascotProps {
  model: ModelMeta;
  isSelected?: boolean;
  onSelect?: (model: ModelMeta) => void;
  className?: string;
  reactionSignal?: number;
  reactionState?: 'happy' | 'sad' | 'thinking' | 'idle';
  motion?: MascotMotion;
  height?: number;
  showAuthoredLine?: boolean;
  interactive?: boolean;
}

export const Mascot: React.FC<MascotProps> = ({
  model,
  isSelected = false,
  onSelect,
  className = '',
  reactionSignal = 0,
  reactionState = 'happy',
  motion = 'idle',
  height = 0,
  showAuthoredLine = true,
  interactive = true
}) => {
  // Globally unique SVG ID prefix per mounted instance
  const rawId = useId();
  const instancePrefix = `m_${rawId.replace(/[^a-zA-Z0-9]/g, '')}_`;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const leftEyeRef = useRef<SVGGElement>(null);
  const rightEyeRef = useRef<SVGGElement>(null);

  const { emotion, isPopActive, speechBubble, triggerReaction } = useMascotAnimation({
    modelId: model.id,
    wrapperRef,
    leftEyeRef,
    rightEyeRef
  });

  React.useEffect(() => {
    if (reactionSignal > 0) triggerReaction(reactionState === 'sad' ? 'shy' : reactionState === 'thinking' ? 'thinking' : reactionState === 'idle' ? 'curious' : 'happy');
  }, [reactionSignal, reactionState, triggerReaction]);

  const handleClick = () => {
    if (!interactive) return;
    // Authored character lines describe the model; they are never inference output.
    const line = model.dialogueLines[Math.floor(Math.random() * model.dialogueLines.length)];
    const reactions = { text: 'curious', vision: 'surprised', audio: 'happy', omni: 'excited', d1: 'thinking', d1_omni: 'proud' } as const;
    triggerReaction(reactions[model.id], showAuthoredLine ? line : undefined);

    if (onSelect) {
      onSelect(model);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  // Audio model resting face has closed smiling eyes in idle
  const isAudioResting = model.id === 'audio' && emotion === 'idle';

  return (
    <div
      ref={wrapperRef}
      className={`mascot-card mascot-${model.characterSlug} ${isSelected ? 'selected' : ''} ${
        isPopActive ? 'mascot-click-pop' : ''
      } ${className}`}
      data-emotion={emotion}
      data-motion={motion}
      style={{'--jump-height': `${height}px`} as React.CSSProperties}
      tabIndex={interactive ? 0 : -1}
      role={interactive ? 'button' : 'img'}
      aria-label={interactive ? `${model.characterName}, ${model.name}. Select to view model details.` : `${model.characterName}, ${model.name}`}
      aria-pressed={interactive ? isSelected : undefined}
      onClick={interactive ? handleClick : undefined}
      onKeyDown={interactive ? handleKeyDown : undefined}
    >
      {/* Speech Bubble */}
      {speechBubble && <div className="mascot-bubble">{speechBubble}</div>}

      <div className="mascot-svg-wrapper">
        <svg
          viewBox="0 0 180 180"
          className={`mascot-svg mascot-svg-${model.characterSlug}`}
          aria-hidden="true"
        >
          {/* Instance-scoped unique gradient and filter defs */}
          <MascotDefs prefix={instancePrefix} />

          {/* Ambient Background Glow */}
          <circle
            cx="90"
            cy="100"
            r="74"
            fill={`url(#${instancePrefix}ambientBacklight)`}
            className="mascot-ambient-glow"
          />

          {/* Main Mascot Body Root */}
          <g className="mascot-body-root" style={{ transformOrigin: '90px 100px' }}>
            {/* Outer Shell Sphere */}
            <g className="mascot-outer-sphere">
              <circle
                cx="90"
                cy="100"
                r="48"
                fill={`url(#${instancePrefix}outerBodyGrad)`}
                filter="drop-shadow(0 6px 14px rgba(10,5,20,0.55))"
              />
              <circle cx="90" cy="100" r="48" fill={`url(#${instancePrefix}rimLightGrad)`} />
            </g>

            {/* Inner Face Sphere */}
            <g className="mascot-inner-face" style={{ transformOrigin: '90px 100px' }}>
              <circle cx="90" cy="100" r="39.5" fill={`url(#${instancePrefix}faceBodyGrad)`} />
              <ellipse
                cx="85"
                cy="80"
                rx="28"
                ry="16"
                fill={`url(#${instancePrefix}plushTopGlow)`}
              />
              <circle cx="90" cy="100" r="39.5" fill={`url(#${instancePrefix}faceDepthGrad)`} />

              {/* Cheek Blushes */}
              <circle
                cx="68"
                cy="106"
                r="8"
                fill={`url(#${instancePrefix}blushGrad)`}
                className="cheek-blush blush-left"
                style={{ opacity: emotion === 'happy' || emotion === 'shy' ? 0.75 : 0.38 }}
              />
              <circle
                cx="112"
                cy="100"
                r="8"
                fill={`url(#${instancePrefix}blushGrad)`}
                className="cheek-blush blush-right"
                style={{ opacity: emotion === 'happy' || emotion === 'shy' ? 0.75 : 0.38 }}
              />
            </g>

            {/* Facial Expressions */}
            <g className="mascot-face-features" style={{ transformOrigin: '90px 98px' }}>
              {/* Eyebrows */}
              <path
                className="eyebrow eyebrow-left"
                d={emotion === 'surprised' ? 'M 70 85 Q 74 82 78 85' : 'M 71 89 Q 74 88 78 89'}
                fill="none"
                stroke="#352046"
                strokeWidth="2.2"
                strokeLinecap="round"
                opacity={emotion === 'idle' ? 0 : 0.85}
              />
              <path
                className="eyebrow eyebrow-right"
                d={emotion === 'surprised' ? 'M 102 81 Q 106 78 110 81' : 'M 102 85 Q 106 84 110 85'}
                fill="none"
                stroke="#352046"
                strokeWidth="2.2"
                strokeLinecap="round"
                opacity={emotion === 'idle' ? 0 : 0.85}
              />

              {/* Left Eye Gaze Tracker */}
              <g
                ref={leftEyeRef}
                className="eye-tracker-left"
                style={{ transformOrigin: '74px 98px', transition: 'transform 0.08s ease-out' }}
              >
                <g className="eye-group eye-left" style={{ transformOrigin: '74px 98px' }}>
                  {isAudioResting || emotion === 'happy' ? (
                    <path
                      className="eye-arc"
                      d="M 70 99 Q 74 93.5 78 99"
                      fill="none"
                      stroke="#352046"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                    />
                  ) : (
                    <>
                      <ellipse
                        className="eye-shape"
                        cx="74"
                        cy="98"
                        rx="3.3"
                        ry="5.0"
                        fill={`url(#${instancePrefix}eyeGrad)`}
                        transform="rotate(10 74 98)"
                      />
                      <circle className="eye-glint" cx="75.6" cy="96" r="1.1" fill="#ffffff" opacity="0.95" />
                    </>
                  )}
                </g>
              </g>

              {/* Right Eye Gaze Tracker */}
              <g
                ref={rightEyeRef}
                className="eye-tracker-right"
                style={{ transformOrigin: '106px 92px', transition: 'transform 0.08s ease-out' }}
              >
                <g className="eye-group eye-right" style={{ transformOrigin: '106px 92px' }}>
                  {isAudioResting || emotion === 'happy' ? (
                    <path
                      className="eye-arc"
                      d="M 102 93.5 Q 106 88 110 93.5"
                      fill="none"
                      stroke="#352046"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                    />
                  ) : (
                    <>
                      <ellipse
                        className="eye-shape"
                        cx="106"
                        cy="92"
                        rx="3.3"
                        ry="5.0"
                        fill={`url(#${instancePrefix}eyeGrad)`}
                        transform="rotate(10 106 92)"
                      />
                      <circle className="eye-glint" cx="107.6" cy="90" r="1.1" fill="#ffffff" opacity="0.95" />
                    </>
                  )}
                </g>
              </g>

              {/* Mouth & Tongue */}
              {emotion === 'happy' || emotion === 'excited' ? (
                <>
                  <path
                    className="mascot-mouth"
                    d="M 87 97 Q 90.5 103.5 94 96.5 Z"
                    fill="#352046"
                    stroke="#352046"
                    strokeWidth="1.5"
                  />
                  <path
                    className="mascot-tongue"
                    d="M 88.5 101 Q 90.5 99 92.5 101 Q 90.5 103.5 88.5 101 Z"
                    fill="#ff9ebb"
                  />
                </>
              ) : (
                <path
                  className="mascot-mouth"
                  d="M 87.5 97.5 Q 90.2 101.5 93.5 97"
                  fill="none"
                  stroke="#352046"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </g>

            {/* Layered Accessories */}
            <MascotAccessories prefix={instancePrefix} accessories={model.accessories} />
          </g>
        </svg>
      </div>

      <div className="mascot-contact" aria-hidden="true" />

      {/* Model Name Label */}
      <div className="mascot-name"><strong>{model.characterName}</strong><span>{model.name}</span></div>
    </div>
  );
};
