#!/bin/sh
set -e

# Create nginx system user if missing (Alpine uses adduser --system)
if ! id nginx >/dev/null 2>&1; then
    adduser --system --no-create-home --disabled-password nginx 2>/dev/null || \
    adduser -S -D -H nginx 2>/dev/null || \
    addgroup nginx 2>/dev/null && adduser -S -G nginx nginx 2>/dev/null || true
fi

mkdir -p /tmp/hls
chown -R nginx:nginx /tmp/hls 2>/dev/null || chmod 777 /tmp/hls

exec nginx -g "daemon off;"
