const ROOT = '/media/backgrounds/';

export function mountBackgroundVideo(host, scene, { shouldPlay = () => true } = {}) {
  const video = document.createElement('video');
  video.className = `world-video world-video-${scene}`;
  video.muted = true;
  video.defaultMuted = true;
  video.autoplay = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = scene === 'gallery' ? 'metadata' : 'none';
  video.poster = `${ROOT}${scene}-night-poster.webp`;
  video.setAttribute('aria-hidden', 'true');
  video.innerHTML = `<source src="${ROOT}${scene}-night.webm" type="video/webm"><source src="${ROOT}${scene}-night.mp4" type="video/mp4">`;
  host.prepend(video);

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const sync = () => {
    if (document.hidden || reduced.matches || !host.isConnected || !shouldPlay() || (scene === 'gallery' && document.querySelector('.game-overlay-visible'))) video.pause();
    else video.play().catch(() => {
      video.classList.add('video-failed');
      host.classList.add('scenery-fallback');
    });
  };
  const onGameOpen = () => { if (!host.closest('.game-overlay')) video.pause(); };
  const onGameClose = () => sync();
  video.addEventListener('error', () => {
    video.classList.add('video-failed');
    host.classList.add('scenery-fallback');
  });
  video.addEventListener('playing', () => host.classList.remove('scenery-fallback'));
  document.addEventListener('visibilitychange', sync);
  document.addEventListener('prism:game-open', onGameOpen);
  document.addEventListener('prism:game-close', onGameClose);
  reduced.addEventListener('change', sync);
  sync();
  return () => {
    document.removeEventListener('visibilitychange', sync);
    document.removeEventListener('prism:game-open', onGameOpen);
    document.removeEventListener('prism:game-close', onGameClose);
    reduced.removeEventListener('change', sync);
    video.pause();
    video.remove();
    host.classList.remove('scenery-fallback');
  };
}
