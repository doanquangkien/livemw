FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    nginx \
    libnginx-mod-rtmp \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

RUN nginx -v && ffmpeg -version 2>&1 | head -1

COPY nginx.conf /etc/nginx/nginx.conf
COPY transcode.sh /usr/local/bin/transcode.sh
RUN chmod +x /usr/local/bin/transcode.sh

RUN mkdir -p /tmp/hls && chown www-data:www-data /tmp/hls && touch /tmp/hls/exec.log && chown www-data:www-data /tmp/hls/exec.log

EXPOSE 1935 8088

CMD ["nginx", "-g", "daemon off;"]
