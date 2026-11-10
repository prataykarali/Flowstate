/**
 * Emotion & Reaction Definitions for PrismLab Mascots
 * Core Emotions: idle, happy, sad, angry, excited
 * Micro-Reactions: surprised, curious, shy, sleepy, confused, proud, wink, thinking
 */

export const EMOTIONS = ['idle', 'happy', 'sad', 'angry', 'excited'];

export const REACTIONS = [
  'surprised',
  'curious',
  'shy',
  'sleepy',
  'confused',
  'proud',
  'wink',
  'thinking'
];

export const EMOTION_CONFIGS = {
  // --- CORE EMOTIONS ---
  idle: {
    name: 'Idle',
    bodyTransform: 'translate(0, 0) rotate(0)',
    headTilt: 0,
    blushOpacity: 0.38,
    blushScale: 1.0,
    leftEye: {
      type: 'oval',
      cx: 74,
      cy: 98,
      rx: 3.3,
      ry: 5.0,
      rotation: 10,
      glint: true,
      sparkle: false
    },
    rightEye: {
      type: 'oval',
      cx: 106,
      cy: 92,
      rx: 3.3,
      ry: 5.0,
      rotation: 10,
      glint: true,
      sparkle: false
    },
    eyebrows: {
      visible: false,
      leftD: 'M 71 89 Q 74 88 78 89',
      rightD: 'M 102 85 Q 106 84 110 85'
    },
    mouth: {
      d: 'M 87.5 97.5 Q 90.2 101.5 93.5 97',
      fill: 'none',
      stroke: '#352046',
      strokeWidth: 2.1,
      hasTongue: false
    }
  },

  happy: {
    name: 'Happy',
    bodyTransform: 'translate(0, -6px) scale(1.02, 0.98)',
    headTilt: 2,
    blushOpacity: 0.65,
    blushScale: 1.25,
    leftEye: {
      type: 'arc',
      d: 'M 70 99 Q 74 93.5 78 99',
      strokeWidth: 2.6,
      glint: false,
      sparkle: false
    },
    rightEye: {
      type: 'arc',
      d: 'M 102 93.5 Q 106 88 110 93.5',
      strokeWidth: 2.6,
      glint: false,
      sparkle: false
    },
    eyebrows: {
      visible: false,
      leftD: 'M 71 88 Q 74 86 78 88',
      rightD: 'M 102 84 Q 106 82 110 84'
    },
    mouth: {
      d: 'M 87 97 Q 90.5 103.5 94 96.5 Z',
      fill: '#352046',
      stroke: '#352046',
      strokeWidth: 1.5,
      hasTongue: true,
      tongueD: 'M 88.5 101 Q 90.5 99 92.5 101 Q 90.5 103.5 88.5 101 Z'
    }
  },

  sad: {
    name: 'Sad',
    bodyTransform: 'translate(0, 3px) rotate(-1.5deg)',
    headTilt: -2.5,
    blushOpacity: 0.2,
    blushScale: 0.9,
    leftEye: {
      type: 'droop',
      cx: 74,
      cy: 99.5,
      rx: 3.1,
      ry: 4.4,
      rotation: 18,
      glint: true,
      sparkle: false
    },
    rightEye: {
      type: 'droop',
      cx: 106,
      cy: 93.5,
      rx: 3.1,
      ry: 4.4,
      rotation: 18,
      glint: true,
      sparkle: false
    },
    eyebrows: {
      visible: true,
      leftD: 'M 71 91 Q 74 92.5 78 93',
      rightD: 'M 102 89 Q 105 88 109 86.5'
    },
    mouth: {
      d: 'M 87.5 100.5 Q 90.5 97.5 93.5 100.5',
      fill: 'none',
      stroke: '#352046',
      strokeWidth: 2.1,
      hasTongue: false
    }
  },

  angry: {
    name: 'Angry',
    bodyTransform: 'translate(0, 1px) scale(0.99, 1.01)',
    headTilt: -1,
    blushOpacity: 0.45,
    blushScale: 1.1,
    leftEye: {
      type: 'narrow',
      cx: 74,
      cy: 98.5,
      rx: 3.3,
      ry: 4.0,
      rotation: 5,
      glint: false,
      sparkle: false
    },
    rightEye: {
      type: 'narrow',
      cx: 106,
      cy: 92.5,
      rx: 3.3,
      ry: 4.0,
      rotation: 5,
      glint: false,
      sparkle: false
    },
    eyebrows: {
      visible: true,
      leftD: 'M 72 91 L 78 93.5',
      rightD: 'M 102 91 L 108 88'
    },
    mouth: {
      d: 'M 87.5 99.5 Q 90.5 98.5 93.5 99.5',
      fill: 'none',
      stroke: '#352046',
      strokeWidth: 2.2,
      hasTongue: false
    }
  },

  excited: {
    name: 'Excited',
    bodyTransform: 'translate(0, -8px) scale(1.03, 0.97) rotate(2deg)',
    headTilt: 3,
    blushOpacity: 0.7,
    blushScale: 1.3,
    leftEye: {
      type: 'sparkle',
      cx: 74,
      cy: 97,
      rx: 3.6,
      ry: 5.4,
      rotation: 8,
      glint: false,
      sparkle: true
    },
    rightEye: {
      type: 'sparkle',
      cx: 106,
      cy: 91,
      rx: 3.6,
      ry: 5.4,
      rotation: 8,
      glint: false,
      sparkle: true
    },
    eyebrows: {
      visible: true,
      leftD: 'M 71 87 Q 74 84 78 87',
      rightD: 'M 102 83 Q 106 80 110 83'
    },
    mouth: {
      d: 'M 86.5 96.5 Q 90.5 104 94.5 96 Z',
      fill: '#352046',
      stroke: '#352046',
      strokeWidth: 1.5,
      hasTongue: true,
      tongueD: 'M 88 100.5 Q 90.5 98 93 100.5 Q 90.5 103 88 100.5 Z'
    }
  },

  // --- SHORT CLICK/TAP MICRO-REACTIONS ---

  surprised: {
    name: 'Surprised',
    bodyTransform: 'translate(0, -5px) scale(0.97, 1.04)',
    headTilt: 0,
    blushOpacity: 0.5,
    blushScale: 1.2,
    leftEye: {
      type: 'oval',
      cx: 74,
      cy: 97,
      rx: 4.0,
      ry: 5.8,
      rotation: 8,
      glint: true,
      sparkle: false
    },
    rightEye: {
      type: 'oval',
      cx: 106,
      cy: 91,
      rx: 4.0,
      ry: 5.8,
      rotation: 8,
      glint: true,
      sparkle: false
    },
    eyebrows: {
      visible: true,
      leftD: 'M 70 85 Q 74 82 78 85',
      rightD: 'M 102 81 Q 106 78 110 81'
    },
    mouth: {
      // Tiny surprised 'o'
      d: 'M 88.5 98.5 A 2.5 3.2 0 1 0 92.5 98.5 A 2.5 3.2 0 1 0 88.5 98.5 Z',
      fill: '#352046',
      stroke: '#352046',
      strokeWidth: 1.2,
      hasTongue: false
    }
  },

  curious: {
    name: 'Curious',
    bodyTransform: 'translate(1px, -3px) rotate(5deg)',
    headTilt: 6,
    blushOpacity: 0.45,
    blushScale: 1.05,
    leftEye: {
      type: 'oval',
      cx: 74,
      cy: 97.5,
      rx: 3.5,
      ry: 5.2,
      rotation: 14,
      glint: true,
      sparkle: false
    },
    rightEye: {
      type: 'oval',
      cx: 106,
      cy: 91,
      rx: 3.2,
      ry: 4.6,
      rotation: 14,
      glint: true,
      sparkle: false
    },
    eyebrows: {
      visible: true,
      leftD: 'M 71 87 Q 74 85 78 87',
      rightD: 'M 102 84 Q 106 83 110 85'
    },
    mouth: {
      d: 'M 88 98 Q 91 100 94 97.5',
      fill: 'none',
      stroke: '#352046',
      strokeWidth: 2.1,
      hasTongue: false
    }
  },

  shy: {
    name: 'Shy',
    bodyTransform: 'translate(0, 2px) rotate(-2deg)',
    headTilt: -3,
    blushOpacity: 0.75,
    blushScale: 1.45,
    leftEye: {
      type: 'droop',
      cx: 73,
      cy: 99,
      rx: 3.0,
      ry: 4.2,
      rotation: 16,
      glint: true,
      sparkle: false
    },
    rightEye: {
      type: 'droop',
      cx: 105,
      cy: 93,
      rx: 3.0,
      ry: 4.2,
      rotation: 16,
      glint: true,
      sparkle: false
    },
    eyebrows: {
      visible: false,
      leftD: 'M 71 89 Q 74 88 78 89',
      rightD: 'M 102 85 Q 106 84 110 85'
    },
    mouth: {
      d: 'M 88 98.5 Q 90.5 100 93 98',
      fill: 'none',
      stroke: '#352046',
      strokeWidth: 2.0,
      hasTongue: false
    }
  },

  sleepy: {
    name: 'Sleepy',
    bodyTransform: 'translate(0, 3px) scale(1.02, 0.98)',
    headTilt: -2,
    blushOpacity: 0.3,
    blushScale: 1.0,
    leftEye: {
      type: 'droop',
      cx: 74,
      cy: 99.5,
      rx: 3.4,
      ry: 2.8,
      rotation: 10,
      glint: false,
      sparkle: false
    },
    rightEye: {
      type: 'droop',
      cx: 106,
      cy: 93.5,
      rx: 3.4,
      ry: 2.8,
      rotation: 10,
      glint: false,
      sparkle: false
    },
    eyebrows: {
      visible: false,
      leftD: 'M 71 89 Q 74 88 78 89',
      rightD: 'M 102 85 Q 106 84 110 85'
    },
    mouth: {
      // Tiny yawn/sigh
      d: 'M 88.5 98 Q 90.5 101.5 92.5 98 Z',
      fill: '#352046',
      stroke: '#352046',
      strokeWidth: 1.2,
      hasTongue: false
    }
  },

  confused: {
    name: 'Confused',
    bodyTransform: 'translate(-1px, 0px) rotate(-4deg)',
    headTilt: -4,
    blushOpacity: 0.35,
    blushScale: 1.0,
    leftEye: {
      type: 'oval',
      cx: 74,
      cy: 97.5,
      rx: 3.6,
      ry: 5.2,
      rotation: 6,
      glint: true,
      sparkle: false
    },
    rightEye: {
      type: 'narrow',
      cx: 106,
      cy: 92.5,
      rx: 3.0,
      ry: 3.8,
      rotation: 8,
      glint: true,
      sparkle: false
    },
    eyebrows: {
      visible: true,
      leftD: 'M 71 86 Q 74 84 78 86',
      rightD: 'M 102 87 Q 106 89 110 88'
    },
    mouth: {
      // Tiny wavy question curve
      d: 'M 87.5 98 Q 89.5 96 91 98 Q 92.5 100 94 97.5',
      fill: 'none',
      stroke: '#352046',
      strokeWidth: 2.0,
      hasTongue: false
    }
  },

  proud: {
    name: 'Proud',
    bodyTransform: 'translate(0, -6px) scale(1.03, 0.97)',
    headTilt: 1,
    blushOpacity: 0.65,
    blushScale: 1.3,
    leftEye: {
      type: 'arc',
      d: 'M 70 98 Q 74 93 78 98',
      strokeWidth: 2.6,
      glint: false,
      sparkle: false
    },
    rightEye: {
      type: 'arc',
      d: 'M 102 92.5 Q 106 87.5 110 92.5',
      strokeWidth: 2.6,
      glint: false,
      sparkle: false
    },
    eyebrows: {
      visible: false,
      leftD: 'M 71 88 Q 74 86 78 88',
      rightD: 'M 102 84 Q 106 82 110 84'
    },
    mouth: {
      // Confident cat smile 'w' curve
      d: 'M 87 97.5 Q 89 100 90.5 98 Q 92 100 94 97',
      fill: 'none',
      stroke: '#352046',
      strokeWidth: 2.1,
      hasTongue: false
    }
  },

  wink: {
    name: 'Wink',
    bodyTransform: 'translate(0, -3px) rotate(2deg)',
    headTilt: 2,
    blushOpacity: 0.6,
    blushScale: 1.25,
    leftEye: {
      // Winking closed arc
      type: 'arc',
      d: 'M 70 99 Q 74 94 78 99',
      strokeWidth: 2.8,
      glint: false,
      sparkle: false
    },
    rightEye: {
      // Sparkling open eye
      type: 'sparkle',
      cx: 106,
      cy: 91,
      rx: 3.6,
      ry: 5.4,
      rotation: 8,
      glint: false,
      sparkle: true
    },
    eyebrows: {
      visible: true,
      leftD: 'M 71 90 Q 74 89 78 90',
      rightD: 'M 102 83 Q 106 80 110 83'
    },
    mouth: {
      d: 'M 87.5 97 Q 90.5 102.5 94 96.5 Z',
      fill: '#352046',
      stroke: '#352046',
      strokeWidth: 1.4,
      hasTongue: true,
      tongueD: 'M 89 100.5 Q 90.8 99 92.5 100.5 Z'
    }
  },

  thinking: {
    name: 'Thinking',
    bodyTransform: 'translate(0, -2px) rotate(3deg)',
    headTilt: 4,
    blushOpacity: 0.4,
    blushScale: 1.1,
    leftEye: {
      type: 'oval',
      cx: 75,
      cy: 96,
      rx: 3.2,
      ry: 4.8,
      rotation: 12,
      glint: true,
      sparkle: false
    },
    rightEye: {
      type: 'oval',
      cx: 107,
      cy: 90,
      rx: 3.2,
      ry: 4.8,
      rotation: 12,
      glint: true,
      sparkle: false
    },
    eyebrows: {
      visible: true,
      leftD: 'M 71 87 Q 74 86 78 88',
      rightD: 'M 102 83 Q 106 81 110 83'
    },
    mouth: {
      d: 'M 88 98 Q 91 97 93.5 98.5',
      fill: 'none',
      stroke: '#352046',
      strokeWidth: 2.1,
      hasTongue: false
    }
  }
};
