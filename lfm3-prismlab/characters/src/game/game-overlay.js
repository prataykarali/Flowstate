import { getObstacleGradients } from './obstacles.js';
import { getRunnerHillsMarkup } from './scenery.js';

export function createGameOverlay(character) {
  const overlay = document.createElement('div');
  overlay.className = 'game-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', `${character.name} Mini-Game Playground`);

  overlay.innerHTML = `
    <div class="game-modal">
      <!-- Top HUD -->
      <header class="game-hud">
        <div class="hud-left">
          <span class="game-mascot-badge">${character.name}</span>
          <span class="hud-instruction">SPACE / ↑ JUMP • ↓ / S DODGE</span>
        </div>
        <div class="hud-right">
          <div class="score-display">
            <span class="score-label">HI</span>
            <span class="score-best" id="gameBestScore">00000</span>
            <span class="score-current" id="gameCurrentScore">00000</span>
          </div>
          <button class="game-close-btn" id="gameCloseBtn" aria-label="Close game (Esc)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </header>

      <!-- Stage Viewport -->
      <div class="game-stage-viewport" id="gameStageViewport" tabindex="0" aria-label="Runner stage. Space or Up to jump, Down or S to dodge.">
        <svg class="runner-scene-svg" viewBox="0 0 760 280" preserveAspectRatio="xMidYMid meet">
          ${getObstacleGradients()}

          <!-- Scenic video or CSS poster sits behind this transparent SVG. -->
          ${getRunnerHillsMarkup('hillsGroup')}

          <!-- Horizon Sky Glow -->
          <radialGradient id="horizonGlow" cx="50%" cy="100%" r="70%">
            <stop offset="0%" stop-color="#7c3aed" stop-opacity="0.28" />
            <stop offset="60%" stop-color="#4c1d95" stop-opacity="0.1" />
            <stop offset="100%" stop-color="#08080b" stop-opacity="0" />
          </radialGradient>
          <rect x="0" y="60" width="760" height="220" fill="url(#horizonGlow)" />

          <!-- Parallax Distant Stars / Stardust -->
          <circle cx="90" cy="40" r="1.3" fill="#e9d5ff" opacity="0.6" />
          <circle cx="210" cy="70" r="1.5" fill="#f0abfc" opacity="0.7" />
          <circle cx="360" cy="35" r="1.2" fill="#c084fc" opacity="0.5" />
          <circle cx="500" cy="65" r="1.6" fill="#f5d0fe" opacity="0.8" />
          <circle cx="670" cy="45" r="1.2" fill="#d8b4fe" opacity="0.6" />

          <!-- Parallax Clouds Group -->
          <g class="runner-clouds-layer" id="cloudsGroup"></g>

          <!-- Obstacles Layer -->
          <g class="runner-obstacles-layer" id="obstaclesGroup"></g>

          <!-- Mascot Layer (Positioned by RunnerEngine) -->
          <g class="runner-mascot-layer" id="mascotGroup"></g>

          <!-- Dino-style Textured Ground Group (Pebbles, dashes, baseline) -->
          <g class="runner-ground-layer" id="groundGroup"></g>
        </svg>

        <!-- On-screen Action Controls (Jump / Dodge) -->
        <div class="inline-touch-controls">
          <button class="touch-btn" id="modalJumpBtn">JUMP ↑</button>
          <button class="touch-btn" id="modalDodgeBtn">DODGE ↓</button>
        </div>

        <div class="runner-ready" id="gameReady">
          <span class="runner-ready-title">READY TO RUN?</span>
          <span class="runner-ready-hint">Jump over crystals. Duck beneath floating cubes.</span>
          <button class="runner-ready-btn" id="gameStartBtn" type="button">START RUNNING</button>
        </div>

        <!-- Milestone Sparkle Notification -->
        <div class="milestone-badge" id="milestoneBadge" style="display: none;">
          <span>+100 GAME SCORE</span>
        </div>

        <!-- Game Over Modal Overlay -->
        <div class="game-over-modal" id="gameOverModal" style="display: none;">
          <h2 class="game-over-title">GAME OVER</h2>
          <div class="game-over-stats">
            <div class="stat-item">
              <span class="stat-label">SCORE</span>
              <span class="stat-value" id="finalScoreVal">0</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">BEST</span>
              <span class="stat-value" id="finalBestVal">0</span>
            </div>
          </div>
          <div class="game-over-actions">
            <button class="game-btn game-btn-restart" id="gameRestartBtn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M1 4v6h6M23 20v-6h-6"></path>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
              </svg>
              PLAY AGAIN
            </button>
            <button class="game-btn game-btn-exit" id="gameExitBtn">
              RETURN TO GALLERY
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  return overlay;
}
