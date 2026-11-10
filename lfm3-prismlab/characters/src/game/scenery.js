/**
 * Scenery System for PrismLab Endless Runner
 * Hand-drawn SVG landscape evoking a futuristic cyberpunk dusk:
 * - Full moon with craters and radial glow halo
 * - Twinkling 4-pointed stars
 * - Shooting star with gradient trail
 * - Mountain ridge observatory dome with slit opening and telescope
 * - Rolling hills with rich neon purple gradients
 * - Neon grass tufts and glowing flowers along ground baseline
 */

export function getRunnerSceneryMarkup() {
  return `
    <g class="runner-scenery-layer" aria-hidden="true">
      <defs>
        <!-- Full Moon Radial Surface & Glow Gradients -->
        <radialGradient id="scenery-moon-surface" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="45%" stop-color="#f3e8ff" />
          <stop offset="85%" stop-color="#ddd6fe" />
          <stop offset="100%" stop-color="#c4b5fd" />
        </radialGradient>

        <radialGradient id="scenery-moon-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#e9d5ff" stop-opacity="0.45" />
          <stop offset="35%" stop-color="#c084fc" stop-opacity="0.25" />
          <stop offset="70%" stop-color="#a855f7" stop-opacity="0.1" />
          <stop offset="100%" stop-color="#7c3aed" stop-opacity="0" />
        </radialGradient>

        <!-- Shooting Star Fading Trail Gradient -->
        <linearGradient id="scenery-shooting-star" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0" />
          <stop offset="55%" stop-color="#f5d0fe" stop-opacity="0.35" />
          <stop offset="90%" stop-color="#ffffff" stop-opacity="0.85" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="1" />
        </linearGradient>

        <!-- Flower Petal Glow Filter -->
        <filter id="scenery-flower-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#f43f5e" flood-opacity="0.9" />
        </filter>

        <!-- Rich Purple Hill Gradients -->
        <linearGradient id="scenery-hill-back" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#581c87" />
          <stop offset="50%" stop-color="#3b0764" />
          <stop offset="100%" stop-color="#1e1035" />
        </linearGradient>

        <linearGradient id="scenery-hill-front" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#7c3aed" />
          <stop offset="55%" stop-color="#4c1d95" />
          <stop offset="100%" stop-color="#2e1065" />
        </linearGradient>
      </defs>

      <!-- Celestial Layer: Moon & Glow Halo -->
      <g class="scenery-celestial">
        <!-- Radial Glow Halo -->
        <circle cx="620" cy="45" r="52" fill="url(#scenery-moon-halo)" />
        <circle cx="620" cy="45" r="38" fill="url(#scenery-moon-halo)" opacity="0.75" />

        <!-- Full Moon Disc -->
        <circle cx="620" cy="45" r="28" fill="url(#scenery-moon-surface)" stroke="#ede9fe" stroke-width="0.75" />

        <!-- Hand-drawn Craters -->
        <ellipse cx="612" cy="40" rx="4.5" ry="3.2" fill="#a78bfa" opacity="0.45" transform="rotate(-15 612 40)" />
        <ellipse cx="628" cy="51" rx="5" ry="3.6" fill="#8b5cf6" opacity="0.4" transform="rotate(12 628 51)" />
        <ellipse cx="616" cy="56" rx="3.5" ry="2.5" fill="#a78bfa" opacity="0.42" transform="rotate(-6 616 56)" />
        <ellipse cx="632" cy="37" rx="3" ry="2.2" fill="#8b5cf6" opacity="0.36" transform="rotate(20 632 37)" />
      </g>

      <!-- Twinkling 4-Pointed Cross Stars (y < 160) -->
      <g class="scenery-stars">
        <!-- Star 1: size ~4px -->
        <path d="M 48 34 Q 48 38 52 38 Q 48 38 48 42 Q 48 38 44 38 Q 48 38 48 34 Z" fill="#ffffff" opacity="0.9" />
        <!-- Star 2: size ~3px -->
        <path d="M 118 71 Q 118 74 121 74 Q 118 74 118 77 Q 118 74 115 74 Q 118 74 118 71 Z" fill="#f5d0fe" opacity="0.8" />
        <!-- Star 3: size ~5px -->
        <path d="M 192 21 Q 192 26 197 26 Q 192 26 192 31 Q 192 26 187 26 Q 192 26 192 21 Z" fill="#ffffff" opacity="0.95" />
        <!-- Star 4: size ~2.5px -->
        <path d="M 248 93.5 Q 248 96 250.5 96 Q 248 96 248 98.5 Q 248 96 245.5 96 Q 248 96 248 93.5 Z" fill="#e9d5ff" opacity="0.75" />
        <!-- Star 5: size ~4px -->
        <path d="M 334 42 Q 334 46 338 46 Q 334 46 334 50 Q 334 46 330 46 Q 334 46 334 42 Z" fill="#ffffff" opacity="0.9" />
        <!-- Star 6: size ~3px -->
        <path d="M 418 105 Q 418 108 421 108 Q 418 108 418 111 Q 418 108 415 108 Q 418 108 418 105 Z" fill="#f0abfc" opacity="0.8" />
        <!-- Star 7: size ~4.5px -->
        <path d="M 488 27.5 Q 488 32 492.5 32 Q 488 32 488 36.5 Q 488 32 483.5 32 Q 488 32 488 27.5 Z" fill="#ffffff" opacity="0.92" />
        <!-- Star 8: size ~2.5px -->
        <path d="M 546 79.5 Q 546 82 548.5 82 Q 546 82 546 84.5 Q 546 82 543.5 82 Q 546 82 546 79.5 Z" fill="#e9d5ff" opacity="0.75" />
        <!-- Star 9: size ~3.5px -->
        <path d="M 694 94.5 Q 694 98 697.5 98 Q 694 98 694 101.5 Q 694 98 690.5 98 Q 694 98 694 94.5 Z" fill="#ffffff" opacity="0.85" />
        <!-- Star 10: size ~2.5px -->
        <path d="M 728 31.5 Q 728 34 730.5 34 Q 728 34 728 36.5 Q 728 34 725.5 34 Q 728 34 728 31.5 Z" fill="#f5d0fe" opacity="0.8" />
      </g>

      <!-- Shooting Star (Top-Left) -->
      <g class="scenery-shooting-star">
        <line x1="50" y1="16" x2="148" y2="54" stroke="url(#scenery-shooting-star)" stroke-width="2.2" stroke-linecap="round" />
        <circle cx="148" cy="54" r="2.2" fill="#ffffff" filter="drop-shadow(0 0 3px #f0abfc)" />
        <polygon points="148,51 149.2,54 148,57 146.8,54" fill="#ffffff" />
      </g>

      <!-- Mountain Ridge Observatory Dome (Peak at x=264) -->
      <g class="scenery-observatory">
        <!-- Foundation Base -->
        <rect x="254" y="164" width="20" height="3" rx="1" fill="#3b0764" stroke="#a855f7" stroke-width="0.8" />
        <!-- Semicircular Dome (r≈8) -->
        <path d="M 256 164 A 8 8 0 0 1 272 164 Z" fill="#c084fc" stroke="#f5d0fe" stroke-width="1.1" />
        <!-- Slit Opening -->
        <path d="M 264 156.5 L 266 164" stroke="#2e1065" stroke-width="1.6" stroke-linecap="round" />
        <!-- Telescope Line Poking Out -->
        <line x1="264" y1="160" x2="272" y2="151" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" filter="drop-shadow(0 0 2px #38bdf8)" />
        <circle cx="272" cy="151" r="1.1" fill="#38bdf8" />
      </g>

      <!-- Neon Grass Tufts (Along Ground Line y=220) -->
      <g class="scenery-neon-grass">
        <!-- Tuft 1 (x=58) -->
        <path d="M 55 220 Q 53 214 51 212 M 58 220 Q 59 213 60 210 M 60 220 Q 63 215 65 213" stroke="#d946ef" stroke-width="1.3" stroke-linecap="round" fill="none" />
        <!-- Tuft 2 (x=148) -->
        <path d="M 145 220 Q 144 215 142 213 M 148 220 Q 148 213 149 210 M 150 220 Q 153 215 155 213" stroke="#c026d3" stroke-width="1.3" stroke-linecap="round" fill="none" />
        <!-- Tuft 3 (x=235) -->
        <path d="M 232 220 Q 231 214 229 211 M 235 220 Q 236 212 237 209 M 237 220 Q 240 214 242 212" stroke="#e879f9" stroke-width="1.3" stroke-linecap="round" fill="none" />
        <!-- Tuft 4 (x=372) -->
        <path d="M 369 220 Q 367 214 365 211 M 372 220 Q 373 213 374 210 M 374 220 Q 377 215 379 213" stroke="#a855f7" stroke-width="1.3" stroke-linecap="round" fill="none" />
        <!-- Tuft 5 (x=475) -->
        <path d="M 472 220 Q 470 214 468 212 M 475 220 Q 476 212 477 209 M 478 220 Q 481 215 483 213" stroke="#d946ef" stroke-width="1.3" stroke-linecap="round" fill="none" />
        <!-- Tuft 6 (x=582) -->
        <path d="M 579 220 Q 578 214 576 211 M 582 220 Q 583 212 584 209 M 585 220 Q 587 214 590 212" stroke="#ec4899" stroke-width="1.3" stroke-linecap="round" fill="none" />
        <!-- Tuft 7 (x=682) -->
        <path d="M 679 220 Q 677 214 675 212 M 682 220 Q 683 213 684 210 M 684 220 Q 687 215 689 213" stroke="#c084fc" stroke-width="1.3" stroke-linecap="round" fill="none" />
      </g>

      <!-- Glowing Flower Tufts (Hot Pink/Magenta with Glow Filter) -->
      <g class="scenery-glowing-flowers" filter="url(#scenery-flower-glow)">
        <!-- Flower 1 (x=102) -->
        <g class="neon-flower">
          <line x1="102" y1="220" x2="102" y2="215" stroke="#a855f7" stroke-width="1" />
          <circle cx="100" cy="215" r="1.8" fill="#ec4899" />
          <circle cx="104" cy="215" r="1.8" fill="#ec4899" />
          <circle cx="102" cy="213" r="2" fill="#f43f5e" />
          <circle cx="102" cy="214.5" r="0.9" fill="#ffffff" />
        </g>
        <!-- Flower 2 (x=210) -->
        <g class="neon-flower">
          <line x1="210" y1="220" x2="210" y2="215" stroke="#c084fc" stroke-width="1" />
          <circle cx="208" cy="215" r="1.8" fill="#ec4899" />
          <circle cx="212" cy="215" r="1.8" fill="#ec4899" />
          <circle cx="210" cy="213" r="2" fill="#f43f5e" />
          <circle cx="210" cy="214.5" r="0.9" fill="#ffffff" />
        </g>
        <!-- Flower 3 (x=420) -->
        <g class="neon-flower">
          <line x1="420" y1="220" x2="420" y2="215" stroke="#a855f7" stroke-width="1" />
          <circle cx="418" cy="215" r="1.8" fill="#ec4899" />
          <circle cx="422" cy="215" r="1.8" fill="#ec4899" />
          <circle cx="420" cy="213" r="2" fill="#f43f5e" />
          <circle cx="420" cy="214.5" r="0.9" fill="#ffffff" />
        </g>
        <!-- Flower 4 (x=530) -->
        <g class="neon-flower">
          <line x1="530" y1="220" x2="530" y2="215" stroke="#c084fc" stroke-width="1" />
          <circle cx="528" cy="215" r="1.8" fill="#ec4899" />
          <circle cx="532" cy="215" r="1.8" fill="#ec4899" />
          <circle cx="530" cy="213" r="2" fill="#f43f5e" />
          <circle cx="530" cy="214.5" r="0.9" fill="#ffffff" />
        </g>
        <!-- Flower 5 (x=645) -->
        <g class="neon-flower">
          <line x1="645" y1="220" x2="645" y2="215" stroke="#a855f7" stroke-width="1" />
          <circle cx="643" cy="215" r="1.8" fill="#ec4899" />
          <circle cx="647" cy="215" r="1.8" fill="#ec4899" />
          <circle cx="645" cy="213" r="2" fill="#f43f5e" />
          <circle cx="645" cy="214.5" r="0.9" fill="#ffffff" />
        </g>
      </g>
    </g>
  `;
}

export function getRunnerHillsMarkup(id) {
  const hill = `<path d="M0 220 L0 191 Q95 152 170 194 Q264 135 358 196 Q480 153 565 196 Q660 166 760 194 L760 220 Z" fill="url(#scenery-hill-back)" />
    <path d="M0 220 L0 207 Q100 180 185 210 Q280 178 390 209 Q485 183 590 209 Q670 186 760 207 L760 220 Z" fill="url(#scenery-hill-front)" />`;
  return `${getRunnerSceneryMarkup()}<g class="runner-hills-layer" id="${id}"><g>${hill}</g><g transform="translate(760,0)">${hill}</g></g>`;
}
