#!/bin/sh
set -e

# Fix permissions on Docker volume at runtime
chown www-data:www-data /tmp/hls 2>/dev/null || true
touch /tmp/hls/exec.log 2>/dev/null || true
chown www-data:www-data /tmp/hls/exec.log 2>/dev/null || true

# Clean up orphaned ffmpeg from previous container sessions
kill $(pgrep -f 'ffmpeg.*rtmp://localhost' 2>/dev/null) 2>/dev/null || true

exec nginx -g "daemon off;"
