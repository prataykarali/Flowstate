export function initAmbientWorld(host) {
  const layer = document.createElement('div');
  layer.className = 'ambient-world';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = `
    <div class="ambient-moon-glow"></div>
    <div class="ambient-cloud ambient-cloud-one"></div>
    <div class="ambient-cloud ambient-cloud-two"></div>
    <svg class="ambient-branch ambient-branch-left" viewBox="0 0 320 190" aria-hidden="true">
      <path d="M-20 8 C75 15 77 55 151 63 S231 103 285 167 M55 21 C86 70 107 78 141 80 M138 60 C173 22 211 22 246 12" fill="none" stroke="#65405b" stroke-width="8" stroke-linecap="round" />
      <g fill="#f9b9d9" opacity=".8"><circle cx="76" cy="28" r="9"/><circle cx="113" cy="54" r="8"/><circle cx="148" cy="62" r="11"/><circle cx="193" cy="82" r="8"/><circle cx="241" cy="122" r="9"/><circle cx="95" cy="66" r="7"/><circle cx="211" cy="20" r="8"/></g>
    </svg>
    <svg class="ambient-branch ambient-branch-right" viewBox="0 0 320 190" aria-hidden="true">
      <path d="M-20 8 C75 15 77 55 151 63 S231 103 285 167 M55 21 C86 70 107 78 141 80 M138 60 C173 22 211 22 246 12" fill="none" stroke="#65405b" stroke-width="8" stroke-linecap="round" />
      <g fill="#f9b9d9" opacity=".8"><circle cx="76" cy="28" r="9"/><circle cx="113" cy="54" r="8"/><circle cx="148" cy="62" r="11"/><circle cx="193" cy="82" r="8"/><circle cx="241" cy="122" r="9"/><circle cx="95" cy="66" r="7"/><circle cx="211" cy="20" r="8"/></g>
    </svg>`;
  const count = matchMedia('(max-width: 600px)').matches ? 12 : 25;
  for (let i = 0; i < count; i++) {
    const item = document.createElement('i');
    item.className = i % 3 === 0 ? 'ambient-petal' : 'ambient-star';
    item.style.setProperty('--x', `${(i * 37.1) % 100}%`);
    item.style.setProperty('--y', `${(i * 23.7) % 90}%`);
    item.style.setProperty('--delay', `${-(i * 1.37) % 16}s`);
    item.style.setProperty('--duration', `${10 + (i * 7) % 11}s`);
    layer.appendChild(item);
  }
  host.prepend(layer);
  let frame = 0;
  const move = e => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const x = (e.clientX / innerWidth - .5) * 12;
      const y = (e.clientY / innerHeight - .5) * 8;
      host.style.setProperty('--far-x', `${(x * .15).toFixed(1)}px`);
      host.style.setProperty('--far-y', `${(y * .15).toFixed(1)}px`);
      host.style.setProperty('--mid-x', `${(x * .45).toFixed(1)}px`);
      host.style.setProperty('--mid-y', `${(y * .45).toFixed(1)}px`);
      host.style.setProperty('--near-x', `${x.toFixed(1)}px`);
      host.style.setProperty('--near-y', `${y.toFixed(1)}px`);
    });
  };
  const reset = () => {
    ['--far-x','--far-y','--mid-x','--mid-y','--near-x','--near-y'].forEach(key => host.style.setProperty(key, '0px'));
  };
  window.addEventListener('pointermove', move, { passive: true });
  window.addEventListener('pointerleave', reset);
  return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerleave', reset); cancelAnimationFrame(frame); layer.remove(); };
}
