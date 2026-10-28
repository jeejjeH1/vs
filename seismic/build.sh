#!/bin/sh
# One command: score -> frames -> master. Needs node, ffmpeg, python3 + numpy, and the video-shotcraft SFX
# library (SFX_DIR, default /home/user/vincentwei1021/video-shotcraft/assets/audio/sfx).
set -e
cd "$(dirname "$0")"
[ -d node_modules/three ] || npm install
python3 audio.py                       # -> out/mix.wav
node render.js --workers 3             # -> out/video.mp4
sh mux.sh out/video.mp4 out/mix.wav seismic_privacy.mp4
