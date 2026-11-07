import { useEffect, useRef, useState, useCallback } from 'react';
import { CanonicalModelId } from '../data/models.ts';

export type MascotEmotion = 'idle' | 'happy' | 'curious' | 'surprised' | 'thinking' | 'excited' | 'proud' | 'shy';

interface UseMascotAnimationOptions {
  modelId: CanonicalModelId;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  leftEyeRef: React.RefObject<SVGGElement | null>;
  rightEyeRef: React.RefObject<SVGGElement | null>;
}

export function useMascotAnimation({
  modelId,
  wrapperRef,
  leftEyeRef,
  rightEyeRef
}: UseMascotAnimationOptions) {
  const [emotion, setEmotion] = useState<MascotEmotion>('idle');
  const [isPopActive, setIsPopActive] = useState<boolean>(false);
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);

  const rafId = useRef<number | null>(null);
  const blinkTimer = useRef<number | null>(null);
  const reactionTimer = useRef<number | null>(null);
  const popTimer = useRef<number | null>(null);
  const blinkResetTimer = useRef<number | null>(null);
  const bubbleTimer = useRef<number | null>(null);

  // Check user motion preference
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );

  // Organic Blinking
  const scheduleBlink = useCallback(() => {
    if (prefersReducedMotion.current) return;

    const delay = 2500 + Math.random() * 3200;
    blinkTimer.current = window.setTimeout(() => {
      const left = leftEyeRef.current?.querySelector('.eye-shape') as SVGElement | null;
      const right = rightEyeRef.current?.querySelector('.eye-shape') as SVGElement | null;

      if (left && right && emotion === 'idle' && modelId !== 'audio') {
        left.style.transform = 'scaleY(0.08)';
        right.style.transform = 'scaleY(0.08)';

        blinkResetTimer.current = window.setTimeout(() => {
          left.style.transform = '';
          right.style.transform = '';
        }, 140);
      }
      scheduleBlink();
    }, delay);
  }, [leftEyeRef, rightEyeRef, emotion, modelId]);

  useEffect(() => {
    scheduleBlink();
    return () => {
      if (blinkTimer.current) window.clearTimeout(blinkTimer.current);
      if (blinkResetTimer.current) window.clearTimeout(blinkResetTimer.current);
    };
  }, [scheduleBlink]);

  // Pointer Move / Gaze Tracking via requestAnimationFrame
  useEffect(() => {
    if (prefersReducedMotion.current) return;

    let targetX = 0;
    let targetY = 0;

    const updateGaze = () => {
      if (!wrapperRef.current || !leftEyeRef.current || !rightEyeRef.current) {
        rafId.current = null;
        return;
      }

      const rect = wrapperRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height * (100 / 180);

      const dx = targetX - centerX;
      const dy = targetY - centerY;
      const dist = Math.hypot(dx, dy);

      if (dist > 5) {
        const strength = Math.min(dist / 320, 1);
        const offsetX = ((dx / dist) * 2.4 * strength).toFixed(2);
        const offsetY = ((dy / dist) * 1.8 * strength).toFixed(2);

        leftEyeRef.current.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        rightEyeRef.current.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
      } else {
        leftEyeRef.current.style.transform = 'translate(0px, 0px)';
        rightEyeRef.current.style.transform = 'translate(0px, 0px)';
      }

      rafId.current = null;
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      targetX = clientX;
      targetY = clientY;

      if (!rafId.current) {
        rafId.current = window.requestAnimationFrame(updateGaze);
      }
    };

    const handlePointerLeave = () => {
      if (leftEyeRef.current && rightEyeRef.current) {
        leftEyeRef.current.style.transform = 'translate(0px, 0px)';
        rightEyeRef.current.style.transform = 'translate(0px, 0px)';
      }
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    wrapperRef.current?.addEventListener('mouseleave', handlePointerLeave);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
      wrapperRef.current?.removeEventListener('mouseleave', handlePointerLeave);
      if (rafId.current) window.cancelAnimationFrame(rafId.current);
    };
  }, [wrapperRef, leftEyeRef, rightEyeRef]);

  // Click Reaction
  const triggerReaction = useCallback((reactionEmotion: MascotEmotion = 'happy', line?: string) => {
    setIsPopActive(true);
    setEmotion(reactionEmotion);

    if (line) {
      setSpeechBubble(line);
      if (bubbleTimer.current) window.clearTimeout(bubbleTimer.current);
      bubbleTimer.current = window.setTimeout(() => setSpeechBubble(null), 2400);
    }

    if (reactionTimer.current) window.clearTimeout(reactionTimer.current);

    if (popTimer.current) window.clearTimeout(popTimer.current);
    popTimer.current = window.setTimeout(() => setIsPopActive(false), 450);

    reactionTimer.current = window.setTimeout(() => {
      setEmotion('idle');
    }, 1600);
  }, []);

  useEffect(() => () => {
    if (reactionTimer.current) window.clearTimeout(reactionTimer.current);
    if (bubbleTimer.current) window.clearTimeout(bubbleTimer.current);
    if (popTimer.current) window.clearTimeout(popTimer.current);
  }, []);

  return {
    emotion,
    isPopActive,
    speechBubble,
    triggerReaction
  };
}
