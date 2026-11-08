import React, { useEffect, useRef, useState } from 'react';
import { RouteId } from '../../app/routes.ts';
import { SCENES } from '../../data/sceneManifest.ts';
import { useExperience } from '../../app/ExperienceContext.tsx';

interface SceneBackgroundProps {
  route: RouteId;
  variant?: 'hero' | 'world' | 'arena';
}

const cachedLoadedPosters = new Set<string>();

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

  // Double-buffering: keep previous poster rendered underneath so there is never a blank flash
  const [activePoster, setActivePoster] = useState(scene.poster);
  const [prevPoster, setPrevPoster] = useState<string | null>(null);

  useEffect(() => {
    setFailed(false);
    setPlaying(false);
    if (scene.poster !== activePoster) {
      setPrevPoster(activePoster);
      setActivePoster(scene.poster);
    }
  }, [route, scene.poster, activePoster]);

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
      {prevPoster && prevPoster !== activePoster && (
        <img
          className="scene-poster scene-poster--prev"
          src={prevPoster}
          alt=""
          draggable={false}
          style={{ objectPosition: scene.position, zIndex: 0 }}
        />
      )}
      <img
        key={activePoster}
        className="scene-poster scene-poster--active"
        src={activePoster}
        alt=""
        draggable={false}
        loading="eager"
        decoding="async"
        onLoad={() => {
          cachedLoadedPosters.add(activePoster);
          setPrevPoster(null);
        }}
        style={{ objectPosition: scene.position, zIndex: 1 }}
      />
      {shouldPlay && <video key={route} ref={videoRef} className={`scene-video ${playing ? 'is-playing' : ''}`} src={scene.video} poster={scene.poster} autoPlay muted loop playsInline preload="none" disablePictureInPicture
        onPlaying={() => setPlaying(true)} onError={() => { setFailed(true); setPlaying(false); }} style={{ objectPosition: scene.position, zIndex: 2 }} />}
      <div className="scene-readability" style={{ zIndex: 3 }} />
    </div>
  );
};
