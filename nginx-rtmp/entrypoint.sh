#!/bin/sh
set -e

# Create nginx user if missing (some base images lack it)
if ! id nginx >/dev/null 2>&1; then
    adduser -D -H nginx 2>/dev/null || addgroup -S nginx && adduser -S nginx -G nginx 2>/dev/null || true
fi

# Fix /tmp/hls permissions at RUNTIME — build-time chown is overwritten by named volumes (Phase 0 Lesson 1)
mkdir -p /tmp/hls
chown -R nginx:nginx /tmp/hls 2>/dev/null || chmod 777 /tmp/hls

exec nginx -g "daemon off;"
