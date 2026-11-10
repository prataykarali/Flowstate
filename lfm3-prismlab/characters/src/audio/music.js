/**
 * PrismLab Mascots - Synthesized Audio & Music Engine
 *
 * Fully synthesized Web Audio API sound system delivering:
 * 1. Retro synthwave background music loop (Am - F - C - G):
 *    - Detuned sawtooth pad with gentle analog lowpass filter
 *    - Warm, mellow triangle-wave bassline following chord roots
 *    - Melodic triangle arpeggio with tape-style filtered delay
 * 2. Short, punchy synthesized sound effects:
 *    - playJumpSfx: quick ascending chirp (sine sweep ~200-600Hz, 100ms)
 *    - playDodgeSfx: low whoosh (filtered noise burst, 80ms)
 *    - playMilestoneSfx: sparkly ascending arpeggio (3 quick notes)
 *    - playGameOverSfx: descending sad tone (saw wave pitch drop, 300ms)
 *    - playClickSfx: soft pop (800Hz sine blip, 40ms)
 *
 * No external audio files or dependencies required.
 */

// --- 96 BPM Synthwave Musical Structure ---
const BPM = 96;
const BEAT_DURATION = 60 / BPM;              // 0.625s per beat
const BAR_DURATION = BEAT_DURATION * 4;       // 2.500s per 4/4 bar
const LOOKAHEAD_MS = 40;                      // Scheduler poll frequency (ms)
const SCHEDULE_AHEAD_SEC = 0.35;              // Lookahead horizon (s)

/** Progression: Am -> F -> C -> G with pad voicings, root frequencies, and 8th-note arp lines */
const CHORD_PROGRESSION = [
  { name: 'Am', pad: [220.00, 261.63, 329.63, 392.00], bassRoot: 110.00, arp: [440.00, 523.25, 659.25, 880.00, 659.25, 523.25, 587.33, 659.25] },
  { name: 'F',  pad: [174.61, 220.00, 261.63, 329.63], bassRoot: 87.31,  arp: [349.23, 440.00, 523.25, 698.46, 523.25, 440.00, 392.00, 440.00] },
  { name: 'C',  pad: [130.81, 196.00, 261.63, 329.63], bassRoot: 65.41,  arp: [392.00, 523.25, 659.25, 783.99, 659.25, 523.25, 587.33, 659.25] },
  { name: 'G',  pad: [196.00, 246.94, 293.66, 392.00], bassRoot: 98.00,  arp: [392.00, 493.88, 587.33, 783.99, 587.33, 493.88, 440.00, 493.88] }
];

// --- Engine State & Node References ---
let audioCtx = null, masterGain = null, sfxGain = null, bgmGain = null;
let leadBusGain = null, delayNode = null, delayFeedback = null, delayFilter = null;
let isPlayingBgm = false, sfxEnabled = true, masterVolume = 0.75;
let schedulerTimer = null, currentBarIndex = 0, nextBarTime = 0;
const activeBgmNodes = new Set();
let cachedNoiseBuffer = null;

/** Initializes AudioContext and gain graph on user gesture. */
export function initAudio() {
  if (audioCtx) {
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return audioCtx;
  }
  const AudioContextClass = typeof window !== 'undefined'
    ? (window.AudioContext || window.webkitAudioContext)
    : (typeof AudioContext !== 'undefined' ? AudioContext : null);
  if (!AudioContextClass) return null;

  try {
    audioCtx = new AudioContextClass();
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(masterVolume, audioCtx.currentTime);
    masterGain.connect(audioCtx.destination);

    sfxGain = audioCtx.createGain();
    sfxGain.gain.setValueAtTime(sfxEnabled ? 1 : 0, audioCtx.currentTime);
    sfxGain.connect(masterGain);

    bgmGain = audioCtx.createGain();
    bgmGain.gain.setValueAtTime(1, audioCtx.currentTime);
    bgmGain.connect(masterGain);
    return audioCtx;
  } catch (_) { return null; }
}

/** Configures vintage tape delay effect for the lead arpeggio. */
function setupLeadDelayNetwork(ctx) {
  try {
    leadBusGain?.disconnect(); delayNode?.disconnect();
    delayFeedback?.disconnect(); delayFilter?.disconnect();
  } catch (_) {}
  leadBusGain = ctx.createGain();
  delayNode = ctx.createDelay(1.5);
  delayNode.delayTime.setValueAtTime(BEAT_DURATION * 0.75, ctx.currentTime); // Dotted 8th delay
  delayFilter = ctx.createBiquadFilter();
  delayFilter.type = 'lowpass';
  delayFilter.frequency.setValueAtTime(1600, ctx.currentTime); // Warm analog roll-off
  delayFeedback = ctx.createGain();
  delayFeedback.gain.setValueAtTime(0.35, ctx.currentTime);

  leadBusGain.connect(bgmGain); // Dry path
  leadBusGain.connect(delayNode); // Wet delay loop
  delayNode.connect(delayFilter);
  delayFilter.connect(delayFeedback);
  delayFeedback.connect(delayNode);
  delayFilter.connect(bgmGain);
}

function registerBgmNode(node) {
  activeBgmNodes.add(node);
  node.onended = () => { activeBgmNodes.delete(node); try { node.disconnect(); } catch (_) {} };
}

function cleanUpBgmNodes() {
  for (const node of activeBgmNodes) {
    try { if (typeof node.stop === 'function') node.stop(); } catch (_) {}
    try { node.disconnect(); } catch (_) {}
  }
  activeBgmNodes.clear();
}

function getNoiseBuffer(ctx) {
  if (cachedNoiseBuffer && cachedNoiseBuffer.sampleRate === ctx.sampleRate) return cachedNoiseBuffer;
  try {
    const size = Math.floor(ctx.sampleRate * 0.1);
    const buf = ctx.createBuffer(1, size, ctx.sampleRate), data = buf.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
    return (cachedNoiseBuffer = buf);
  } catch (_) { return null; }
}

// --- Voice Synthesis Schedulers ---

/** Soft pad chord using detuned sawtooth waves with gentle lowpass filter. */
function schedulePadChord(chord, startTime) {
  if (!audioCtx || !bgmGain) return;
  const chordGain = audioCtx.createGain();
  chordGain.gain.setValueAtTime(0.0001, startTime);
  chordGain.gain.linearRampToValueAtTime(0.10, startTime + 0.45);
  chordGain.gain.setValueAtTime(0.10, startTime + BAR_DURATION - 0.35);
  chordGain.gain.linearRampToValueAtTime(0.0001, startTime + BAR_DURATION + 0.35);

  const padFilter = audioCtx.createBiquadFilter();
  padFilter.type = 'lowpass';
  padFilter.frequency.setValueAtTime(750, startTime);
  padFilter.Q.setValueAtTime(1.2, startTime);
  chordGain.connect(padFilter);
  padFilter.connect(bgmGain);

  for (const freq of chord.pad) {
    for (const detune of [-8, 8]) {
      const osc = audioCtx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.detune.setValueAtTime(detune, startTime);
      osc.connect(chordGain);
      osc.start(startTime);
      osc.stop(startTime + BAR_DURATION + 0.4);
      registerBgmNode(osc);
    }
  }
}

/** Mellow triangle bassline following chord root notes with 8th-note pulse. */
function scheduleBassline(chord, startTime) {
  if (!audioCtx || !bgmGain) return;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(260, startTime);
  filter.Q.setValueAtTime(1.8, startTime);
  filter.connect(bgmGain);

  const stepDuration = BEAT_DURATION / 2;
  for (let i = 0; i < 8; i++) {
    const t = startTime + i * stepDuration;
    const freq = (i === 3 || i === 7) ? chord.bassRoot * 2 : chord.bassRoot;
    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    const peak = (i % 2 === 0) ? 0.20 : 0.14;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + stepDuration * 0.92);

    osc.connect(gain);
    gain.connect(filter);
    osc.start(t);
    osc.stop(t + stepDuration);
    registerBgmNode(osc);
  }
}

/** Melodic arpeggio using triangle waves routed into the delay bus. */
function scheduleArpeggio(chord, startTime) {
  if (!audioCtx || !leadBusGain) return;
  const stepDuration = BEAT_DURATION / 2;
  chord.arp.forEach((freq, idx) => {
    const t = startTime + idx * stepDuration;
    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.075, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + stepDuration * 0.85);

    osc.connect(gain);
    gain.connect(leadBusGain);
    osc.start(t);
    osc.stop(t + stepDuration);
    registerBgmNode(osc);
  });
}

/** Continuous lookahead scheduler for seamless looping. */
function schedulerLoop() {
  if (!isPlayingBgm || !audioCtx) return;
  while (nextBarTime < audioCtx.currentTime + SCHEDULE_AHEAD_SEC) {
    const chord = CHORD_PROGRESSION[currentBarIndex];
    schedulePadChord(chord, nextBarTime);
    scheduleBassline(chord, nextBarTime);
    scheduleArpeggio(chord, nextBarTime);
    currentBarIndex = (currentBarIndex + 1) % CHORD_PROGRESSION.length;
    nextBarTime += BAR_DURATION;
  }
}

// --- Public Background Music API ---

/** Starts the background music loop seamlessly. */
export function startBgm() {
  if (isPlayingBgm) return true;
  const ctx = initAudio();
  if (!ctx) return false;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});

  isPlayingBgm = true;
  bgmGain.gain.cancelScheduledValues(ctx.currentTime);
  bgmGain.gain.setValueAtTime(1, ctx.currentTime);
  setupLeadDelayNetwork(ctx);

  currentBarIndex = 0;
  nextBarTime = ctx.currentTime + 0.05;
  schedulerLoop();
  schedulerTimer = setInterval(schedulerLoop, LOOKAHEAD_MS);
  return true;
}

/** Stops the background music and cleans up all active nodes. */
export function stopBgm() {
  if (!isPlayingBgm) return;
  isPlayingBgm = false;
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
  if (bgmGain && audioCtx) {
    const now = audioCtx.currentTime;
    bgmGain.gain.cancelScheduledValues(now);
    bgmGain.gain.setValueAtTime(bgmGain.gain.value, now);
    bgmGain.gain.linearRampToValueAtTime(0.0001, now + 0.05);
  }
  setTimeout(() => {
    cleanUpBgmNodes();
    if (bgmGain && audioCtx) bgmGain.gain.setValueAtTime(1, audioCtx.currentTime);
  }, 60);
}

/** Toggles BGM on/off, returns boolean isPlaying. */
export function toggleBgm() {
  if (isPlayingBgm) stopBgm();
  else startBgm();
  return isPlayingBgm;
}

/** Returns whether BGM is currently playing. */
export function isBgmPlaying() {
  return isPlayingBgm;
}

/** Sets master volume (0 to 1). */
export function setMasterVolume(v) {
  masterVolume = Math.max(0, Math.min(1, Number(v) || 0));
  if (masterGain && audioCtx) {
    masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
    masterGain.gain.setTargetAtTime(masterVolume, audioCtx.currentTime, 0.02);
  }
}

/** Toggles sound effects on or off. */
export function setSfxEnabled(enabled) {
  sfxEnabled = Boolean(enabled);
  if (sfxGain && audioCtx) {
    sfxGain.gain.cancelScheduledValues(audioCtx.currentTime);
    sfxGain.gain.setValueAtTime(sfxEnabled ? 1 : 0, audioCtx.currentTime);
  }
}

// --- Public Synthesized Sound Effects API ---

function withSfx(cb) {
  if (!sfxEnabled) return;
  const ctx = initAudio();
  if (ctx) cb(ctx, ctx.currentTime);
}

/** Quick ascending chirp (sine sweep ~200-600Hz over 100ms). */
export function playJumpSfx() {
  withSfx((ctx, t) => {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.1);
    gain.gain.setValueAtTime(0.30, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(gain); gain.connect(sfxGain);
    osc.start(t); osc.stop(t + 0.105);
    osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch (_) {} };
  });
}

/** Low whoosh (filtered noise burst, 80ms). */
export function playDodgeSfx() {
  withSfx((ctx, t) => {
    const noise = getNoiseBuffer(ctx);
    if (!noise) return;
    const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    src.buffer = noise;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, t);
    filter.frequency.exponentialRampToValueAtTime(140, t + 0.08);
    gain.gain.setValueAtTime(0.38, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    src.connect(filter); filter.connect(gain); gain.connect(sfxGain);
    src.start(t); src.stop(t + 0.085);
    src.onended = () => { try { src.disconnect(); filter.disconnect(); gain.disconnect(); } catch (_) {} };
  });
}

/** Sparkly ascending arpeggio (3 quick notes ascending). */
export function playMilestoneSfx() {
  withSfx((ctx, t) => {
    [659.25, 880.00, 1318.51].forEach((freq, idx) => {
      const noteTime = t + idx * 0.06;
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);
      gain.gain.setValueAtTime(0.0001, noteTime);
      gain.gain.linearRampToValueAtTime(0.24, noteTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.16);
      osc.connect(gain); gain.connect(sfxGain);
      osc.start(noteTime); osc.stop(noteTime + 0.17);
      osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch (_) {} };
    });
  });
}

/** Descending sad tone (saw wave pitch drop over 300ms). */
export function playGameOverSfx() {
  withSfx((ctx, t) => {
    const osc = ctx.createOscillator(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(340, t);
    osc.frequency.exponentialRampToValueAtTime(65, t + 0.3);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(700, t);
    filter.frequency.exponentialRampToValueAtTime(180, t + 0.3);
    gain.gain.setValueAtTime(0.30, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(filter); filter.connect(gain); gain.connect(sfxGain);
    osc.start(t); osc.stop(t + 0.31);
    osc.onended = () => { try { osc.disconnect(); filter.disconnect(); gain.disconnect(); } catch (_) {} };
  });
}

/** Soft pop (short sine blip at 800Hz, 40ms). */
export function playClickSfx() {
  withSfx((ctx, t) => {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.04);
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc.connect(gain); gain.connect(sfxGain);
    osc.start(t); osc.stop(t + 0.045);
    osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch (_) {} };
  });
}
