import React, { useEffect, useState } from 'react';
import type { RouteId } from '../app/routes.ts';
import { getCurrentActivity, parkActivity, resumeParkedActivity, stopActivity, startActivity, type ActivitySessionInfo } from '../lib/api.ts';
import { readShows, type ShowRecord } from '../lib/storyShow.ts';

export const GlobalActivityBanner: React.FC<{ onNavigate?: (route: RouteId) => void }> = ({ onNavigate }) => {
  const [activity, setActivity] = useState<ActivitySessionInfo | null>(null);
  const [parked, setParked] = useState<ActivitySessionInfo | null>(null);
  const [localShow, setLocalShow] = useState<ShowRecord | null>(null);
  const [localTrivia, setLocalTrivia] = useState<{ id: string; length: number; rounds: unknown[]; status: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const checkStatus = async () => {
    try {
      const res = await getCurrentActivity();
      setActivity(res.active ? res.activity : null);
      setParked(res.parked || null);

      // Check local story show records
      const shows = readShows();
      const current = shows[0];
      if (current && (current.status === 'active' || current.status === 'paused_rate_limit' || current.status === 'parked')) {
        setLocalShow(current);
      } else {
        setLocalShow(null);
      }

      // Check local trivia records
      try {
        const rawTrivia = localStorage.getItem('prismlab_active_trivia_match_v1');
        if (rawTrivia) {
          const parsed = JSON.parse(rawTrivia);
          if (parsed && (parsed.status === 'running' || parsed.status === 'paused') && parsed.rounds?.length < parsed.length) {
            setLocalTrivia(parsed);
          } else {
            setLocalTrivia(null);
          }
        } else {
          setLocalTrivia(null);
        }
      } catch {
        setLocalTrivia(null);
      }
    } catch {}
  };

  useEffect(() => {
    void checkStatus();
    const interval = setInterval(checkStatus, 4000);
    const handleUpdate = () => void checkStatus();
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('prismlab_activity_change', handleUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('prismlab_activity_change', handleUpdate);
    };
  }, []);

  const session = activity || parked;
  if (!session && !localShow && !localTrivia) return null;

  const isStory = session ? session.activity_type === 'STORY' : !!localShow;
  const isTrivia = session ? session.activity_type === 'TRIVIA' : (!isStory && !!localTrivia);
  const isParked = (session && session.status === 'parked') || (localShow?.status === 'parked') || (localTrivia?.status === 'paused');

  const turnInfo = isStory
    ? (localShow ? `Turn ${localShow.turns.length}/${localShow.config.turnCount}` : (session?.metadata && typeof session.metadata.turn === 'number' ? `Turn ${session.metadata.turn}` : ''))
    : (localTrivia ? `Round ${localTrivia.rounds.length}/${localTrivia.length}` : (session?.metadata && typeof session.metadata.round === 'number' ? `Round ${session.metadata.round}` : ''));

  const themeLabel: string = isStory
    ? (localShow?.config.theme || (typeof session?.metadata?.theme === 'string' ? session.metadata.theme : 'Story'))
    : 'Trivia Match';

  const handleReturn = () => {
    if (isStory) {
      if (onNavigate) onNavigate('chat');
      else window.location.hash = '#chat';
      window.dispatchEvent(new CustomEvent('prismlab_open_story'));
    } else if (isTrivia) {
      if (onNavigate) onNavigate('trivia');
      else window.location.hash = '#trivia';
    }
  };

  const handleSaveAndExit = async () => {
    if (!session && !localShow && !localTrivia) return;
    setLoading(true);
    try {
      const sessId = session?.session_id || localShow?.showId || localTrivia?.id;
      if (sessId) {
        await parkActivity(sessId, {
          theme: isStory ? localShow?.config.theme : 'Trivia Match',
          turn: isStory ? localShow?.turns.length : localTrivia?.rounds.length,
          turnCount: isStory ? localShow?.config.turnCount : localTrivia?.length,
        });
      }
      if (localTrivia && localTrivia.status === 'running') {
        const paused = { ...localTrivia, status: 'paused' };
        localStorage.setItem('prismlab_active_trivia_match_v1', JSON.stringify(paused));
        setLocalTrivia(paused);
      }
      window.dispatchEvent(new CustomEvent('prismlab_activity_change'));
      await checkStatus();
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    setLoading(true);
    try {
      const sessId = session?.session_id || localShow?.showId || localTrivia?.id;
      if (sessId && isParked) {
        try {
          await resumeParkedActivity(sessId);
        } catch {
          try {
            await startActivity(isStory ? 'STORY' : 'TRIVIA', sessId);
          } catch {}
        }
      }
      handleReturn();
      window.dispatchEvent(new CustomEvent('prismlab_activity_change'));
      window.dispatchEvent(new CustomEvent('prismlab_resume_activity', { detail: { activity: isStory ? 'STORY' : 'TRIVIA' } }));
      if (isStory) window.dispatchEvent(new CustomEvent('prismlab_resume_story'));
      else window.dispatchEvent(new CustomEvent('prismlab_resume_trivia'));
      await checkStatus();
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      const sessId = session?.session_id || localShow?.showId || localTrivia?.id;
      if (sessId) {
        await stopActivity(sessId, 'user_stopped');
      }
      if (localTrivia) {
        localStorage.removeItem('prismlab_active_trivia_match_v1');
        setLocalTrivia(null);
      }
      window.dispatchEvent(new CustomEvent('prismlab_activity_change'));
      await checkStatus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="global-activity-banner"
      role="region"
      aria-label="Active Activity Status"
      style={{
        background: isParked
          ? 'linear-gradient(90deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))'
          : 'linear-gradient(90deg, rgba(217, 119, 6, 0.25), rgba(180, 83, 9, 0.35))',
        borderBottom: isParked ? '1px solid rgba(148, 163, 184, 0.3)' : '1px solid rgba(245, 158, 11, 0.5)',
        color: '#fef3c7',
        padding: '6px 16px',
        fontSize: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        zIndex: 50,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '14px' }}>{isParked ? '⏸️' : '⏳'}</span>
        <span>
          <strong>{isParked ? 'Saved & Parked' : 'In Progress'}:</strong>{' '}
          {themeLabel} {isStory ? 'Story' : 'Trivia'} {turnInfo ? `(${turnInfo})` : ''}
          {isParked ? ' is saved. Single-activity lock is released.' : ' is running in background. Lock is active.'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          type="button"
          onClick={handleReturn}
          disabled={loading}
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            background: 'rgba(255, 255, 255, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Return to {isStory ? 'Story' : 'Trivia'}
        </button>
        {isParked ? (
          <button
            type="button"
            onClick={handleResume}
            disabled={loading}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              background: '#059669',
              border: 'none',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Resume
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSaveAndExit}
            disabled={loading}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              background: '#3b82f6',
              border: 'none',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Save & Exit
          </button>
        )}
        <button
          type="button"
          onClick={handleStop}
          disabled={loading}
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Stop
        </button>
      </div>
    </div>
  );
};
