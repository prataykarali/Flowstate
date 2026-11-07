import React, { useEffect } from 'react';
import type { LiveResult } from '../../lib/api.ts';
import type { ModelMeta } from '../../data/models.ts';
import {
  IconClose,
  IconCopy,
  IconCheck,
  IconTelemetry
} from './Icons.tsx';

interface InferenceInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: LiveResult | null;
  activeModel: ModelMeta;
  executionMode: 'recorded' | 'live';
}

export const InferenceInspectorModal: React.FC<InferenceInspectorModalProps> = ({
  isOpen,
  onClose,
  result,
  activeModel,
  executionMode
}) => {
  const [copied, setCopied] = React.useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Build sanitized diagnostic summary (strictly excluding tokens, cookies, auth headers, and base64 payloads)
  const sanitizedDiagnostics = result
    ? {
        request_id: result.request_id,
        status: result.status,
        execution_mode: result.mode,
        requested_model: result.requested_model || activeModel.id,
        backend_model_id: result.backend_model_id || null,
        executed_route: result.route || [result.model || activeModel.id],
        task: result.task || 'chat',
        metrics: {
          total_latency_s: result.metrics?.total_latency_s ?? null,
          ttft_s: result.metrics?.ttft_s ?? null,
          tokens_per_second: result.metrics?.tokens_per_second ?? null
        },
        trace: result.trace?.map(t => ({
          stage: t.stage,
          status: t.status,
          model: t.model,
          latency_s: t.latency_s,
          ttft_s: t.ttft_s
        })) || [],
        warnings: result.warnings || [],
        error: result.error || null
      }
    : null;

  const handleCopyDiagnostics = () => {
    if (!sanitizedDiagnostics) return;
    navigator.clipboard.writeText(JSON.stringify(sanitizedDiagnostics, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="inspector-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="inspector-modal-title">
      <div className="inspector-modal-dialog" onClick={e => e.stopPropagation()}>
        {/* Modal Top Bar */}
        <div className="modal-header">
          <div className="modal-title-group">
            <IconTelemetry size={18} />
            <h2 id="inspector-modal-title" className="modal-title">Inference Telemetry & Audit Diagnostics</h2>
            <span className="modal-mode-badge">
              {executionMode === 'recorded' ? 'Prerecorded Replay' : 'Local Live Inference'}
            </span>
          </div>

          <button
            type="button"
            className="btn-modal-close"
            onClick={onClose}
            aria-label="Close telemetry modal"
          >
            <IconClose size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="modal-scroll-body">
          {result ? (
            <div className="inspector-content-stack">
              {/* Primary Key Metrics */}
              <div className="telemetry-stat-grid">
                <div className="telemetry-stat-card">
                  <span className="stat-label">TOTAL LATENCY</span>
                  <strong className="stat-value">
                    {result.metrics?.total_latency_s != null
                      ? `${result.metrics.total_latency_s.toFixed(3)}s`
                      : 'N/A'}
                  </strong>
                </div>

                <div className="telemetry-stat-card">
                  <span className="stat-label">TIME TO FIRST TOKEN (TTFT)</span>
                  <strong className="stat-value">
                    {result.metrics?.ttft_s != null
                      ? `${(result.metrics.ttft_s * 1000).toFixed(0)}ms`
                      : 'N/A'}
                  </strong>
                </div>

                <div className="telemetry-stat-card">
                  <span className="stat-label">GENERATION THROUGHPUT</span>
                  <strong className="stat-value">
                    {result.metrics?.tokens_per_second != null
                      ? `${result.metrics.tokens_per_second.toFixed(1)} tok/s`
                      : 'N/A'}
                  </strong>
                </div>

                <div className="telemetry-stat-card">
                  <span className="stat-label">REQUEST IDENTIFIER</span>
                  <strong className="stat-value stat-code">
                    #{result.request_id ? result.request_id.slice(0, 16) : 'N/A'}
                  </strong>
                </div>
              </div>

              {/* Route & Dispatcher Audit */}
              <div className="inspector-card">
                <h3 className="inspector-card-title">Routing & Engine Resolution</h3>
                <div className="route-details-row">
                  <div className="route-field">
                    <span className="field-label">Requested Target:</span>
                    <strong className="field-val">{result.requested_model || activeModel.name}</strong>
                  </div>
                  <div className="route-field">
                    <span className="field-label">Executed Model Route:</span>
                    <strong className="field-val route-highlight">
                      {result.route?.join(' ➔ ') || result.model || activeModel.name}
                    </strong>
                  </div>
                  <div className="route-field">
                    <span className="field-label">Execution Status:</span>
                    <span className={`status-pill status-${result.status}`}>
                      {result.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Lifecycle Trace Stages Table */}
              {result.trace && result.trace.length > 0 && (
                <div className="inspector-card">
                  <h3 className="inspector-card-title">Pipeline Lifecycle Trace</h3>
                  <div className="trace-table-container">
                    <table className="trace-table">
                      <thead>
                        <tr>
                          <th>Stage</th>
                          <th>Status</th>
                          <th>Model Node</th>
                          <th>Stage Latency</th>
                          <th>TTFT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.trace.map((step, idx) => (
                          <tr key={idx}>
                            <td className="stage-name">{step.stage}</td>
                            <td>
                              <span className={`stage-status-tag ${step.status === 'ok' ? 'is-ok' : ''}`}>
                                {step.status}
                              </span>
                            </td>
                            <td>{step.model || '—'}</td>
                            <td>{step.latency_s != null ? `${step.latency_s.toFixed(3)}s` : '—'}</td>
                            <td>{step.ttft_s != null ? `${(step.ttft_s * 1000).toFixed(0)}ms` : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Sanitized Diagnostics JSON Viewer */}
              <div className="inspector-card">
                <div className="inspector-card-header-row">
                  <h3 className="inspector-card-title">Sanitized Diagnostics Payload</h3>
                  <button
                    type="button"
                    className="btn-copy-diagnostics"
                    onClick={handleCopyDiagnostics}
                  >
                    {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                    <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                </div>
                <pre className="diagnostics-code-block">
                  <code>{JSON.stringify(sanitizedDiagnostics, null, 2)}</code>
                </pre>
              </div>
            </div>
          ) : (
            <div className="inspector-empty-state">
              <IconTelemetry size={32} />
              <h3>No Execution Telemetry Available</h3>
              <p>
                Send a message or run a request in either Prerecorded Replay or Local Live mode to capture and inspect genuine execution telemetry.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
