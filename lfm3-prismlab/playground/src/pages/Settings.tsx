import React, { useState, useEffect } from 'react';
import { loadRecordedReplays, type RecordedReplay } from '../lib/replays.ts';
import { useExperience } from '../app/ExperienceContext.tsx';
import { OfficialResources } from '../components/OfficialResources.tsx';
import { getGatewayStatus, type GatewayStatus } from '../lib/api.ts';

export const Settings: React.FC = () => {
  const { videoEnabled, setVideoEnabled } = useExperience();
  const [replays, setReplays] = useState<RecordedReplay[]>([]);
  const [gateway,setGateway] = useState<GatewayStatus|null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('prismlab_sound') === 'true';
  });

  useEffect(() => {
    loadRecordedReplays().then(setReplays).catch(() => setReplays([]));
    getGatewayStatus(true).then(setGateway);
  }, []);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('prismlab_sound', String(next));
  };

  return (
    <div className="page-settings">
      <div className="page-header">
        <h1 className="page-title">
          <span>⚙️</span> Your Playground
        </h1>
        <p className="page-description">
          Set your preferences and revisit recorded research demonstrations.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 32 }}>
        {/* Client Preferences */}
        <div className="glass-panel">
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: 'var(--text-main)' }}>
            Preferences
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Audio Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Sound preference</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Reserved for optional reaction audio. No sound currently plays.</div>
              </div>
              <button
                className={`btn ${soundEnabled ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 14px', fontSize: 13 }}
                onClick={handleToggleSound}
              >
                {soundEnabled ? 'Sound ON 🔊' : 'Sound MUTED 🔇'}
              </button>
            </div>

            <div className="setting-row">
              <div><div style={{ fontWeight: 600, fontSize: 14 }}>Animated backgrounds</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Motion in Model World, Playground, Chat, Arcade, and Championship. Other rooms use still scenes.</div></div>
              <button type="button" className={`btn ${videoEnabled ? 'btn-primary' : 'btn-secondary'}`} role="switch" aria-checked={videoEnabled} onClick={() => setVideoEnabled(!videoEnabled)}>{videoEnabled ? 'Motion on' : 'Motion off'}</button>
            </div>

            {/* Accessibility / Motion Status */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Accessibility & Motion</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Your system reduced-motion preference takes priority over the video setting. A still image is shown when motion is reduced or data saving is enabled.
              </div>
            </div>

            {/* Security & Isolation */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--accent-mint)', marginBottom: 4 }}>
                Security & Isolation
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Local inference execution tokens (<code>PRISMLAB_LIVE_TOKEN</code>) are strictly excluded from client builds and client environment variables. Inference runs inside Bubblewrap filesystem isolation.
              </div>
            </div>

            {/* Privacy & Data Handling */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--accent-lilac)', marginBottom: 4 }}>
                Privacy & Data Handling Notice
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                <ul style={{ paddingLeft: 16, margin: '4px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <li><strong>Prompts & Uploads:</strong> Processed in-memory within the local CPU execution worker. Images and audio payloads are discarded immediately upon execution completion.</li>
                  <li><strong>Checkpoints:</strong> Story and Trivia turn progression is stored temporarily in local SQLite storage for session recovery and purged upon session conclusion.</li>
                  <li><strong>Anonymous Identity:</strong> Sessions use short-lived cryptographic tokens. No tracking cookies, third-party analytics pixels, or personal identity collection.</li>
                  <li><strong>Championship:</strong> Only signed cryptographic receipts and aggregate scores are persisted to Supabase for the global leaderboard.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Backend Operating Status */}
        <div className="glass-panel">
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: 'var(--text-main)' }}>
            Runtime details
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13, fontFamily: 'var(--font-mono)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-dim)' }}>API Gateway:</span>
              <span style={{ color: 'var(--accent-mint)' }}>{gateway?.backend_available ? 'FastAPI online' : 'FastAPI offline'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-dim)' }}>Execution Mode:</span>
              <span>{gateway?.backend_mode || 'unavailable'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-dim)' }}>Active Models:</span>
              <span>6 in registry · live availability separate</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-dim)' }}>Frontend Stack:</span>
              <span>React 19 + TypeScript + Vite</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-dim)' }}>Mascot Rendering:</span>
              <span>Instance-Isolated SVG</span>
            </div>
          </div>
        </div>
      </div>

      <OfficialResources compact />
      <div className="glass-panel"><h3>Local execution</h3><p>{gateway?.reason || 'Checking…'}</p><p>Gateway: {gateway?.gateway_enabled ? 'enabled' : 'disabled'} · text: {gateway?.text_model_available ? 'responding' : gateway?.on_demand_routes?.includes('text') ? 'ready on request' : 'offline'} · other models: {gateway?.multimodal_model_available ? 'responding' : gateway?.on_demand_routes?.length === 6 ? 'ready on request' : 'offline'}</p><button className="btn btn-secondary" onClick={()=>getGatewayStatus().then(setGateway)}>Refresh runtime status</button></div>
      {/* Recorded P6 Replays */}
      <div className="glass-panel">
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: 'var(--text-main)' }}>
          Preserved P6 Replay Archive
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {replays.map((r) => (
            <div
              key={r.slug}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(0,0,0,0.3)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                flexWrap: 'wrap',
                gap: 10
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-main)' }}>
                  {r.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  Model: {r.route.join(' → ')} · Trace stages: {r.trace.length} · Source: results/p6/public_replays/{r.slug}.json
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent-mint)' }}>
                  {r.metrics.total_latency_s.toFixed(2)} s
                </span>
                <span className="badge badge-mint">
                  {r.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
