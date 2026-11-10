/**
 * Shared SVG Gradients, Filters, and Depth Shaders for PrismLab Mascots
 * High-fidelity revision matching the soft, pillowy, pastel lavender-pink reference
 */
export function getSvgDefs(idPrefix = '') {
  const p = idPrefix ? `${idPrefix}-` : '';
  return `
    <defs>
      <!-- Outer Body Spherical Gradient: Dark Slate Lavender Shell -->
      <linearGradient id="${p}outerBodyGrad" x1="20%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%" stop-color="#877a8e" />
        <stop offset="40%" stop-color="#766589" />
        <stop offset="80%" stop-color="#644e7f" />
        <stop offset="100%" stop-color="#553e71" />
      </linearGradient>

      <!-- Outer Rim Bottom Luminous Highlight (Iconic glowing violet rim from reference) -->
      <radialGradient id="${p}rimLightGrad" cx="50%" cy="94%" r="52%">
        <stop offset="0%" stop-color="#dcbbfb" stop-opacity="0.95" />
        <stop offset="35%" stop-color="#bf9ee8" stop-opacity="0.65" />
        <stop offset="70%" stop-color="#916fc2" stop-opacity="0.2" />
        <stop offset="100%" stop-color="#644e7f" stop-opacity="0" />
      </radialGradient>

      <!-- Inner Face Gradient: Full, Plump, Pillowy Pastel Lilac-Pink -->
      <linearGradient id="${p}faceBodyGrad" x1="30%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%" stop-color="#fdf4fd" />
        <stop offset="25%" stop-color="#fae8f8" />
        <stop offset="60%" stop-color="#f1dbf6" />
        <stop offset="85%" stop-color="#e5cdf2" />
        <stop offset="100%" stop-color="#d6bcf0" />
      </linearGradient>

      <!-- Plush Spherical Top Specular Glow (Gives round toy-like volume) -->
      <radialGradient id="${p}plushTopGlow" cx="42%" cy="28%" r="55%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55" />
        <stop offset="45%" stop-color="#ffffff" stop-opacity="0.18" />
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
      </radialGradient>

      <!-- Inner Edge Soft Depth Shade (Separates face from outer shell naturally) -->
      <radialGradient id="${p}faceDepthGrad" cx="50%" cy="50%" r="50%">
        <stop offset="78%" stop-color="#7e629b" stop-opacity="0" />
        <stop offset="92%" stop-color="#7e629b" stop-opacity="0.22" />
        <stop offset="100%" stop-color="#563b72" stop-opacity="0.48" />
      </radialGradient>

      <!-- Soft Cheek Blush: Delicate Pastel Rose-Lilac -->
      <radialGradient id="${p}blushGrad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#f49ecf" stop-opacity="0.45" />
        <stop offset="55%" stop-color="#e99dc9" stop-opacity="0.22" />
        <stop offset="100%" stop-color="#e99dc9" stop-opacity="0" />
      </radialGradient>

      <!-- Eye Color Gradient: Deep Dark Eggplant/Plum -->
      <linearGradient id="${p}eyeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#462e57" />
        <stop offset="100%" stop-color="#321e42" />
      </linearGradient>

      <!-- Ambient Glow Behind Mascot -->
      <radialGradient id="${p}ambientBacklight" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#b488ed" stop-opacity="0.28" />
        <stop offset="50%" stop-color="#7e52be" stop-opacity="0.12" />
        <stop offset="80%" stop-color="#4e2c84" stop-opacity="0.04" />
        <stop offset="100%" stop-color="#08080b" stop-opacity="0" />
      </radialGradient>

      <!-- Detective Hat Gradients (Jaunty Fedora) -->
      <linearGradient id="${p}hatCrownGrad" x1="15%" y1="0%" x2="85%" y2="100%">
        <stop offset="0%" stop-color="#9d81bf" />
        <stop offset="45%" stop-color="#8468a5" />
        <stop offset="100%" stop-color="#694e8a" />
      </linearGradient>
      <linearGradient id="${p}hatBrimGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#735693" />
        <stop offset="50%" stop-color="#8e73b0" />
        <stop offset="100%" stop-color="#6a4d8a" />
      </linearGradient>
      <linearGradient id="${p}hatBandGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#48325b" />
        <stop offset="100%" stop-color="#311e42" />
      </linearGradient>

      <!-- Headphone Ear Cup Gradient -->
      <linearGradient id="${p}earCupGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ab8ecf" />
        <stop offset="50%" stop-color="#8d70ac" />
        <stop offset="100%" stop-color="#694d86" />
      </linearGradient>

      <!-- Magnifying Glass Gradients -->
      <linearGradient id="${p}lensFrameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#c4abe3" />
        <stop offset="40%" stop-color="#9e84bd" />
        <stop offset="100%" stop-color="#70548e" />
      </linearGradient>
      <linearGradient id="${p}lensGlassGrad" x1="30%" y1="10%" x2="70%" y2="90%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.32" />
        <stop offset="45%" stop-color="#ede3fd" stop-opacity="0.1" />
        <stop offset="100%" stop-color="#b695ee" stop-opacity="0.22" />
      </linearGradient>
      <linearGradient id="${p}handleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#5a4173" />
        <stop offset="50%" stop-color="#452f5b" />
        <stop offset="100%" stop-color="#301b44" />
      </linearGradient>

      <!-- Reasoning Prism Gradient (d1-2B) -->
      <linearGradient id="${p}prismFacet1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f5bbfd" />
        <stop offset="100%" stop-color="#c084fc" />
      </linearGradient>
      <linearGradient id="${p}prismFacet2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#a855f7" />
        <stop offset="100%" stop-color="#7c3aed" />
      </linearGradient>
      <linearGradient id="${p}prismFacet3" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#818cf8" />
        <stop offset="100%" stop-color="#c084fc" />
      </linearGradient>

      <!-- Filters -->
      <filter id="${p}magGlassGlow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="-1" dy="2.5" stdDeviation="3" flood-color="#000000" flood-opacity="0.5" />
      </filter>

      <filter id="${p}prismGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3.5" result="glow" />
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  `;
}
