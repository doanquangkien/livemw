#!/bin/bash
# ============================================================
# VOD Recorder Daemon — Isolated RTMP Subscriber
# ============================================================
# Nguyên tắc:
#   - KHÔNG đụng vào nginx-rtmp container
#   - FFmpeg kết nối RTMP như subscriber ẩn danh
#   - Recorder crash → live stream không bị ảnh hưởng
#
# Luật thép:
#   1. MIN DURATION: video < 15 phút (900s) → xóa file, KHÔNG update DB
#   2. MAX DURATION: mỗi part tối đa 4 tiếng (-t 14400), dài hơn → part mới
#   3. STORAGE CAP: giữ tối đa 10 VOD, xóa cũ nhất khi vượt
# ============================================================
set -euo pipefail

API_BASE="http://frontend:3000"
VOD_DIR="/tmp/vod"
RECONNECT_WINDOW=900   # 15 phút chờ reconnect
MAX_PART_DURATION=14400 # 4 tiếng mỗi part (chống cháy ổ đĩa)
MIN_VOD_DURATION=900    # 15 phút — video ngắn hơn coi như phiên test
CLEANUP_CAP=10          # Số VOD tối đa

STATE="IDLE"  # IDLE | RECORDING | WAITING
CURRENT_SESSION=""
CURRENT_KEY=""
ENDED_AT=0
FFMPEG_PID=""
PART=1

mkdir -p "$VOD_DIR"

echo "[$(date -Iseconds)] VOD Recorder started — min=${MIN_VOD_DURATION}s, max_part=${MAX_PART_DURATION}s, cap=${CLEANUP_CAP}"

# ---- Helper: finalize VOD for a session ----
finalize_vod() {
  local session_id="$1"
  local parts
  parts=$(ls -t "$VOD_DIR/${session_id}"_part*.mp4 2>/dev/null || true)

  if [ -z "$parts" ]; then
    echo "[$(date -Iseconds)] FINALIZE: no parts found for $session_id — skipping"
    return
  fi

  local part_count
  part_count=$(echo "$parts" | wc -l)

  # Merge parts if multiple
  if [ "$part_count" -eq 1 ]; then
    mv "$(echo "$parts" | head -1)" "$VOD_DIR/${session_id}.mp4"
  else
    local concat_file="$VOD_DIR/${session_id}_concat.txt"
    echo "$parts" | while read -r f; do echo "file '$f'" >> "$concat_file"; done
    ffmpeg -loglevel warning -f concat -safe 0 -i "$concat_file" \
      -c copy "$VOD_DIR/${session_id}.mp4" -y
    rm -f "$concat_file" $parts
  fi

  local final_path="$VOD_DIR/${session_id}.mp4"

  if [ ! -f "$final_path" ]; then
    echo "[$(date -Iseconds)] FINALIZE: concat failed for $session_id"
    return
  fi

  # ---- Luật 1: MIN DURATION — xóa video test < 15 phút ----
  local duration
  duration=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$final_path" 2>/dev/null || echo "0")
  local duration_int
  duration_int=$(printf "%.0f" "$duration" 2>/dev/null || echo "0")

  if [ "$duration_int" -lt "$MIN_VOD_DURATION" ]; then
    echo "[$(date -Iseconds)] FINALIZE: duration=${duration_int}s < ${MIN_VOD_DURATION}s — test stream, deleting"
    rm -f "$final_path"
    return
  fi

  # Update DB
  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$API_BASE/api/vod/${session_id}" \
    -H "Content-Type: application/json" \
    -d "{\"vod_url\":\"${session_id}.mp4\"}")

  if [ "$http_code" = "200" ]; then
    echo "[$(date -Iseconds)] FINALIZE: ${session_id}.mp4 (${duration_int}s) → DB updated OK"
  else
    echo "[$(date -Iseconds)] FINALIZE: ${session_id}.mp4 → DB update FAILED (HTTP ${http_code})"
  fi

  # ---- Cleanup: giữ tối đa 10 VOD ----
  local vod_count
  vod_count=$(find "$VOD_DIR" -maxdepth 1 -name '*.mp4' ! -name '*_part*' | wc -l)

  if [ "$vod_count" -gt "$CLEANUP_CAP" ]; then
    find "$VOD_DIR" -maxdepth 1 -name '*.mp4' ! -name '*_part*' -printf '%T@ %p\n' \
      | sort -n | head -n $((vod_count - CLEANUP_CAP)) | while read -r line; do
      local old_file
      old_file=$(echo "$line" | awk '{print $2}')
      local old_id
      old_id=$(basename "$old_file" .mp4)
      curl -s -X DELETE "$API_BASE/api/vod/${old_id}" > /dev/null || true
      rm -f "$old_file"
      echo "[$(date -Iseconds)] CLEANUP: deleted ${old_id}.mp4 (over cap of ${CLEANUP_CAP})"
    done
  fi
}

# ---- Main daemon loop ----
while true; do
  # Poll live status
  LIVE_JSON=$(curl -s --max-time 5 "$API_BASE/api/live-now" 2>/dev/null || echo '{"isLive":false}')
  IS_LIVE=$(echo "$LIVE_JSON" | jq -r '.isLive // false')
  SESSION_ID=$(echo "$LIVE_JSON" | jq -r '.sessionId // ""')
  STREAM_KEY=$(echo "$LIVE_JSON" | jq -r '.streamKey // ""')
  ENDED_BY=$(echo "$LIVE_JSON" | jq -r '.endedBy // ""')

  NOW=$(date +%s)

  case "$STATE" in
    # ------------------------------------------------------------
    IDLE)
      if [ "$IS_LIVE" = "true" ] && [ -n "$SESSION_ID" ] && [ -n "$STREAM_KEY" ]; then
        echo "[$(date -Iseconds)] IDLE → RECORDING: session=$SESSION_ID key=$STREAM_KEY"
        PART=1

        # ---- Luật 2: MAX DURATION — giới hạn mỗi part 4 tiếng ----
        ffmpeg -loglevel warning \
          -i "rtmp://nginx-rtmp:1935/live/${STREAM_KEY}" \
          -c copy -f mp4 -t "$MAX_PART_DURATION" \
          "$VOD_DIR/${SESSION_ID}_part${PART}.mp4" &
        FFMPEG_PID=$!
        CURRENT_SESSION="$SESSION_ID"
        CURRENT_KEY="$STREAM_KEY"
        STATE="RECORDING"
      fi
      ;;

    # ------------------------------------------------------------
    RECORDING)
      # Check if ffmpeg still alive
      if [ -n "$FFMPEG_PID" ] && ! kill -0 "$FFMPEG_PID" 2>/dev/null; then
        wait "$FFMPEG_PID" 2>/dev/null || true
        FFMPEG_PID=""

        # If still live with same session, ffmpeg likely hit the 4h limit → start new part
        if [ "$IS_LIVE" = "true" ] && [ "$SESSION_ID" = "$CURRENT_SESSION" ]; then
          PART=$((PART + 1))
          echo "[$(date -Iseconds)] RECORDING: part $((PART-1)) hit max duration → starting part $PART"
          ffmpeg -loglevel warning \
            -i "rtmp://nginx-rtmp:1935/live/${CURRENT_KEY}" \
            -c copy -f mp4 -t "$MAX_PART_DURATION" \
            "$VOD_DIR/${CURRENT_SESSION}_part${PART}.mp4" &
          FFMPEG_PID=$!
          continue
        fi

        # Stream ended while ffmpeg was dying → go to WAITING
        echo "[$(date -Iseconds)] RECORDING: ffmpeg exited (stream likely ended)"
        ENDED_AT=$(date +%s)
        STATE="WAITING"
        continue
      fi

      # Stream ended (or session changed)
      if [ "$IS_LIVE" != "true" ] || [ "$SESSION_ID" != "$CURRENT_SESSION" ]; then
        echo "[$(date -Iseconds)] RECORDING → WAITING: stream ended or session changed"
        if [ -n "$FFMPEG_PID" ]; then
          kill "$FFMPEG_PID" 2>/dev/null || true
          wait "$FFMPEG_PID" 2>/dev/null || true
          FFMPEG_PID=""
        fi
        ENDED_AT=$(date +%s)
        STATE="WAITING"
      fi
      ;;

    # ------------------------------------------------------------
    WAITING)
      ELAPSED=$((NOW - ENDED_AT))

      # Admin force end: finalize immediately without waiting 15 min
      if [ "$ENDED_BY" = "admin" ] && [ "$SESSION_ID" = "$CURRENT_SESSION" ] && [ -n "$CURRENT_SESSION" ]; then
        echo "[$(date -Iseconds)] WAITING → FINALIZE: admin force end"
        finalize_vod "$CURRENT_SESSION"
        CURRENT_SESSION=""
        CURRENT_KEY=""
        STATE="IDLE"
        continue
      fi

      # Reconnect within 15 min: keep same session, continue recording
      if [ "$IS_LIVE" = "true" ] && [ "$SESSION_ID" = "$CURRENT_SESSION" ]; then
        echo "[$(date -Iseconds)] WAITING → RECORDING: reconnected within $(date -u -d @$ELAPSED +%M:%S)"
        PART=$((PART + 1))
        ffmpeg -loglevel warning \
          -i "rtmp://nginx-rtmp:1935/live/${CURRENT_KEY}" \
          -c copy -f mp4 -t "$MAX_PART_DURATION" \
          "$VOD_DIR/${CURRENT_SESSION}_part${PART}.mp4" &
        FFMPEG_PID=$!
        STATE="RECORDING"
        continue
      fi

      # New session started while waiting → finalize old, start fresh
      if [ "$IS_LIVE" = "true" ] && [ "$SESSION_ID" != "$CURRENT_SESSION" ] && [ -n "$CURRENT_SESSION" ]; then
        echo "[$(date -Iseconds)] WAITING → FINALIZE: new session $SESSION_ID started"
        finalize_vod "$CURRENT_SESSION"
        CURRENT_SESSION=""
        CURRENT_KEY=""
        STATE="IDLE"
        continue
      fi

      # 15 min expired: finalize
      if [ "$ELAPSED" -ge "$RECONNECT_WINDOW" ] && [ -n "$CURRENT_SESSION" ]; then
        echo "[$(date -Iseconds)] WAITING → FINALIZE: reconnect window expired ($(date -u -d @$ELAPSED +%M:%S))"
        finalize_vod "$CURRENT_SESSION"
        CURRENT_SESSION=""
        CURRENT_KEY=""
        STATE="IDLE"
      fi
      ;;
  esac

  sleep 10
done
