import React, { useEffect } from 'react';
import type { LiveResult } from '../../lib/api.ts';
import type { InputModality, TaskCategory } from '../../data/pipeline.ts';
import { PipelineExplorer } from '../pipeline/PipelineExplorer.tsx';
import { IconClose, IconRouteDiagram, IconInfo } from './Icons.tsx';

interface RoutingModalProps {
  isOpen: boolean;
  onClose: () => void;
  routeInput: { task: TaskCategory; inputs: InputModality[] };
  liveResult?: LiveResult | null;
  livePending?: boolean;
}

export const RoutingModal: React.FC<RoutingModalProps> = ({
  isOpen,
  onClose,
  routeInput,
  liveResult,
  livePending = false
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="inspector-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="routing-modal-title">
      <div className="inspector-modal-dialog routing-modal-dialog" onClick={e => e.stopPropagation()}>
        {/* Modal Top Bar */}
        <div className="modal-header">
          <div className="modal-title-group">
            <IconRouteDiagram size={18} />
            <h2 id="routing-modal-title" className="modal-title">Deterministic Routing Architecture</h2>
            <span className="modal-mode-badge">Python Pipeline Topology</span>
          </div>

          <button
            type="button"
            className="btn-modal-close"
            onClick={onClose}
            aria-label="Close routing modal"
          >
            <IconClose size={18} />
          </button>
        </div>

        {/* Modal Scroll Body */}
        <div className="modal-scroll-body">
          <div className="routing-modal-content">
            <div className="routing-explainer-banner">
              <IconInfo size={16} />
              <p>
                PrismLab uses a deterministic routing policy mirroring <code>prismlab/core/router.py</code>.
                In <strong>Smart Auto</strong> mode, incoming requests are automatically dispatched to the optimal neural backbone based on task category and input modalities.
              </p>
            </div>

            {/* Embedded Interactive Pipeline Explorer */}
            <div className="routing-pipeline-canvas-box">
              <PipelineExplorer
                compact
                routeInput={routeInput}
                liveResult={liveResult}
                livePending={livePending}
              />
            </div>

            {/* Routing Matrix Reference Table */}
            <div className="routing-matrix-card">
              <h3 className="matrix-title">Six-Model Deterministic Routing Matrix</h3>
              <div className="matrix-table-wrapper">
                <table className="matrix-table">
                  <thead>
                    <tr>
                      <th>Target Model</th>
                      <th>Companion</th>
                      <th>Task Category</th>
                      <th>Required Modalities</th>
                      <th>Architectural Specialty</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>LFM3-1.7B</strong></td>
                      <td>Prism Pure</td>
                      <td>Chat / Summarize</td>
                      <td>Text only</td>
                      <td>24-layer hybrid Gated-Conv + Attention language backbone</td>
                    </tr>
                    <tr>
                      <td><strong>LFM3-VL-2B</strong></td>
                      <td>Spectra</td>
                      <td>OCR / Vision Analysis</td>
                      <td>Text + Image/Video</td>
                      <td>14-layer Vision Encoder + Projection to LFM3 backbone</td>
                    </tr>
                    <tr>
                      <td><strong>LFM3-Audio-2B</strong></td>
                      <td>Echo</td>
                      <td>Transcribe / Audio Q&amp;A</td>
                      <td>Text + Audio (WAV)</td>
                      <td>17-layer Audio Encoder + 12-code RVQ Depthformer</td>
                    </tr>
                    <tr>
                      <td><strong>LFM3-Omni-2B</strong></td>
                      <td>Omni Pup</td>
                      <td>Joint Multimodal</td>
                      <td>Text + Audio + Image/Video</td>
                      <td>Dual acoustic &amp; visual encoders into unified token fusion</td>
                    </tr>
                    <tr>
                      <td><strong>d1-2B</strong></td>
                      <td>Prism Thinker</td>
                      <td>Decision</td>
                      <td>Text / Image</td>
                      <td>SystemOne slot scoring replacing LM head for classification</td>
                    </tr>
                    <tr>
                      <td><strong>d1-Omni-2B</strong></td>
                      <td>Sherlock Omni</td>
                      <td>Decision</td>
                      <td>Text + Audio + Image</td>
                      <td>Audio-visual slot scoring with human review gating</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
