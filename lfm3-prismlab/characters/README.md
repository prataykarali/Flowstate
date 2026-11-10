# PrismLab mascots

Run `npm install` and `npm run dev`. Use `npm test` for the core behavior checks and `npm run build` for a production build.

The six SVG mascots remain interactive. Click or tap once for a reaction and a short speech bubble. Double click, double tap, or press Enter on a focused mascot to open its runner. Press Space on a focused mascot for a reaction. The gallery voice control is off by default; enabling it uses browser speech synthesis when available. The runner waits at a ready screen until you start it, then accepts Space or Up to jump, Down or S to dodge, and Escape to close. The embedded runner clip loads only when play begins.

## Background clips

The supplied gallery and runner clips are in `public/media/backgrounds/gallery-night.mp4` and `public/media/backgrounds/runner-night.mp4`. Matching WebP posters are there too. To replace them, keep the same filenames or add `gallery-night.webm` and `runner-night.webm` for preferred WebM playback. Videos must contain scenery only; mascots, obstacles, UI, and terrain are rendered by the app. The CSS scenery and posters remain visible if a video cannot load. Videos play muted and pause when the page is hidden or reduced motion is requested.

## Manual checks

At 375, 768, 1024, and 1440 px, check that the header, all six mascots, and runner are reachable without horizontal scrolling. Check that eyes follow the pointer gently, that single click shows a character line without opening the runner, and that double click opens the selected mascot. Jump over an obstacle, collide, restart, and close and reopen the runner. Enable reduced motion in the operating system and confirm that controls remain usable with video and ambient motion suppressed.
