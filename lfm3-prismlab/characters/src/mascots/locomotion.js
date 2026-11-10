/**
 * Locomotion Profiles & Game Animation States for PrismLab Mascots
 * Upgraded High-Fidelity: Plump, pillowy face, tiny sweet expressions, accessory physics
 * States: idle, run, takeoff, jump, land, hurt, victory
 */

export const LOCOMOTION_CONFIGS = {
  // 1. LFM3-1.7B: Light, bouncy, floaty runner
  'lfm3-17b': {
    strideRate: 1.0,
    runTilt: 4,
    jumpTilt: -5,
    landSquash: 'scale(1.12, 0.88)',
    accessoryRunClass: '',
  },

  // 2. LFM3-VL-2B: Determined scurry, glasses jiggling with forward focus
  'lfm3-vl-2b': {
    strideRate: 1.06,
    runTilt: 5,
    jumpTilt: -4,
    landSquash: 'scale(1.14, 0.86)',
    accessoryRunClass: 'runner-glasses-jiggle',
  },

  // 3. LFM3-Audio-2B: Rhythmic musical jog in sync with pulsing headphones
  'lfm3-audio-2b': {
    strideRate: 0.96,
    runTilt: 3,
    jumpTilt: -5,
    landSquash: 'scale(1.13, 0.87)',
    accessoryRunClass: 'runner-headphones-beat',
  },

  // 4. LFM3-Omni-2B: Dynamic stride combining both audio rhythm and observant focus
  'lfm3-omni-2b': {
    strideRate: 1.02,
    runTilt: 4.5,
    jumpTilt: -5,
    landSquash: 'scale(1.13, 0.87)',
    accessoryRunClass: 'runner-omni-stride',
  },

  // 5. d1-2B: Steady, analytical glide; thought prism trailing smoothly behind
  'd1-2b': {
    strideRate: 0.98,
    runTilt: 3.5,
    jumpTilt: -4,
    landSquash: 'scale(1.12, 0.88)',
    accessoryRunClass: 'runner-prism-trail',
  },

  // 6. d1-Omni-2B: Low detective dash; magnifying glass held forward, hat tilted into the wind
  'd1-omni-2b': {
    strideRate: 1.05,
    runTilt: 5.5,
    jumpTilt: -6,
    landSquash: 'scale(1.15, 0.85)',
    accessoryRunClass: 'runner-detective-dash',
  }
};

/**
 * Apply locomotion visual state to mascot character SVG elements
 */
export function applyLocomotionState(character, stateName) {
  if (!character || !character.svgElement) return;
  const svg = character.svgElement;
  const bodyRoot = svg.querySelector('.mascot-body-root');
  const faceRoot = svg.querySelector('.mascot-inner-face');
  const mouth = svg.querySelector('.mascot-mouth');
  const tongue = svg.querySelector('.mascot-tongue');
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

  const profile = LOCOMOTION_CONFIGS[character.id] || LOCOMOTION_CONFIGS['lfm3-17b'];

  // Clear previous locomotion classes on bodyRoot
  bodyRoot.classList.remove('loco-run', 'loco-takeoff', 'loco-jump', 'loco-dodge', 'loco-land', 'loco-hurt', 'loco-victory');
  bodyRoot.classList.add(`loco-${stateName}`);

  switch (stateName) {
    case 'run':
      // Sweet, determined running expression
      if (leftEyeShape && rightEyeShape) {
        leftEyeShape.style.opacity = '1';
        rightEyeShape.style.opacity = '1';
        leftEyeShape.setAttribute('rx', '3.3');
        leftEyeShape.setAttribute('ry', '4.8');
        rightEyeShape.setAttribute('rx', '3.3');
        rightEyeShape.setAttribute('ry', '4.8');
      }
      if (leftEyeArc) leftEyeArc.style.opacity = '0';
      if (rightEyeArc) rightEyeArc.style.opacity = '0';
      if (leftGlint) leftGlint.style.opacity = '0.95';
      if (rightGlint) rightGlint.style.opacity = '0.95';
      if (leftSparkle) leftSparkle.style.opacity = '0';
      if (rightSparkle) rightSparkle.style.opacity = '0';

      if (leftBrow) leftBrow.style.opacity = '0';
      if (rightBrow) rightBrow.style.opacity = '0';

      // Sweet running smile
      if (mouth) {
        mouth.setAttribute('d', 'M 87.5 97.5 Q 90.2 102 93.5 97');
        mouth.setAttribute('fill', 'none');
        mouth.setAttribute('stroke', '#352046');
        mouth.setAttribute('stroke-width', '2.1');
      }
      if (tongue) tongue.style.opacity = '0';
      if (faceRoot) faceRoot.style.transform = `rotate(${profile.runTilt}deg)`;
      break;

    case 'takeoff':
      // Quick anticipatory crouch / squash
      bodyRoot.style.transform = 'scale(1.15, 0.85)';
      if (faceRoot) faceRoot.style.transform = 'translateY(1.5px)';
      break;

    case 'jump':
      // Character-specific leap pose
      bodyRoot.style.transform = 'scale(0.92, 1.1) rotate(-3deg)';
      if (faceRoot) faceRoot.style.transform = `rotate(${profile.jumpTilt}deg)`;

      if (character.id.includes('audio')) {
        // Audio mascot: Joyful musical leap with singing smile
        if (leftEyeShape) leftEyeShape.style.opacity = '0';
        if (rightEyeShape) rightEyeShape.style.opacity = '0';
        if (leftEyeArc) {
          leftEyeArc.setAttribute('d', 'M 70 98 Q 74 92 78 98');
          leftEyeArc.style.opacity = '1';
        }
        if (rightEyeArc) {
          rightEyeArc.setAttribute('d', 'M 102 92.5 Q 106 86.5 110 92.5');
          rightEyeArc.style.opacity = '1';
        }
        if (mouth) {
          mouth.setAttribute('d', 'M 87 96.5 Q 90.5 103 94 96.5 Z');
          mouth.setAttribute('fill', '#352046');
        }
      } else {
        // Alert, excited upward leap
        if (leftEyeShape && rightEyeShape) {
          leftEyeShape.style.opacity = '1';
          rightEyeShape.style.opacity = '1';
          leftEyeShape.setAttribute('rx', '3.8');
          leftEyeShape.setAttribute('ry', '5.4');
          rightEyeShape.setAttribute('rx', '3.8');
          rightEyeShape.setAttribute('ry', '5.4');
        }
        if (leftEyeArc) leftEyeArc.style.opacity = '0';
        if (rightEyeArc) rightEyeArc.style.opacity = '0';
        if (leftGlint) leftGlint.style.opacity = '1';
        if (rightGlint) rightGlint.style.opacity = '1';
        if (mouth) {
          mouth.setAttribute('d', 'M 88 97.5 A 2.6 3.2 0 1 0 93.2 97.5 A 2.6 3.2 0 1 0 88 97.5 Z');
          mouth.setAttribute('fill', '#352046');
        }
      }
      break;

    case 'dodge':
      // Flattened duck / slide pose under obstacles
      bodyRoot.style.transform = 'scale(1.36, 0.62) translateY(14px)';
      if (faceRoot) faceRoot.style.transform = `scale(1.2, 0.7) translateY(8px) rotate(${profile.runTilt * 0.5}deg)`;

      // Eyes: squished focused or charming curved arcs
      if (character.id.includes('audio') || character.id.includes('17b')) {
        if (leftEyeShape) leftEyeShape.style.opacity = '0';
        if (rightEyeShape) rightEyeShape.style.opacity = '0';
        if (leftEyeArc) {
          leftEyeArc.setAttribute('d', 'M 70 100 Q 74 94 78 100');
          leftEyeArc.style.opacity = '1';
        }
        if (rightEyeArc) {
          rightEyeArc.setAttribute('d', 'M 102 94.5 Q 106 88.5 110 94.5');
          rightEyeArc.style.opacity = '1';
        }
      } else {
        // Observant, intense squint for reasoning/detective/vision
        if (leftEyeShape && rightEyeShape) {
          leftEyeShape.style.opacity = '1';
          rightEyeShape.style.opacity = '1';
          leftEyeShape.setAttribute('rx', '3.6');
          leftEyeShape.setAttribute('ry', '2.5');
          rightEyeShape.setAttribute('rx', '3.6');
          rightEyeShape.setAttribute('ry', '2.5');
        }
        if (leftEyeArc) leftEyeArc.style.opacity = '0';
        if (rightEyeArc) rightEyeArc.style.opacity = '0';
      }

      if (leftBrow && rightBrow) {
        leftBrow.setAttribute('d', 'M 71 91 Q 74 90 78 91');
        rightBrow.setAttribute('d', 'M 102 87 Q 106 86 110 87');
        leftBrow.style.opacity = '0.7';
        rightBrow.style.opacity = '0.7';
      }

      // Grin / determined mouth
      if (mouth) {
        mouth.setAttribute('d', 'M 87 99 Q 90.5 102.5 94 99');
        mouth.setAttribute('fill', 'none');
        mouth.setAttribute('stroke', '#352046');
        mouth.setAttribute('stroke-width', '2.2');
      }
      if (tongue) tongue.style.opacity = '0';
      break;

    case 'land':
      // Ground impact squash
      bodyRoot.style.transform = profile.landSquash;
      if (faceRoot) faceRoot.style.transform = 'translateY(2px)';
      break;

    case 'hurt':
      // Collision / Game Over: gentle sad droop
      bodyRoot.style.transform = 'rotate(-10deg) translateY(3px)';
      if (leftEyeShape && rightEyeShape) {
        leftEyeShape.style.opacity = '1';
        rightEyeShape.style.opacity = '1';
        leftEyeShape.setAttribute('rx', '2.9');
        leftEyeShape.setAttribute('ry', '3.9');
        rightEyeShape.setAttribute('rx', '2.9');
        rightEyeShape.setAttribute('ry', '3.9');
      }
      if (leftBrow && rightBrow) {
        leftBrow.setAttribute('d', 'M 71 92 Q 74 93.5 78 94');
        rightBrow.setAttribute('d', 'M 102 90 Q 105 89 109 87.5');
        leftBrow.style.opacity = '0.9';
        rightBrow.style.opacity = '0.9';
      }
      if (mouth) {
        // Downturned pout
        mouth.setAttribute('d', 'M 87.5 101 Q 90.2 97.5 93.5 101');
        mouth.setAttribute('fill', 'none');
        mouth.setAttribute('stroke', '#352046');
        mouth.setAttribute('stroke-width', '2.2');
      }
      if (tongue) tongue.style.opacity = '0';
      break;

    case 'victory':
      // 100-point milestone celebration
      bodyRoot.style.transform = 'translateY(-10px) scale(1.04, 0.96) rotate(3deg)';
      if (leftEyeShape) leftEyeShape.style.opacity = '0';
      if (rightEyeShape) rightEyeShape.style.opacity = '0';
      if (leftEyeArc) {
        leftEyeArc.setAttribute('d', 'M 70 99 Q 74 93.5 78 99');
        leftEyeArc.style.opacity = '1';
      }
      if (rightEyeArc) {
        rightEyeArc.setAttribute('d', 'M 102 93.5 Q 106 88 110 93.5');
        rightEyeArc.style.opacity = '1';
      }
      if (leftSparkle) leftSparkle.style.opacity = '1';
      if (rightSparkle) rightSparkle.style.opacity = '1';
      if (mouth) {
        mouth.setAttribute('d', 'M 87 97 Q 90.5 103.5 94 96.5 Z');
        mouth.setAttribute('fill', '#352046');
      }
      if (tongue) {
        tongue.setAttribute('d', 'M 88.5 101 Q 90.5 99 92.5 101 Q 90.5 103.5 88.5 101 Z');
        tongue.style.opacity = '1';
      }
      break;

    case 'idle':
    default:
      bodyRoot.style.transform = '';
      if (faceRoot) faceRoot.style.transform = '';
      character.applyEmotion('idle', true);
      break;
  }
}
