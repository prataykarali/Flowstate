import './styles.css';
import { MascotCharacter } from './mascots/character.js';
import { GameController } from './game/game-controller.js';
import { initEmotionsPanel } from './ui/emotions-panel.js';
import { InlineRunnerPanel } from './ui/inline-runner.js';
import { MascotSpeechBubble } from './ui/mascot-speech-bubble.js';
import { mountBackgroundVideo } from './world/background-video.js';
import { initAmbientWorld } from './world/ambient.js';
import { EMOTION_CONFIGS } from './mascots/expressions.js';

const MASCOT_DEFINITIONS = [
  {
    id: 'lfm3-17b',
    name: 'LFM3-1.7B',
    accessories: [],
    timingOffset: 0,
    initialEmotion: 'idle'
  },
  {
    id: 'lfm3-vl-2b',
    name: 'LFM3-VL-2B',
    accessories: ['glasses'],
    timingOffset: 1200,
    initialEmotion: 'idle'
  },
  {
    id: 'lfm3-audio-2b',
    name: 'LFM3-Audio-2B',
    accessories: ['headphones'],
    timingOffset: 2400,
    initialEmotion: 'idle'
  },
  {
    id: 'lfm3-omni-2b',
    name: 'LFM3-Omni-2B',
    accessories: ['glasses', 'headphones'],
    timingOffset: 3600,
    initialEmotion: 'idle'
  },
  {
    id: 'd1-2b',
    name: 'd1-2B',
    accessories: ['monocle', 'prism'],
    timingOffset: 4800,
    initialEmotion: 'idle'
  },
  {
    id: 'd1-omni-2b',
    name: 'd1-Omni-2B',
    accessories: ['hat', 'magnifier'],
    timingOffset: 6000,
    initialEmotion: 'idle'
  }
];

let globalInlineRunner = null;
let dialogue = null;

function setupMascotInteraction(cardElement, character) {
  let clickTimeout = null;
  let lastTapTime = 0;
  let hoverTimer = null;
  let lastHoverReaction = 0;

  function chooseRunnerCharacter() {
    dialogue?.show(character, 'launch');
    if (globalInlineRunner) {
      globalInlineRunner.setMascot(character);
    }
    character.setEmotion('happy');
    GameController.launch(character);
    setTimeout(() => {
      character.setEmotion('idle');
    }, 1200);
  }

  // Desktop Mouse Click & Double-Click Resolver
  cardElement.addEventListener('click', (e) => {
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      clickTimeout = null;
      // Double Click -> Choose that character for the runner!
      chooseRunnerCharacter();
    } else {
      clickTimeout = setTimeout(() => {
        clickTimeout = null;
        // Single Click -> Trigger Delightful Random Micro-Reaction!
        character.triggerRandomReaction();
        dialogue?.show(character, 'react');
      }, 420);
    }
  });

  // Mobile Touch & Double-Tap Resolver
  cardElement.addEventListener('touchend', (e) => {
    const currentTime = Date.now();
    const tapInterval = currentTime - lastTapTime;

    if (tapInterval > 0 && tapInterval < 420) {
      // Double Tap -> Choose that character for the runner!
      e.preventDefault();
      if (clickTimeout) {
        clearTimeout(clickTimeout);
        clickTimeout = null;
      }
      lastTapTime = 0;
      chooseRunnerCharacter();
    } else {
      lastTapTime = currentTime;
    }
  }, { passive: false });

  cardElement.addEventListener('pointerenter', e => {
    if (e.pointerType === 'touch' || Date.now() - lastHoverReaction < 12000) return;
    hoverTimer = setTimeout(() => {
      if (!character.isReacting && !GameController.getActive()) {
        character.showEmotionFor('curious', 1000);
        lastHoverReaction = Date.now();
      }
    }, 450);
  });
  cardElement.addEventListener('pointerleave', () => {
    clearTimeout(hoverTimer);
    character.resetEyes();
  });

  // Keyboard navigation: Enter chooses runner, Space triggers random reaction
  cardElement.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      chooseRunnerCharacter();
    } else if (e.key === ' ') {
      e.preventDefault();
      character.triggerRandomReaction();
      dialogue?.show(character, 'react');
    }
  });
}

function initGallery() {
  const gridContainer = document.getElementById('mascotGrid');
  if (!gridContainer) return;

  const urlParams = new URLSearchParams(window.location.search);
  const fixedEmotion = urlParams.get('emotion');
  const launchMascotId = urlParams.get('game');

  const characters = [];
  const world = document.querySelector('.mascot-gallery-container');
  if (world) {
    mountBackgroundVideo(world, 'gallery');
    initAmbientWorld(world);
  }

  MASCOT_DEFINITIONS.forEach(def => {
    const character = new MascotCharacter(def);
    const cardElement = character.render();
    setupMascotInteraction(cardElement, character);
    gridContainer.appendChild(cardElement);

    if (fixedEmotion && EMOTION_CONFIGS[fixedEmotion]) {
      character.setEmotion(fixedEmotion);
    } else {
      character.start();
    }
    characters.push(character);

    if (launchMascotId === def.id) {
      setTimeout(() => {
        GameController.launch(character);
      }, 100);
    }
  });

  dialogue = new MascotSpeechBubble(characters);
  const soundButton = document.getElementById('soundToggle');
  soundButton?.addEventListener('click', () => {
    const enabled = soundButton.getAttribute('aria-pressed') !== 'true';
    soundButton.setAttribute('aria-pressed', String(enabled));
    soundButton.textContent = enabled ? 'Voice on' : 'Voice off';
    dialogue.setSoundEnabled(enabled);
  });

  // Initialize Emotions Panel
  const emotionsPanel = document.getElementById('emotionsPanel');
  if (emotionsPanel) {
    initEmotionsPanel(emotionsPanel, characters);
  }

  // Initialize Inline Runner Playground (default to LFM3-VL-2B index 1)
  const runnerPanel = document.getElementById('runnerPanel');
  if (runnerPanel) {
    globalInlineRunner = new InlineRunnerPanel(runnerPanel, characters, 1);
  }

  // Global Eye-Tracking: Subtle gaze following cursor / touch position
  let gazeFrame = 0;
  let pointer = null;
  window.addEventListener('pointermove', (e) => {
    if (GameController.getActive() || document.hidden) return;
    pointer = { x: e.clientX, y: e.clientY };
    if (gazeFrame) return;
    gazeFrame = requestAnimationFrame(() => {
      gazeFrame = 0;
      characters.forEach(c => c.handlePointerMove(pointer.x, pointer.y));
    });
  }, { passive: true });

  window.addEventListener('pointerleave', () => {
    cancelAnimationFrame(gazeFrame);
    gazeFrame = 0;
    characters.forEach(c => c.resetEyes());
  });

  window.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse') {
      characters.forEach(c => c.handlePointerMove(e.clientX, e.clientY));
      setTimeout(() => characters.forEach(c => c.resetEyes()), 1200);
    }
  }, { passive: true });

  let inlineWasRunning = false;
  document.addEventListener('prism:game-open', () => {
    inlineWasRunning = Boolean(globalInlineRunner?.hasStarted && !globalInlineRunner.isPaused && !globalInlineRunner.engine?.isDead);
    globalInlineRunner?.engine?.pause();
  });
  document.addEventListener('prism:game-close', () => {
    if (inlineWasRunning) globalInlineRunner?.engine?.resume();
    inlineWasRunning = false;
  });
  const syncGalleryAnimation = () => {
    const shouldPause = document.hidden || Boolean(GameController.getActive());
    characters.forEach(character => {
      if (shouldPause || (fixedEmotion && EMOTION_CONFIGS[fixedEmotion])) character.pause();
      else character.resume();
      if (!shouldPause && fixedEmotion && EMOTION_CONFIGS[fixedEmotion]) character.setEmotion(fixedEmotion);
    });
    if (shouldPause) dialogue.clear();
  };
  document.addEventListener('visibilitychange', syncGalleryAnimation);
  document.addEventListener('prism:game-open', syncGalleryAnimation);
  document.addEventListener('prism:game-close', syncGalleryAnimation);

  window.__prismMascots = characters;
  window.__prismGameController = GameController;
  window.__prismInlineRunner = globalInlineRunner;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGallery);
} else {
  initGallery();
}
