import React from 'react';
import { ModelMeta } from '../data/models.ts';

interface ModelCardProps {
  model: ModelMeta;
  isSelected?: boolean;
  onSelect?: (model: ModelMeta) => void;
  showDetails?: boolean;
}

export const ModelCard: React.FC<ModelCardProps> = ({
  model,
  isSelected = false,
  onSelect,
  showDetails = true
}) => {
  return (
    <div
      className={`glass-panel model-spec-card ${isSelected ? 'selected' : ''}`}
      style={{
        borderColor: isSelected ? model.themeColor : 'var(--border-subtle)',
        boxShadow: isSelected ? `0 0 24px ${model.themeColor}33` : 'var(--shadow-card)',
        transition: 'all var(--transition-normal)'
      }}
      onClick={() => onSelect && onSelect(model)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              {model.name}
            </h3>
            <span className={`badge ${model.badgeClass}`}>
              {model.characterName}
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
            {model.repo}
          </div>
        </div>

        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            padding: '4px 8px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(82, 239, 208, 0.12)',
            color: 'var(--accent-mint)',
            border: '1px solid rgba(82, 239, 208, 0.35)'
          }}
        >
          ● VERIFIED (P1-P7)
        </span>
      </div>

      <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 16 }}>
        {model.specialty}
      </p>

      {/* Modality Capabilities */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 14, fontSize: 13 }}>
        <div>
          <span style={{ color: 'var(--text-dim)', textTransform: 'uppercase', fontSize: 11, fontWeight: 700 }}>
            Inputs:{' '}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
            {model.inputModalities.join(' + ')}
          </span>
        </div>
        <div>
          <span style={{ color: 'var(--text-dim)', textTransform: 'uppercase', fontSize: 11, fontWeight: 700 }}>
            Outputs:{' '}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-mint)' }}>
            {model.outputModalities.join(' + ')}
          </span>
        </div>
      </div>

      {showDetails && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14, marginTop: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>
            Architecture Overview
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.45, marginBottom: 10 }}>
            {model.architectureSummary}
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>
            Empirical Benchmark Grounding
          </div>
          <div
            style={{
              fontSize: 12.5,
              color: '#fdf4fd',
              background: 'rgba(0, 0, 0, 0.35)',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              borderLeft: `3px solid ${model.themeColor}`,
              fontFamily: 'var(--font-mono)'
            }}
          >
            {model.benchmarkHighlight}
          </div>
        </div>
      )}
    </div>
  );
};
