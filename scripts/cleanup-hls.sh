#!/bin/sh
# Auto-cleanup HLS segments & logs — chạy mỗi 5 phút qua Docker cron
# Xóa .ts/.m3u8 cũ hơn 10 phút, log FFmpeg cũ hơn 7 ngày
set -e

HLS_DIR="/tmp/hls"
LOG_DIR="/var/log/nginx"

# Xóa HLS segments cũ hơn 10 phút
if [ -d "$HLS_DIR" ]; then
    find "$HLS_DIR" -name "*.ts" -mmin +10 -delete 2>/dev/null || true
    find "$HLS_DIR" -name "*.m3u8" -mmin +10 -delete 2>/dev/null || true
fi

# Xóa FFmpeg log cũ hơn 7 ngày
if [ -d "$LOG_DIR" ]; then
    find "$LOG_DIR" -name "ffmpeg-*.log" -mtime +7 -delete 2>/dev/null || true
fi
