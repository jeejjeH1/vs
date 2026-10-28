# Seismic — What should remain private?

A 65-second cinematic motion film (16:9, 1920×1080, 30 fps) for the post about privacy approaches on the blockchain: ZK proofs vs Seismic's TEEs + shielded Solidity types. It uses the brand colours (Mauve `#825A6D`, Purple `#523542`, the grey scale) and the logo, rebuilt in 3D from its five facets, with light living in the gaps between them.

**Final file:** `seismic_privacy.mp4` (H.264 + AAC, −14 LUFS)

| Time | Scene |
|---|---|
| 0–7.5 | A seismograph line kicks twice; logo shards fly in and assemble on the impact (flash, shockwave, flare); a light sweep crosses the stone |
| 7.5–15 | "Not all privacy-focused blockchains take the same approach." A chain of 3D blocks forks into two paths |
| 15–25 | ZK: data is scanned, scrambled and hidden; a π proof forms and is VERIFIED |
| 25–30 | "Seismic takes a different path." The logo slams into a grid of pillars and a seismic wave rolls out |
| 30–37.5 | TEE enclave: data turns shielded inside; `suint256 / saddress / sbool` are typed |
| 37.5–47.5 | White flash → "The goal?" → EVM base where app tiles land, one of them private |
| 47.5–55 | "Different approaches. One important question:" Two beams converge to one point, then silence |
| 55–65 | "What should remain **private** on the blockchain?" A redaction bar lifts; the logo returns |

## How it's made
Everything is code, with no video generation and no stock footage:
- **Picture:** `main.js` is a pure `render(t)` function. three.js + postprocessing (bloom, chromatic aberration, neutral tone mapping) draw the 3D, and a 2D canvas on top draws the type and the light effects (flares, god rays, shockwaves, zoom blur). Headless Chromium renders every frame (`render.js`).
- **Sound:** `audio.py` synthesizes an original score in D minor at 96 BPM (drones, braams, pulse, bells, risers) and places Mixkit SFX on the picture events in `timeline.js`. `mux.sh` adds grain and normalizes to −14 LUFS.
- The timing, easing and motion grammar follow the lemo-opuscar directing guide and video-shotcraft shot cards (see `TREATMENT.md` and `CREDITS`).

## Rebuild
```bash
npm install                 # three + postprocessing
sh build.sh                 # audio -> frames -> seismic_privacy.mp4
node render.js --stills 2.5,25,55 out/stills   # review stills
```
Live preview: serve this folder (e.g. `npx serve .`) and open `index.html?t=25`.
SFX are read from the video-shotcraft library (`SFX_DIR`, default `/home/user/vincentwei1021/video-shotcraft/assets/audio/sfx`).
