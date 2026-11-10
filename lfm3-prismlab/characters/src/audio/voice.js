// Replace this adapter to use local voice or sound files. Nothing plays until enabled by the user.
export function createAudioAdapter({ soundUrl = null } = {}) {
  let effect = null;
  return {
    play(text) {
      this.cancel();
      if (soundUrl) {
        effect = new Audio(soundUrl);
        effect.volume = .35;
        effect.play().catch(() => {});
      }
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.volume = .45;
        utterance.rate = 1.1;
        speechSynthesis.speak(utterance);
      }
    },
    cancel() {
      effect?.pause();
      effect = null;
      if ('speechSynthesis' in window) speechSynthesis.cancel();
    }
  };
}
