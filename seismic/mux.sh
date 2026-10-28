#!/bin/sh
# mux.sh video.mp4 mix.wav out.mp4 : film grain in ffmpeg + two-pass loudnorm to -14 LUFS, true peak -1 dB
set -e
V=$1; A=$2; O=$3
M=$(ffmpeg -hide_banner -i "$A" -af loudnorm=I=-14:TP=-1:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
g() { echo "$M" | grep "\"$1\"" | sed 's/.*: "\(.*\)".*/\1/'; }
ffmpeg -y -hide_banner -loglevel error -i "$V" -i "$A" \
  -filter_complex "[0:v]noise=alls=5:allf=t,format=yuv420p[v];[1:a]loudnorm=I=-14:TP=-1:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true,aresample=48000[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -preset slow -crf 18 -tune grain -profile:v high -pix_fmt yuv420p -r 30 \
  -c:a aac -b:a 256k -movflags +faststart -shortest "$O"
ffmpeg -hide_banner -i "$O" -af ebur128 -f null - 2>&1 | grep -E "^\s+I:" | tail -1
