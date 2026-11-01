# Action Model — 15s motion graphic

A 1080×1080 square video at 30 fps, 15 seconds long, with an original soft electronic score and sound effects timed to the visuals.

**Final files** (H.264 + AAC):
- `actionmodel_15s_16x9.mp4`: 1920×1080 (16:9). The story runs in a centred column. The background, people network and flow lines use the full width, and each headline fits on one line.
- `actionmodel_15s.mp4`: 1080×1080 (square).

| Time | Scene | On-screen text |
|---|---|---|
| 0–3s | Chat bubbles fade away. Thin violet lines flow in and draw a glossy 3D cursor | AI that talks is *old news.* |
| 3–6s | The cursor clicks into a glass browser, types "Book a flight to Tokyo", hits Go, and books a flight in the pop-up | Action Model learns to *ACT.* |
| 6–9s | 16 cursors with country tags connect to a glowing glass core over a dotted globe | Trained by *real people.* |
| 9–12s | The core collapses and bursts into the starburst icon. Two waves of sparks fly back out to the people, who turn violet | Owned by the people *who build it.* |
| 12–15s | The icon settles into the app tile, the "ActionModel" wordmark wipes in, and the logo pulses twice | Community-Owned AI · @ActionModelAI |

## Files
- `timeline.js`: one timing table that drives both the visuals and the audio, so clicks, typing, connections, the burst and the logo hit stay in sync. The tempo is 120 BPM and every cut lands on a downbeat.
- `logo.js`: a vector rebuild of the starburst icon, traced from `logo_reference.jpg`. It is drawn as stroked bands so the icon can grow out of the core.
- `main.js`: the canvas animation. `renderFrame(t)` is a pure function of time.
- `audio.js`: synthesizes `soundtrack.wav`. It contains an A-minor pad, sub bass, a soft kick, clap and hats, a pluck arpeggio, plus mouse clicks, key ticks, whooshes, connection blips, sparkles, risers and impacts.
- `render.js`: renders frames in headless Chromium and pipes them to ffmpeg.

## Rebuild
```bash
node audio.js    # -> soundtrack.wav
node render.js          # -> actionmodel_15s.mp4 (1080×1080)
node render.js --wide   # -> actionmodel_15s_16x9.mp4 (1920×1080)
node render.js --stills 2.3,7.5,14.9 out/   # optional review stills
```
For a live preview, serve this folder (for example with `npx serve .`) and open `index.html` (add `?wide` for the 16:9 layout).
Font: Inter (OFL).
