# PrismLab S0.7 implementation walkthrough

## Design direction

The eight sections now share a quiet PrismLab interface around eight distinct Google Flow scenes. The approach uses the [RayCodes Unslop showcase](https://github.com/47thtechcorner/RayCodes_Unslop) as a design reference: the animated scene carries the visual interest, while navigation, controls, and data surfaces use restrained color, spacing, and labels. No code or assets from that repository were copied.

## Pages

- **Model World:** The supplied garden video replaces the static stage backdrop. All six original SVG mascots remain interactive above it, with shared mobile terrace bands and the existing model spotlight.
- **AI Playground:** A prompt draft is explicitly marked as not executed. The page shows only existing recorded replay summaries and a selected model companion. The previous generated-looking trace response was removed.
- **Trivia Arena:** Existing four verified questions remain. They are shown one at a time with progress, score, explanation, keyboard-accessible options, and Spectra as the host.
- **Arcade:** Two future-game previews and a six-character selection area; no game mechanics were added.
- **Research Desk:** Seven existing milestones remain, now in a readable two-column layout with links to the corresponding repository reports.
- **Architecture:** Existing comparison table and P7 links remain, with a six-character explorer above them.
- **Championship:** Future challenge tracks and six selectable companions are explicitly labeled as previews. No rankings, scores, or judging were added.
- **Settings:** A persistent animated-background switch controls the actual video layer. Existing replay archive and runtime information remain available.

The selected canonical model ID is shared across Model World, Playground, Arcade, Architecture, and Championship using a small React context. The original `characters/` prototype and Python modules were not modified.

## Media system

`src/data/sceneManifest.ts` maps the eight routes to their MP4 and WebP assets. `src/components/environment/SceneBackground.tsx` mounts one native video for the active route, with a poster always underneath. It mutes playback, loops, pauses on document visibility changes, and falls back to the poster when playback fails. Reduced motion, the Settings switch, and browser data saving display only the poster. The scene layer never captures pointer events.

All eight sources were 1280×720, 24 fps, H.264 MP4, approximately 10 seconds, with AAC audio. The optimized public files remain 1280×720 H.264/yuv420p, silent, and use `faststart`. The originals were moved with user approval to `playground/original-environments/` and left unchanged there. No duplicate source encodes remain in `public/`.

| Asset group | Bytes |
| --- | ---: |
| Eight original source videos (outside `public/`) | 28,351,602 |
| Eight optimized public videos | 3,812,199 |
| Eight WebP posters | 385,746 |
| Total new deployed route media | 4,197,945 |

The existing S0.6 static illustration remains in `public/assets/environment/` as a 189 KB legacy asset. The two self-hosted font files remain unchanged.

## Verification

- `npm run typecheck`, `npm test` (4 passing), and `npm run build` passed.
- The existing browser audit found six World mascots, no duplicate SVG IDs, working selection, all eight routes, and no console or network errors.
- Browser media checks found exactly one active video and one poster on every route, with the correct source file. A 10-second clip looped and continued playing. Reduced-motion emulation and the Settings switch removed the video while retaining the poster. Blocking a video URL also retained its poster.
- All eight pages were captured at 1440×900 and 390×844; World, Playground, and Settings were also captured at 1024×768. Browser layout checks found no horizontal overflow on any route at 1024px or 390px widths.
- The app did not gain a new runtime dependency, inference path, game engine, or backend feature.

## Screenshots

Desktop and mobile screenshots for all eight routes are in this directory, named `<route>-1440.png` and `<route>-390.png`. World, Playground, and Settings also have `<route>-1024.png`.
