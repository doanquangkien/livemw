FROM tiangolo/nginx-rtmp:latest

# nginx + nginx-rtmp-module compiled from source (NOT Ubuntu's broken libnginx-mod-rtmp)
# FFmpeg pre-installed

COPY nginx.conf /etc/nginx/nginx.conf

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && mkdir -p /tmp/hls

EXPOSE 1935 8088

ENTRYPOINT ["/entrypoint.sh"]
