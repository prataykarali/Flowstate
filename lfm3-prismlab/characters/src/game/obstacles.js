/**
 * Procedural Obstacle System for PrismLab Endless Runner
 * Original PrismLab hazards evoking a richly glowing neon cyber aesthetic:
 * 1. prism-cactus: Crystal pyramid clusters with glowing core
 * 2. crystal-pillar: Glowing monolith prism pillar with diamond-cut cap & energy core
 * 3. tech-totem: Floating faceted diamond gem with cardinal sparkle crosses
 * 4. floating-cube: Glowing isometric cube with internal triangle & lens-flare sparkle
 */

export const OBSTACLE_TYPES = ['prism-cactus', 'crystal-pillar', 'tech-totem', 'floating-cube'];

let obstacleCounter = 0;

export class Obstacle {
  constructor(type, x, groundY, speed) {
    this.id = `obs_${++obstacleCounter}`;
    this.type = type;
    this.x = x;
    this.groundY = groundY;
    this.speed = speed;
    this.passed = false;

    switch (this.type) {
      case 'crystal-pillar':
        this.width = 30;
        this.height = 70;
        this.y = groundY - this.height;
        this.hitbox = { xOffset: 5, yOffset: 6, width: 20, height: 62 };
        break;

      case 'tech-totem':
        this.width = 36;
        this.height = 62;
        this.y = groundY - this.height;
        this.hitbox = { xOffset: 4, yOffset: 6, width: 28, height: 54 };
        break;

      case 'floating-cube':
        this.width = 32;
        this.height = 32;
        // Low hovering altitude (similar to Dino low pterodactyl)
        this.y = groundY - 50;
        this.hitbox = { xOffset: 4, yOffset: 4, width: 24, height: 24 };
        break;

      case 'prism-cactus':
      default:
        this.width = 40;
        this.height = 54;
        this.y = groundY - this.height;
        this.hitbox = { xOffset: 4, yOffset: 8, width: 32, height: 44 };
        break;
    }
  }

  update(dt, currentSpeed) {
    // currentSpeed is already measured in SVG world units per second.
    this.x -= currentSpeed * dt;
  }

  getBounds() {
    return {
      left: this.x + this.hitbox.xOffset,
      right: this.x + this.hitbox.xOffset + this.hitbox.width,
      top: this.y + this.hitbox.yOffset,
      bottom: this.y + this.hitbox.yOffset + this.hitbox.height
    };
  }

  renderSvg() {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', `game-obstacle obstacle-${this.type}`);
    g.setAttribute('id', this.id);
    g.setAttribute('transform', `translate(${this.x}, ${this.y})`);

    let inner = '';

    if (this.type === 'prism-cactus') {
      // Crystal pyramid clusters: overlapping transparent pyramids with neon edge glow, facet lines, glowing core
      inner = `
        <!-- Ground contact glow -->
        <ellipse cx="20" cy="54" rx="16" ry="2" fill="#c084fc" opacity="0.4" filter="url(#obs-glow-magenta)" />

        <!-- Primary Crystal Pyramid (Taller, Left/Center) -->
        <!-- Facet Left -->
        <polygon points="2,54 16,8 16,54" fill="url(#obs-pyramid-facet1)" fill-opacity="0.8" stroke="#e879f9" stroke-width="1.6" filter="url(#obs-glow-magenta)" />
        <!-- Facet Right -->
        <polygon points="16,54 16,8 30,54" fill="url(#obs-pyramid-facet2)" fill-opacity="0.6" stroke="#e879f9" stroke-width="1.6" filter="url(#obs-glow-magenta)" />
        <!-- Ridge and internal facet lines -->
        <line x1="16" y1="8" x2="16" y2="54" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" opacity="0.9" />
        <line x1="16" y1="28" x2="2" y2="54" stroke="#f5d0fe" stroke-width="1.1" opacity="0.65" />
        <line x1="16" y1="28" x2="30" y2="54" stroke="#f5d0fe" stroke-width="1.1" opacity="0.65" />

        <!-- Secondary Overlapping Crystal Pyramid (Front, Right) -->
        <!-- Facet Left -->
        <polygon points="16,54 28,18 28,54" fill="url(#obs-pyramid-facet-cyan)" fill-opacity="0.75" stroke="#38bdf8" stroke-width="1.5" filter="url(#obs-glow-cyan)" />
        <!-- Facet Right -->
        <polygon points="28,54 28,18 38,54" fill="url(#obs-pyramid-facet-purple)" fill-opacity="0.55" stroke="#38bdf8" stroke-width="1.5" filter="url(#obs-glow-cyan)" />
        <!-- Ridge and internal facet lines -->
        <line x1="28" y1="18" x2="28" y2="54" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round" opacity="0.85" />
        <line x1="28" y1="34" x2="16" y2="54" stroke="#bae6fd" stroke-width="1" opacity="0.6" />
        <line x1="28" y1="34" x2="38" y2="54" stroke="#bae6fd" stroke-width="1" opacity="0.6" />

        <!-- Glowing Core Point at intersection -->
        <circle cx="20" cy="32" r="3.2" fill="#ffffff" filter="url(#obs-glow-bright)" />
        <circle cx="20" cy="32" r="1.6" fill="#fdf4ff" />

        <!-- Apex Sparkles -->
        <circle cx="16" cy="8" r="2.2" fill="#ffffff" filter="url(#obs-glow-bright)" />
        <circle cx="28" cy="18" r="1.8" fill="#ffffff" filter="url(#obs-glow-bright)" />
      `;
    } else if (this.type === 'crystal-pillar') {
      // Glowing monolith prism pillar: diamond-cut top cap, internal energy line, pulsing glow filter, floating particles
      inner = `
        <!-- Ground contact glow -->
        <ellipse cx="15" cy="70" rx="14" ry="2.5" fill="#c084fc" opacity="0.5" filter="url(#obs-glow-magenta)" />

        <!-- Monolith Pillar Body -->
        <polygon points="5,16 15,18 15,70 5,70" fill="url(#obs-pillar-facet-l)" stroke="#c084fc" stroke-width="1.2" />
        <polygon points="15,18 25,16 25,70 15,70" fill="url(#obs-pillar-facet-r)" stroke="#a855f7" stroke-width="1.2" />
        <!-- Outer edge luminous highlights -->
        <line x1="5" y1="16" x2="5" y2="70" stroke="#f0abfc" stroke-width="1.3" opacity="0.8" />
        <line x1="25" y1="16" x2="25" y2="70" stroke="#c084fc" stroke-width="1.3" opacity="0.8" />

        <!-- Diamond-Cut Top Cap -->
        <polygon points="15,2 5,16 15,19" fill="url(#obs-cap-facet-l)" stroke="#f5d0fe" stroke-width="1.2" />
        <polygon points="15,2 25,16 15,19" fill="url(#obs-cap-facet-r)" stroke="#e879f9" stroke-width="1.2" />
        <circle cx="15" cy="2" r="2.2" fill="#ffffff" filter="url(#obs-glow-bright)" />

        <!-- Internal Laser Energy Core Line with Pulsing Glow Filter -->
        <line x1="15" y1="20" x2="15" y2="67" stroke="#e879f9" stroke-width="4" stroke-linecap="round" opacity="0.6" filter="url(#obs-laser-glow)" />
        <line x1="15" y1="18" x2="15" y2="68" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" filter="url(#obs-pulsing-glow)" />
        <circle cx="15" cy="32" r="2.2" fill="#ffffff" opacity="0.95" />
        <circle cx="15" cy="50" r="2" fill="#ffffff" opacity="0.9" />

        <!-- Floating Particles Around Pillar -->
        <circle cx="2" cy="22" r="1.4" fill="#38bdf8" opacity="0.9" filter="url(#obs-glow-cyan)" />
        <polygon points="28,26 30,28 28,30 26,28" fill="#ffffff" opacity="0.85" filter="url(#obs-glow-magenta)" />
        <circle cx="1" cy="46" r="1.5" fill="#f0abfc" opacity="0.8" />
        <polygon points="28,50 30,52 28,54 26,52" fill="#a855f7" opacity="0.85" />
        <circle cx="3" cy="62" r="1.2" fill="#ffffff" opacity="0.75" />
        <circle cx="27" cy="38" r="1.3" fill="#e879f9" opacity="0.8" />
      `;
    } else if (this.type === 'tech-totem') {
      // Floating diamond/gem: rotated square with faceted internal lines, cardinal sparkle crosses
      inner = `
        <!-- Floating Ground Shadow / Energy Tether -->
        <ellipse cx="18" cy="60" rx="12" ry="2" fill="#38bdf8" opacity="0.3" filter="url(#obs-glow-cyan)" />
        <line x1="18" y1="50" x2="18" y2="58" stroke="#818cf8" stroke-width="1" stroke-dasharray="2,2" opacity="0.6" />

        <!-- Outer Rotated Diamond Body -->
        <polygon points="18,10 32,30 18,50 4,30" fill="url(#obs-gem-body)" stroke="#38bdf8" stroke-width="1.8" filter="url(#obs-glow-cyan)" />

        <!-- Inner Faceted Diamond & Internal Facet Lines -->
        <polygon points="18,18 26,30 18,42 10,30" fill="url(#obs-gem-core)" stroke="#bae6fd" stroke-width="1.2" />
        <line x1="18" y1="10" x2="18" y2="18" stroke="#ffffff" stroke-width="1.4" opacity="0.9" />
        <line x1="32" y1="30" x2="26" y2="30" stroke="#ffffff" stroke-width="1.4" opacity="0.9" />
        <line x1="18" y1="50" x2="18" y2="42" stroke="#ffffff" stroke-width="1.4" opacity="0.9" />
        <line x1="4" y1="30" x2="10" y2="30" stroke="#ffffff" stroke-width="1.4" opacity="0.9" />
        <!-- Cross Facet Lines -->
        <line x1="18" y1="18" x2="18" y2="42" stroke="#e0e7ff" stroke-width="1" opacity="0.75" />
        <line x1="10" y1="30" x2="26" y2="30" stroke="#e0e7ff" stroke-width="1" opacity="0.75" />

        <!-- Glowing Center Point -->
        <circle cx="18" cy="30" r="2.8" fill="#ffffff" filter="url(#obs-glow-bright)" />

        <!-- Small Sparkle Crosses at Cardinal Points -->
        <!-- North -->
        <path d="M 18 1 L 18 6 M 15.5 3.5 L 20.5 3.5" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round" filter="url(#obs-glow-cyan)" />
        <circle cx="18" cy="3.5" r="1" fill="#ffffff" />
        <!-- South -->
        <path d="M 18 54 L 18 59 M 15.5 56.5 L 20.5 56.5" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round" filter="url(#obs-glow-cyan)" />
        <circle cx="18" cy="56.5" r="1" fill="#ffffff" />
        <!-- West -->
        <path d="M 1 27.5 L 1 32.5 M -1.5 30 L 3.5 30" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round" filter="url(#obs-glow-cyan)" />
        <circle cx="1" cy="30" r="1" fill="#ffffff" />
        <!-- East -->
        <path d="M 35 27.5 L 35 32.5 M 32.5 30 L 37.5 30" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round" filter="url(#obs-glow-cyan)" />
        <circle cx="35" cy="30" r="1" fill="#ffffff" />
      `;
    } else if (this.type === 'floating-cube') {
      // Glowing cube with internal triangle: isometric cube outline, glowing triangle, lens-flare sparkle at center
      inner = `
        <!-- Isometric Cube Faces (Semi-transparent Holographic) -->
        <!-- Top Face -->
        <polygon points="16,2 29,9.5 16,16.5 3,9.5" fill="url(#obs-cube-face-top)" fill-opacity="0.45" stroke="#f0abfc" stroke-width="1.4" filter="url(#obs-glow-magenta)" />
        <!-- Left Face -->
        <polygon points="3,9.5 16,16.5 16,31 3,23.5" fill="url(#obs-cube-face-left)" fill-opacity="0.4" stroke="#c084fc" stroke-width="1.4" filter="url(#obs-glow-magenta)" />
        <!-- Right Face -->
        <polygon points="16,16.5 29,9.5 29,23.5 16,31" fill="url(#obs-cube-face-right)" fill-opacity="0.35" stroke="#a855f7" stroke-width="1.4" filter="url(#obs-glow-magenta)" />

        <!-- Cube Center Ridge Lines -->
        <line x1="16" y1="16.5" x2="16" y2="31" stroke="#f0abfc" stroke-width="1.2" opacity="0.75" />
        <line x1="16" y1="16.5" x2="3" y2="9.5" stroke="#f0abfc" stroke-width="1.2" opacity="0.75" />
        <line x1="16" y1="16.5" x2="29" y2="9.5" stroke="#f0abfc" stroke-width="1.2" opacity="0.75" />

        <!-- Glowing Equilateral Triangle Inside -->
        <polygon points="16,7.5 24,21.5 8,21.5" fill="url(#obs-triangle-glow-fill)" fill-opacity="0.65" stroke="#38bdf8" stroke-width="1.8" filter="url(#obs-glow-cyan)" />
        <line x1="16" y1="7.5" x2="16" y2="16.5" stroke="#ffffff" stroke-width="1.2" opacity="0.8" />
        <line x1="24" y1="21.5" x2="16" y2="16.5" stroke="#ffffff" stroke-width="1.2" opacity="0.8" />
        <line x1="8" y1="21.5" x2="16" y2="16.5" stroke="#ffffff" stroke-width="1.2" opacity="0.8" />

        <!-- Lens-Flare Style Cross Sparkle at Center -->
        <polygon points="5,16.5 16,15.2 27,16.5 16,17.8" fill="#ffffff" filter="url(#obs-glow-bright)" />
        <polygon points="16,5.5 17.3,16.5 16,27.5 14.7,16.5" fill="#ffffff" filter="url(#obs-glow-bright)" />
        <line x1="11" y1="11.5" x2="21" y2="21.5" stroke="#ffffff" stroke-width="1" opacity="0.75" />
        <line x1="21" y1="11.5" x2="11" y2="21.5" stroke="#ffffff" stroke-width="1" opacity="0.75" />
        <circle cx="16" cy="16.5" r="2.2" fill="#ffffff" filter="url(#obs-glow-cyan)" />
      `;
    }

    g.innerHTML = inner;
    return g;
  }
}

export function getObstacleGradients() {
  return `
    <defs>
      <!-- Glow Filters -->
      <filter id="obs-glow-magenta" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="0" stdDeviation="2.5" flood-color="#e879f9" flood-opacity="0.8" />
      </filter>

      <filter id="obs-glow-cyan" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="0" stdDeviation="2.5" flood-color="#38bdf8" flood-opacity="0.8" />
      </filter>

      <filter id="obs-glow-bright" x="-60%" y="-60%" width="220%" height="220%">
        <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#ffffff" flood-opacity="0.9" />
      </filter>

      <filter id="obs-laser-glow" x="-50%" y="-20%" width="200%" height="140%">
        <feDropShadow dx="0" dy="0" stdDeviation="3.5" flood-color="#ec4899" flood-opacity="0.85" />
      </filter>

      <filter id="obs-pulsing-glow" x="-50%" y="-20%" width="200%" height="140%">
        <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#ffffff" flood-opacity="1" />
        <feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="#e879f9" flood-opacity="0.75" />
      </filter>

      <!-- Crystal Pyramid Clusters Gradients -->
      <linearGradient id="obs-pyramid-facet1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fdf4ff" />
        <stop offset="45%" stop-color="#c084fc" />
        <stop offset="100%" stop-color="#581c87" />
      </linearGradient>

      <linearGradient id="obs-pyramid-facet2" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#fae8ff" />
        <stop offset="50%" stop-color="#a855f7" />
        <stop offset="100%" stop-color="#3b0764" />
      </linearGradient>

      <linearGradient id="obs-pyramid-facet-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#e0f2fe" />
        <stop offset="55%" stop-color="#38bdf8" />
        <stop offset="100%" stop-color="#1e1b4b" />
      </linearGradient>

      <linearGradient id="obs-pyramid-facet-purple" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#f5d0fe" />
        <stop offset="100%" stop-color="#6b21a8" />
      </linearGradient>

      <!-- Backwards compatibility for cactus IDs -->
      <linearGradient id="obs-cactus-body" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fae8ff" />
        <stop offset="45%" stop-color="#c084fc" />
        <stop offset="100%" stop-color="#6b21a8" />
      </linearGradient>
      <linearGradient id="obs-cactus-side" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#e9d5ff" />
        <stop offset="60%" stop-color="#a855f7" />
        <stop offset="100%" stop-color="#581c87" />
      </linearGradient>

      <!-- Monolith Pillar Gradients -->
      <linearGradient id="obs-pillar-facet-l" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#581c87" />
        <stop offset="60%" stop-color="#7e22ce" />
        <stop offset="100%" stop-color="#3b0764" />
      </linearGradient>

      <linearGradient id="obs-pillar-facet-r" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#3b0764" />
        <stop offset="60%" stop-color="#581c87" />
        <stop offset="100%" stop-color="#1e1b4b" />
      </linearGradient>

      <linearGradient id="obs-cap-facet-l" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="50%" stop-color="#f0abfc" />
        <stop offset="100%" stop-color="#a855f7" />
      </linearGradient>

      <linearGradient id="obs-cap-facet-r" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#f5d0fe" />
        <stop offset="60%" stop-color="#c084fc" />
        <stop offset="100%" stop-color="#6b21a8" />
      </linearGradient>

      <linearGradient id="obs-pillar-body" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#3b0764" />
        <stop offset="50%" stop-color="#6b21a8" />
        <stop offset="100%" stop-color="#4c1d95" />
      </linearGradient>

      <!-- Floating Gem Gradients -->
      <linearGradient id="obs-gem-body" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#e0f2fe" stop-opacity="0.95" />
        <stop offset="45%" stop-color="#38bdf8" stop-opacity="0.85" />
        <stop offset="100%" stop-color="#312e81" stop-opacity="0.9" />
      </linearGradient>

      <linearGradient id="obs-gem-core" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#bae6fd" />
        <stop offset="50%" stop-color="#0284c7" />
        <stop offset="100%" stop-color="#1e1b4b" />
      </linearGradient>

      <!-- Floating Cube Gradients -->
      <linearGradient id="obs-cube-face-top" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fdf4ff" />
        <stop offset="50%" stop-color="#e879f9" />
        <stop offset="100%" stop-color="#7c3aed" />
      </linearGradient>

      <linearGradient id="obs-cube-face-left" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#f5d0fe" />
        <stop offset="60%" stop-color="#c084fc" />
        <stop offset="100%" stop-color="#4c1d95" />
      </linearGradient>

      <linearGradient id="obs-cube-face-right" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#e9d5ff" />
        <stop offset="60%" stop-color="#a855f7" />
        <stop offset="100%" stop-color="#2e1065" />
      </linearGradient>

      <linearGradient id="obs-triangle-glow-fill" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="50%" stop-color="#38bdf8" />
        <stop offset="100%" stop-color="#0284c7" />
      </linearGradient>

      <linearGradient id="obs-cube-body" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fdf4ff" />
        <stop offset="50%" stop-color="#d946ef" />
        <stop offset="100%" stop-color="#581c87" />
      </linearGradient>
    </defs>
  `;
}
