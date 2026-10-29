# Startale App — ipUSD × IP Vault (motion graphic)

A 40-second 16:9 video (1920×1080, 30 fps) in the Startale App style: white/mint aurora with halftone dots, iridescent IP coin, and the eight-square logo. Every frame is drawn in code. The music and sound design are original and synthesized in code (120 BPM, F minor), with every hit synced to the visuals.

**Final file:** `startale_ipusd.mp4` (H.264 + AAC) · lighter version: `startale_ipusd_small.mp4`

| Time | Scene |
|---|---|
| 0–4 s | Dark: light converges, the eight logo squares fly in and lock with a flash/shockwave, the wordmark reveals, then a fly-through into the white world |
| 4–10 | "ipUSD Is Live on Startale App" (per-letter slam-in), spinning iridescent coin |
| 10–14 | "IP Vault is live on Soneium", preferred wallet, 3D phone with app UI |
| 14–20 | Step 01: swap 100 USDSC → ipUSD, +30 STAR Points |
| 20–27 | Step 02: coin drops into IP Vault, dial locks, +200 STAR Points |
| 27–31 | Dark: 30 + 200 collide → **230 STAR Points** |
| 31–35 | Runs until Nov 1, 13:00 UTC · keep ETH on Soneium for gas |
| 35–40 | End card: logo, "Join now", disclaimer |

Effects: whip pans with motion blur, zoom blur, iris wipe, chromatic aberration and camera shake on impacts, anamorphic lens flares, light rays, particle bursts, depth-of-field glass shards, film grain, and a vignette.

## Rebuild
```bash
node audio.js    # -> soundtrack.wav
node render.js   # -> startale_ipusd.mp4 (headless Chromium + ffmpeg)
node render.js --stills 6,16.4,28.1 DIR   # review stills
```
Live preview: open `index.html` with a local server (e.g. `npx serve .`). Font: Poppins (OFL).
