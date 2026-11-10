import { getSvgDefs } from './svg-defs.js';
import { EMOTION_CONFIGS, REACTIONS } from './expressions.js';
import { applyLocomotionState } from './locomotion.js';
import { profileFor } from './profiles.js';
import { gazeOffset } from './gaze.js';
import {
  renderGlasses,
  renderHeadphones,
  renderDetectiveHat,
  renderMagnifyingGlass,
  renderThinkerMonocle,
  renderThoughtPrism
} from './accessories.js';

export class MascotCharacter {
  /**
   * @param {Object} options
   * @param {string} options.id - e.g. "lfm3-17b"
   * @param {string} options.name - e.g. "LFM3-1.7B"
   * @param {string[]} options.accessories - ['glasses', 'headphones', 'hat', 'magnifier', 'monocle', 'prism']
   * @param {number} options.timingOffset - float in ms to stagger loops
   * @param {string} options.initialEmotion - 'idle', 'happy', etc.
   */
  constructor(options) {
    this.id = options.id;
    this.name = options.name;
    this.accessories = options.accessories || [];
    this.timingOffset = options.timingOffset || 0;
    this.currentEmotion = options.initialEmotion || 'idle';
    this.currentLocomotion = 'idle';
    this.profile = profileFor(this.id);
    this.isBlinking = false;
    this.isReacting = false;
    this.reactionTimeout = null;
    this.blinkTimer = null;
    this.cycleTimer = null;
    this.personalityTimer = null;
    this.startTimer = null;
    this.blinkResetTimer = null;
    this.microTimers = new Set();
    this.container = null;
    this.svgElement = null;
    this.isPaused = false;

    // Eye-follow state
    this.eyeTargetX = 0;
    this.eyeTargetY = 0;
    this.eyeCurrentX = 0;
    this.eyeCurrentY = 0;

    // Emotion cycle sequence: Always returns to calm sweet idle between emotions
    this.emotionSequence = this.profile.sequence;
    this.sequenceIndex = 0;

    // Emotional durations in ms
    this.durations = {
      idle: 4400 + (Math.random() * 800 - 400),
      happy: 3800,
      excited: 3600,
      sad: 3800,
      angry: 3400
    };
  }

  /**
   * Build complete SVG DOM structure with full, plump, pillowy face orb
   */
  render() {
    const card = document.createElement('div');
    card.className = `mascot-card mascot-${this.id} personality-${this.id}`;
    card.setAttribute('data-mascot-id', this.id);
    card.setAttribute('data-emotion', this.currentEmotion);
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `${this.name} mascot. Click to react, double-click to launch game.`);

    const svgWrapper = document.createElement('div');
    svgWrapper.className = 'mascot-svg-wrapper';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 180 180');
    svg.setAttribute('class', `mascot-svg mascot-svg-${this.id}`);
    svg.setAttribute('aria-hidden', 'true');

    // Insert Defs
    const defsMarkup = getSvgDefs(this.id);

    // Build Accessory Markups
    let accessoriesMarkup = '';
    if (this.accessories.includes('glasses')) accessoriesMarkup += renderGlasses(this.id);
    if (this.accessories.includes('headphones')) accessoriesMarkup += renderHeadphones(this.id);
    if (this.accessories.includes('hat')) accessoriesMarkup += renderDetectiveHat(this.id);
    if (this.accessories.includes('magnifier')) accessoriesMarkup += renderMagnifyingGlass(this.id);
    if (this.accessories.includes('monocle')) accessoriesMarkup += renderThinkerMonocle(this.id);
    if (this.accessories.includes('prism')) accessoriesMarkup += renderThoughtPrism(this.id);

    const isAudioResting = (this.id === 'lfm3-audio-2b' || this.id === 'game-lfm3-audio-2b');

    svg.innerHTML = `
      ${defsMarkup}

      <!-- Ambient Background Glow -->
      <circle cx="90" cy="100" r="74" fill="url(#${this.id}-ambientBacklight)" class="mascot-ambient-glow" />

      <!-- Main Mascot Character Root (floats, breathes, and runs) -->
      <g class="mascot-body-root" style="transform-origin: 90px 100px;">
        
        <!-- Outer Shell Sphere: Sleek Dark Slate-Lavender with Glowing Violet Rim -->
        <g class="mascot-outer-sphere">
          <!-- Main Outer Body Circle (r=48) -->
          <circle cx="90" cy="100" r="48" fill="url(#${this.id}-outerBodyGrad)" filter="drop-shadow(0 6px 14px rgba(10,5,20,0.55))" />
          <!-- Lower Rim Glow Light (3D sphere illumination matching reference) -->
          <circle cx="90" cy="100" r="48" fill="url(#${this.id}-rimLightGrad)" />
        </g>

        <!-- Inner Face Sphere: FULL, PLUMP, PILLOWY PASTEL LILAC-PINK ORB (r=39.5) -->
        <g class="mascot-inner-face" style="transform-origin: 90px 100px;">
          <!-- Plush Face Base (dominant, pillowy volume) -->
          <circle cx="90" cy="100" r="39.5" fill="url(#${this.id}-faceBodyGrad)" />
          <!-- Soft Specular Top Shine (Gives rounded toy-like volume) -->
          <ellipse cx="85" cy="80" rx="28" ry="16" fill="url(#${this.id}-plushTopGlow)" />
          <!-- Soft Inset Rim Depth Shading -->
          <circle cx="90" cy="100" r="39.5" fill="url(#${this.id}-faceDepthGrad)" />

          <!-- Delicate Cheek Blushes -->
          <circle cx="68" cy="106" r="8" fill="url(#${this.id}-blushGrad)" class="cheek-blush blush-left" />
          <circle cx="112" cy="100" r="8" fill="url(#${this.id}-blushGrad)" class="cheek-blush blush-right" />
        </g>

        <!-- Facial Expressions Layer: Natural 10° Curious Angle -->
        <g class="mascot-face-features" style="transform-origin: 90px 98px;">
          <!-- Eyebrows (Dynamic for Emotions, hidden in Idle) -->
          <path class="eyebrow eyebrow-left" d="M 71 89 Q 74 88 78 89" fill="none" stroke="#352046" stroke-width="2.2" stroke-linecap="round" opacity="0" />
          <path class="eyebrow eyebrow-right" d="M 102 85 Q 106 84 110 85" fill="none" stroke="#352046" stroke-width="2.2" stroke-linecap="round" opacity="0" />

          <!-- Left Eye Group with Eye-Tracking container -->
          <g class="eye-tracker-left" style="transform-origin: 74px 98px; transition: transform 0.08s ease-out;">
            <g class="eye-group eye-left" style="transform-origin: 74px 98px;">
              <ellipse class="eye-shape" cx="74" cy="98" rx="3.3" ry="5.0" fill="url(#${this.id}-eyeGrad)" transform="rotate(10 74 98)" style="opacity: ${isAudioResting ? 0 : 1};" />
              <path class="eye-arc" d="M 70 99 Q 74 93.5 78 99" fill="none" stroke="#352046" stroke-width="2.6" stroke-linecap="round" style="opacity: ${isAudioResting ? 1 : 0};" />
              <!-- Specular Glint -->
              <circle class="eye-glint" cx="75.6" cy="96" r="1.1" fill="#ffffff" style="opacity: ${isAudioResting ? 0 : 0.95};" />
              <!-- Sparkle Star for Excited -->
              <polygon class="eye-sparkle" points="74,94 75,97 78,97 75.5,99 76.5,102 74,100 71.5,102 72.5,99 70,97 73,97" fill="#ffffff" opacity="0" transform="scale(0.8) translate(19, 21)" />
            </g>
          </g>

          <!-- Right Eye Group with Eye-Tracking container -->
          <g class="eye-tracker-right" style="transform-origin: 106px 92px; transition: transform 0.08s ease-out;">
            <g class="eye-group eye-right" style="transform-origin: 106px 92px;">
              <ellipse class="eye-shape" cx="106" cy="92" rx="3.3" ry="5.0" fill="url(#${this.id}-eyeGrad)" transform="rotate(10 106 92)" style="opacity: ${isAudioResting ? 0 : 1};" />
              <path class="eye-arc" d="M 102 93.5 Q 106 88 110 93.5" fill="none" stroke="#352046" stroke-width="2.6" stroke-linecap="round" style="opacity: ${isAudioResting ? 1 : 0};" />
              <!-- Specular Glint -->
              <circle class="eye-glint" cx="107.6" cy="90" r="1.1" fill="#ffffff" style="opacity: ${isAudioResting ? 0 : 0.95};" />
              <!-- Sparkle Star for Excited -->
              <polygon class="eye-sparkle" points="106,88 107,91 110,91 107.5,93 108.5,96 106,94 103.5,96 104.5,93 102,91 105,91" fill="#ffffff" opacity="0" transform="scale(0.8) translate(26, 20)" />
            </g>
          </g>

          <!-- Tiny, Sweet, Delicate Smiling Mouth -->
          <path class="mascot-mouth" d="M 87.5 97.5 Q 90.2 101.5 93.5 97" fill="none" stroke="#352046" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" />
          <!-- Tongue for open smile -->
          <path class="mascot-tongue" d="M 88.5 101 Q 90.5 99 92.5 101 Q 90.5 103.5 88.5 101 Z" fill="#ff9ebb" opacity="0" />
        </g>

        <!-- Accessories (Glasses, Headphones, Hat, Monocle, Prism, Magnifier) -->
        <g class="mascot-accessories-layer">
          ${accessoriesMarkup}
        </g>

      </g>
    `;

    svgWrapper.appendChild(svg);
    card.appendChild(svgWrapper);

    // Glowing Pedestal Platform beneath the orb
    const pedestal = document.createElement('div');
    pedestal.className = 'mascot-pedestal';
    card.appendChild(pedestal);

    // Mascot Model Label (Strictly only the model name)
    const label = document.createElement('div');
    label.className = 'mascot-name';
    label.textContent = this.name;
    card.appendChild(label);

    this.container = card;
    this.svgElement = svg;
    this.gazeElement = svgWrapper;
    this.leftEyeTracker = svg.querySelector('.eye-tracker-left');
    this.rightEyeTracker = svg.querySelector('.eye-tracker-right');

    // Apply initial emotion state
    this.applyEmotion(this.currentEmotion, false);

    return card;
  }

  /**
   * Clone or mount the mascot SVG for the game overlay runner
   */
  createGameClone() {
    const clone = this.svgElement.cloneNode(true);
    clone.classList.add('runner-mascot-svg');
    return clone;
  }

  /**
   * Start animation loops
   */
  start() {
    if (this.isPaused) this.isPaused = false;
    this.scheduleBlink();
    this.startPersonalityBehaviors();

    // Start expression cycling after initial staggered offset
    this.startTimer = setTimeout(() => {
      if (!this.isPaused && !this.isReacting) this.cycleNextEmotion();
    }, this.timingOffset);
  }

  /**
   * Trigger a random delightful reaction on single click / tap
   */
  triggerRandomReaction() {
    if (this.isPaused) return;

    // Available reaction choices
    const choices = this.profile.reactions;
    const chosen = choices[Math.floor(Math.random() * choices.length)];

    this.triggerReaction(chosen);
  }

  /**
   * Play a specific short reaction animation, returning smoothly to idle
   */
  triggerReaction(reactionName) {
    if (!EMOTION_CONFIGS[reactionName]) return;

    this.isReacting = true;
    clearTimeout(this.cycleTimer);
    clearTimeout(this.reactionTimeout);

    // Card gentle pop bounce
    if (this.container) {
      this.container.classList.add('mascot-click-pop');
      this.scheduleMicro(() => this.container?.classList.remove('mascot-click-pop'), 400);
      this.container.setAttribute('data-emotion', reactionName);
    }

    this.applyEmotion(reactionName, true);

    // Return to calm idle after 1.5s
    this.reactionTimeout = setTimeout(() => {
      this.isReacting = false;
      if (!this.isPaused) {
        this.setEmotion('idle');
        this.cycleTimer = setTimeout(() => this.cycleNextEmotion(), this.durations.idle);
      }
    }, 1600);
  }

  showEmotionFor(emotionName, duration = 4000) {
    if (!EMOTION_CONFIGS[emotionName] || this.isPaused) return;
    clearTimeout(this.cycleTimer);
    clearTimeout(this.reactionTimeout);
    this.isReacting = true;
    this.setEmotion(emotionName);
    this.reactionTimeout = setTimeout(() => {
      this.isReacting = false;
      if (!this.isPaused) {
        this.setEmotion('idle');
        this.cycleTimer = setTimeout(() => this.cycleNextEmotion(), this.durations.idle);
      }
    }, duration);
  }

  /**
   * Eye tracking: subtly move pupils toward pointer
   * @param {number} pointerX - clientX
   * @param {number} pointerY - clientY
   */
  handlePointerMove(pointerX, pointerY) {
    if (!this.svgElement || this.isPaused || this.currentLocomotion !== 'idle') return;

    // Get center of this mascot card
    const rect = this.gazeElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height * (100 / 180);

    const { x: offsetX, y: offsetY } = gazeOffset(pointerX, pointerY, centerX, centerY);

    const leftTracker = this.leftEyeTracker;
    const rightTracker = this.rightEyeTracker;

    if (leftTracker && rightTracker) {
      leftTracker.style.transform = `translate(${offsetX.toFixed(2)}px, ${offsetY.toFixed(2)}px)`;
      rightTracker.style.transform = `translate(${offsetX.toFixed(2)}px, ${offsetY.toFixed(2)}px)`;
    }
  }

  /**
   * Reset eyes to center when pointer leaves
   */
  resetEyes() {
    if (!this.svgElement) return;
    const leftTracker = this.leftEyeTracker;
    const rightTracker = this.rightEyeTracker;
    if (leftTracker && rightTracker) {
      leftTracker.style.transform = 'translate(0px, 0px)';
      rightTracker.style.transform = 'translate(0px, 0px)';
    }
  }

  scheduleMicro(callback, delay) {
    const timer = setTimeout(() => {
      this.microTimers.delete(timer);
      if (!this.isPaused) callback();
    }, delay);
    this.microTimers.add(timer);
  }

  clearMicroTimers() {
    this.microTimers.forEach(clearTimeout);
    this.microTimers.clear();
    this.container?.classList.remove('mascot-click-pop');
    this.svgElement?.querySelector('.mascot-body-root')?.classList.remove('personality-audio-groove');
    this.svgElement?.querySelector('.accessory-prism')?.classList.remove('prism-thought-shimmer');
    this.svgElement?.querySelectorAll('.accessory-glasses, .accessory-hat, .accessory-magnifier, .mascot-inner-face, .eye-group').forEach(node => { node.style.transform = ''; });
  }

  /**
   * Pause animation loops
   */
  pause() {
    this.isPaused = true;
    clearTimeout(this.blinkTimer);
    clearTimeout(this.cycleTimer);
    clearTimeout(this.personalityTimer);
    clearTimeout(this.reactionTimeout);
    clearTimeout(this.startTimer);
    clearTimeout(this.blinkResetTimer);
    this.clearMicroTimers();
    this.resetEyes();
  }

  /**
   * Resume animation loops
   */
  resume() {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.scheduleBlink();
    this.startPersonalityBehaviors();
    this.cycleNextEmotion();
  }

  /**
   * Apply game locomotion state
   */
  setLocomotion(stateName) {
    this.currentLocomotion = stateName;
    applyLocomotionState(this, stateName);
  }

  /**
   * Schedule natural, organic blinking
   */
  scheduleBlink() {
    if (this.isPaused) return;
    const [minBlink, maxBlink] = this.profile.blink;
    const nextBlink = minBlink + Math.random() * (maxBlink - minBlink);
    this.blinkTimer = setTimeout(() => {
      if (!this.isPaused && !this.isReacting && (this.currentEmotion === 'idle' || this.currentEmotion === 'sad')) {
        this.performBlink();
      }
      this.scheduleBlink();
    }, nextBlink);
  }

  /**
   * Rapid natural blink
   */
  performBlink() {
    if (!this.svgElement || this.isPaused) return;
    if (this.id === 'lfm3-audio-2b' && this.currentEmotion === 'idle') return;

    const leftEye = this.svgElement.querySelector('.eye-left .eye-shape');
    const rightEye = this.svgElement.querySelector('.eye-right .eye-shape');
    const leftGlint = this.svgElement.querySelector('.eye-left .eye-glint');
    const rightGlint = this.svgElement.querySelector('.eye-right .eye-glint');

    if (leftEye && rightEye && leftEye.style.opacity !== '0') {
      leftEye.style.transform = 'scaleY(0.08)';
      rightEye.style.transform = 'scaleY(0.08)';
      if (leftGlint) leftGlint.style.opacity = '0';
      if (rightGlint) rightGlint.style.opacity = '0';

      this.blinkResetTimer = setTimeout(() => {
        if (!this.isPaused) {
          leftEye.style.transform = '';
          rightEye.style.transform = '';
          if (leftGlint) leftGlint.style.opacity = '0.95';
          if (rightGlint) rightGlint.style.opacity = '0.95';
        }
      }, 140);
    }
  }

  /**
   * Distinct Idle Personalities per character
   */
  startPersonalityBehaviors() {
    if (this.isPaused) return;

    const runPersonalityStep = () => {
      if (this.isPaused || this.isReacting || this.currentEmotion !== 'idle') {
        this.personalityTimer = setTimeout(runPersonalityStep, 3500);
        return;
      }

      switch (this.id) {
        case 'lfm3-vl-2b':
          this.triggerGlassesNudge();
          break;
        case 'lfm3-audio-2b':
          this.triggerAudioGroove();
          break;
        case 'lfm3-omni-2b':
          this.triggerOmniPerk();
          break;
        case 'd1-2b':
          this.triggerPrismShimmer();
          break;
        case 'd1-omni-2b':
          this.triggerDetectiveInspect();
          break;
        case 'lfm3-17b':
        default:
          this.triggerCuriousTilt();
          break;
      }

      const nextInterval = 4500 + Math.random() * 3000;
      this.personalityTimer = setTimeout(runPersonalityStep, nextInterval);
    };

    this.personalityTimer = setTimeout(runPersonalityStep, 2200 + this.timingOffset);
  }

  // --- Specific Personality Micro-Actions ---

  triggerCuriousTilt() {
    const face = this.svgElement?.querySelector('.mascot-inner-face');
    if (!face) return;
    face.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
    face.style.transform = 'rotate(4deg) translateY(-2px)';
    this.scheduleMicro(() => {
      if (face && this.currentEmotion === 'idle' && !this.isReacting) {
        face.style.transform = 'rotate(0deg) translateY(0px)';
      }
    }, 1200);
  }

  triggerGlassesNudge() {
    const glasses = this.svgElement?.querySelector('.accessory-glasses');
    const eyes = this.svgElement?.querySelectorAll('.eye-group');
    if (!glasses) return;
    eyes?.forEach(e => { e.style.transform = 'translateX(2px)'; });
    glasses.style.transition = 'transform 0.35s ease';
    glasses.style.transform = 'translateY(-2px) rotate(-1deg)';
    this.scheduleMicro(() => {
      glasses.style.transform = 'translateY(0) rotate(0deg)';
      eyes?.forEach(e => { e.style.transform = ''; });
    }, 900);
  }

  triggerAudioGroove() {
    const root = this.svgElement?.querySelector('.mascot-body-root');
    if (!root) return;
    root.classList.add('personality-audio-groove');
    this.scheduleMicro(() => {
      root.classList.remove('personality-audio-groove');
    }, 1800);
  }

  triggerOmniPerk() {
    const face = this.svgElement?.querySelector('.mascot-inner-face');
    const glasses = this.svgElement?.querySelector('.accessory-glasses');
    if (!face) return;
    face.style.transform = 'translateY(-2.5px) scale(1.02)';
    if (glasses) glasses.style.transform = 'translateY(-1.5px)';
    this.scheduleMicro(() => {
      if (face && this.currentEmotion === 'idle' && !this.isReacting) {
        face.style.transform = '';
        if (glasses) glasses.style.transform = '';
      }
    }, 1100);
  }

  triggerPrismShimmer() {
    const prism = this.svgElement?.querySelector('.accessory-prism');
    if (!prism) return;
    prism.classList.add('prism-thought-shimmer');
    this.scheduleMicro(() => {
      prism.classList.remove('prism-thought-shimmer');
    }, 1600);
  }

  triggerDetectiveInspect() {
    const hat = this.svgElement?.querySelector('.accessory-hat');
    const magnifier = this.svgElement?.querySelector('.accessory-magnifier');
    const face = this.svgElement?.querySelector('.mascot-inner-face');
    if (hat) hat.style.transform = 'rotate(-4deg) translateY(-1.5px)';
    if (magnifier) magnifier.style.transform = 'translate(5px, -3px) scale(1.06)';
    if (face) face.style.transform = 'rotate(-2deg) translate(-1px, 1.5px)';
    this.scheduleMicro(() => {
      if (hat) hat.style.transform = '';
      if (magnifier) magnifier.style.transform = '';
      if (face && this.currentEmotion === 'idle' && !this.isReacting) face.style.transform = '';
    }, 1400);
  }

  /**
   * Cycle to next emotion in the sequence
   */
  cycleNextEmotion() {
    if (this.isPaused || this.isReacting || this.currentLocomotion !== 'idle') return;
    this.sequenceIndex = (this.sequenceIndex + 1) % this.emotionSequence.length;
    const nextEmotion = this.emotionSequence[this.sequenceIndex];
    this.setEmotion(nextEmotion);

    const duration = this.durations[nextEmotion] || 3600;
    this.cycleTimer = setTimeout(() => {
      if (!this.isPaused && !this.isReacting) this.cycleNextEmotion();
    }, duration);
  }

  /**
   * Set emotion with smooth transition
   */
  setEmotion(emotionName) {
    if (!EMOTION_CONFIGS[emotionName]) return;
    this.currentEmotion = emotionName;
    if (this.container) {
      this.container.setAttribute('data-emotion', emotionName);
    }
    this.applyEmotion(emotionName, true);
  }

  /**
   * Apply SVG facial and accessory properties for given emotion
   */
  applyEmotion(emotionName, animate = true) {
    if (!this.svgElement) return;
    const config = EMOTION_CONFIGS[emotionName];
    if (!config) return;

    const svg = this.svgElement;
    const leftEyeShape = svg.querySelector('.eye-left .eye-shape');
    const rightEyeShape = svg.querySelector('.eye-right .eye-shape');
    const leftEyeArc = svg.querySelector('.eye-left .eye-arc');
    const rightEyeArc = svg.querySelector('.eye-right .eye-arc');
    const leftGlint = svg.querySelector('.eye-left .eye-glint');
    const rightGlint = svg.querySelector('.eye-right .eye-glint');
    const leftSparkle = svg.querySelector('.eye-left .eye-sparkle');
    const rightSparkle = svg.querySelector('.eye-right .eye-sparkle');

    const leftBrow = svg.querySelector('.eyebrow-left');
    const rightBrow = svg.querySelector('.eyebrow-right');
    const mouth = svg.querySelector('.mascot-mouth');
    const tongue = svg.querySelector('.mascot-tongue');
    const blushLeft = svg.querySelector('.blush-left');
    const blushRight = svg.querySelector('.blush-right');

    const faceRoot = svg.querySelector('.mascot-inner-face');

    // 1. Eyes configuration
    if (config.leftEye.type === 'arc' || (this.id === 'lfm3-audio-2b' && emotionName === 'idle' && !this.isReacting)) {
      if (leftEyeShape) leftEyeShape.style.opacity = '0';
      if (rightEyeShape) rightEyeShape.style.opacity = '0';
      if (leftEyeArc) {
        leftEyeArc.setAttribute('d', config.leftEye.d || 'M 70 99 Q 74 93.5 78 99');
        leftEyeArc.style.opacity = '1';
      }
      if (rightEyeArc) {
        rightEyeArc.setAttribute('d', config.rightEye.d || 'M 102 93.5 Q 106 88 110 93.5');
        rightEyeArc.style.opacity = '1';
      }
      if (leftGlint) leftGlint.style.opacity = '0';
      if (rightGlint) rightGlint.style.opacity = '0';
      if (leftSparkle) leftSparkle.style.opacity = '0';
      if (rightSparkle) rightSparkle.style.opacity = '0';
    } else {
      if (leftEyeShape) {
        leftEyeShape.setAttribute('rx', config.leftEye.rx);
        leftEyeShape.setAttribute('ry', config.leftEye.ry);
        leftEyeShape.setAttribute('cx', config.leftEye.cx);
        leftEyeShape.setAttribute('cy', config.leftEye.cy);
        leftEyeShape.setAttribute('transform', `rotate(${config.leftEye.rotation} ${config.leftEye.cx} ${config.leftEye.cy})`);
        leftEyeShape.style.opacity = '1';
      }
      if (rightEyeShape) {
        rightEyeShape.setAttribute('rx', config.rightEye.rx);
        rightEyeShape.setAttribute('ry', config.rightEye.ry);
        rightEyeShape.setAttribute('cx', config.rightEye.cx);
        rightEyeShape.setAttribute('cy', config.rightEye.cy);
        rightEyeShape.setAttribute('transform', `rotate(${config.rightEye.rotation} ${config.rightEye.cx} ${config.rightEye.cy})`);
        rightEyeShape.style.opacity = '1';
      }
      if (leftEyeArc) leftEyeArc.style.opacity = '0';
      if (rightEyeArc) rightEyeArc.style.opacity = '0';

      if (leftGlint) leftGlint.style.opacity = config.leftEye.glint ? '0.95' : '0';
      if (rightGlint) rightGlint.style.opacity = config.rightEye.glint ? '0.95' : '0';

      if (leftSparkle) leftSparkle.style.opacity = config.leftEye.sparkle ? '1' : '0';
      if (rightSparkle) rightSparkle.style.opacity = config.rightEye.sparkle ? '1' : '0';
    }

    // 2. Eyebrows
    if (config.eyebrows.visible) {
      if (leftBrow) {
        leftBrow.setAttribute('d', config.eyebrows.leftD);
        leftBrow.style.opacity = '0.85';
      }
      if (rightBrow) {
        rightBrow.setAttribute('d', config.eyebrows.rightD);
        rightBrow.style.opacity = '0.85';
      }
    } else {
      if (leftBrow) leftBrow.style.opacity = '0';
      if (rightBrow) rightBrow.style.opacity = '0';
    }

    // 3. Mouth & Tongue
    if (mouth) {
      mouth.setAttribute('d', config.mouth.d);
      mouth.setAttribute('fill', config.mouth.fill);
      mouth.setAttribute('stroke', config.mouth.stroke);
      mouth.setAttribute('stroke-width', config.mouth.strokeWidth);
    }
    if (tongue) {
      if (config.mouth.hasTongue) {
        tongue.setAttribute('d', config.mouth.tongueD);
        tongue.style.opacity = '1';
      } else {
        tongue.style.opacity = '0';
      }
    }

    // 4. Blush
    if (blushLeft) {
      blushLeft.style.opacity = config.blushOpacity;
      blushLeft.style.transform = `scale(${config.blushScale})`;
      blushLeft.style.transformOrigin = '68px 106px';
    }
    if (blushRight) {
      blushRight.style.opacity = config.blushOpacity;
      blushRight.style.transform = `scale(${config.blushScale})`;
      blushRight.style.transformOrigin = '112px 100px';
    }

    // 5. Head tilt
    if (faceRoot && this.currentLocomotion === 'idle') {
      faceRoot.style.transform = `rotate(${config.headTilt}deg)`;
    }
  }

  /**
   * Stop loops and cleanup
   */
  destroy() {
    this.isPaused = true;
    clearTimeout(this.blinkTimer);
    clearTimeout(this.cycleTimer);
    clearTimeout(this.personalityTimer);
    clearTimeout(this.reactionTimeout);
    clearTimeout(this.startTimer);
    clearTimeout(this.blinkResetTimer);
    this.clearMicroTimers();
  }
}
