import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { MODEL_LIST, type CanonicalModelId } from '../data/models.ts';
import { RunnerFrame } from '../components/RunnerFrame.tsx';

export const Arcade: React.FC = () => {
  const [activity, setActivity] = useState<'runner' | null>(null);
  const [mascot, setMascot] = useState<CanonicalModelId>('text');

  const handleOpenStory = () => {
    sessionStorage.setItem('prismlab_open_story', 'true');
    window.location.hash = '#chat';
    window.dispatchEvent(new CustomEvent('prismlab_open_story'));
  };

  return (
    <div className="page-arcade">
      <div className="page-header">
        <h1 className="page-title">
          <span>🕹️</span> Arcade
        </h1>
        <p className="page-description">
          Choose an activity. Each game opens into a full-screen play space.
        </p>
      </div>
      <div className="s1-activity-grid">
        <article className="s1-activity-card s1-activity-runner">
          <div>
            <p className="eyebrow">01 / Original PrismLab game</p>
            <h2>Endless Mascot Runner</h2>
            <p>
              Play the earlier runner with its original scenery, crystal hazards, movement and sound. Runs of 25+ game score award <strong>+100</strong> Championship points to the mascot's global score!
            </p>
            <label>
              Starting mascot
              <select value={mascot} onChange={e => setMascot(e.target.value as CanonicalModelId)}>
                {MODEL_LIST.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.characterName}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn btn-primary" onClick={() => setActivity('runner')}>
              Play full screen →
            </button>
          </div>
        </article>
        <article className="s1-activity-card s1-activity-story" onClick={handleOpenStory} style={{ cursor: 'pointer' }}>
          <div>
            <p className="eyebrow">02 / Local text collaboration</p>
            <h2>Story Relay</h2>
            <p>
              Write together in Collaborative Story. Auto Story Show is available inside Chat.
            </p>
            <button className="btn btn-primary" onClick={e => { e.stopPropagation(); handleOpenStory(); }}>
              Collaborative Story →
            </button>
          </div>
        </article>
      </div>
      {activity === 'runner' &&
        createPortal(<RunnerFrame initial={mascot} onClose={() => setActivity(null)} />, document.body)}
    </div>
  );
};
