import React, { useEffect, useRef, useState } from 'react';
import { Mascot } from '../components/mascots/Mascot.tsx';
import { MascotAvatar } from '../components/mascots/MascotAvatar.tsx';
import { MODELS } from '../data/models.ts';
import { MATCH_CHANGE_EVENT, readMatches } from '../lib/triviaLive.ts';
import { LEAGUE_CHANGE_EVENT, readLeagueEvents } from '../lib/league.ts';
import { championshipStandings, RATING_CHANGE_EVENT, readRatings, saveRating } from '../lib/championshipScore.ts';
import { useGlobalStandings, fetchGlobalStandings } from '../lib/globalLeague.ts';

export const Championship: React.FC = () => {
  const [matches, setMatches] = useState(readMatches);
  const [events, setEvents] = useState(readLeagueEvents);
  const [ratings, setRatings] = useState(readRatings);
  const [ratingOpen, setRatingOpen] = useState(false);
  const stageRef = useRef<HTMLElement>(null);
  const [spots, setSpots] = useState<Array<{ left: number; top: number }>>([]);
  const [compact, setCompact] = useState(() => window.innerWidth < 750);
  const [boardTab, setBoardTab] = useState<'standings' | 'contributions'>('standings');
  const [refreshing, setRefreshing] = useState(false);

  const global = useGlobalStandings();

  useEffect(() => {
    void fetchGlobalStandings(true);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchGlobalStandings(true);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const refresh = () => {
      setMatches(readMatches());
      setEvents(readLeagueEvents());
      setRatings(readRatings());
      void fetchGlobalStandings(true);
    };
    window.addEventListener(MATCH_CHANGE_EVENT, refresh);
    window.addEventListener(LEAGUE_CHANGE_EVENT, refresh);
    window.addEventListener(RATING_CHANGE_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(MATCH_CHANGE_EVENT, refresh);
      window.removeEventListener(LEAGUE_CHANGE_EVENT, refresh);
      window.removeEventListener(RATING_CHANGE_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  useEffect(() => {
    const update = () => {
      setCompact(window.innerWidth < 750);
      const bounds = stageRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const scale = Math.max(window.innerWidth / 1280, window.innerHeight / 720);
      const ox = (window.innerWidth - 1280 * scale) / 2;
      const oy = (window.innerHeight - 720 * scale) / 2;
      const originals = [
        [640, 418],
        [466, 452],
        [813, 452],
        [433, 547],
        [854, 547],
        [640, 603]
      ];
      setSpots(originals.map(([x, y]) => ({
        left: x * scale + ox - bounds.left,
        top: y * scale + oy - bounds.top + 22
      })));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const localCompleted = matches.filter(match => match.status === 'completed');
  const localStandings = championshipStandings(events, matches, ratings);
  const totalLocalQuestions = localCompleted.reduce((sum, match) => sum + match.rounds.length, 0);

  // Active standings: use global server-authoritative standings if available, else local
  const standings = global.standings && global.standings.length === 6
    ? global.standings.map(g => ({
        modelId: g.model_id,
        rank: g.unranked ? null : g.rank,
        points: g.total_points,
        triviaPoints: g.trivia_points,
        chatPoints: g.chat_points,
        storyPoints: g.story_points,
        ratingPoints: g.rating_points,
        stars: ratings[g.model_id]?.stars || null,
        matches: localCompleted.filter(m => m.rounds.some(r => r.attempts.some(a => a.modelId === g.model_id))).length,
        correct: 0,
        attempts: 0,
        incorrect: 0,
        errors: 0,
        lastResultAt: g.last_activity_at,
      }))
    : localStandings;

  const maxPoints = Math.max(...standings.map(row => row.points), 1);
  const slots = standings;

  return (
    <div className="page-championship s4-championship">
      <header className="s4-championship-header">
        <div>
          <p className="eyebrow">Global Championship · Live Standings</p>
          <h1>Global Championship</h1>
          <p className="s4-subtitle" style={{ margin: '0.25rem 0 0', opacity: 0.85, fontSize: '0.9rem' }}>
            Live six-model rankings · Shared across all visitors
          </p>
        </div>
        <div className="s4-championship-metrics">
          <span title={global.updatedAt ? `Last updated: ${new Date(global.updatedAt).toLocaleTimeString()}` : 'Connecting…'}>
            ● {global.dataSource === 'supabase_postgres' ? 'Supabase Live Sync' : 'Global Sync Active'}
          </span>
          {global.updatedAt && (
            <span style={{ fontSize: '0.8rem', opacity: 0.75, display: 'inline-block', margin: '0 4px' }}>
              Updated {new Date(global.updatedAt).toLocaleTimeString()}
            </span>
          )}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || global.isLoading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <span style={{ display: 'inline-block', transform: refreshing ? 'rotate(360deg)' : 'none', transition: refreshing ? 'transform 0.6s linear infinite' : 'none' }}>↻</span>
            {refreshing ? 'Syncing…' : 'Refresh Rankings'}
          </button>
          <button type="button" onClick={() => setRatingOpen(true)}>★ Rate models</button>
        </div>
      </header>

      <section className="s4-championship-stage" aria-label="Six model championship arena" ref={stageRef}>
        {slots.map((standing, slot) => {
          const model = MODELS[standing.modelId];
          const hasEarnedRank = standing.rank !== null && standing.points > 0;
          return (
            <div
              key={model.id}
              className={`s4-stage-slot s4-stage-slot--${slot + 1} ${hasEarnedRank && standing.rank! <= 3 ? 'is-podium' : ''}`}
              style={{
                '--slot-color': model.themeColor,
                ...(!compact && spots[slot] ? { left: spots[slot].left, top: spots[slot].top } : {})
              } as React.CSSProperties}
            >
              <span
                className={`s4-rank-badge ${hasEarnedRank ? `rank-${standing.rank}` : 'is-unranked'}`}
                title={hasEarnedRank ? `Competition rank ${standing.rank}` : `Stage spot ${slot + 1}; unranked until points earned`}
              >
                <strong>{hasEarnedRank ? `#${standing.rank}` : '—'}</strong>
                <small>{hasEarnedRank ? 'Rank' : `Spot ${slot + 1}`}</small>
              </span>
              <Mascot model={model} motion={hasEarnedRank && standing.rank === 1 ? 'celebrating' : 'idle'} showAuthoredLine={false} interactive={false} />
              <div className="s4-stage-name">
                <strong>{model.characterName}</strong>
                <small>{hasEarnedRank ? `${model.name} · ${standing.points.toLocaleString()} pts` : `${model.name} · Unranked`}</small>
              </div>
            </div>
          );
        })}
      </section>

      <section className="s4-championship-board" aria-label="Championship leaderboard">
        <div className="s4-board-head">
          <div>
            <p className="eyebrow">Global Leaderboard</p>
            <h2>Live verified rankings</h2>
          </div>
          <p>
            {standings.some(row => row.points > 0)
              ? 'Shared global competition points accumulated by visitors across Chat, Story, Trivia, and Ratings.'
              : 'All models are currently awaiting initial competition points. Interact via Chat, Story, Trivia or Ratings to score!'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          <button
            type="button"
            onClick={() => setBoardTab('standings')}
            style={{
              flex: 1,
              padding: '6px 8px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 700,
              background: boardTab === 'standings' ? 'rgba(255, 230, 160, 0.25)' : 'rgba(255, 255, 255, 0.05)',
              border: boardTab === 'standings' ? '1px solid rgba(255, 230, 160, 0.6)' : '1px solid rgba(255, 255, 255, 0.1)',
              color: boardTab === 'standings' ? '#fff4ce' : '#e4d3f5',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            🏆 Global Standings
          </button>
          <button
            type="button"
            onClick={() => setBoardTab('contributions')}
            style={{
              flex: 1,
              padding: '6px 8px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 700,
              background: boardTab === 'contributions' ? 'rgba(255, 230, 160, 0.25)' : 'rgba(255, 255, 255, 0.05)',
              border: boardTab === 'contributions' ? '1px solid rgba(255, 230, 160, 0.6)' : '1px solid rgba(255, 255, 255, 0.1)',
              color: boardTab === 'contributions' ? '#fff4ce' : '#e4d3f5',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            👤 Your Activity
          </button>
        </div>

        {boardTab === 'standings' ? (
          <div className="s4-leaderboard">
            {standings.map(standing => {
              const model = MODELS[standing.modelId];
              const hasEarnedRank = standing.rank !== null && standing.points > 0;
              return (
                <article
                  key={model.id}
                  className={`s4-leaderboard-row ${hasEarnedRank ? `rank-${standing.rank}` : 'is-unranked'}`}
                  title={`Trivia ${standing.triviaPoints} · Chat ${standing.chatPoints} · Story ${standing.storyPoints} · Rating ${standing.ratingPoints}`}
                >
                  <span className="s4-row-rank">{hasEarnedRank ? `#${standing.rank}` : '—'}</span>
                  <span className="s4-row-avatar"><MascotAvatar model={model} /></span>
                  <span className="s4-row-name">
                    <strong>{model.characterName}</strong>
                    <small>{model.name}</small>
                  </span>
                  <span className="s4-row-result">
                    <strong>{standing.points ? `${standing.points.toLocaleString()} pts` : 'Awaiting activity'}</strong>
                    <small>{standing.points ? `T${standing.triviaPoints} · C${standing.chatPoints} · S${standing.storyPoints} · R${standing.ratingPoints}` : 'No global points yet'}</small>
                    {standing.points > 0 && (
                      <span className="s4-score-track">
                        <span style={{ width: `${Math.max(8, (standing.points / maxPoints) * 100)}%` }} />
                      </span>
                    )}
                  </span>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="s4-contributions-panel" style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div>
                <p className="eyebrow" style={{ margin: 0 }}>Personal Activity</p>
                <h3 style={{ margin: '0.2rem 0 0', fontSize: '1rem', color: '#fff' }}>Your Contributions</h3>
              </div>
              <span style={{ fontSize: '0.75rem', opacity: 0.8, color: '#e8d4f8' }}>
                {localCompleted.length} matches · {totalLocalQuestions} questions
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.6rem' }}>
              {localStandings.map(ls => {
                const m = MODELS[ls.modelId];
                return (
                  <div key={ls.modelId} style={{ padding: '0.5rem 0.7rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                      <span style={{ width: '18px', height: '18px', display: 'inline-block' }}><MascotAvatar model={m} /></span>
                      <strong style={{ fontSize: '0.8rem', color: '#fff' }}>{m.characterName}</strong>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#e4d2f5' }}>
                      {ls.points > 0 ? `+${ls.points} pts contributed` : 'No local turns'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {ratingOpen && (
        <div className="s4-rating-overlay" role="presentation" onClick={() => setRatingOpen(false)}>
          <section className="s4-rating-dialog" role="dialog" aria-modal="true" aria-label="Rate the models" onClick={event => event.stopPropagation()}>
            <div className="s4-rating-head">
              <div>
                <p className="eyebrow">Your ratings</p>
                <h2>Rate the mascots</h2>
                <p>One local rating per model. Each star gives 2 points; changing a rating replaces it.</p>
              </div>
              <button type="button" onClick={() => setRatingOpen(false)} aria-label="Close ratings">×</button>
            </div>
            <div className="s4-rating-list">
              {Object.values(MODELS).map(model => (
                <div className="s4-rating-item" key={model.id}>
                  <MascotAvatar model={model} />
                  <strong>{model.characterName}</strong>
                  <div aria-label={`Rate ${model.characterName}`}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        type="button"
                        key={star}
                        className={star <= (ratings[model.id]?.stars || 0) ? 'is-selected' : ''}
                        aria-label={`${star} stars for ${model.characterName}`}
                        onClick={() => setRatings(saveRating(model.id, star))}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
