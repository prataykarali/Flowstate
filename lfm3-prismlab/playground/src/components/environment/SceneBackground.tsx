import React, { useEffect, useRef, useState } from 'react';
import { RouteId } from '../../app/routes.ts';
import { SCENES } from '../../data/sceneManifest.ts';
import { useExperience } from '../../app/ExperienceContext.tsx';

interface SceneBackgroundProps {
  route: RouteId;
  variant?: 'hero' | 'world' | 'arena';
}

export const SceneBackground: React.FC<SceneBackgroundProps> = ({ route, variant = 'hero' }) => {
  const { videoEnabled } = useExperience();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [visible, setVisible] = useState(() => !document.hidden);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const scene = SCENES[route];
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
  const shouldPlay = scene.motion === 'video' && videoEnabled && !reducedMotion && !saveData && visible && !failed;

  useEffect(() => { setFailed(false); setPlaying(false); }, [route]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReducedMotion(media.matches);
    const updateVisibility = () => setVisible(!document.hidden);
    media.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => {
      media.removeEventListener('change', updateMotion);
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!shouldPlay) { video.pause(); setPlaying(false); return; }
    video.play().catch((error: DOMException) => {
      if (error.name === 'AbortError') return;
      setFailed(true);
      setPlaying(false);
    });
    return () => video.pause();
  }, [shouldPlay, route]);

  return (
    <div className={`scene-background scene-background--${variant} scene-background--${route}`} aria-hidden="true" style={{ backgroundPosition: scene.position }}>
      <img className="scene-poster" src={scene.poster} alt="" draggable={false} style={{ objectPosition: scene.position }} />
      {shouldPlay && <video key={route} ref={videoRef} className={`scene-video ${playing ? 'is-playing' : ''}`} src={scene.video} poster={scene.poster} autoPlay muted loop playsInline preload="none" disablePictureInPicture
        onPlaying={() => setPlaying(true)} onError={() => { setFailed(true); setPlaying(false); }} style={{ objectPosition: scene.position }} />}
      <div className="scene-readability" />
    </div>
  );
};
