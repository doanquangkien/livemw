FROM alpine:latest
RUN apk add --no-cache ffmpeg curl jq bash
COPY record.sh /usr/local/bin/record.sh
RUN chmod +x /usr/local/bin/record.sh
ENTRYPOINT ["/usr/local/bin/record.sh"]
