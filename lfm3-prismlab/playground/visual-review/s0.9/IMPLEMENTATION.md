# PrismLab P7E — S0.9 implementation

## Result

The eight-route playground now has a stronger editorial hierarchy, warmer route-specific surfaces, restrained page and card motion, and a two-view Architecture experience. The main feature is an interactive execution pipeline with the six original SVG mascots as selectable model nodes. The app still has no live inference, generated trivia, games, or tournament scoring.

## Design references inspected

The original implementation draws on the interaction vocabulary visible at [Vengeance UI](https://www.vengenceui.com/) (hover, press, and restrained motion), the big-type and layout categories at [Landbook](https://land-book.com/), component hierarchy examples at [Landingfolio](https://www.landingfolio.com/), source-owned micro-interactions at [React Bits](https://www.reactbits.dev/), creative interface examples at [Codrops](https://tympanus.net/codrops/), and the mixed media curation at [Recent](https://recent.design/). No reference site or component was copied. No UI or animation library was installed.

## Visual and interaction changes

- Existing Manrope and Outfit fonts gain clearer type scales, larger headings, and more legible body text. Their self-hosted OFL license files remain in place.
- Page transitions, heading entrances, card elevation, button feedback, model-selected states, research section entry, and graph edge highlighting use CSS transforms and opacity. Reduced motion removes automated motion, including trace autoplay.
- The six model worlds and eight established environments remain. World, Playground, Arcade, and Championship retain video; Trivia, Research, Architecture, and Settings retain still WebP backgrounds.
- Model World has clearer discovery copy; Arcade and Championship retain their staged mascot areas and gain more expressive interaction feedback. Settings keeps calm controls and now lists the six actual preserved P6 runs.
- Research Desk has a light editorial figure panel using the canonical P7 phase-local latency chart. Copy states its comparison limits, and the P5 section now discloses the known incorrect auto-recommendation and uncalibrated confidence.
- Trivia retains the four curated questions. Its score, question, and explanation transitions are calmer; each question links to a research source. A content type reserves model-generated candidates as unvalidated, with no generated content or automated grading added.

## Execution pipeline

The graph follows the README topology: user request → Python pipeline → deterministic router → local dispatcher → one of six registered model pathways → output → evaluation/logging. Model registry feeds the router. Connection paths are measured from live DOM node positions and drawn in one SVG layer, so the graph responds to desktop and mobile layouts. All model nodes are the shared interactive `Mascot` SVG component.

Six sample route choices use a TypeScript mirror of `prismlab/core/router.py`. The mirror was compared against the Python function for 24 task and modality combinations. A route preview highlights only the predicted path to a model; it never suggests that output or evaluation ran. Unsupported modality combinations are marked as registry mismatches.

Six recorded P6 JSON files are served directly from `results/p6/public_replays/` through a small Vite asset plugin. They are the only replay data source. Selection shows the preserved model route, trace stages, measured stage/total latency when present, recorded output, evaluation scope, and source JSON. Play, pause, restart, and step controls advance only through stages present in the record. The step pacing is labeled illustrative because the files do not contain stage start timestamps. No trace is presented as internal neural execution.

The replay records do not preserve a task-category field or complete input-modality set, so the UI says “Not in replay record” rather than inferring or inventing those fields. Live inference remains unavailable.

## P7 internal architecture

Architecture has separate tabs for PrismLab orchestration and configured internal model structure. The second view shows six verified component summaries from the P7 report and component maps, an embedded original model HTML visualization on desktop, the corresponding Mermaid source, and official model links. Mobile offers a full-view link because the detailed graph is too dense to embed legibly at 390 px.

`vite.config.ts` serves canonical P6 JSON, P7 HTML, Mermaid, and selected P7 figures in development and emits byte-identical copies to production output. There is no second editable source tree. Development and production URLs returned HTTP 200; source and output SHA-256 hashes matched for checked replay and HTML files.

## Files changed

- `vite.config.ts`
- `src/data/pipeline.ts`, `src/data/architectureEvidence.ts`, `src/data/models.ts`
- `src/lib/replays.ts`, `src/lib/api.ts`
- `src/components/pipeline/PipelineExplorer.tsx`
- `src/pages/Architecture.tsx`, `Playground.tsx`, `Research.tsx`, `Trivia.tsx`, `Home.tsx`, `Championship.tsx`, `Settings.tsx`
- `src/app/routes.ts`, `src/styles/global.css`
- `tests/pipeline.test.js`, `tests/s09-browser-audit.mjs`
- This report and the `visual-review/s0.9/` screenshots

## Before and after screenshots

Left is S0.8; right is S0.9. The comparison images use 1440 × 900 desktop and 390 × 844 mobile viewport captures.

| Route | Desktop | Mobile |
| --- | --- | --- |
| Model World | [Before / after](world-before-after-1440.jpg) | [Before / after](world-before-after-390.jpg) |
| AI Playground | [Before / after](playground-before-after-1440.jpg) | [Before / after](playground-before-after-390.jpg) |
| Trivia | [Before / after](trivia-before-after-1440.jpg) | [Before / after](trivia-before-after-390.jpg) |
| Arcade | [Before / after](arcade-before-after-1440.jpg) | [Before / after](arcade-before-after-390.jpg) |
| Research Desk | [Before / after](research-before-after-1440.jpg) | [Before / after](research-before-after-390.jpg) |
| Architecture | [Before / after](architecture-before-after-1440.jpg) | [Before / after](architecture-before-after-390.jpg) |
| Championship | [Before / after](championship-before-after-1440.jpg) | [Before / after](championship-before-after-390.jpg) |
| Settings | [Before / after](settings-before-after-1440.jpg) | [Before / after](settings-before-after-390.jpg) |

Feature views: [pipeline close-up](pipeline-feature-1440.jpg), [full execution graph](architecture-full-1440.png), [recorded replay at inference stage](recorded-pipeline-1440.png), [embedded P7 internal diagram](internal-architecture-1440.png), [mobile internal view](internal-architecture-390.png), [full Playground workspace](playground-full-1440.png).

## Verification and size

- `npm run typecheck`: passed.
- `npm test`: 7 checks passed, including graph topology, six canonical routes, 24 parity cases against the Python router, and replay record validation.
- `npm run build`: passed.
- `node tests/s09-browser-audit.mjs`: passed. Covered all eight routes, six mascot nodes, keyboard Enter/Space, route selection, replay stage stepping and edge activation, P7 asset access, Trivia scoring, reduced motion, no SVG ID collisions, no mobile horizontal overflow, and no console/network errors.
- `python3 -m unittest discover -s tests -p 'test_p6*.py' -q`: 90 backend regression tests passed. Backend files were not changed.
- Production preview served canonical replay JSON, P7 HTML, main explorer, Mermaid source, and P7 chart URLs successfully.

No dependencies were added. S0.8 main JavaScript was 291.34 KB (87.45 KB gzip); S0.9 is 304.26 KB (91.85 KB gzip). CSS rose from 43.20 KB (10.29 KB gzip) to 60.34 KB (13.73 KB gzip). The additional built research assets are source-derived static files, not new downloaded media.

## Remaining limits

The graph previews deterministic routing and plays preserved traces. It does not execute a model. P7 visualizations show configured components, not every tensor-level operation. P5 decision confidence is not production-calibrated; the known incorrect auto-recommendation and human-review requirement remain material. No S1 gameplay or live inference was started.
