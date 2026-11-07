# PrismLab P7E — S0.8 visual polish

## Result

The existing eight-route playground has a tighter type scale, more readable foreground panels, and route-specific placement for its original interactive SVG mascots. No gameplay, inference, backend, or mascot geometry was added.

The Championship roster is now inside the arena scene. Five competitors occupy separate positions around the circular floor, while the selected companion takes the center spotlight. Selecting another mascot updates that center position and its specialty. Model World uses a grounded foreground terrace; Arcade and Architecture use shallow room-specific stages; the Playground companion and Trivia host each have a single small floor surface. Research and Settings remain free of large mascots.

## Scene preferences

| Route | Default scene | Mascots |
| --- | --- | --- |
| Model World | Video | Six on observatory terrace |
| AI Playground | Video | One active companion |
| Trivia Arena | WebP still | One host, Spectra |
| Arcade | Video | Six in carnival selection area |
| Research Desk | WebP still | None |
| Models & Architecture | WebP still | Six small architecture selectors |
| Championship | Video in arena stage | Six arena competitors; selected in center |
| Settings | WebP still | None |

All eight routes keep a WebP poster. Reduced motion, data saving, playback failure, or the Settings motion switch use the poster on video routes. The existing optimized MP4s and original source archive remain intact.

## Before and after

The comparisons place the S0.7 screenshot on the left and S0.8 on the right. Championship uses a taller S0.8 capture so the entire arena is visible.

| Route | Desktop | Mobile |
| --- | --- | --- |
| Model World | [Before / after](world-before-after-1440.jpg) | [Before / after](world-before-after-390.jpg) |
| Trivia Arena | [Before / after](trivia-before-after-1440.jpg) | [Before / after](trivia-before-after-390.jpg) |
| Arcade | [Before / after](arcade-before-after-1440.jpg) | [Before / after](arcade-before-after-390.jpg) |
| Championship | [Before / after](championship-before-after-1440.jpg) | [Before / after](championship-before-after-390.jpg) |
| Models & Architecture | [Before / after](architecture-before-after-1440.jpg) | [Before / after](architecture-before-after-390.jpg) |
| Settings | [Before / after](settings-before-after-1440.jpg) | [Before / after](settings-before-after-390.jpg) |

Additional captures: [full desktop arena](championship-stage-1440.png), [full mobile arena](championship-stage-390.png), [full arcade roster](arcade-stage-1440.png). S0.8 screenshots for all eight routes are in this directory at 1440 × 900 and 390 × 844.

## Verification

- `npm run typecheck`: passed.
- `npm test`: four checks passed.
- `npm run build`: passed.
- Existing browser acceptance audit: eight routes loaded, no console errors or failed requests, and no duplicate SVG IDs.
- CDP route audit: expected single video or still poster on each of the eight routes; expected mascot counts; no desktop horizontal overflow.
- CDP fallback audit: reduced motion, data saving, and the persisted Settings motion toggle displayed only the poster.
- CDP mobile audit: no horizontal overflow at 390 px across all eight routes.
- Visual inspection: desktop and mobile captures reviewed for World, Trivia, Arcade, Championship, Architecture, Settings, plus Playground and Research.

The scene artwork remains pre-rendered. Contact shadows, lighting, floor planes, and perspective are CSS compositing cues, not actual 3D geometry.
