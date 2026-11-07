import React from 'react';
import { AccessoryType } from '../../data/models.ts';

interface MascotAccessoriesProps {
  prefix: string;
  accessories: AccessoryType[];
}

export const MascotAccessories: React.FC<MascotAccessoriesProps> = ({ prefix: p, accessories }) => {
  return (
    <g className="mascot-accessories-layer">
      {/* 1. Wire-Rimmed Glasses */}
      {accessories.includes('glasses') && (
        <g className="accessory-glasses" style={{ transformOrigin: '90px 95px' }}>
          {/* Bridge */}
          <path
            d="M 85 96.5 Q 90 94.5 95 96.5"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.3"
            strokeLinecap="round"
          />
          {/* Left Lens Frame */}
          <circle
            cx="73"
            cy="98"
            r="13"
            fill="rgba(255, 255, 255, 0.08)"
            stroke="#ffffff"
            strokeWidth="2.3"
            filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
          />
          {/* Left Lens Glint */}
          <path
            d="M 65 91 Q 72 87 77 91"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.85"
          />
          {/* Right Lens Frame */}
          <circle
            cx="107"
            cy="92"
            r="13"
            fill="rgba(255, 255, 255, 0.08)"
            stroke="#ffffff"
            strokeWidth="2.3"
            filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
          />
          {/* Right Lens Glint */}
          <path
            d="M 99 85 Q 106 81 111 85"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.85"
          />
          {/* Temples */}
          <path d="M 60 97 L 53 96" fill="none" stroke="#ffffff" strokeWidth="2.0" strokeLinecap="round" />
          <path d="M 120 91 L 127 90" fill="none" stroke="#ffffff" strokeWidth="2.0" strokeLinecap="round" />
        </g>
      )}

      {/* 2. Over-Ear Headphones */}
      {accessories.includes('headphones') && (
        <g className="accessory-headphones">
          {/* Headband Arc */}
          <path
            d="M 43 103 C 41 52, 139 46, 137 97"
            fill="none"
            stroke="#331e48"
            strokeWidth="6.5"
            strokeLinecap="round"
            filter="drop-shadow(0 3px 6px rgba(0,0,0,0.4))"
          />
          {/* Metallic Inner Highlight */}
          <path
            d="M 44 101 C 43 55, 137 49, 136 95"
            fill="none"
            stroke="#c084fc"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.65"
          />
          {/* Left Ear Cup */}
          <rect
            x="36"
            y="86"
            width="14"
            height="28"
            rx="7"
            fill={`url(#${p}earCupGrad)`}
            stroke="#674488"
            strokeWidth="1.8"
            filter="drop-shadow(0 4px 8px rgba(0,0,0,0.5))"
          />
          <rect x="44" y="90" width="4" height="20" rx="2" fill={`url(#${p}earCushionGrad)`} />
          {/* Right Ear Cup */}
          <rect
            x="130"
            y="80"
            width="14"
            height="28"
            rx="7"
            fill={`url(#${p}earCupGrad)`}
            stroke="#674488"
            strokeWidth="1.8"
            filter="drop-shadow(0 4px 8px rgba(0,0,0,0.5))"
          />
          <rect x="132" y="84" width="4" height="20" rx="2" fill={`url(#${p}earCushionGrad)`} />
        </g>
      )}

      {/* 3. Detective Fedora Hat */}
      {accessories.includes('hat') && (
        <g className="accessory-hat">
          {/* Head Shadow */}
          <ellipse cx="90" cy="76" rx="36" ry="6" fill="#1e102d" opacity="0.45" />
          {/* Crown */}
          <path
            d="M 68 76 Q 72 54 85 55 Q 90 60 95 55 Q 108 54 112 76 Z"
            fill={`url(#${p}hatCrownGrad)`}
            stroke="#4a375f"
            strokeWidth="1.2"
          />
          {/* Hatband Ribbon */}
          <path
            d="M 68 73 Q 90 68 112 73 L 112 76 Q 90 71 68 76 Z"
            fill={`url(#${p}hatBandGrad)`}
          />
          {/* Curled Brim */}
          <path
            d="M 54 78 Q 90 67 126 78 Q 90 73 54 78 Z"
            fill={`url(#${p}hatBrimGrad)`}
            stroke="#3b2552"
            strokeWidth="1.2"
            filter="drop-shadow(0 3px 6px rgba(0,0,0,0.4))"
          />
        </g>
      )}

      {/* 4. Magnifying Glass */}
      {accessories.includes('magnifier') && (
        <g className="accessory-magnifier">
          {/* Handle */}
          <path
            d="M 124 124 L 138 138"
            stroke={`url(#${p}handleGrad)`}
            strokeWidth="5"
            strokeLinecap="round"
          />
          {/* Lens Frame & Glass */}
          <circle
            cx="116"
            cy="116"
            r="14"
            fill={`url(#${p}lensGlassGrad)`}
            stroke={`url(#${p}lensFrameGrad)`}
            strokeWidth="2.8"
            filter={`url(#${p}magGlassGlow)`}
          />
          {/* Reflection Glint */}
          <path
            d="M 108 112 Q 114 107 121 110"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.8"
          />
        </g>
      )}

      {/* 5. Thinker Monocle */}
      {accessories.includes('monocle') && (
        <g className="accessory-monocle">
          {/* Rim & Glass */}
          <circle
            cx="73"
            cy="98"
            r="13.5"
            fill={`url(#${p}monocleGlassGrad)`}
            stroke={`url(#${p}monocleRimGrad)`}
            strokeWidth="2.2"
            filter="drop-shadow(0 2px 5px rgba(0,0,0,0.35))"
          />
          {/* Lens Glint */}
          <path
            d="M 65 91 Q 72 87 77 91"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.85"
          />
          {/* Beaded Chain */}
          <path
            d="M 73 111.5 Q 70 126 62 133"
            fill="none"
            stroke="#fef08a"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeDasharray="2.8,2.2"
            filter="drop-shadow(0 1px 2px rgba(0,0,0,0.4))"
          />
        </g>
      )}

      {/* 6. Floating Thought Prism */}
      {accessories.includes('prism') && (
        <g className="accessory-prism">
          <g filter={`url(#${p}prismGlow)`}>
            {/* Top Facet */}
            <polygon
              points="124,72 134,84 124,96 114,84"
              fill={`url(#${p}prismFacet1)`}
              opacity="0.9"
            />
            {/* Left Facet */}
            <polygon
              points="114,84 124,96 124,84"
              fill={`url(#${p}prismFacet2)`}
              opacity="0.8"
            />
            {/* Right Facet */}
            <polygon
              points="134,84 124,96 124,84"
              fill={`url(#${p}prismFacet3)`}
              opacity="0.85"
            />
          </g>
          {/* Central Sparkle */}
          <circle cx="124" cy="84" r="1.5" fill="#ffffff" opacity="0.95" />
        </g>
      )}
    </g>
  );
};
