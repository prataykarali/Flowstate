import { RunnerEngine } from '../game/runner-engine.js';
import { MascotCharacter } from '../mascots/character.js';
import { getObstacleGradients } from '../game/obstacles.js';
import { GameController } from '../game/game-controller.js';
import { mountBackgroundVideo } from '../world/background-video.js';
import { showRunnerDialogue } from './runner-dialogue.js';
import { getRunnerHillsMarkup } from '../game/scenery.js';

export class InlineRunnerPanel {
  constructor(container, characters, initialMascotIndex = 1) {
    this.container = container;
    this.characters = characters;
    this.currentMascot = characters[initialMascotIndex] || characters[0];
    this.engine = null;
    this.runnerMascot = null;
    this.isPaused = false;

    this.render();
    this.initEngine();
    this.updateActiveCardHighlight();
  }

  render() {
    this.container.innerHTML = `
      <div class="inline-runner-card">
        <!-- Top Game Header Bar -->
        <header class="inline-hud">
          <div class="inline-hud-left">
            <button class="inline-mascot-pill" id="inlineMascotPicker" title="Click to cycle mascot">
              <span class="inline-mascot-label" id="inlineMascotName">${this.currentMascot.name}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            <span class="inline-hud-hint">SPACE / ↑ JUMP • ↓ / S DODGE</span>
          </div>

          <div class="inline-hud-right">
            <div class="inline-score-box">
              <span class="inline-hi-tag">HI</span>
              <span class="inline-hi-val" id="inlineHiVal">00297</span>
              <span class="inline-score-val" id="inlineScoreVal">00000</span>
            </div>
            
            <button class="inline-icon-btn" id="inlinePauseBtn" title="Pause / Play">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" id="inlinePauseIcon">
                <rect x="6" y="4" width="4" height="16" rx="1"></rect>
                <rect x="14" y="4" width="4" height="16" rx="1"></rect>
              </svg>
            </button>

            <button class="inline-icon-btn" id="inlineExpandBtn" title="Launch Fullscreen Stage">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                <polyline points="15 3 21 3 21 9"></polyline>
                <polyline points="9 21 3 21 3 15"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
            </button>
          </div>
        </header>

        <!-- Runner Stage Viewport -->
        <div class="inline-stage-viewport" id="inlineStage" tabindex="0" aria-label="Inline runner. Space or Up to jump, Down or S to dodge.">
          <svg class="inline-runner-svg" viewBox="0 0 760 280" preserveAspectRatio="xMidYMid meet">
            ${getObstacleGradients()}

            <!-- Scenic video or CSS poster sits behind this transparent SVG. -->
            ${getRunnerHillsMarkup('inlineHillsGroup')}

            <!-- Parallax Clouds Group -->
            <g class="runner-clouds-layer" id="inlineCloudsGroup"></g>

            <!-- Obstacles Layer -->
            <g class="runner-obstacles-layer" id="inlineObstaclesGroup"></g>

            <!-- Mascot Layer -->
            <g class="runner-mascot-layer" id="inlineMascotGroup"></g>

            <!-- Dino-style Scrolling Brick Ground Group -->
            <g class="runner-ground-layer" id="inlineGroundGroup"></g>
          </svg>

          <!-- On-screen Action Controls (Jump / Dodge) -->
          <div class="inline-touch-controls">
            <button class="touch-btn" id="inlineJumpBtn">JUMP ↑</button>
            <button class="touch-btn" id="inlineDodgeBtn">DODGE ↓</button>
          </div>

          <!-- Milestone Badge -->
          <div class="milestone-badge" id="inlineMilestone" style="display: none;">
            <span>+100 GAME SCORE</span>
          </div>

          <div class="runner-ready" id="inlineReady">
            <span class="runner-ready-title">READY TO RUN?</span>
            <span class="runner-ready-hint">Jump over crystals. Duck beneath floating cubes.</span>
            <button class="runner-ready-btn" id="inlineStartBtn" type="button">START RUNNING</button>
          </div>

          <!-- Inline Game Over Overlay -->
          <div class="inline-gameover" id="inlineGameOver" style="display: none;">
            <span class="inline-gameover-title">GAME OVER</span>
            <div class="inline-gameover-stats">
              <span>SCORE: <b id="inlineFinalScore">0</b></span>
              <span>BEST: <b id="inlineFinalBest">0</b></span>
            </div>
            <button class="inline-btn-restart" id="inlineRestartBtn">PLAY AGAIN</button>
          </div>
        </div>
      </div>
    `;

    // Event listeners
    const picker = this.container.querySelector('#inlineMascotPicker');
    picker.addEventListener('click', (e) => {
      e.stopPropagation();
      this.cycleMascot();
    });

    const expandBtn = this.container.querySelector('#inlineExpandBtn');
    expandBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      GameController.launch(this.currentMascot);
    });

    const pauseBtn = this.container.querySelector('#inlinePauseBtn');
    pauseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePause();
    });

    // Touch controls for Jump and Dodge
    const jumpBtn = this.container.querySelector('#inlineJumpBtn');
    jumpBtn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (!this.hasStarted) this.startGame();
      if (this.engine.isDead) this.restart();
      else this.engine.jump();
    });

    const dodgeBtn = this.container.querySelector('#inlineDodgeBtn');
    dodgeBtn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (!this.hasStarted) this.startGame();
      dodgeBtn.classList.add('is-pressed');
      this.engine.dodge(true);
    });
    const releaseDodge = (e) => {
      e?.stopPropagation();
      dodgeBtn.classList.remove('is-pressed');
      this.engine.dodge(false);
    };
    dodgeBtn.addEventListener('pointerup', releaseDodge);
    dodgeBtn.addEventListener('pointerleave', releaseDodge);
    dodgeBtn.addEventListener('pointercancel', releaseDodge);

    // Stage Click: upper 65% jumps, lower 35% dodges
    const stage = this.container.querySelector('#inlineStage');
    stage.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      if (!this.hasStarted) { this.startGame(); return; }
      if (this.engine.isDead) {
        this.restart();
        return;
      }
      const rect = stage.getBoundingClientRect();
      const clickYRel = (e.clientY - rect.top) / rect.height;
      if (clickYRel > 0.68) {
        this.engine.dodge(true);
        clearTimeout(this.dodgeTimer);
        this.dodgeTimer = setTimeout(() => this.engine?.dodge(false), 380);
      } else {
        this.engine.jump();
      }
    });

    const restartBtn = this.container.querySelector('#inlineRestartBtn');
    restartBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.restart();
    });
    this.container.querySelector('#inlineStartBtn').addEventListener('click', e => {
      e.stopPropagation();
      this.startGame();
      stage.focus();
    });

    // Keyboard navigation: Space/Up/W to jump, Down/S to dodge
    this.boundKeyDown = (e) => {
      if (GameController.getActive()) return; // modal handles its own
      if (e.target instanceof Element && e.target.closest('button, .mascot-card')) return;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        if (!this.hasStarted) { this.startGame(); return; }
        if (this.engine.isDead) {
          this.restart();
        } else {
          this.engine.jump();
        }
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        if (!this.engine.isDead) {
          this.engine.dodge(true);
        }
      }
    };
    window.addEventListener('keydown', this.boundKeyDown);

    this.boundKeyUp = (e) => {
      if (GameController.getActive()) return;
      if (e.target instanceof Element && e.target.closest('button, .mascot-card')) return;
      if (!this.hasStarted) return;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        this.engine.dodge(false);
      }
    };
    window.addEventListener('keyup', this.boundKeyUp);
  }

  initEngine() {
    clearTimeout(this.gameOverTimer);
    clearTimeout(this.milestoneTimer);
    clearTimeout(this.dodgeTimer);
    this.newBest = false;
    this.isPaused = false;
    if (this.engine) {
      this.engine.destroy();
    }
    if (this.runnerMascot) {
      this.runnerMascot.destroy();
    }

    const mascotGroup = this.container.querySelector('#inlineMascotGroup');
    const obstaclesGroup = this.container.querySelector('#inlineObstaclesGroup');
    const groundGroup = this.container.querySelector('#inlineGroundGroup');
    const cloudsGroup = this.container.querySelector('#inlineCloudsGroup');
    const hillsGroup = this.container.querySelector('#inlineHillsGroup');
    const sceneSvg = this.container.querySelector('.inline-runner-svg');
    const currentScoreEl = this.container.querySelector('#inlineScoreVal');
    const bestScoreEl = this.container.querySelector('#inlineHiVal');
    const milestoneBadge = this.container.querySelector('#inlineMilestone');
    const gameOverModal = this.container.querySelector('#inlineGameOver');
    const finalScoreVal = this.container.querySelector('#inlineFinalScore');
    const finalBestVal = this.container.querySelector('#inlineFinalBest');
    const stageViewport = this.container.querySelector('#inlineStage');
    stageViewport.querySelector('.world-video-runner')?.pause();
    this.hasStarted = false;
    this.container.querySelector('#inlineReady').style.display = 'flex';
    this.container.querySelector('#inlinePauseIcon').innerHTML = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';

    // Clean old mascot
    mascotGroup.innerHTML = '';

    // Create MascotCharacter instance for runner
    this.runnerMascot = new MascotCharacter({
      id: `inline-${this.currentMascot.id}`,
      name: this.currentMascot.name,
      accessories: this.currentMascot.accessories,
      timingOffset: 0,
      initialEmotion: 'idle'
    });
    const runnerCard = this.runnerMascot.render();
    const runnerSvg = runnerCard.querySelector('svg');
    runnerSvg.classList.add('runner-mascot-svg');
    runnerSvg.setAttribute('width', '180');
    runnerSvg.setAttribute('height', '180');
    mascotGroup.appendChild(runnerSvg);

    this.engine = new RunnerEngine({
      character: this.runnerMascot,
      container: stageViewport,
      sceneSvg: sceneSvg,
      mascotGroup: mascotGroup,
      obstaclesGroup: obstaclesGroup,
      groundGroup: groundGroup,
      cloudsGroup: cloudsGroup,
      hillsGroup: hillsGroup,
      width: 760,
      height: 280,
      onScoreUpdate: (score, best) => {
        if (currentScoreEl) currentScoreEl.textContent = score.toString().padStart(5, '0');
        if (bestScoreEl) bestScoreEl.textContent = best.toString().padStart(5, '0');
      },
      onMilestone: (milestoneVal) => {
        showRunnerDialogue(stageViewport, 'Look at us go!');
        if (milestoneBadge) {
          milestoneBadge.textContent = `+${milestoneVal} GAME SCORE`;
          milestoneBadge.style.display = 'block';
          this.milestoneTimer = setTimeout(() => {
            milestoneBadge.style.display = 'none';
          }, 1200);
        }
      },
      onGameOver: (finalScore, finalBest) => {
        stageViewport.querySelector('.world-video-runner')?.pause();
        if (!this.newBest) showRunnerDialogue(stageViewport, 'Ouch! One more try?');
        if (finalScoreVal) finalScoreVal.textContent = finalScore;
        if (finalBestVal) finalBestVal.textContent = finalBest;
        this.gameOverTimer = setTimeout(() => {
          if (gameOverModal) gameOverModal.style.display = 'flex';
        }, 650);
      },
      onNewBest: () => { this.newBest = true; showRunnerDialogue(stageViewport, 'A new best!'); },
      onJumpSuccess: () => { if (Math.random() < .2) showRunnerDialogue(stageViewport, 'Nice jump!'); }
    });
    if (bestScoreEl) bestScoreEl.textContent = this.engine.bestScore.toString().padStart(5, '0');
    if (currentScoreEl) currentScoreEl.textContent = '00000';

  }

  startGame() {
    if (this.hasStarted) return;
    this.hasStarted = true;
    const stage = this.container.querySelector('#inlineStage');
    if (!this.disposeVideo) this.disposeVideo = mountBackgroundVideo(stage, 'runner', {
      shouldPlay: () => this.hasStarted && !this.isPaused && !this.engine?.isDead && !GameController.getActive()
    });
    else stage.querySelector('.world-video-runner')?.play().catch(() => {});
    this.container.querySelector('#inlineReady').style.display = 'none';
    this.container.querySelector('#inlinePauseIcon').innerHTML = '<rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect>';
    this.engine.start();
  }

  updateActiveCardHighlight() {
    document.querySelectorAll('.mascot-card').forEach(card => {
      const name = card.querySelector('.mascot-name')?.textContent;
      if (name === this.currentMascot.name) {
        card.classList.add('is-active-runner');
      } else {
        card.classList.remove('is-active-runner');
      }
    });
  }

  setMascot(character) {
    this.currentMascot = character;
    const nameEl = this.container.querySelector('#inlineMascotName');
    if (nameEl) nameEl.textContent = character.name;
    this.updateActiveCardHighlight();
    this.container.querySelector('#inlineGameOver').style.display = 'none';
    this.initEngine();
  }

  cycleMascot() {
    const currentIndex = this.characters.findIndex(c => c.id === this.currentMascot.id);
    const nextIndex = (currentIndex + 1) % this.characters.length;
    this.setMascot(this.characters[nextIndex]);
  }

  togglePause() {
    if (!this.hasStarted) { this.startGame(); return; }
    if (this.engine.isDead) return;
    this.isPaused = !this.isPaused;
    const icon = this.container.querySelector('#inlinePauseIcon');
    if (this.isPaused) {
      this.engine.pause();
      this.container.querySelector('.world-video-runner')?.pause();
      if (icon) {
        icon.innerHTML = `<polygon points="5 3 19 12 5 21 5 3"></polygon>`;
      }
    } else {
      this.engine.resume();
      this.container.querySelector('.world-video-runner')?.play().catch(() => {});
      if (icon) {
        icon.innerHTML = `<rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect>`;
      }
    }
  }

  restart() {
    const gameOverModal = this.container.querySelector('#inlineGameOver');
    if (gameOverModal) gameOverModal.style.display = 'none';
    this.initEngine();
    this.startGame();
  }

  destroy() {
    clearTimeout(this.gameOverTimer);
    clearTimeout(this.milestoneTimer);
    clearTimeout(this.dodgeTimer);
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    this.engine?.destroy();
    this.runnerMascot?.destroy();
    this.disposeVideo?.();
    this.container.innerHTML = '';
  }
}
