#!/bin/sh
# HLS transcode script called by nginx-rtmp exec directive
NAME=$1
echo "PUBLISH $NAME at $(date)" >> /tmp/hls/exec.log
ffmpeg -i rtmp://localhost/live/$NAME \
  -c:v libx264 -preset veryfast -tune zerolatency \
  -sc_threshold 0 -g 48 -keyint_min 48 \
  -b:v 2500k -maxrate 2500k -bufsize 5000k \
  -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2" \
  -c:a aac -ar 44100 -b:a 128k \
  -f hls -hls_time 2 -hls_list_size 6 \
  -hls_flags delete_segments+append_list -hls_segment_type mpegts \
  -hls_segment_filename /tmp/hls/${NAME}_%03d.ts \
  /tmp/hls/${NAME}.m3u8 \
  2>>/tmp/hls/ffmpeg-${NAME}.log &
