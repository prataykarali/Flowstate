import React from 'react';

export const LIQUID_AI_MODELS = [
  { name: 'LFM3-1.7B', url: 'https://huggingface.co/LiquidAI/LFM3-1.7B', role: 'Text / Reasoning' },
  { name: 'LFM3-VL-2B', url: 'https://huggingface.co/LiquidAI/LFM3-VL-2B', role: 'Vision / OCR' },
  { name: 'LFM3-Audio-2B', url: 'https://huggingface.co/LiquidAI/LFM3-Audio-2B', role: 'Speech / Audio' },
  { name: 'LFM3-Omni-2B', url: 'https://huggingface.co/LiquidAI/LFM3-Omni-2B', role: 'Omnimodal' },
  { name: 'd1-2B', url: 'https://huggingface.co/LiquidAI/d1-2B', role: 'Visual Decisions' },
  { name: 'd1-Omni-2B', url: 'https://huggingface.co/LiquidAI/d1-Omni-2B', role: 'Audio-Visual Decisions' }
];

export const REPO_URL = 'https://github.com/prataykarali/Flowstate/tree/main/lfm3-prismlab';
export const LIQUID_AI_URL = 'https://liquid.ai';
export const LIQUID_HF_URL = 'https://huggingface.co/LiquidAI';

export const ResearchHeader: React.FC = () => {
  return (
    <header className="research-obs-header" aria-label="Research Observatory Header">
      {/* Top Ecosystem & Repository Linkbar */}
      <div className="research-obs-toplinkbar">
        <div className="toplinkbar-left">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="repo-link-btn"
            title="Open PrismLab research repository on GitHub"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            <span>Flowstate / lfm3-prismlab ↗</span>
          </a>
          <span className="toplinkbar-divider">|</span>
          <a
            href={LIQUID_AI_URL}
            target="_blank"
            rel="noreferrer"
            className="ecosystem-link-btn"
            title="Liquid AI Official Website"
          >
            <span>Liquid AI ↗</span>
          </a>
          <a
            href={LIQUID_HF_URL}
            target="_blank"
            rel="noreferrer"
            className="ecosystem-link-btn"
            title="Liquid AI Models on Hugging Face"
          >
            <span>Hugging Face Hub ↗</span>
          </a>
        </div>

        <div className="toplinkbar-models-strip">
          <span className="strip-label">Liquid Models:</span>
          {LIQUID_AI_MODELS.map(m => (
            <a
              key={m.name}
              href={m.url}
              target="_blank"
              rel="noreferrer"
              className="model-hf-pill"
              title={`View ${m.name} (${m.role}) on Hugging Face`}
            >
              {m.name}
            </a>
          ))}
        </div>
      </div>

      <div className="research-obs-header-top">
        <div className="research-obs-title-group">
          <div className="research-obs-badge">
            <span className="research-obs-dot" aria-hidden="true" />
            <span>SCIENTIFIC OBSERVATORY · P1–P7</span>
          </div>
          <h1 className="research-obs-title">PrismLab / Research Observatory</h1>
          <p className="research-obs-subtitle">
            Seven phases of local multimodal AI experimentation across Liquid Foundation Models (LFM3 &amp; d1).
          </p>
        </div>

        <div className="research-obs-provenance-strip" aria-label="Experimental Provenance Metadata">
          <div className="provenance-item">
            <span className="provenance-label">Runtime Scope</span>
            <strong className="provenance-value">P1–P7 Canonical</strong>
          </div>
          <div className="provenance-item">
            <span className="provenance-label">Architectures</span>
            <strong className="provenance-value">6 Model Pathways</strong>
          </div>
          <div className="provenance-item">
            <span className="provenance-label">Hardware Context</span>
            <strong className="provenance-value">Local CPU (Q4_K_M)</strong>
          </div>
          <div className="provenance-item">
            <span className="provenance-label">Dataset Nature</span>
            <strong className="provenance-value">Synthetic / Pilot Holdout</strong>
          </div>
        </div>
      </div>
    </header>
  );
};
