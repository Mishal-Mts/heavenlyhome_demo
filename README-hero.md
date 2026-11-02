# Hero video: swapping clips and rebuilding

1. One-time setup (tools live outside the project): `npm install --prefix "%TEMP%\defender-hero-tools" ffmpeg-static ffprobe-static`
2. Drop the new clips into the source folder (`sourceDir` in `hero-video.config.json`, now `videos_1/`). The originals are only read.
3. Edit `hero-video.config.json`: list the clips in play order (first = opening and poster), with `start`/`end` trim and `speed` for each; adjust `crossfade`, sizes, CRF, size caps and the `grade` values if needed.
4. Run `node tools/build-hero.mjs`. It writes `videos/hero.mp4`, `hero.webm`, `hero-mobile.mp4`, `hero-mobile.webm` and `images/hero-poster.jpg` (+ `.webp` and mobile versions), and prints the loop length, per-clip brightness before/after and file sizes against the caps (full report: `.shots/hero-build-report.json`).
5. Re-check text contrast over the new video: serve the site (`npm run serve`), run `node tools/measure-hero-overlay.mjs`, and if needed adjust the overlay stops in `css/hero-video.css`; confirm with `--verify`.
6. Phone framing (which part of the video shows on narrow screens) is `--hv-pos` in `css/hero-video.css`.
7. Bump the `?v=` on `css/hero-video.css` / `js/hero-video.js` in `index.html` if you changed those files. The page itself never names a clip, so nothing else needs editing.
