import React from 'react';

export type PhaseTab = 'overview' | 'p1' | 'p2' | 'p3' | 'p4' | 'p5' | 'p6' | 'p7' | 'failures';

export interface PhaseNavProps {
  activePhase: PhaseTab;
  onSelectPhase: (phase: PhaseTab) => void;
}

interface PhaseMeta {
  id: PhaseTab;
  label: string;
  badge: string;
  summary: string;
}

export const PHASES_LIST: PhaseMeta[] = [
  { id: 'overview', label: 'Overview', badge: 'Synthesis', summary: 'Research scope, methodology, and core findings' },
  { id: 'p1', label: 'P1: Routing', badge: '6 Pathways', summary: 'Deterministic capability-based router topology' },
  { id: 'p2', label: 'P2: Vision & OCR', badge: '10 Cases', summary: 'Direct VL vs modular OCR and resolution ablation' },
  { id: 'p3', label: 'P3: Speech S2S', badge: '25 Cases', summary: 'Native speech-to-speech vs modular cascade' },
  { id: 'p4', label: 'P4: AV Fusion', badge: '40 Paired', summary: 'Omni vs modular paired holdout & McNemar test' },
  { id: 'p5', label: 'P5: Decisions', badge: 'Stress Pilot', summary: 'Confidence, calibration error & X03 failure' },
  { id: 'p6', label: 'P6: Orchestration', badge: '90/90 Tests', summary: 'Deterministic multi-model execution lifecycle' },
  { id: 'p7', label: 'P7: Architecture', badge: '24 Layers', summary: '6-model component audit & operator schedules' },
  { id: 'failures', label: 'Failure Lab', badge: 'Taxonomy', summary: 'Recorded failure modes, mechanisms & boundaries' }
];

export const PhaseNavRibbon: React.FC<PhaseNavProps> = ({ activePhase, onSelectPhase }) => {
  const currentIndex = PHASES_LIST.findIndex(p => p.id === activePhase);
  const prevPhase = currentIndex > 0 ? PHASES_LIST[currentIndex - 1] : null;
  const nextPhase = currentIndex < PHASES_LIST.length - 1 ? PHASES_LIST[currentIndex + 1] : null;

  return (
    <nav className="research-ribbon-container" aria-label="Research Phase Navigation">
      <div className="research-ribbon-track" role="tablist">
        {PHASES_LIST.map(p => {
          const isActive = p.id === activePhase;
          return (
            <button
              key={p.id}
              role="tab"
              type="button"
              id={`tab-${p.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${p.id}`}
              className={`research-ribbon-tab ${isActive ? 'is-active' : ''}`}
              onClick={() => onSelectPhase(p.id)}
            >
              <span className="ribbon-tab-badge">{p.badge}</span>
              <span className="ribbon-tab-label">{p.label}</span>
              {isActive && <span className="ribbon-tab-indicator" layout-id="activeTabIndicator" />}
            </button>
          );
        })}
      </div>

      <div className="research-nav-actions">
        {prevPhase && (
          <button
            type="button"
            className="research-nav-btn prev"
            onClick={() => onSelectPhase(prevPhase.id)}
            title={`Previous: ${prevPhase.label}`}
          >
            ← {prevPhase.label}
          </button>
        )}
        {nextPhase && (
          <button
            type="button"
            className="research-nav-btn next"
            onClick={() => onSelectPhase(nextPhase.id)}
            title={`Next: ${nextPhase.label}`}
          >
            {nextPhase.label} →
          </button>
        )}
      </div>
    </nav>
  );
};
