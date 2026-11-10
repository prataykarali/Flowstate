const timers = new WeakMap();

export function showRunnerDialogue(stage, text) {
  if (!stage) return;
  clearTimeout(timers.get(stage));
  stage.querySelector('.runner-dialogue')?.remove();
  const bubble = document.createElement('span');
  bubble.className = 'runner-dialogue';
  bubble.textContent = text;
  stage.appendChild(bubble);
  timers.set(stage, setTimeout(() => bubble.remove(), 1900));
}
