import React from 'react';
import { MascotStage } from '../components/mascots/MascotStage.tsx';

interface HomeProps {
  onNavigateToPlayground: (modelId: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigateToPlayground }) => (
  <div className="page-home">
    <div className="world-intro">
      <div>
        <p className="eyebrow">Public Research Beta · Six Specialized Model Pathways</p>
        <h1 className="page-title">Meet the Minds of <span>PrismLab</span></h1>
        <p className="page-description">
          An open experimental playground for genuine Liquid AI models, hosted entirely on CPU hardware. Explore multi-modal inference across six distinct architectures:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginTop: '14px', marginBottom: '8px' }}>
          <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <strong style={{ color: '#c084fc', display: 'block', fontSize: '13px' }}>Prism Pure · LFM3-1.7B</strong>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Conversational text reasoning & multi-turn dialogue.</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <strong style={{ color: '#52efd0', display: 'block', fontSize: '13px' }}>Spectra · LFM3-VL-2B</strong>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Visual OCR, scene analysis, & image QA.</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <strong style={{ color: '#38bdf8', display: 'block', fontSize: '13px' }}>Echo · LFM3-Audio-2B</strong>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Acoustic scene reasoning & spoken speech QA.</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <strong style={{ color: '#fb923c', display: 'block', fontSize: '13px' }}>Omni Pup · LFM3-Omni-2B</strong>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Joint multimodal sensory fusion & perception.</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <strong style={{ color: '#facc15', display: 'block', fontSize: '13px' }}>Prism Thinker · d1-2B</strong>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>System-1 typed decisions & native logit probabilities.</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <strong style={{ color: '#a78bfa', display: 'block', fontSize: '13px' }}>Sherlock Omni · d1_omni-2B</strong>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Multimodal decision intelligence & operational routing.</span>
          </div>
        </div>
      </div>
      <div className="world-intro-note">
        <strong>What you can try:</strong> Chat directly with any model, conduct multi-turn collaborative Auto Story shows, compete in Live Trivia matches, and explore Decision Studio. Inference runs on laptop CPU hardware with fair admission queuing.
      </div>
    </div>
    <MascotStage onNavigateToPlayground={onNavigateToPlayground} />
  </div>
);
