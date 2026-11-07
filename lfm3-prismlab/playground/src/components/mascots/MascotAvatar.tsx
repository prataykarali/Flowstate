import { useId } from 'react';
import type { ModelMeta } from '../../data/models.ts';
import { MascotDefs } from './MascotDefs.tsx';
import { MascotAccessories } from './MascotAccessories.tsx';

/** A close-framed, static portrait using the same SVG palette and accessories as Mascot. */
export function MascotAvatar({ model }: { model: ModelMeta }) {
  const prefix = `avatar_${useId().replace(/[^a-zA-Z0-9]/g, '')}_`;
  const audioEyes = model.id === 'audio';
  return <svg className="mascot-avatar-svg" viewBox="34 44 112 112" aria-hidden="true" focusable="false">
    <MascotDefs prefix={prefix} />
    <circle cx="90" cy="100" r="56" fill={`url(#${prefix}outerBodyGrad)`} />
    <circle cx="90" cy="100" r="56" fill={`url(#${prefix}rimLightGrad)`} />
    <circle cx="90" cy="100" r="46" fill={`url(#${prefix}faceBodyGrad)`} />
    <ellipse cx="85" cy="78" rx="32" ry="17" fill={`url(#${prefix}plushTopGlow)`} />
    <circle cx="90" cy="100" r="46" fill={`url(#${prefix}faceDepthGrad)`} />
    <circle cx="66" cy="107" r="8" fill={`url(#${prefix}blushGrad)`} opacity=".4" />
    <circle cx="114" cy="102" r="8" fill={`url(#${prefix}blushGrad)`} opacity=".4" />
    {audioEyes ? <>
      <path d="M 68 98 Q 74 92 80 98 M 100 93 Q 106 87 112 93" fill="none" stroke="#352046" strokeWidth="2.8" strokeLinecap="round" />
    </> : <>
      <ellipse cx="74" cy="98" rx="3.5" ry="5.2" fill={`url(#${prefix}eyeGrad)`} />
      <ellipse cx="106" cy="92" rx="3.5" ry="5.2" fill={`url(#${prefix}eyeGrad)`} />
      <circle cx="75.6" cy="96" r="1.1" fill="#fff" />
      <circle cx="107.6" cy="90" r="1.1" fill="#fff" />
    </>}
    <path d="M 87.5 97.5 Q 90.2 101.5 93.5 97" fill="none" stroke="#352046" strokeWidth="2.3" strokeLinecap="round" />
    <MascotAccessories prefix={prefix} accessories={model.accessories} />
  </svg>;
}
