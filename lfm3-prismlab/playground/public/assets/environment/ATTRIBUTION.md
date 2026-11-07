# Observatory garden artwork

`observatory-garden.webp` is original artwork generated for PrismLab with OpenAI image generation on 2026-11-03. It was compressed locally to WebP (189,328 bytes). No third-party image assets were incorporated. The six character SVGs are rendered separately by the application.

Typography uses the self-hosted Outfit and Manrope variable fonts from the [Google Fonts repository](https://github.com/google/fonts), each licensed under the SIL Open Font License 1.1. Their license texts are stored in `../fonts/`.

## S0.7 route videos

`01_model_world.mp4` through `08_settings.mp4` were supplied by the user as original Google Flow environment clips. Their untouched source files, including audio, are archived in `playground/original-environments/` outside the deployed `public/` directory. The public MP4 files are silent H.264/yuv420p 720p derivatives encoded with FFmpeg (`libx264`, CRF 28, `-an`, `-movflags +faststart`). Matching WebP posters were extracted from the supplied clips at two seconds. No third-party video or character art was added.
