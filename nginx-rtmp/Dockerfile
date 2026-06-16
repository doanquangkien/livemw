FROM tiangolo/nginx-rtmp:latest

# nginx + nginx-rtmp-module compiled from source (NOT Ubuntu's broken libnginx-mod-rtmp)
# FFmpeg pre-installed

COPY nginx.conf /etc/nginx/nginx.conf

RUN mkdir -p /tmp/hls && chown -R nginx:nginx /tmp/hls

EXPOSE 1935 8088

CMD ["nginx", "-g", "daemon off;"]
