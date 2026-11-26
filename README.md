# Segue: boardroom-ready slide transitions

Live: https://jivraj-18.github.io/slide-motion-gallery/

Ten transitions between real HTML slides: Light Sweep, Parallax Push, Depth Zoom, Cascade Columns, Boardroom Cube, Card Stack, Focus Reveal, Data Tiles, Frosted Glass, Ribbon Wipe.

- Hover a tile to preview, click to play. Scrub, change duration, auto tour, or present full screen.
- With [HTML-in-Canvas](https://developer.chrome.com/docs/web-platform/html-in-canvas/concepts) the browser draws the slides into canvas. Without it, a small DOM painter (boxes and words only) does the same job.
- Transitions are WebGL 2 fragment shaders. One static file, no dependencies. All company data is fictional.
- Test: `.github/workflows/test.yml` runs `test/live.mjs` against the live page in Chrome, in both modes.
