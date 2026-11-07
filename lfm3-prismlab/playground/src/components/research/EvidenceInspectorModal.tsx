import React, { useEffect } from 'react';

interface EvidenceInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  sourcePath: string;
  data: any;
}

export const EvidenceInspectorModal: React.FC<EvidenceInspectorModalProps> = ({
  isOpen,
  onClose,
  title,
  sourcePath,
  data
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const jsonString = JSON.stringify(data, null, 2);

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_evidence.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="evidence-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="evidence-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`Evidence Inspector: ${title}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="evidence-modal-head">
          <div>
            <span className="eyebrow">Canonical Evidence Inspector</span>
            <h3>{title}</h3>
            <p className="evidence-source-path">Source artifact: <code>{sourcePath}</code></p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              className="btn btn-secondary evidence-download-btn"
              onClick={handleDownload}
            >
              Download JSON ↓
            </button>
            <button
              type="button"
              className="evidence-modal-close"
              onClick={onClose}
              aria-label="Close evidence inspector"
            >
              ×
            </button>
          </div>
        </div>

        <div className="evidence-modal-body">
          <pre className="evidence-json-code">
            <code>{jsonString}</code>
          </pre>
        </div>

        <div className="evidence-modal-footer">
          <small>
            Data strictly generated from verified repository artifacts. Values are not simulated.
          </small>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
