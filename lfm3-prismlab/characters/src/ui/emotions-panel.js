import { EMOTION_CONFIGS } from '../mascots/expressions.js';

export const SHOWCASE_EMOTIONS = [
  'idle',
  'happy',
  'sad',
  'angry',
  'excited',
  'surprised',
  'curious',
  'shy',
  'sleepy',
  'confused',
  'thinking',
  'proud'
];

export function createMiniFaceSvg(emotionKey) {
  const cfg = EMOTION_CONFIGS[emotionKey] || EMOTION_CONFIGS.idle;
  
  // Render left eye
  let leftEyeSvg = '';
  if (cfg.leftEye.type === 'arc') {
    leftEyeSvg = `<path d="M 12 19 Q 15 15.5 18 19" fill="none" stroke="#352046" stroke-width="1.8" stroke-linecap="round" />`;
  } else if (cfg.leftEye.type === 'droop') {
    leftEyeSvg = `<ellipse cx="15" cy="20" rx="2.0" ry="1.6" fill="#352046" />`;
  } else if (cfg.leftEye.type === 'narrow') {
    leftEyeSvg = `<ellipse cx="15" cy="19.5" rx="2.2" ry="1.4" fill="#352046" />`;
  } else {
    leftEyeSvg = `<ellipse cx="15" cy="19" rx="2.2" ry="3.0" fill="#352046" />
      ${cfg.leftEye.glint ? '<circle cx="16" cy="17.8" r="0.8" fill="#ffffff" />' : ''}
      ${cfg.leftEye.sparkle ? '<circle cx="15" cy="18" r="1.3" fill="#ffffff" />' : ''}`;
  }

  // Render right eye
  let rightEyeSvg = '';
  if (cfg.rightEye.type === 'arc') {
    rightEyeSvg = `<path d="M 22 19 Q 25 15.5 28 19" fill="none" stroke="#352046" stroke-width="1.8" stroke-linecap="round" />`;
  } else if (cfg.rightEye.type === 'droop') {
    rightEyeSvg = `<ellipse cx="25" cy="20" rx="2.0" ry="1.6" fill="#352046" />`;
  } else if (cfg.rightEye.type === 'narrow') {
    rightEyeSvg = `<ellipse cx="25" cy="19.5" rx="2.2" ry="1.4" fill="#352046" />`;
  } else {
    rightEyeSvg = `<ellipse cx="25" cy="19" rx="2.2" ry="3.0" fill="#352046" />
      ${cfg.rightEye.glint ? '<circle cx="26" cy="17.8" r="0.8" fill="#ffffff" />' : ''}
      ${cfg.rightEye.sparkle ? '<circle cx="25" cy="18" r="1.3" fill="#ffffff" />' : ''}`;
  }

  // Render mouth (scaled to 40x40 viewport, center is ~20, 24)
  let mouthSvg = '';
  if (cfg.mouth.d.includes('A 2.5')) {
    // Surprised tiny 'o'
    mouthSvg = `<circle cx="20" cy="23.5" r="1.6" fill="#352046" />`;
  } else if (cfg.mouth.hasTongue) {
    mouthSvg = `<path d="M 18 22 Q 20 25.5 22 22 Z" fill="#352046" />
                <path d="M 19 24.2 Q 20 23.2 21 24.2 Z" fill="#ff9ebb" />`;
  } else {
    mouthSvg = `<path d="M 18.2 22.5 Q 20 24.8 21.8 22.5" fill="none" stroke="#352046" stroke-width="1.4" stroke-linecap="round" />`;
  }

  // Eyebrows if visible
  let browsSvg = '';
  if (cfg.eyebrows && cfg.eyebrows.visible) {
    if (emotionKey === 'angry') {
      browsSvg = `<line x1="13" y1="14" x2="17" y2="15.5" stroke="#352046" stroke-width="1.2" stroke-linecap="round" />
                  <line x1="27" y1="14" x2="23" y2="15.5" stroke="#352046" stroke-width="1.2" stroke-linecap="round" />`;
    } else {
      browsSvg = `<path d="M 13 14 Q 15 12.5 17 14" fill="none" stroke="#352046" stroke-width="1.1" stroke-linecap="round" />
                  <path d="M 23 14 Q 25 12.5 27 14" fill="none" stroke="#352046" stroke-width="1.1" stroke-linecap="round" />`;
    }
  }

  return `
    <svg width="38" height="38" viewBox="0 0 40 40" class="mini-face-svg">
      <defs>
        <radialGradient id="mini-face-grad-${emotionKey}" cx="45%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="35%" stop-color="#fae9f8" />
          <stop offset="70%" stop-color="#ebd5f5" />
          <stop offset="100%" stop-color="#d6bcf1" />
        </radialGradient>
      </defs>
      <!-- Outer orb shell -->
      <circle cx="20" cy="20" r="18.5" fill="#7b6c8f" stroke="#a78bfa" stroke-width="0.8" opacity="0.6" />
      <!-- Inner pastel face -->
      <circle cx="20" cy="20.5" r="15" fill="url(#mini-face-grad-${emotionKey})" />
      <!-- Soft blushes -->
      <circle cx="11.5" cy="23" r="3.2" fill="#ec4899" opacity="${cfg.blushOpacity || 0.4}" />
      <circle cx="28.5" cy="23" r="3.2" fill="#ec4899" opacity="${cfg.blushOpacity || 0.4}" />
      <!-- Eyes & Brows -->
      ${browsSvg}
      ${leftEyeSvg}
      ${rightEyeSvg}
      <!-- Mouth -->
      ${mouthSvg}
    </svg>
  `;
}

export function getEmotionOrnamentSvg(emotionKey) {
  switch (emotionKey) {
    case 'idle':
      return `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="emotion-ornament-svg">
          <path d="M 11.5 3.5 C 6.5 4 3 8 4 13 C 4.8 17 8.5 18 12 16.5 C 7.5 14.5 6.5 8.5 11.5 3.5 Z" fill="#fef08a" stroke="#facc15" stroke-width="0.8" stroke-linejoin="round" />
          <path d="M 15 5.5 Q 15 7.5 13 7.5 Q 15 7.5 15 9.5 Q 15 7.5 17 7.5 Q 15 7.5 15 5.5 Z" fill="#ffffff" />
          <circle cx="15.5" cy="13.5" r="0.75" fill="#fef08a" opacity="0.8" />
        </svg>
      `.trim();

    case 'happy':
      return `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="emotion-ornament-svg">
          <path d="M 5.5 14 C 7.5 11 9 9 11.5 6.5" stroke="#fb7185" stroke-width="2.2" stroke-linecap="round" fill="none" />
          <path d="M 9.5 15.5 C 11.5 12.5 13 10.5 15.5 8" stroke="#fb7185" stroke-width="2.2" stroke-linecap="round" fill="none" />
        </svg>
      `.trim();

    case 'sad':
      return `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="emotion-ornament-svg">
          <path d="M 10 3 C 9.5 5.5 5.5 9.5 5.5 13 C 5.5 15.5 7.5 17.5 10 17.5 C 12.5 17.5 14.5 15.5 14.5 13 C 14.5 9.5 10.5 5.5 10 3 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="0.8" />
          <path d="M 8 11.5 C 7.5 12.5 7.5 13.8 8 14.8" stroke="#ffffff" stroke-width="1.1" stroke-linecap="round" opacity="0.85" fill="none" />
        </svg>
      `.trim();

    case 'angry':
      return `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="emotion-ornament-svg">
          <line x1="6" y1="6" x2="14" y2="14" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round" />
          <line x1="14" y1="6" x2="6" y2="14" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round" />
          <circle cx="5.5" cy="5.5" r="1.6" fill="#f87171" stroke="#dc2626" stroke-width="0.8" />
          <circle cx="14.5" cy="5.5" r="1.6" fill="#f87171" stroke="#dc2626" stroke-width="0.8" />
          <circle cx="5.5" cy="14.5" r="1.6" fill="#f87171" stroke="#dc2626" stroke-width="0.8" />
          <circle cx="14.5" cy="14.5" r="1.6" fill="#f87171" stroke="#dc2626" stroke-width="0.8" />
        </svg>
      `.trim();

    case 'excited':
      return `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="emotion-ornament-svg">
          <line x1="10" y1="9" x2="10" y2="3" stroke="#facc15" stroke-width="2" stroke-linecap="round" />
          <line x1="7.5" y1="11" x2="3.5" y2="6.5" stroke="#facc15" stroke-width="2" stroke-linecap="round" />
          <line x1="12.5" y1="11" x2="16.5" y2="6.5" stroke="#facc15" stroke-width="2" stroke-linecap="round" />
          <circle cx="10" cy="2.5" r="1" fill="#ffffff" />
          <circle cx="3" cy="6" r="0.9" fill="#ffffff" />
          <circle cx="17" cy="6" r="0.9" fill="#ffffff" />
          <path d="M 8.5 13.5 Q 10 12 11.5 13.5" stroke="#f59e0b" stroke-width="1.4" stroke-linecap="round" fill="none" />
        </svg>
      `.trim();

    case 'surprised':
      return `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="emotion-ornament-svg">
          <line x1="10" y1="3.5" x2="10" y2="11.5" stroke="#fbbf24" stroke-width="2.8" stroke-linecap="round" />
          <circle cx="10" cy="16" r="1.6" fill="#fbbf24" />
        </svg>
      `.trim();

    case 'curious':
      return `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="emotion-ornament-svg">
          <path d="M 7.5 6.5 C 7.5 4.5 9 3 10.5 3 C 12.5 3 13.5 4.5 13.5 6.2 C 13.5 8 11.8 9.2 10.5 10.5 L 10.5 11.8" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
          <circle cx="10.5" cy="16" r="1.5" fill="#38bdf8" />
        </svg>
      `.trim();

    case 'shy':
      return `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="emotion-ornament-svg">
          <path d="M 15.5 3.5 C 15 4.8 12.8 6.2 11.8 7.5 C 10.8 8.8 11.2 10.8 12.5 11.5 C 13.8 12.2 15.8 11.5 16.5 10.2 C 17.2 8.8 15.5 3.5 15.5 3.5 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="0.8" />
          <circle cx="12.8" cy="9.2" r="0.75" fill="#ffffff" opacity="0.85" />
          <line x1="4.5" y1="16" x2="8.5" y2="11" stroke="#f472b6" stroke-width="1.8" stroke-linecap="round" />
          <line x1="8.5" y1="16.5" x2="12.5" y2="11.5" stroke="#f472b6" stroke-width="1.8" stroke-linecap="round" />
        </svg>
      `.trim();

    case 'sleepy':
      return `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="emotion-ornament-svg">
          <!-- Large Z -->
          <path d="M 4 11 L 9 11 L 4 17 L 9 17" fill="none" stroke="#a5b4fc" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
          <!-- Medium Z -->
          <path d="M 9.5 6.5 L 13.5 6.5 L 9.5 11 L 13.5 11" fill="none" stroke="#a5b4fc" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          <!-- Small Z -->
          <path d="M 14.5 3 L 17.5 3 L 14.5 6.5 L 17.5 6.5" fill="none" stroke="#a5b4fc" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      `.trim();

    case 'confused':
      return `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="emotion-ornament-svg">
          <path d="M 10 10 C 10.6 10 11.2 10.4 11.2 11 C 11.2 11.8 10.4 12.4 9.5 12.4 C 8.3 12.4 7.4 11.4 7.4 10 C 7.4 8.3 8.8 7 10.5 7 C 12.5 7 14 8.5 14 10.5 C 14 12.8 12.1 14.5 9.8 14.5 C 7 14.5 5 12.5 5 9.8 C 5 6.8 7.5 4.5 10.5 4.5 C 13 4.5 15.5 6 16 8.5" fill="none" stroke="#c084fc" stroke-width="1.8" stroke-linecap="round" />
        </svg>
      `.trim();

    case 'thinking':
      return `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="emotion-ornament-svg">
          <path d="M 6 10.5 C 4 10.5 3 9 3 7.5 C 3 6 4.2 4.8 5.8 4.8 C 6.5 3.5 8 2.5 10 2.5 C 12.2 2.5 13.8 3.8 14.3 5 C 15.8 5.2 17 6.3 17 7.8 C 17 9.5 15.5 10.5 14 10.5 Z" fill="rgba(199, 210, 254, 0.2)" stroke="#c7d2fe" stroke-width="1.2" stroke-linejoin="round" />
          <circle cx="6.5" cy="13.5" r="1.3" fill="#c7d2fe" />
          <circle cx="4.5" cy="16.5" r="0.85" fill="#c7d2fe" />
        </svg>
      `.trim();

    case 'proud':
      return `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="emotion-ornament-svg">
          <path d="M 4 6 L 7.5 9.5 L 10 3.5 L 12.5 9.5 L 16 6 L 15 14.5 C 11.5 15.5 8.5 15.5 5 14.5 Z" fill="#fbbf24" stroke="#f59e0b" stroke-width="1.1" stroke-linejoin="round" />
          <circle cx="4" cy="5.5" r="1" fill="#ec4899" />
          <circle cx="10" cy="3" r="1.2" fill="#38bdf8" />
          <circle cx="16" cy="5.5" r="1" fill="#ec4899" />
          <circle cx="10" cy="12.5" r="0.9" fill="#ffffff" opacity="0.9" />
        </svg>
      `.trim();

    default:
      return '';
  }
}

export function initEmotionsPanel(container, characters) {
  if (!container) return;

  container.innerHTML = `
    <div class="panel-header">
      <span class="panel-icon">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="panel-icon-svg" aria-hidden="true">
          <!-- Tragedy mask (behind, top-right) -->
          <path d="M 7.5 4 C 7.5 2 13.5 2 13.5 4 C 13.5 8 12.5 11 10.5 11.5 C 8.5 11 7.5 8 7.5 4 Z" fill="#24143d" stroke="#c084fc" stroke-width="1" stroke-linejoin="round" />
          <path d="M 13.4 4.5 C 14.4 4.3 15 4.8 15.5 4.5" stroke="#a855f7" stroke-width="0.8" stroke-linecap="round" />
          <circle cx="9.2" cy="5.2" r="0.65" fill="#f3e8ff" />
          <circle cx="11.8" cy="5.2" r="0.65" fill="#f3e8ff" />
          <path d="M 9.4 8.2 Q 10.5 7 11.6 8.2" stroke="#f3e8ff" stroke-width="0.9" stroke-linecap="round" fill="none" />
          <!-- Comedy mask (in front, bottom-left) -->
          <path d="M 2.5 7 C 2.5 5 8.5 5 8.5 7 C 8.5 11 7.5 14 5.5 14.5 C 3.5 14 2.5 11 2.5 7 Z" fill="#2e184d" stroke="#e879f9" stroke-width="1.1" stroke-linejoin="round" />
          <path d="M 2.6 7 C 1.6 7.2 1 7.8 0.5 7.5" stroke="#a855f7" stroke-width="0.8" stroke-linecap="round" />
          <path d="M 3.8 8.2 Q 4.6 7 5.3 8.2" stroke="#fdf4ff" stroke-width="0.9" stroke-linecap="round" fill="none" />
          <path d="M 5.8 8.2 Q 6.5 7 7.2 8.2" stroke="#fdf4ff" stroke-width="0.9" stroke-linecap="round" fill="none" />
          <path d="M 4.2 10.6 Q 5.5 12.8 6.8 10.6" stroke="#fdf4ff" stroke-width="1" stroke-linecap="round" fill="none" />
          <circle cx="3.6" cy="9.6" r="0.6" fill="#ec4899" opacity="0.6" />
          <circle cx="7.4" cy="9.6" r="0.6" fill="#ec4899" opacity="0.6" />
        </svg>
      </span>
      <h2 class="panel-title">Example Emotions & Reactions</h2>
    </div>
    <div class="emotions-grid">
      ${SHOWCASE_EMOTIONS.map(key => {
        const name = EMOTION_CONFIGS[key]?.name || key;
        return `
          <button class="emotion-item" data-emotion="${key}" title="Apply ${name} emotion">
            <div class="emotion-avatar">
              ${createMiniFaceSvg(key)}
              <span class="emotion-ornament">${getEmotionOrnamentSvg(key)}</span>
            </div>
            <span class="emotion-name">${name}</span>
          </button>
        `;
      }).join('')}
    </div>
  `;

  // Attach click listener
  const buttons = container.querySelectorAll('.emotion-item');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const emotion = btn.dataset.emotion;
      buttons.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      characters.forEach(char => {
        char.showEmotionFor(emotion);
      });
    });
  });
}
