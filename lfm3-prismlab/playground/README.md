# PrismLab Playground (P7E · S0)

Standalone interactive presentation frontend for the Liquid AI LFM3 multimodal model family, featuring the six living animated SVG mascots.

## Quick Start

```bash
# Navigate to playground
cd lfm3-prismlab/playground

# Install dependencies
npm install

# Start development server
npm run dev

# Run automated tests
npm test

# Run strict TypeScript typecheck
npm run typecheck

# Production build
npm run build
```

## Architecture & Eight Sections

The application is built on React 19, TypeScript 5, and Vite 6 with zero-dependency hash routing (`#world`, `#playground`, `#trivia`, `#arcade`, `#research`, `#architecture`, `#championship`, `#settings`):

1. **🌌 Model World (`#world`)**: Living showcase stage with all six signature animated SVG mascots on glowing pedestals with organic breathing floats, pupil gaze tracking, organic blinking, and single-click reaction bounces.
2. **⚡ AI Playground (`#playground`)**: Interactive multimodal prompt sandbox displaying verified execution trace replays from P1–P6 benchmark milestones.
3. **🎯 Trivia Arena (`#trivia`)**: Technical quiz testing architectural knowledge on LFM3 hybrid schedules, GatedDeltaNet recurrence, and S2S latency.
4. **🕹️ Arcade (`#arcade`)**: Preview of the upcoming Endless Mascot Runner and Story Relay challenges.
5. **📊 Research Desk (`#research`)**: Summaries of verified empirical findings across Milestones P1 through P7.
6. **🏛️ Models & Architecture (`#architecture`)**: Six-model architectural comparison matrix with direct links to validated repository diagrams in `visuals/`.
7. **🏆 Championship (`#championship`)**: Competitive evaluation arena tracking benchmark leaderboards across TTFT, OCR, speech, and decision routing.
8. **⚙️ Settings (`#settings`)**: Archive of verified P6 execution replays, runtime health status, and accessibility motion settings.

## Model Mapping Contract

All six models map to canonical backend IDs:

| Canonical Key | Model Name | Character Slug | Accessories | Primary Flow |
| :--- | :--- | :--- | :--- | :--- |
| `text` | LFM3-1.7B | `lfm3-17b` | None | Document (Language) |
| `vision` | LFM3-VL-2B | `lfm3-vl-2b` | Wire-rimmed Glasses | Document (OCR/Vision) |
| `audio` | LFM3-Audio-2B | `lfm3-audio-2b` | Over-ear Headphones | Voice (Speech-to-Speech) |
| `omni` | LFM3-Omni-2B | `lfm3-omni-2b` | Glasses + Headphones | Unified Multimodal |
| `d1` | d1-2B | `d1-2b` | Monocle + Thought Prism | Decision Intelligence |
| `d1_omni` | d1-Omni-2B | `d1-omni-2b` | Detective Hat + Magnifier | Audio-Visual Decision |

## Mascot Preservation & ID Isolation

Each `<Mascot />` component uses instance-scoped prefixing (`useId()`) for all `<linearGradient>`, `<radialGradient>`, `<clipPath>`, and `<filter>` tags. This ensures that multiple instances of any mascot can render concurrently without SVG ID collision or visual gradient bleed.

## Security & Anti-Bloat Policy

- **No live inference tokens**: `PRISMLAB_LIVE_TOKEN` is never exposed or bundled in client builds.
- **Zero asset duplication**: No large videos or external media duplicated into `public/`.
- **Pure vector graphics**: 100% SVG rendering.
- **Reduced motion support**: Fully honors `@media (prefers-reduced-motion: reduce)`.
