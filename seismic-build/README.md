# What can developers build on Seismic?

A 60-second motion film (16:9, 1920×1080, 30 fps) for the post about what developers can build on Seismic. It is a companion to `../seismic/` but deliberately different: a bright white-model studio instead of a dark stage, one continuous camera track instead of cuts, frosted glass as the signature effect, and a light 120 BPM mallet score instead of a trailer score.

**Final file:** `seismic_build.mp4` (H.264 + AAC, −14 LUFS)

| Time | Scene |
|---|---|
| 0–6 | Swiss type on a white grid: a caret, then "What can developers actually build on @SeismicSys?" with mauve wipe blocks |
| 6–13 | One mauve token: "More than just private transactions." The camera pulls back to reveal a long table of five turntables: "Think about:" |
| 13–38 | One continuous track past five dioramas. Each one shows its data in clear glass, then the glass frosts over: shielded tokens · confidential DeFi pools · private lending & order book · hidden-vote ballot box · data that only a key lens can see through ("ACCESS GRANTED") |
| 38–45 | A crane up over the table; every diorama wires into one smart-contract block: "Seismic gives developers the tools to bring privacy into smart contracts." |
| 45–52 | All the glass clears and addresses, balances and votes pop up everywhere: "needs more than transparency." Then silence |
| 52–60 | A frost wave sweeps the whole frame: "It needs confidentiality, too." The flat logo assembles with @SeismicSys, then fades to white |

## Rebuild
```bash
npm install
python3 audio.py                         # -> out/mix.wav (SFX_DIR = video-shotcraft assets/audio/sfx)
node render.js --workers 3               # -> out/video.mp4
sh mux.sh out/video.mp4 out/mix.wav seismic_build.mp4
```
Review stills: `node render.js --stills 15.6,40.5,52.4 out/stills`. See `TREATMENT.md` and `CREDITS`.
