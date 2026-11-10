import { pickLine } from '../mascots/dialogue.js';
import { createAudioAdapter } from '../audio/voice.js';

export function canShowUnsolicited(active, lastShown, now, cooldown = 45000) {
  return !active && now - lastShown >= cooldown;
}

export class MascotSpeechBubble {
  constructor(characters, audioAdapter = createAudioAdapter()) {
    this.characters = characters;
    this.active = null;
    this.timer = null;
    this.idleTimer = null;
    this.lastLine = new Map();
    this.lastShown = new Map();
    this.soundEnabled = false;
    this.audioAdapter = audioAdapter;
    this.scheduleIdle();
  }

  setSoundEnabled(enabled) {
    this.soundEnabled = enabled;
    if (!enabled) this.audioAdapter.cancel();
  }

  show(character, kind = 'react', text = null, unsolicited = false) {
    if (!character?.container || document.hidden) return false;
    const now = Date.now();
    if (unsolicited && !canShowUnsolicited(this.active, this.lastShown.get(character.id) || 0, now)) return false;
    this.clear();
    const line = text || pickLine(character.id, kind, this.lastLine.get(character.id));
    this.lastLine.set(character.id, line);
    this.lastShown.set(character.id, now);
    const bubble = document.createElement('span');
    bubble.className = 'mascot-speech-bubble';
    bubble.textContent = line;
    bubble.setAttribute('role', 'status');
    character.container.appendChild(bubble);
    this.active = bubble;
    const bounds = bubble.getBoundingClientRect();
    if (bounds.left < 8) bubble.style.transform = `translateX(${8 - bounds.left}px)`;
    if (bounds.right > innerWidth - 8) bubble.style.transform = `translateX(${innerWidth - 8 - bounds.right}px)`;
    this.timer = setTimeout(() => this.clear(), 2800);
    if (this.soundEnabled && !unsolicited) this.audioAdapter.play(line);
    return true;
  }

  clear() {
    clearTimeout(this.timer);
    this.active?.remove();
    this.active = null;
    this.audioAdapter.cancel();
  }

  scheduleIdle() {
    this.idleTimer = setTimeout(() => {
      if (!document.hidden && !document.querySelector('.game-overlay-visible') && !this.active && this.characters.length) {
        const character = this.characters[Math.floor(Math.random() * this.characters.length)];
        this.show(character, 'idle', null, true);
      }
      this.scheduleIdle();
    }, 12000 + Math.random() * 8000);
  }

  destroy() { clearTimeout(this.idleTimer); this.clear(); }
}
