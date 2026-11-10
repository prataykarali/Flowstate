import { createGameOverlay } from './game-overlay.js';
import { RunnerEngine } from './runner-engine.js';
import { MascotCharacter } from '../mascots/character.js';
import { mountBackgroundVideo } from '../world/background-video.js';
import { showRunnerDialogue } from '../ui/runner-dialogue.js';
import { pickLine } from '../mascots/dialogue.js';

let activeController = null;

export class GameController {
  constructor(character) {
    this.character = character;
    this.overlayElement = null;
    this.engine = null;
    this.boundKeyDown = null;
    this.boundVisibilityChange = null;
    this.boundStageTap = null;
    this.hasStarted = false;
  }

  static launch(character) {
    if (activeController) {
      activeController.close();
    }
    const controller = new GameController(character);
    controller.init();
    activeController = controller;
    document.dispatchEvent(new Event('prism:game-open'));
    return controller;
  }

  static getActive() {
    return activeController;
  }

  init() {
    // 1. Pause gallery mascot
    this.character.pause();

    // 2. Build Overlay DOM
    this.overlayElement = createGameOverlay(this.character);
    document.body.appendChild(this.overlayElement);

    const mascotGroup = this.overlayElement.querySelector('#mascotGroup');
    const obstaclesGroup = this.overlayElement.querySelector('#obstaclesGroup');
    const groundGroup = this.overlayElement.querySelector('#groundGroup');
    const cloudsGroup = this.overlayElement.querySelector('#cloudsGroup');
    const hillsGroup = this.overlayElement.querySelector('#hillsGroup');
    const sceneSvg = this.overlayElement.querySelector('.runner-scene-svg');
    const currentScoreEl = this.overlayElement.querySelector('#gameCurrentScore');
    const bestScoreEl = this.overlayElement.querySelector('#gameBestScore');
    const milestoneBadge = this.overlayElement.querySelector('#milestoneBadge');
    const gameOverModal = this.overlayElement.querySelector('#gameOverModal');
    const finalScoreVal = this.overlayElement.querySelector('#finalScoreVal');
    const finalBestVal = this.overlayElement.querySelector('#finalBestVal');
    const restartBtn = this.overlayElement.querySelector('#gameRestartBtn');
    const exitBtn = this.overlayElement.querySelector('#gameExitBtn');
    const closeBtn = this.overlayElement.querySelector('#gameCloseBtn');
    const stageViewport = this.overlayElement.querySelector('#gameStageViewport');
    showRunnerDialogue(stageViewport, pickLine(this.character.id, 'launch'));
    this.newBest = false;
    this.disposeVideo = mountBackgroundVideo(stageViewport, 'runner');

    // 3. Create dedicated MascotCharacter instance inside the game
    this.runnerMascot = new MascotCharacter({
      id: `game-${this.character.id}`,
      name: this.character.name,
      accessories: this.character.accessories,
      timingOffset: 0,
      initialEmotion: 'idle'
    });
    const runnerCard = this.runnerMascot.render();
    const runnerSvg = runnerCard.querySelector('svg');
    runnerSvg.classList.add('runner-mascot-svg');
    runnerSvg.setAttribute('width', '180');
    runnerSvg.setAttribute('height', '180');
    mascotGroup.appendChild(runnerSvg);

    // 4. Initialize Runner Physics Engine
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
          milestoneBadge.classList.add('milestone-pop');
          clearTimeout(this.milestoneTimer);
          this.milestoneTimer = setTimeout(() => {
            milestoneBadge.classList.remove('milestone-pop');
            milestoneBadge.style.display = 'none';
          }, 1200);
        }
      },
      onGameOver: (finalScore, finalBest) => {
        if (!this.newBest) showRunnerDialogue(stageViewport, 'Ouch! One more try?');
        if (finalScoreVal) finalScoreVal.textContent = finalScore;
        if (finalBestVal) finalBestVal.textContent = finalBest;
        this.gameOverTimer = setTimeout(() => {
          if (gameOverModal?.isConnected) {
            gameOverModal.style.display = 'flex';
            gameOverModal.classList.add('fade-in');
          }
        }, 650);
      },
      onNewBest: () => { this.newBest = true; showRunnerDialogue(stageViewport, 'A new best!'); },
      onJumpSuccess: () => { if (Math.random() < .2) showRunnerDialogue(stageViewport, 'Nice jump!'); }
    });
    if (bestScoreEl) bestScoreEl.textContent = this.engine.bestScore.toString().padStart(5, '0');

    // 5. Setup Event Listeners
    this.boundKeyDown = (e) => {
      if (e.code === 'Tab') {
        const controls = [...this.overlayElement.querySelectorAll('button, [tabindex="0"]')].filter(element => element.offsetParent !== null);
        const index = controls.indexOf(document.activeElement);
        if (e.shiftKey && index <= 0) { e.preventDefault(); controls.at(-1)?.focus(); }
        else if (!e.shiftKey && index === controls.length - 1) { e.preventDefault(); controls[0]?.focus(); }
        return;
      }
      if (e.target instanceof Element && e.target.closest('button') && e.code !== 'Escape') return;
      if (e.code === 'Escape') { e.preventDefault(); this.close(); return; }
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        if (!this.hasStarted) { this.startGame(); return; }
        if (this.engine.isDead) {
          this.restartGame();
        } else {
          this.engine.jump();
        }
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        if (!this.engine.isDead) {
          this.engine.dodge(true);
        }
      } else if (e.code === 'Enter' && this.engine.isDead) {
        e.preventDefault();
        this.restartGame();
      }
    };
    window.addEventListener('keydown', this.boundKeyDown);

    this.boundKeyUp = (e) => {
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        this.engine.dodge(false);
      }
    };
    window.addEventListener('keyup', this.boundKeyUp);

    // Modal touch buttons for Jump and Dodge
    const modalJumpBtn = this.overlayElement.querySelector('#modalJumpBtn');
    if (modalJumpBtn) {
      modalJumpBtn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        if (!this.hasStarted) this.startGame();
        if (this.engine.isDead) this.restartGame();
        else this.engine.jump();
      });
    }

    const modalDodgeBtn = this.overlayElement.querySelector('#modalDodgeBtn');
    if (modalDodgeBtn) {
      modalDodgeBtn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        if (!this.hasStarted) this.startGame();
        modalDodgeBtn.classList.add('is-pressed');
        this.engine.dodge(true);
      });
      const endModalDodge = (e) => {
        e?.stopPropagation();
        modalDodgeBtn.classList.remove('is-pressed');
        this.engine.dodge(false);
      };
      modalDodgeBtn.addEventListener('pointerup', endModalDodge);
      modalDodgeBtn.addEventListener('pointerleave', endModalDodge);
      modalDodgeBtn.addEventListener('pointercancel', endModalDodge);
    }

    // Click/Tap anywhere on stage to jump or restart
    this.boundStageTap = (e) => {
      if (e.target.closest('button')) return;
      if (!this.hasStarted) { this.startGame(); return; }
      if (this.engine.isDead) {
        this.restartGame();
        return;
      }
      const rect = stageViewport.getBoundingClientRect();
      const clickYRel = (e.clientY - rect.top) / rect.height;
      if (clickYRel > 0.68) {
        this.engine.dodge(true);
        clearTimeout(this.dodgeTimer);
        this.dodgeTimer = setTimeout(() => this.engine?.dodge(false), 380);
      } else {
        this.engine.jump();
      }
    };
    stageViewport.addEventListener('pointerdown', this.boundStageTap);

    // Buttons
    restartBtn.addEventListener('click', () => this.restartGame());
    exitBtn.addEventListener('click', () => this.close());
    closeBtn.addEventListener('click', () => this.close());
    this.overlayElement.querySelector('#gameStartBtn').addEventListener('click', e => {
      e.stopPropagation();
      this.startGame();
      stageViewport.focus();
    });

    // Tab visibility handling
    this.boundVisibilityChange = () => {
      if (document.hidden) {
        this.engine.pause();
      } else {
        this.engine.resume();
      }
    };
    document.addEventListener('visibilitychange', this.boundVisibilityChange);

    // Trigger entrance transition
    requestAnimationFrame(() => {
      this.overlayElement.classList.add('game-overlay-visible');
      stageViewport.focus();
    });
  }

  startGame() {
    if (this.hasStarted) return;
    this.hasStarted = true;
    this.overlayElement.querySelector('#gameReady').style.display = 'none';
    this.engine.start();
  }

  restartGame() {
    clearTimeout(this.gameOverTimer);
    clearTimeout(this.milestoneTimer);
    clearTimeout(this.dodgeTimer);
    this.newBest = false;
    const gameOverModal = this.overlayElement.querySelector('#gameOverModal');
    if (gameOverModal) gameOverModal.style.display = 'none';
    this.hasStarted = true;
    if (this.engine) this.engine.restart();
  }

  close() {
    clearTimeout(this.gameOverTimer);
    clearTimeout(this.milestoneTimer);
    clearTimeout(this.dodgeTimer);
    this.disposeVideo?.();
    this.disposeVideo = null;
    if (this.engine) {
      this.engine.destroy();
      this.engine = null;
    }

    if (this.boundKeyDown) {
      window.removeEventListener('keydown', this.boundKeyDown);
      this.boundKeyDown = null;
    }
    if (this.boundKeyUp) {
      window.removeEventListener('keyup', this.boundKeyUp);
      this.boundKeyUp = null;
    }
    if (this.boundVisibilityChange) {
      document.removeEventListener('visibilitychange', this.boundVisibilityChange);
      this.boundVisibilityChange = null;
    }
    if (this.boundStageTap && this.overlayElement) {
      const stageViewport = this.overlayElement.querySelector('#gameStageViewport');
      if (stageViewport) stageViewport.removeEventListener('pointerdown', this.boundStageTap);
      this.boundStageTap = null;
    }

    if (this.runnerMascot) {
      this.runnerMascot.destroy();
      this.runnerMascot = null;
    }

    if (this.overlayElement) {
      this.overlayElement.classList.remove('game-overlay-visible');
      setTimeout(() => {
        if (this.overlayElement) {
          this.overlayElement.remove();
          this.overlayElement = null;
        }
      }, 200);
    }

    // Resume gallery mascot
    this.character.resume();

    // Return focus to gallery card
    if (this.character.container) {
      this.character.container.focus();
    }

    if (activeController === this) {
      activeController = null;
    }
    document.dispatchEvent(new Event('prism:game-close'));
  }
}
