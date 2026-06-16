FROM tiangolo/nginx-rtmp:latest

# nginx + nginx-rtmp-module compiled from source (NOT Ubuntu's broken libnginx-mod-rtmp)
# Based on Debian — FFmpeg NOT pre-installed

RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

COPY nginx.conf /etc/nginx/nginx.conf

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && mkdir -p /tmp/hls

EXPOSE 1935 8088

ENTRYPOINT ["/entrypoint.sh"]
