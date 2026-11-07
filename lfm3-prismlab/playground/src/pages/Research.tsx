import React, { useState, useEffect } from 'react';
import { ResearchHeader } from '../components/research/ResearchHeader.tsx';
import { PhaseNavRibbon, type PhaseTab } from '../components/research/PhaseNavRibbon.tsx';
import { ResearchOverview } from '../components/research/ResearchOverview.tsx';
import { P1RoutingObservatory } from '../components/research/P1RoutingObservatory.tsx';
import { P2VisionObservatory } from '../components/research/P2VisionObservatory.tsx';
import { P3AudioObservatory } from '../components/research/P3AudioObservatory.tsx';
import { P4FusionObservatory } from '../components/research/P4FusionObservatory.tsx';
import { P5DecisionObservatory } from '../components/research/P5DecisionObservatory.tsx';
import { P6OrchestrationObservatory } from '../components/research/P6OrchestrationObservatory.tsx';
import { P7ArchitectureObservatory } from '../components/research/P7ArchitectureObservatory.tsx';
import { FailureLabObservatory } from '../components/research/FailureLabObservatory.tsx';

// Canonical research milestones contract preserved for archival links and test verification
export const RESEARCH_ARCHIVE_MANIFEST = [
  { phase: 'P1', docPath: 'docs/p1/README.md', title: 'Phase 1: Deterministic Capability Router' },
  { phase: 'P2', docPath: 'docs/p2/README.md', title: 'Phase 2: Vision & OCR Laboratory' },
  { phase: 'P3', docPath: 'docs/p3/README.md', title: 'Phase 3: Speech-to-Speech Streaming' },
  { phase: 'P4', docPath: 'docs/p4/P4_FINAL_REPORT.md', title: 'Phase 4: Synthetic OCR & AV Holdout Generalization' },
  { phase: 'P5', docPath: 'docs/p5/README.md', title: 'Phase 5: SystemOne Decisions & Confidence' },
  { phase: 'P6', docPath: 'docs/p6/README.md', title: 'Phase 6: Unified Multimodal Orchestration' },
  { phase: 'P7', docPath: 'docs/p7/P7_FINAL_REPORT.md', title: 'Phase 7: 6-Model Architecture Audit & Synthesis' }
];

export const P7_REPORT_URL = 'https://github.com/prataykarali/Flowstate/blob/main/lfm3-prismlab/docs/p7/P7_FINAL_REPORT.md';
export const RESEARCH_BASE_URL = 'https://github.com/prataykarali/Flowstate/blob/main/lfm3-prismlab/';


export const Research: React.FC = () => {
  const [activePhase, setActivePhase] = useState<PhaseTab>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const match = hash.match(/phase=([a-z0-9_]+)/i);
      if (match && ['overview', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'failures'].includes(match[1].toLowerCase())) {
        return match[1].toLowerCase() as PhaseTab;
      }
    }
    return 'overview';
  });

  const [showDocArchive, setShowDocArchive] = useState(false);

  // Sync phase with URL query param without triggering app route switches
  const handleSelectPhase = (phase: PhaseTab) => {
    setActivePhase(phase);
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      const url = new URL(window.location.href);
      url.hash = `research?phase=${phase}`;
      window.history.replaceState(null, '', url.toString());
    }
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const match = hash.match(/phase=([a-z0-9_]+)/i);
      if (match && ['overview', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'failures'].includes(match[1].toLowerCase())) {
        setActivePhase(match[1].toLowerCase() as PhaseTab);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <div className="page-research page-research-observatory">
      {/* Editorial Scientific Header */}
      <ResearchHeader />

      {/* Phase Navigation Ribbon */}
      <PhaseNavRibbon activePhase={activePhase} onSelectPhase={handleSelectPhase} />

      {/* Active Phase Laboratory Visualizer */}
      <main className="observatory-content-wrapper" role="region" aria-live="polite">
        {activePhase === 'overview' && <ResearchOverview onSelectPhase={handleSelectPhase} />}
        {activePhase === 'p1' && <P1RoutingObservatory />}
        {activePhase === 'p2' && <P2VisionObservatory />}
        {activePhase === 'p3' && <P3AudioObservatory />}
        {activePhase === 'p4' && <P4FusionObservatory />}
        {activePhase === 'p5' && <P5DecisionObservatory />}
        {activePhase === 'p6' && <P6OrchestrationObservatory />}
        {activePhase === 'p7' && <P7ArchitectureObservatory />}
        {activePhase === 'failures' && <FailureLabObservatory />}
      </main>

      {/* Persistent Archive & Provenance Drawer Bar */}
      <aside className="research-provenance-drawer-bar" aria-label="Research Documentation Archive">
        <div className="drawer-bar-inner">
          <div className="archive-summary">
            <span className="archive-dot" />
            <span>Canonical P1–P7 Research Reports Verified</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowDocArchive(prev => !prev)}
            aria-expanded={showDocArchive}
          >
            {showDocArchive ? 'Hide Document Manifest ▲' : 'Inspect Published Reports (P1–P7) ▼'}
          </button>
        </div>

        {showDocArchive && (
          <div className="research-manifest-dropdown">
            <p className="manifest-note">
              Direct access to all 7 published markdown monographs and empirical data logs in the flowstate repository:
            </p>
            <div className="manifest-links-grid">
              {RESEARCH_ARCHIVE_MANIFEST.map(m => (
                <div key={m.phase} className="manifest-link-card">
                  <div className="manifest-card-head">
                    <span className="manifest-phase-pill">{m.phase}</span>
                    <strong>{m.title}</strong>
                  </div>
                  <code className="manifest-file-path">{m.docPath}</code>
                  <a
                    href={`https://github.com/prataykarali/Flowstate/blob/main/lfm3-prismlab/${m.docPath}`}
                    target="_blank"
                    rel="noreferrer"
                    className="manifest-external-link"
                  >
                    Read full research ↗
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};
