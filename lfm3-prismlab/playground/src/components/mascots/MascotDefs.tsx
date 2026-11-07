import React from 'react';

interface MascotDefsProps {
  prefix: string;
}

export const MascotDefs: React.FC<MascotDefsProps> = ({ prefix: p }) => {
  return (
    <defs>
      {/* Outer Shell Shading */}
      <linearGradient id={`${p}outerBodyGrad`} x1="30%" y1="0%" x2="70%" y2="100%">
        <stop offset="0%" stopColor="#877a8e" />
        <stop offset="35%" stopColor="#766589" />
        <stop offset="70%" stopColor="#644e7f" />
        <stop offset="100%" stopColor="#553e71" />
      </linearGradient>

      {/* Luminous Rim Light */}
      <radialGradient id={`${p}rimLightGrad`} cx="50%" cy="85%" r="50%">
        <stop offset="0%" stopColor="#dcbbfb" stopOpacity="0.95" />
        <stop offset="45%" stopColor="#c084fc" stopOpacity="0.45" />
        <stop offset="80%" stopColor="#a855f7" stopOpacity="0" />
      </radialGradient>

      {/* Plush Pastel Face Gradient */}
      <linearGradient id={`${p}faceBodyGrad`} x1="45%" y1="0%" x2="55%" y2="100%">
        <stop offset="0%" stopColor="#fdf4fd" />
        <stop offset="30%" stopColor="#f8e9fb" />
        <stop offset="70%" stopColor="#ecd2fa" />
        <stop offset="100%" stopColor="#d6bcf0" />
      </linearGradient>

      {/* Top Specular Volume Glow */}
      <radialGradient id={`${p}plushTopGlow`} cx="50%" cy="30%" r="50%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
        <stop offset="50%" stopColor="#ffffff" stopOpacity="0.15" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </radialGradient>

      {/* Inset Depth Edge Shadow */}
      <radialGradient id={`${p}faceDepthGrad`} cx="50%" cy="65%" r="52%">
        <stop offset="0%" stopColor="#000000" stopOpacity="0" />
        <stop offset="70%" stopColor="#563b72" stopOpacity="0.08" />
        <stop offset="100%" stopColor="#563b72" stopOpacity="0.48" />
      </radialGradient>

      {/* Soft Cheek Blush */}
      <radialGradient id={`${p}blushGrad`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#f49ecf" stopOpacity="0.75" />
        <stop offset="50%" stopColor="#f6a5d4" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#f6a5d4" stopOpacity="0" />
      </radialGradient>

      {/* Deep Plum Eyes */}
      <linearGradient id={`${p}eyeGrad`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#462e57" />
        <stop offset="100%" stopColor="#321e42" />
      </linearGradient>

      {/* Ambient Backlight Aura */}
      <radialGradient id={`${p}ambientBacklight`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#b488ed" stopOpacity="0.45" />
        <stop offset="55%" stopColor="#935bd6" stopOpacity="0.18" />
        <stop offset="100%" stopColor="#935bd6" stopOpacity="0" />
      </radialGradient>

      {/* Detective Hat Gradients */}
      <linearGradient id={`${p}hatCrownGrad`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#4a375f" />
        <stop offset="60%" stopColor="#332244" />
        <stop offset="100%" stopColor="#251634" />
      </linearGradient>
      <linearGradient id={`${p}hatBrimGrad`} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#271936" />
        <stop offset="50%" stopColor="#4c3664" />
        <stop offset="100%" stopColor="#271936" />
      </linearGradient>
      <linearGradient id={`${p}hatBandGrad`} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#c084fc" />
        <stop offset="50%" stopColor="#f472b6" />
        <stop offset="100%" stopColor="#c084fc" />
      </linearGradient>

      {/* Headphones Gradients */}
      <linearGradient id={`${p}earCupGrad`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#43285c" />
        <stop offset="50%" stopColor="#2e1942" />
        <stop offset="100%" stopColor="#1a0b28" />
      </linearGradient>
      <linearGradient id={`${p}earCushionGrad`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#674488" />
        <stop offset="100%" stopColor="#3d2254" />
      </linearGradient>

      {/* Magnifying Glass Gradients */}
      <linearGradient id={`${p}lensFrameGrad`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#e2d4f8" />
        <stop offset="50%" stopColor="#9f7aea" />
        <stop offset="100%" stopColor="#553c9a" />
      </linearGradient>
      <radialGradient id={`${p}lensGlassGrad`} cx="40%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
        <stop offset="40%" stopColor="#c084fc" stopOpacity="0.22" />
        <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.1" />
      </radialGradient>
      <linearGradient id={`${p}handleGrad`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#553c7b" />
        <stop offset="50%" stopColor="#2f1d48" />
        <stop offset="100%" stopColor="#1e1030" />
      </linearGradient>

      {/* Monocle Gradients */}
      <linearGradient id={`${p}monocleRimGrad`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="50%" stopColor="#d97706" />
        <stop offset="100%" stopColor="#92400e" />
      </linearGradient>
      <radialGradient id={`${p}monocleGlassGrad`} cx="40%" cy="35%" r="60%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
        <stop offset="50%" stopColor="#e0e7ff" stopOpacity="0.18" />
        <stop offset="100%" stopColor="#818cf8" stopOpacity="0.05" />
      </radialGradient>

      {/* Thought Prism Facets */}
      <linearGradient id={`${p}prismFacet1`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#e9d5ff" />
        <stop offset="100%" stopColor="#c084fc" />
      </linearGradient>
      <linearGradient id={`${p}prismFacet2`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#f472b6" />
        <stop offset="100%" stopColor="#a855f7" />
      </linearGradient>
      <linearGradient id={`${p}prismFacet3`} x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#6366f1" />
      </linearGradient>

      {/* Filters */}
      <filter id={`${p}magGlassGlow`} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#c084fc" floodOpacity="0.45" />
      </filter>
      <filter id={`${p}prismGlow`} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="2.5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
};
