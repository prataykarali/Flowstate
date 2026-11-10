/**
 * Handcrafted SVG Accessories for PrismLab Mascots
 * High-Visibility, Ultra-Polished, Expressive Details
 * 1. Glasses (LFM3-VL-2B, LFM3-Omni-2B)
 * 2. Headphones (LFM3-Audio-2B, LFM3-Omni-2B)
 * 3. Detective Hat (d1-Omni-2B)
 * 4. Magnifying Glass (d1-Omni-2B)
 * 5. Thinker Monocle (d1-2B)
 * 6. Floating Thought Prism (d1-2B)
 */

export function renderGlasses(p = '') {
  return `
    <g class="accessory-glasses" style="transform-origin: 90px 95px;">
      <!-- Left Lens Glass Subtle Sheen & Glint -->
      <circle cx="74" cy="98" r="13" fill="#ffffff" fill-opacity="0.14" />
      <path d="M 65 94 A 11 11 0 0 1 78 89" stroke="#ffffff" stroke-width="2.0" stroke-linecap="round" fill="none" opacity="0.85" />
      <circle cx="81" cy="93" r="1.2" fill="#ffffff" opacity="0.9" />
      
      <!-- Right Lens Glass Subtle Sheen & Glint -->
      <circle cx="106" cy="92" r="13" fill="#ffffff" fill-opacity="0.14" />
      <path d="M 97 88 A 11 11 0 0 1 110 83" stroke="#ffffff" stroke-width="2.0" stroke-linecap="round" fill="none" opacity="0.85" />
      <circle cx="113" cy="87" r="1.2" fill="#ffffff" opacity="0.9" />

      <!-- Left Wireframe Frame (Bright crisp white with drop shadow for pop) -->
      <circle cx="74" cy="98" r="13" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" filter="drop-shadow(0 2px 3px rgba(35,20,50,0.45))" />

      <!-- Right Wireframe Frame -->
      <circle cx="106" cy="92" r="13" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" filter="drop-shadow(0 2px 3px rgba(35,20,50,0.45))" />

      <!-- Angled Bridge between lenses -->
      <path d="M 86 96.5 Q 90 92 94 94.5" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" filter="drop-shadow(0 1px 2px rgba(35,20,50,0.35))" />

      <!-- Left & Right Temples / Hinges extending to outer rim -->
      <path d="M 61 98 L 51 98.5" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" />
      <path d="M 119 92 L 129 91.5" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" />
    </g>
  `;
}

export function renderHeadphones(p = '') {
  return `
    <g class="accessory-headphones" style="transform-origin: 90px 85px;">
      <!-- Headband Arc: Sweeping closely over the plush orb head with dimensional thickness -->
      <path d="M 41 96 C 41 43 139 43 139 93" fill="none" stroke="#362248" stroke-width="6.5" stroke-linecap="round" />
      <path d="M 46 90 C 46 48 134 48 134 87" fill="none" stroke="#5a3f74" stroke-width="2.6" stroke-linecap="round" opacity="0.9" />

      <!-- Left Pivot Mount -->
      <rect x="37" y="86" width="8" height="11" rx="3" fill="#251436" stroke="#48325a" stroke-width="1" />

      <!-- Left Ear Cup (Deep, Plush, 3D Cushion) -->
      <g class="earcup-left" style="transform-origin: 40px 94px;">
        <!-- Drop Shadow Back -->
        <rect x="31" y="76" width="18" height="36" rx="9" fill="#1b0c2a" opacity="0.5" />
        <!-- Main Ear Cup Body -->
        <rect x="32" y="75" width="16" height="36" rx="8" fill="url(#${p}earCupGrad)" stroke="#39244f" stroke-width="1.8" />
        <!-- Inner Soft Cushion Core -->
        <rect x="36" y="80" width="9" height="26" rx="4.5" fill="#543870" />
        <!-- Cup Specular Rim Highlight -->
        <path d="M 34.5 78 L 34.5 108" stroke="#dec9fc" stroke-width="1.8" stroke-linecap="round" opacity="0.85" />
      </g>

      <!-- Right Pivot Mount -->
      <rect x="135" y="83" width="8" height="11" rx="3" fill="#251436" stroke="#48325a" stroke-width="1" />

      <!-- Right Ear Cup -->
      <g class="earcup-right" style="transform-origin: 140px 91px;">
        <!-- Drop Shadow Back -->
        <rect x="131" y="73" width="18" height="36" rx="9" fill="#1b0c2a" opacity="0.5" />
        <!-- Main Ear Cup Body -->
        <rect x="132" y="72" width="16" height="36" rx="8" fill="url(#${p}earCupGrad)" stroke="#39244f" stroke-width="1.8" />
        <!-- Inner Soft Cushion Core -->
        <rect x="135" y="77" width="9" height="26" rx="4.5" fill="#543870" />
        <!-- Cup Specular Rim Highlight -->
        <path d="M 134.5 75 L 134.5 105" stroke="#dec9fc" stroke-width="1.8" stroke-linecap="round" opacity="0.85" />
      </g>
    </g>
  `;
}

export function renderDetectiveHat(p = '') {
  return `
    <g class="accessory-hat" style="transform-origin: 88px 65px;">
      <!-- Hat Shadow on Mascot Head -->
      <ellipse cx="88" cy="72" rx="42" ry="9" fill="#150a22" opacity="0.45" />

      <!-- Hat Crown (Creased Fedora Top with Soft Depth) -->
      <path d="M 56 68 C 55 45 68 37 85 38 C 102 39 120 42 123 65 Z" fill="url(#${p}hatCrownGrad)" stroke="#452e5d" stroke-width="1.5" />
      <!-- Indented Top Crease Fold -->
      <path d="M 70 42 Q 86 46 100 42" fill="none" stroke="#412957" stroke-width="3" stroke-linecap="round" opacity="0.85" />
      <path d="M 85 44 L 85 54" fill="none" stroke="#3f2754" stroke-width="2.4" stroke-linecap="round" opacity="0.5" />

      <!-- Hatband Ribbon (Dark Plum with Crisp Edge) -->
      <path d="M 55 67 C 75 71 106 68 123 64 L 123 58 C 106 62 75 65 55 61 Z" fill="url(#${p}hatBandGrad)" />
      <!-- Hatband Specular Highlight -->
      <path d="M 57 63 C 76 67 105 64 121 60" fill="none" stroke="#9d7ebd" stroke-width="1.1" opacity="0.75" />

      <!-- Hat Brim (Curled Jaunty Fedora Brim) -->
      <path d="M 43 72 C 64 77 116 73 137 64 C 125 59 66 62 43 72 Z" fill="url(#${p}hatBrimGrad)" stroke="#452e5d" stroke-width="1.5" />
      <path d="M 45 72 C 66 76 114 72 134 64" fill="none" stroke="#d5beff" stroke-width="1.5" opacity="0.75" />
    </g>
  `;
}

export function renderMagnifyingGlass(p = '') {
  return `
    <g class="accessory-magnifier" filter="url(#${p}magGlassGlow)" style="transform-origin: 52px 124px;">
      <!-- Turned Handle matching reference structure: -->
      <!-- End Pommel Knob -->
      <circle cx="20" cy="159" r="3.8" fill="url(#${p}handleGrad)" stroke="#200e30" stroke-width="1.2" />
      <circle cx="19.5" cy="158" r="1.3" fill="#b994e4" opacity="0.8" />

      <!-- Lower Shaft -->
      <path d="M 22 157 L 28 149" stroke="url(#${p}handleGrad)" stroke-width="5.2" stroke-linecap="round" />

      <!-- Distinctive Turned Spherical Center Bead (from reference) -->
      <circle cx="31" cy="146" r="7.0" fill="url(#${p}earCupGrad)" stroke="#301c42" stroke-width="1.5" />
      <circle cx="29.5" cy="144" r="2.5" fill="#e3ceff" opacity="0.7" />

      <!-- Upper Neck Joint attaching to Lens -->
      <path d="M 34 142 L 42 134" stroke="url(#${p}handleGrad)" stroke-width="5.8" stroke-linecap="round" />

      <!-- Glass Lens Sheen & Refraction Backing -->
      <circle cx="52" cy="124" r="15" fill="url(#${p}lensGlassGrad)" />

      <!-- Circular Frame Rim (High Visibility) -->
      <circle cx="52" cy="124" r="15" fill="none" stroke="url(#${p}lensFrameGrad)" stroke-width="3.5" />
      
      <!-- Specular Reflection Arc -->
      <path d="M 41 118 A 12 12 0 0 1 60 112" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" opacity="0.85" />
      <circle cx="62" cy="115" r="1.4" fill="#ffffff" opacity="0.9" />
    </g>
  `;
}

export function renderThinkerMonocle(p = '') {
  return `
    <g class="accessory-monocle" style="transform-origin: 74px 98px;">
      <!-- Monocle Glass Sheen -->
      <circle cx="74" cy="98" r="13.5" fill="#ffffff" fill-opacity="0.16" />
      <path d="M 65 94 A 11 11 0 0 1 78 89" stroke="#ffffff" stroke-width="2.0" stroke-linecap="round" fill="none" opacity="0.85" />
      <circle cx="81" cy="93" r="1.2" fill="#ffffff" opacity="0.9" />

      <!-- Monocle Wireframe Frame (Bright crisp wire with glow) -->
      <circle cx="74" cy="98" r="13.5" fill="none" stroke="#f3e8ff" stroke-width="2.6" stroke-linecap="round" filter="drop-shadow(0 2px 4px rgba(40,20,60,0.5))" />

      <!-- Top & Bottom Gallery Tabs -->
      <rect x="72.5" y="83" width="3" height="2.2" rx="1" fill="#f3e8ff" />
      <rect x="72.5" y="110.5" width="3" height="2.8" rx="1" fill="#f3e8ff" />

      <!-- Distinctive Draping Chain (Clearly visible, fine beaded links) -->
      <path d="M 74 112 C 73 122 69 130 63 135 C 57 139 50 140 44 140" 
            fill="none" 
            stroke="#e0c4fd" 
            stroke-width="1.8" 
            stroke-linecap="round" 
            stroke-dasharray="2.8,2.2" 
            filter="drop-shadow(0 1px 2px rgba(30,15,45,0.4))"
            opacity="0.95" />
      <!-- Chain End Loop / Ring -->
      <circle cx="43" cy="140" r="2.2" fill="none" stroke="#e0c4fd" stroke-width="1.2" opacity="0.9" />
    </g>
  `;
}

export function renderThoughtPrism(p = '') {
  return `
    <g class="accessory-prism" filter="url(#${p}prismGlow)" style="transform-origin: 118px 44px;">
      <!-- Ambient Sparkle Rays (Brighter, pulsing) -->
      <line x1="118" y1="30" x2="118" y2="35" stroke="#f5bbfd" stroke-width="2.0" stroke-linecap="round" opacity="0.9" class="prism-spark-1" />
      <line x1="118" y1="53" x2="118" y2="58" stroke="#f5bbfd" stroke-width="2.0" stroke-linecap="round" opacity="0.9" class="prism-spark-2" />
      <line x1="104" y1="44" x2="109" y2="44" stroke="#c084fc" stroke-width="2.0" stroke-linecap="round" opacity="0.9" class="prism-spark-3" />
      <line x1="127" y1="44" x2="132" y2="44" stroke="#c084fc" stroke-width="2.0" stroke-linecap="round" opacity="0.9" class="prism-spark-4" />

      <!-- Faceted Geometric Crystal Prism (Prominent & Radiant) -->
      <polygon points="118,34 109,44 118,46" fill="url(#${p}prismFacet1)" opacity="0.98" stroke="#fbcfe8" stroke-width="0.6" />
      <polygon points="118,34 127,44 118,46" fill="url(#${p}prismFacet2)" opacity="0.95" stroke="#e9d5ff" stroke-width="0.6" />
      <polygon points="109,44 118,54 118,46" fill="url(#${p}prismFacet3)" opacity="0.95" stroke="#c084fc" stroke-width="0.6" />
      <polygon points="127,44 118,54 118,46" fill="url(#${p}prismFacet1)" opacity="0.98" stroke="#fbcfe8" stroke-width="0.6" />

      <!-- Facet Inner Highlights -->
      <line x1="118" y1="36" x2="118" y2="52" stroke="#ffffff" stroke-width="1.2" opacity="0.8" />

      <!-- Center Sparkle Core -->
      <circle cx="118" cy="44" r="2.6" fill="#ffffff" opacity="1" filter="drop-shadow(0 0 4px #ffffff)" />
    </g>
  `;
}

export function renderCelestialRibbon(p = '') {
  return `
    <g class="accessory-ribbon" style="transform-origin: 122px 64px;">
      <!-- Glowing Star Ribbon Bow on Top-Right -->
      <path d="M 116 66 C 108 58 112 50 120 56 C 128 50 132 58 124 66 Z" fill="#f472b6" stroke="#fb7185" stroke-width="1.2" filter="drop-shadow(0 0 4px rgba(244,114,182,0.6))" />
      <circle cx="120" cy="62" r="3" fill="#ffffff" />
      <!-- Star Sparkle -->
      <path d="M 120 57 L 121 61 L 125 62 L 121 63 L 120 67 L 119 63 L 115 62 L 119 61 Z" fill="#fdf2f8" />
      <!-- Ribbon Tails -->
      <path d="M 118 64 Q 114 74 116 80" fill="none" stroke="#f472b6" stroke-width="1.8" stroke-linecap="round" />
      <path d="M 122 64 Q 126 74 125 80" fill="none" stroke="#f472b6" stroke-width="1.8" stroke-linecap="round" />
    </g>
  `;
}

export function renderRunnerSpeedStreaks() {
  return `
    <g class="runner-speed-streaks" opacity="0.92">
      <!-- 3 Yellow/White Curved Speed Streak Lines Behind Head (Matching Image 4) -->
      <path d="M 44 80 Q 40 88 43 96" fill="none" stroke="#fef08a" stroke-width="2.6" stroke-linecap="round" filter="drop-shadow(0 0 3px #facc15)" />
      <path d="M 36 86 Q 32 94 35 102" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" opacity="0.85" />
      <path d="M 46 102 Q 41 110 44 118" fill="none" stroke="#fef08a" stroke-width="2.2" stroke-linecap="round" filter="drop-shadow(0 0 3px #facc15)" />
      <!-- Stardust Trail Dots -->
      <circle cx="30" cy="98" r="1.8" fill="#fef08a" opacity="0.8" />
      <circle cx="24" cy="94" r="1.3" fill="#ffffff" opacity="0.7" />
    </g>
  `;
}

