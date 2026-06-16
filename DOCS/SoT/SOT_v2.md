# 📡 LIVESTREAM WEBAPP — SOURCE OF TRUTH (SoT)

tags: ["#infrastructure", "#config", "#entry-point"]
**Version:** 2.0 — Cập nhật phiên bản stack tháng 06/2026  
**Ngày:** 16/06/2026  
**Domain:** `live.mecwish.com` *(hoặc domain bạn chọn)*  
**Stack chính:** Nginx-RTMP · Node.js/Express API · Next.js 16 · HLS.js · Supabase · Google Cloud VM (Cloud-Agnostic) · Coolify  
**Mục tiêu bất biến:** Admin phát RTMP từ Larix/OBS Mobile → Nginx-RTMP nhận → HLS → Trang chủ viewer xem được ngay

> ⚠️ **TẠI SAO REFACTOR?**  
> Dự án cũ thất bại vì stack quá phức tạp (OME + WebRTC WHIP + ICE/TURN + Safari quirks).  
> Stack mới: **RTMP vào → HLS ra**. Đây là cách YouTube/Twitch khởi đầu. Đơn giản, battle-tested, không cần cấu hình ICE/TURN, không phụ thuộc browser WebRTC.

> 🔄 **THAY ĐỔI SO VỚI v1.0:**  
> Tài liệu này cập nhật toàn bộ phiên bản thư viện/công cụ về trạng thái mới nhất tháng 06/2026. Kiến trúc và logic nghiệp vụ **không thay đổi**. Xem bảng tổng hợp thay đổi phiên bản tại [Mục 28](#28-changelog-v10--v20).

---

## Mục lục

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Hạ tầng & VPS Sizing](#2-hạ-tầng--vps-sizing)
3. [Stack công nghệ](#3-stack-công-nghệ)
4. [Nginx-RTMP — Cài đặt & Cấu hình](#4-nginx-rtmp--cài-đặt--cấu-hình)
5. [Phase 0 — VPS + Nginx-RTMP chạy được](#phase-0--vps--nginx-rtmp-chạy-được)
6. [Phase 1 — Admin phát live từ iPhone THÀNH CÔNG](#phase-1--admin-phát-live-từ-iphone-thành-công)
7. [Phase 2 — Trang chủ viewer xem live THÀNH CÔNG](#phase-2--trang-chủ-viewer-xem-live-thành-công)
8. [Phase 3 — Database + Live Status Realtime](#phase-3--database--live-status-realtime)
9. [Phase 4 — Admin Dashboard + Comment System](#phase-4--admin-dashboard--comment-system)
10. [Phase 5 — Production Hardening](#phase-5--production-hardening)
11. [Frontend — Next.js 16 + HLS.js](#11-frontend--nextjs-16--hlsjs)
12. [Admin Dashboard UI](#12-admin-dashboard-ui)
13. [Viewer UI — Cinema Layout](#13-viewer-ui--cinema-layout)
14. [Homepage — Live Discovery](#14-homepage--live-discovery)
15. [Comment System](#15-comment-system)
16. [Database Schema — Supabase](#16-database-schema--supabase)
17. [API Routes](#17-api-routes)
18. [Firewall & Port Matrix](#18-firewall--port-matrix)
19. [Docker Compose & Coolify Deploy](#19-docker-compose--coolify-deploy)
20. [Environment Variables](#20-environment-variables)
21. [Monitoring & Alerts](#21-monitoring--alerts)
22. [Scale Strategy](#22-scale-strategy)
23. [Kịch bản sự cố & Xử lý](#23-kịch-bản-sự-cố--xử-lý)
24. [Chi phí ước tính](#24-chi-phí-ước-tính)
25. [Checklist triển khai theo Phase](#25-checklist-triển-khai-theo-phase)
26. [Quyết định kiến trúc đã chốt](#26-quyết-định-kiến-trúc-đã-chốt)
27. [Câu hỏi thường gặp](#27-câu-hỏi-thường-gặp)
28. [Changelog v1.0 → v2.0](#28-changelog-v10--v20)

---

## 1. Tổng quan kiến trúc

### 1.1 Flow toàn hệ thống

```
┌─────────────────────────────────────────────────────────────────┐
│  INGEST LAYER                                                   │
│                                                                 │
│  iPhone (Larix / OBS Mobile)                                    │
│  Cài app → cấu hình RTMP URL + Stream Key                       │
│  → Nhấn "Start Stream"                                          │
│         │                                                       │
│         │ RTMP (port 1935)                                      │
│         ▼                                                       │
│  Nginx-RTMP Module (trên VPS)                                   │
│  Nhận RTMP → Transcode → Tạo HLS segments (.ts + .m3u8)        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  HLS DELIVERY LAYER                                             │
│                                                                 │
│  /tmp/hls/stream/*.m3u8 + *.ts                                  │
│  → Nginx HTTP serve tại http://VPS:8080/hls/stream.m3u8        │
│  → SSL terminate tại Coolify proxy                              │
│  → https://live.mecwish.com/hls/stream.m3u8                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  VIEWER LAYER                                                   │
│                                                                 │
│  Trình duyệt (Chrome/Safari/Firefox)                            │
│  HLS.js load .m3u8 → play video                                 │
│  Supabase Realtime → nhận live status update từ server          │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  CONTROL LAYER                                                  │
│                                                                 │
│  Node.js API (Express)                                          │
│  ├── Nginx RTMP callback: on_publish, on_publish_done           │
│  │   → Cập nhật Supabase: status = 'live' / 'ended'            │
│  ├── Supabase Realtime broadcast → tất cả viewers              │
│  ├── Comment API (CRUD)                                         │
│  └── Admin API (session control, force-end)                     │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 User Flow

```
ADMIN FLOW:
  Cài Larix trên iPhone
  → Mở Larix → Connections → New Connection
  → Điền RTMP URL: rtmp://VPS_IP/live
  → Stream Name: [stream_key]
  → Nhấn nút Record (hình tròn đỏ) → ĐANG PHÁT LIVE
  → Trang chủ tự động hiển thị "🔴 ĐANG LIVE"
  → Nhấn Stop → Trang chủ về trạng thái offline

VIEWER FLOW:
  Vào trang chủ / → thấy badge "🔴 ĐANG LIVE"
  → Click "Vào xem" → /live
  → HLS.js load và play stream tự động
  → Nhập tên + comment → gửi bình luận
  → Stream kết thúc → thông báo + redirect về /
```

### 1.3 Tại sao RTMP → HLS thay vì WebRTC?

| Tiêu chí | WebRTC (WHIP/OME) | RTMP → HLS |
|----------|-------------------|------------|
| Độ phức tạp | Rất cao (ICE, TURN, DTLS, CORS) | Thấp |
| Xác suất thành công trên iPhone | Thấp (Safari quirks) | **Cao** (Larix chạy ổn định) |
| Latency | <500ms | 5–15s (chấp nhận được) |
| Scale | Khó (WebRTC P2P) | Dễ (CDN pull HLS) |
| Debug | Khó (ICE state machine) | Dễ (`curl` file .m3u8) |
| Phụ thuộc | ICE server, TURN, STUN | Chỉ cần port 1935 mở |
| Battle-tested | Mới, quirky | 15+ năm |

**Kết luận:** Cho use case single admin + 50–500 viewers, RTMP→HLS là lựa chọn tốt nhất. Latency 5–15s không ảnh hưởng UX livestream nói chuyện/trình bày.

---

## 2. Hạ tầng & VPS Sizing

### 2.1 Khuyến nghị — Cloud-Agnostic Sizing (Ví dụ: Google Cloud VM)

Hệ thống được thiết kế hoàn toàn **Cloud-Agnostic**, có thể deploy trên bất kỳ VPS nào (GCP, AWS, DigitalOcean) miễn là đáp ứng cấu hình tối thiểu và chạy được Docker.

| Stage | Yêu cầu cấu hình tối thiểu | Ví dụ GCP Instance | Giá ước tính | Dùng khi |
|-------|-------|------|-----|---------|
| Dev/Test | 2 vCPU, 4 GB RAM | e2-medium | Tùy chọn | Phase 0–1 |
| **MVP (khuyến nghị)** | **4 vCPU, 8 GB RAM** | **e2-standard-2** | **Tùy chọn** | **Phase 2–4** |
| Production (>200 CCU) | 8 vCPU, 16 GB RAM | e2-standard-4 | Tùy chọn | Phase 5+ |

> **Bắt đầu với MVP (4 vCPU, 8 GB RAM).** Nginx-RTMP + Transcode + Node.js API + Next.js thoải mái hoạt động cho 50–500 viewers. CPU-bound chính là tiến trình FFmpeg transcoding, do đó ưu tiên các dòng instance có compute tốt.

### 2.2 OS & Software

```
OS:       Ubuntu 24.04 LTS
Docker:   29.4.x  (stable April 2026)
Coolify:  v4.0.0-beta.472+  (vẫn là v4.x, không có v5)
Nginx:    1.24+ với nginx-rtmp-module
Node.js:  24 LTS  (Active LTS — thay thế 20 LTS)
FFmpeg:   8.x     (stable 8.1.1 tháng 05/2026)
```

> **⚠️ Node.js quan trọng:** Node.js 20 LTS đã **EOL tháng 04/2026**. Dùng **Node.js 24** (Active LTS, hỗ trợ đến 04/2028). Node.js 26 ra tháng 05/2026 nhưng chưa là LTS — không dùng cho production đến tháng 10/2026.
>
> **⚠️ FFmpeg quan trọng:** FFmpeg 8.1.1 (tháng 05/2026) là stable mới nhất. Ubuntu 24.04 apt repo cung cấp FFmpeg 6.x — vẫn dùng được, nhưng nên pin version trong Dockerfile để đảm bảo ổn định.

### 2.3 Network Requirements

- Port **1935/TCP** mở cho RTMP ingest từ iPhone
- Port **8080/TCP** nội bộ cho Nginx HTTP (Coolify proxy ra ngoài qua 443)
- Băng thông upload VPS: ít nhất **50 Mbps**
- Băng thông: Băng thông ra (Egress) đủ lớn tùy theo lượng viewer (Video Streaming có thể tốn traffic nhanh chóng).

### 2.4 DNS Setup

```
A Record: live.mecwish.com → VPS_PUBLIC_IP (TTL: 300)
Cloudflare: DNS Only (không proxy) — RTMP cần IP trực tiếp
```

---

## 3. Stack công nghệ

### 3.1 Core Stack

| Component | Technology | Version (06/2026) | Lý do chọn |
|-----------|-----------|---------|------------|
| RTMP Server | nginx-rtmp-module | 1.2.2 | Free, stable, battle-tested |
| Transcode | FFmpeg | **8.1.x** | Chuẩn công nghiệp — nâng từ 6.x |
| HLS Delivery | Nginx (built-in) | 1.24+ | Serve file static .m3u8/.ts |
| Backend API | Node.js + Express | **24 LTS** + 4.x | Active LTS — nâng từ 20 LTS |
| Frontend | Next.js | **16.2.x** (App Router) | Turbopack default, ~50% faster render |
| HLS Player | HLS.js | **1.6.16** | Stable nhất, Safari iOS 17.1+ hỗ trợ MSE |
| Realtime | Supabase Realtime | - | Live status + comments, hỗ trợ binary payload |
| Database | Supabase (Postgres) | **JS client 2.108.x** | Auth + DB + Realtime gói 1 |
| Styling | Tailwind CSS | **4.3.x** | CSS-first config, 10x faster build |
| Deploy | Coolify + Docker | **v4.0.0-beta.472+** | Self-host, dễ dùng |
| SSL | Let's Encrypt (Coolify quản lý) | - | Tự động |

### 3.2 Lưu ý nâng cấp quan trọng

**Tailwind CSS v4 (breaking changes):**
- Không còn `tailwind.config.js` — cấu hình bằng CSS (`@theme { }`)
- Zero config, tự động detect template files
- Import bằng `@import "tailwindcss"` thay vì `@tailwind base/components/utilities`
- Chạy migration tool: `npx @tailwindcss/upgrade` để convert từ v3 nếu có project cũ

**Next.js 16 (breaking changes từ v15):**
- Turbopack là **default bundler** (thay webpack)
- `Cache Components` (beta) — review caching strategy
- Node.js minimum: **20+** (dùng 24 để future-proof)
- Cú pháp App Router không thay đổi — code component giữ nguyên

**HLS.js 1.6.x:**
- Thêm Managed Media Source (MMS) API support cho Safari iOS 17.1+
- API không thay đổi — code cũ tương thích hoàn toàn
- `liveMaxLatencyDurationCount` vẫn là config key đúng

### 3.3 Mobile Broadcaster (Admin)

**Option 1 — Larix Broadcaster (Khuyến nghị)**
- iOS: https://apps.apple.com/app/larix-broadcaster/id1516727811
- Miễn phí, hỗ trợ RTMP native, stable, không cần cấu hình phức tạp
- Hỗ trợ landscape 16:9, hardware H.264 encoder
- Bitrate tùy chỉnh, có retry khi mất mạng

**Option 2 — OBS Mobile**
- iOS: https://apps.apple.com/app/obs-studio/id1644256166
- Nặng hơn nhưng nhiều tính năng hơn

**Option 3 — iCam Source / LiveU Solo**
- Cho trường hợp cần chuyên nghiệp hơn

### 3.4 Larix Setup (Hướng dẫn admin)

```
1. Mở Larix Broadcaster
2. Tap vào biểu tượng ⚙️ (Settings)
3. Connections → New Connection
4. Name: "My Live Server" (đặt tùy)
5. URL: rtmp://VPS_IP/live
   (hoặc rtmp://live.mecwish.com/live nếu DNS đã set)
6. Stream name: [STREAM_KEY từ admin dashboard]
7. Tap "Done" → quay lại màn hình chính
8. Nhấn nút tròn đỏ để bắt đầu stream
9. Nhấn lại để dừng
```

---

## 4. Nginx-RTMP — Cài đặt & Cấu hình

### 4.1 Dockerfile cho Nginx-RTMP

```dockerfile
# nginx-rtmp/Dockerfile
# Dùng Ubuntu 24.04 LTS — apt cung cấp nginx-rtmp-module và ffmpeg sẵn
FROM ubuntu:24.04

# Tắt interactive prompt trong apt
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    nginx \
    libnginx-mod-rtmp \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Kiểm tra phiên bản (log ra khi build để debug)
RUN nginx -v && ffmpeg -version 2>&1 | head -1

COPY nginx.conf /etc/nginx/nginx.conf

RUN mkdir -p /tmp/hls && chown www-data:www-data /tmp/hls

EXPOSE 1935 8080

CMD ["nginx", "-g", "daemon off;"]
```

> **Ghi chú phiên bản:** Ubuntu 24.04 LTS apt repo cung cấp `ffmpeg 6.x`. Đây là phiên bản ổn định, đã được test và đủ cho tất cả tính năng HLS transcode trong SPEC này. Nếu cần FFmpeg 8.x (mới nhất), thêm PPA `ppa:savoury1/ffmpeg4` hoặc dùng image `mwader/static-ffmpeg:8.1` như multi-stage build.

### 4.2 nginx.conf — Cấu hình đầy đủ

```nginx
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /run/nginx.pid;

events {
    worker_connections 1024;
}

# ============================================================
# RTMP BLOCK — Nhận stream từ Larix/OBS Mobile
# ============================================================
rtmp {
    server {
        listen 1935;
        chunk_size 4096;
        timeout 30s;

        application live {
            live on;
            record off;

            # ------------------------------------------------
            # QUAN TRỌNG: Chỉ cho phép stream với đúng key
            # on_publish gọi API Node.js để xác thực stream key
            # Node.js trả về 2xx = allow, 4xx = deny
            # ------------------------------------------------
            on_publish http://api:3001/rtmp/on-publish;
            on_publish_done http://api:3001/rtmp/on-publish-done;

            # Transcode RTMP → HLS bằng FFmpeg
            # exec chạy FFmpeg khi nhận được stream
            exec ffmpeg -i rtmp://localhost/live/$name
                -c:v libx264
                -preset veryfast      # Cân bằng tốc độ/chất lượng
                -tune zerolatency     # Giảm latency encode
                -sc_threshold 0       # Tắt scene change detection (ổn định hơn)
                -g 48                 # GOP = 2 giây ở 24fps
                -keyint_min 48
                -b:v 2500k            # Video bitrate 720p
                -maxrate 2500k
                -bufsize 5000k
                -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2"
                -c:a aac
                -ar 44100
                -b:a 128k
                -f hls
                -hls_time 2           # Mỗi segment 2 giây
                -hls_list_size 6      # Giữ 6 segment (~12 giây buffer)
                -hls_flags delete_segments+append_list
                -hls_segment_type mpegts
                -hls_segment_filename /tmp/hls/$name_%03d.ts
                /tmp/hls/$name.m3u8
                2>>/var/log/nginx/ffmpeg-$name.log;
        }
    }
}

# ============================================================
# HTTP BLOCK — Serve HLS segments cho viewer
# ============================================================
http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    sendfile on;
    keepalive_timeout 65;

    server {
        listen 8080;
        server_name _;

        # HLS endpoint — viewer trỏ HLS.js vào đây
        location /hls {
            types {
                application/vnd.apple.mpegurl m3u8;
                video/mp2t ts;
            }
            root /tmp;
            add_header Cache-Control no-cache;
            add_header Access-Control-Allow-Origin *;
            add_header Access-Control-Allow-Methods "GET, OPTIONS";

            # Không cache .m3u8 (playlist thay đổi liên tục)
            if ($request_filename ~* \.m3u8$) {
                add_header Cache-Control no-cache;
                add_header Pragma no-cache;
                add_header Expires 0;
            }

            # Cache .ts segments (đã fixed, không đổi)
            if ($request_filename ~* \.ts$) {
                add_header Cache-Control "max-age=600";
            }
        }

        # RTMP Stats — xem số lượng viewer đang connect
        # QUAN TRỌNG: chỉ để nội bộ, không expose ra ngoài
        location /stat {
            rtmp_stat all;
            rtmp_stat_stylesheet stat.xsl;
            allow 127.0.0.1;
            allow 172.0.0.0/8;  # Docker network
            deny all;
        }

        # Health check endpoint
        location /health {
            return 200 'OK';
            add_header Content-Type text/plain;
        }
    }
}
```

### 4.3 Giải thích tham số FFmpeg quan trọng

| Tham số | Giá trị | Lý do |
|---------|---------|-------|
| `-preset veryfast` | veryfast | CPU thấp, chất lượng OK |
| `-tune zerolatency` | zerolatency | Giảm độ trễ encode |
| `-g 48` | 48 frames | GOP 2s ở 24fps = HLS segment clean |
| `-hls_time 2` | 2 giây | Segment nhỏ = latency thấp hơn |
| `-hls_list_size 6` | 6 segments | ~12s buffer, không dùng quá nhiều disk |
| `delete_segments` | flag HLS | Tự xóa segment cũ, không đầy disk |
| `-vf scale=1280:720` | 720p | Đủ chất lượng, bandwidth hợp lý |

### 4.4 Test Nginx-RTMP hoạt động

```bash
# Bước 1: Kiểm tra Nginx đang chạy
curl http://VPS_IP:8080/health
# → OK

# Bước 2: Giả lập stream từ file test (không cần iPhone)
ffmpeg -re -i test.mp4 -c copy -f flv rtmp://VPS_IP/live/testkey

# Bước 3: Kiểm tra .m3u8 có được tạo không
curl http://VPS_IP:8080/hls/testkey.m3u8
# → Phải thấy nội dung playlist HLS

# Bước 4: Mở VLC → Open Network → http://VPS_IP:8080/hls/testkey.m3u8
# → Phải thấy video

# Nếu 3 bước trên đều pass → Nginx-RTMP đang hoạt động đúng
```

---

## Phase 0 — VPS + Nginx-RTMP chạy được

> **GATE: Nginx nhận được RTMP và tạo được file .m3u8 trên disk.**  
> Không cần frontend, không cần database. Chỉ cần `curl` ra HLS.

### Mục tiêu

Cuối Phase 0, bạn có thể:
1. SSH vào VPS
2. Chạy `docker compose up`
3. Dùng `ffmpeg` test stream lên port 1935
4. `curl http://localhost:8080/hls/stream.m3u8` ra được playlist

### Bước thực hiện

```bash
# Bước 1: Tạo VPS Google Cloud VM (e2-standard-2), cài Docker
# (Đảm bảo OS là Ubuntu 24.04 LTS và mở sẵn port SSH)

# Bước 2: SSH vào VPS
ssh root@VPS_IP

# Bước 3: Cài Docker 29.x
curl -fsSL https://get.docker.com | sh
docker --version  # Phải thấy 29.x

# Bước 4: Cài Coolify (v4.0.0-beta.472+)
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

# Bước 5: Tạo project structure trên VPS
mkdir -p /opt/livestream/nginx-rtmp
cd /opt/livestream

# Bước 6: Tạo Dockerfile và nginx.conf (copy từ Mục 4.1 và 4.2)
# ...

# Bước 7: Build và chạy
docker compose up -d nginx-rtmp

# Bước 8: Mở firewall port 1935
ufw allow 1935/tcp
ufw allow 8080/tcp
ufw allow 22/tcp
ufw enable

# Bước 9: Test stream
# Trên máy local (cần ffmpeg):
ffmpeg -re -i /path/to/test.mp4 -c copy -f flv rtmp://VPS_IP/live/testkey

# Bước 10: Kiểm tra HLS
curl http://VPS_IP:8080/hls/testkey.m3u8
```

### Pass Criteria Phase 0 ✅ ĐÃ PASS (16/06/2026)

- [x] Docker 29.x chạy được trên VPS
- [x] `curl http://127.0.0.1:8088/health` → `OK`
- [x] Sau khi test stream → `curl http://127.0.0.1:8088/hls/finalhls.m3u8` ra playlist HLS hợp lệ (EXTM3U, EXTINF, rotating segments)
- [x] HLS segments được tạo tự động bởi nginx-rtmp built-in HLS (không cần FFmpeg exec)

**Triển khai thực tế:**
- Cấu hình: IaC toàn bộ — source code trong `D:\LiveMecwish\nginx-rtmp\`, deploy qua Git push → Coolify API
- Docker image: `nginx-rtmp` (Ubuntu 24.04 + nginx + libnginx-mod-rtmp + ffmpeg)
- Port mapping: 1935 (RTMP public), 8088 (HTTP internal, proxied qua Coolify Traefik)
- Volume persistence: `hls-temp` (HLS segments), `nginx-logs` (nginx logs)
- **Phase 0 PASSED — sẵn sàng chuyển sang Phase 1.**

---

## Phase 1 — Admin phát live từ iPhone THÀNH CÔNG ✅ (2026-06-16)

> **GATE: Admin mở Larix, nhấn Stream, và `curl https://live.mecwish.com/hls/testkey.m3u8` ra playlist HLS qua HTTPS.**  
> Không cần frontend xem. Chỉ cần stream đến được server.

### Mục tiêu

Cuối Phase 1:
1. Admin cầm iPhone, mở Larix
2. Cấu hình RTMP URL và stream key
3. Nhấn Stream
4. Trên VPS: `curl https://live.mecwish.com/hls/STREAM_KEY.m3u8` ra playlist HLS

### Thành quả Phase 1 đã đạt

- Docker image: `tiangolo/nginx-rtmp:latest` (nginx 1.23.2 + nginx-rtmp 1.2.2, Debian)
- HLS: built-in `hls on;` (nginx-rtmp tự generate HLS, không cần FFmpeg)
- Port: HTTP 8088 (nginx), 1935 (RTMP)
- Traefik: entrypoint `https`, certresolver `letsencrypt`, router `hls@docker`
- Deploy: Coolify API `POST /api/v1/deploy` với `force_rebuild: true`

### Kiến trúc Docker hiện tại

```
nginx-rtmp container (tiangolo/nginx-rtmp + ffmpeg):
├── nginx.conf: RTMP → built-in HLS → /tmp/hls/*.m3u8 + *.ts
├── entrypoint.sh: tạo user nginx + chown /tmp/hls (runtime)
├── transcode.sh: shell wrapper (KHÔNG dùng — exec approach failed)
├── transcode_push.sh: shell wrapper (KHÔNG dùng — exec_publish FLV broken)
└── Ports: 1935 (RTMP), 8088 (HTTP HLS)

Traefik (Coolify proxy):
└── https://live.mecwish.com/hls/* → http://nginx-rtmp:8088/hls/*
    └── Let's Encrypt SSL (certresolver=letsencrypt)
```

### Setup Larix

```
1. Tải Larix Broadcaster từ App Store
2. Settings (⚙️) → Connections → Biểu tượng + → New Connection
3. Name: "Live Server"
4. URL: rtmp://live.mecwish.com/live
5. Stream name: mystream (tạm thời, chưa cần stream key auth)
6. Video: Resolution 1280x720, FPS 24, Bitrate 2500 Kbps, Codec H.264
7. Audio: 44100 Hz, Stereo, 128 Kbps, AAC
8. Done
```

### Kiểm tra từ VPS khi Larix đang stream

```bash
# Trên VPS, sau khi nhấn Start trên Larix
docker exec nginx-rtmp-... ls -la /tmp/hls/
# Phải thấy: mystream.m3u8, mystream-0.ts, mystream-1.ts, ...

docker exec nginx-rtmp-... curl -s http://127.0.0.1:8088/hls/mystream.m3u8
# Phải thấy:
# #EXTM3U
# #EXT-X-VERSION:3
# #EXT-X-TARGETDURATION:8
# #EXTINF:8.333,
# mystream-0.ts
# ...

# Test HTTPS external
curl https://live.mecwish.com/hls/mystream.m3u8
```

### Xử lý sự cố Phase 1

| Triệu chứng | Nguyên nhân | Fix |
|-------------|-------------|-----|
| Larix báo "Connection failed" | Port 1935 chưa mở | `ufw allow 1935/tcp` |
| Larix kết nối nhưng ngắt ngay | on_publish trả 403 | Tắt auth tạm: comment out `on_publish` trong nginx.conf |
| `/tmp/hls/` trống rỗng | Stream chưa chạy hoặc permission sai | `docker exec nginx-rtmp-... ls -la /tmp/hls/` |
| HTTPS trả về "no available server" | Traefik entrypoint sai | Dùng `https` (không phải `websecure`) |
| HTTPS trả về self-signed cert | Thiếu certresolver | Thêm `traefik.http.routers.hls.tls.certresolver=letsencrypt` |
| Larix timeout sau 30s | NAT/firewall upstream của iPhone | Thử dùng WiFi thay 4G, hoặc ngược lại |

### Pass Criteria Phase 1

- [x] Larix kết nối được tới `rtmp://live.mecwish.com/live`
- [x] `/tmp/hls/mystream.m3u8` tồn tại và có nội dung khi đang stream (tested with ffmpeg test stream)
- [x] `curl https://live.mecwish.com/hls/testkey.m3u8` trả playlist HLS hợp lệ qua HTTPS
- [x] Khi stream stop → `.m3u8` và `.ts` files được cleanup tự động

**KHÔNG chuyển sang Phase 2 nếu Phase 1 chưa pass.**

---

## Phase 2 — Trang chủ viewer xem live THÀNH CÔNG

> **GATE: Viewer mở trình duyệt, truy cập URL, thấy video live từ iPhone admin.**  
> Đây là milestone QUAN TRỌNG NHẤT. Sau Phase 2, dự án không còn "chưa live được" nữa.

### Mục tiêu

Cuối Phase 2:
1. Admin stream từ Larix
2. Viewer mở `https://live.mecwish.com/live` trên bất kỳ trình duyệt nào
3. Viewer thấy video đang play (có thể có delay 5–15s, bình thường)
4. Admin stop → viewer thấy màn hình "Stream đã kết thúc"

### 2a. Cài Coolify + SSL

```bash
# Coolify đã cài từ Phase 0
# Truy cập: http://VPS_IP:8000
# Tạo project → Add Service

# Trong Coolify:
# 1. Domains → live.mecwish.com → Enable SSL (Let's Encrypt tự động)
# 2. Coolify proxy sẽ forward: https://live.mecwish.com → http://localhost:3000 (Next.js)
# 3. HLS endpoint: Nginx không qua Coolify proxy (serve trực tiếp)
#    → Cần setup reverse proxy riêng cho port 8080
```

### 2b. Nginx Reverse Proxy cho HLS (qua SSL)

Viewer phải truy cập HLS qua HTTPS để tránh Mixed Content error (trang HTTPS không load HTTP resources).

```nginx
# Thêm vào cấu hình Nginx HTTP của Coolify (hoặc tạo server block riêng)
# Đây là reverse proxy: https://live.mecwish.com/hls/ → http://localhost:8080/hls/

server {
    listen 443 ssl;
    server_name live.mecwish.com;

    ssl_certificate /etc/ssl/live.mecwish.com/fullchain.pem;
    ssl_certificate_key /etc/ssl/live.mecwish.com/privkey.pem;

    # HLS stream endpoint
    location /hls/ {
        proxy_pass http://localhost:8080/hls/;
        proxy_set_header Host $host;
        add_header Cache-Control no-cache;
        add_header Access-Control-Allow-Origin *;
    }

    # Next.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
}
```

> **Lưu ý Coolify:** Coolify dùng Traefik làm proxy. Có thể cấu hình qua UI hoặc thêm label trong docker-compose. Xem Mục 19 để biết cách setup cụ thể.

### 2c. Minimal Viewer Page

Trang xem đơn giản nhất có thể — **không cần Supabase, không cần database, không cần auth**. Chỉ cần HLS.js load và play.

```tsx
// app/live/page.tsx — MINIMAL VIEWER (Phase 2)
// Next.js 16 — App Router, cú pháp không thay đổi so với v15
'use client';

import { useEffect, useRef } from 'react';

const HLS_URL = process.env.NEXT_PUBLIC_HLS_URL!;
// Ví dụ: https://live.mecwish.com/hls/mystream.m3u8

export default function LivePage() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const loadHls = async () => {
      // hls.js 1.6.16 — import API không thay đổi
      const Hls = (await import('hls.js')).default;

      if (Hls.isSupported()) {
        // Chrome, Firefox, Android
        const hls = new Hls({
          liveSyncDurationCount: 3,    // Sync với 3 segment cuối
          liveMaxLatencyDurationCount: 10,
          enableWorker: true,
        });
        hls.loadSource(HLS_URL);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(console.error);
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            // Retry sau 5 giây khi stream chưa bắt đầu
            setTimeout(() => hls.loadSource(HLS_URL), 5000);
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari iOS / macOS — native HLS support
        // HLS.js 1.6.x bổ sung MMS API cho iOS 17.1+ — tự động fallback
        video.src = HLS_URL;
        video.play().catch(console.error);
      }
    };

    loadHls();
  }, []);

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center">
      <div className="w-full max-w-4xl">
        <video
          ref={videoRef}
          className="w-full aspect-video bg-black"
          controls
          playsInline
          muted={false}
        />
        <p className="text-white text-center mt-4 text-sm opacity-60">
          Nếu video không tải, admin chưa bắt đầu phát live
        </p>
      </div>
    </main>
  );
}
```

### 2d. Environment Variable

```env
# .env.local
NEXT_PUBLIC_HLS_URL=https://live.mecwish.com/hls/mystream.m3u8
```

### 2e. Setup Next.js 16 + Tailwind CSS v4

```bash
# Next.js 16 với Tailwind v4 — cú pháp create-next-app mới
npx create-next-app@latest frontend --typescript --tailwind --app
cd frontend

# Cài HLS.js 1.6.16 và Supabase JS client 2.x
npm install hls.js @supabase/supabase-js

# Tailwind v4 không cần tailwind.config.js
# Chỉ cần import trong CSS:
# @import "tailwindcss";
# (create-next-app tự tạo đúng nếu dùng --tailwind flag)
```

> **Tailwind v4 quan trọng:** Nếu bạn đang migrate từ v3, chạy `npx @tailwindcss/upgrade` để convert config và class names tự động. Một số class thay đổi nhỏ (vd: `shadow-sm` → `shadow-xs` trong v4).

### Pass Criteria Phase 2 ✅

- [ ] `https://live.mecwish.com/live` load được trong trình duyệt
- [ ] Khi Larix đang stream → video play trong vòng 15 giây
- [ ] Safari iOS xem được (native HLS)
- [ ] Chrome xem được (HLS.js)
- [ ] Khi Larix stop → video freeze (bình thường), không crash trang

**ĐÂY LÀ MILESTONE. Sau khi pass Phase 2, dự án ĐANG HOẠT ĐỘNG.**  
Các Phase sau chỉ là cải thiện UX và tính năng.

---

## Phase 3 — Database + Live Status Realtime

> **GATE: Trang chủ tự động hiển thị "🔴 ĐANG LIVE" khi admin stream, tắt đi khi admin stop.**

### Mục tiêu

- Nginx-RTMP gọi Node.js API `on_publish` và `on_publish_done`
- Node.js cập nhật Supabase: `live_sessions.status = 'live' / 'ended'`
- Frontend subscribe Supabase Realtime → tự động update UI không cần refresh

### 3a. Node.js API — RTMP Callbacks

```javascript
// api/src/routes/rtmp.js
// Node.js 24 LTS — ESM hoặc CJS đều OK; ví dụ dùng CJS
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// @supabase/supabase-js 2.108.x — API không thay đổi so với 2.x trước
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Nginx-RTMP gọi khi stream bắt đầu
// POST body: name=STREAM_KEY&addr=IP&...
router.post('/on-publish', async (req, res) => {
  const { name } = req.body;  // name = stream key

  console.log(`[RTMP] Stream started: ${name}`);

  // Validate stream key
  const { data: session } = await supabase
    .from('live_sessions')
    .select('id, status')
    .eq('stream_key', name)
    .single();

  if (!session) {
    console.log(`[RTMP] Rejected: unknown stream key ${name}`);
    return res.status(403).send('Forbidden');
  }

  if (session.status === 'live') {
    console.log(`[RTMP] Rejected: already live`);
    return res.status(403).send('Already live');
  }

  // Cập nhật trạng thái → 'live'
  await supabase
    .from('live_sessions')
    .update({
      status: 'live',
      started_at: new Date().toISOString(),
      hls_url: `${process.env.HLS_BASE_URL}/hls/${name}.m3u8`
    })
    .eq('id', session.id);

  // Broadcast cho tất cả frontend clients
  await supabase.channel('live_status').send({
    type: 'broadcast',
    event: 'status_changed',
    payload: {
      status: 'live',
      session_id: session.id,
      hls_url: `${process.env.HLS_BASE_URL}/hls/${name}.m3u8`
    }
  });

  console.log(`[RTMP] Stream ${name} is now LIVE`);
  res.status(200).send('OK');  // 200 = allow stream
});

// Nginx-RTMP gọi khi stream kết thúc
router.post('/on-publish-done', async (req, res) => {
  const { name } = req.body;

  console.log(`[RTMP] Stream ended: ${name}`);

  await supabase
    .from('live_sessions')
    .update({
      status: 'ended',
      ended_at: new Date().toISOString()
    })
    .eq('stream_key', name)
    .eq('status', 'live');

  // Broadcast cho tất cả frontend clients
  await supabase.channel('live_status').send({
    type: 'broadcast',
    event: 'status_changed',
    payload: { status: 'ended' }
  });

  res.status(200).send('OK');
});

module.exports = router;
```

### 3b. Frontend — Supabase Realtime Hook

```typescript
// hooks/useLiveStatus.ts
// @supabase/supabase-js 2.108.x — API createClient không thay đổi
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type LiveStatus = 'idle' | 'live' | 'ended' | 'loading';

export interface LiveSession {
  id: string;
  status: LiveStatus;
  title: string;
  hls_url: string;
  started_at: string | null;
  viewer_peak: number;
}

export function useLiveStatus() {
  const [session, setSession] = useState<LiveSession | null>(null);
  const [status, setStatus] = useState<LiveStatus>('loading');

  useEffect(() => {
    // Fetch trạng thái hiện tại
    const fetchCurrent = async () => {
      const { data } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('status', 'live')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setSession(data);
        setStatus('live');
      } else {
        setStatus('idle');
      }
    };

    fetchCurrent();

    // Subscribe realtime changes
    const channel = supabase
      .channel('live_status')
      .on('broadcast', { event: 'status_changed' }, ({ payload }) => {
        if (payload.status === 'live') {
          setStatus('live');
          // Refetch để có đầy đủ session data
          fetchCurrent();
        } else if (payload.status === 'ended') {
          setStatus('ended');
          setSession(null);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { session, status };
}
```

### 3c. Trang chủ với Live Status

```tsx
// app/page.tsx — HOMEPAGE với live status
// Next.js 16 App Router — cú pháp 'use client' không thay đổi
'use client';

import { useLiveStatus } from '@/hooks/useLiveStatus';
import Link from 'next/link';

export default function HomePage() {
  const { session, status } = useLiveStatus();

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-8">📡 Live Stream</h1>

      {status === 'loading' && (
        <div className="text-gray-400">Đang kiểm tra trạng thái...</div>
      )}

      {status === 'live' && session && (
        <div className="text-center">
          {/* LIVE Badge */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span className="text-red-500 font-bold text-lg">ĐANG LIVE</span>
          </div>

          {/* Session Title */}
          <h2 className="text-xl font-semibold mb-2">{session.title}</h2>

          {/* Thumbnail / Preview */}
          <div className="w-full max-w-md aspect-video bg-gray-800 rounded-lg mb-4 flex items-center justify-center">
            <span className="text-6xl">🎥</span>
          </div>

          {/* CTA Button */}
          <Link
            href="/live"
            className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors"
          >
            👉 Vào xem ngay
          </Link>
        </div>
      )}

      {(status === 'idle' || status === 'ended') && (
        <div className="text-center">
          <div className="text-6xl mb-4">📺</div>
          <p className="text-gray-400 text-lg">Chưa có phiên live nào</p>
          <p className="text-gray-600 text-sm mt-2">Quay lại sau nhé!</p>
        </div>
      )}
    </main>
  );
}
```

### Pass Criteria Phase 3

- [ ] Supabase project tạo xong, schema deploy
- [ ] Node.js 24 API chạy trong Docker
- [ ] Larix stream → API nhận `on_publish` → Supabase `status = 'live'`
- [ ] Trang chủ tự cập nhật "🔴 ĐANG LIVE" không cần refresh
- [ ] Larix stop → API nhận `on_publish_done` → Supabase `status = 'ended'`
- [ ] Trang chủ tự về "Chưa có live" không cần refresh

---

## Phase 4 — Admin Dashboard + Comment System

> **GATE: Admin có dashboard để quản lý live sessions và moderate comments.**

### Mục tiêu

- Admin login bằng Supabase Auth
- Dashboard: tạo session, xem trạng thái, end session thủ công
- Comment system: viewer gửi, admin moderate
- Live viewer count polling

### 4a. Admin Dashboard Route

```
/admin/login        → Trang đăng nhập
/admin/dashboard    → Tổng quan session + controls
/admin/live         → Màn hình monitor khi đang live (trên iPhone landscape)
```

### 4b. Viewer Count

```typescript
// Polling Nginx RTMP stats mỗi 10 giây
// Nginx-RTMP stats endpoint: http://localhost:8080/stat

const fetchViewerCount = async () => {
  const res = await fetch('/api/viewer-count');
  const { count } = await res.json();
  return count;
};

// API route: /api/viewer-count
// Parse XML từ Nginx stat endpoint
// <nclients> tag chứa số kết nối HLS hiện tại
```

```typescript
// api/src/routes/viewers.js
// Node.js 24 — xml2js vẫn tương thích, dùng parseStringPromise
const { parseStringPromise } = require('xml2js');

router.get('/viewer-count', async (req, res) => {
  try {
    const response = await fetch('http://nginx:8080/stat');
    const xml = await response.text();
    const result = await parseStringPromise(xml);

    // Đếm client trong application 'live'
    const clients = result?.rtmp?.server?.[0]?.application
      ?.find(app => app.name[0] === 'live')
      ?.live?.[0]?.nclients?.[0] || '0';

    res.json({ count: parseInt(clients) });
  } catch {
    res.json({ count: 0 });
  }
});
```

### 4c. Comment System — Full Flow

```typescript
// Viewer gửi comment
// POST /api/comments
// Body: { session_id, display_name, content }

// Rate limit: 1 comment / 5 giây / IP
// Validate: display_name 1-30 ký tự, content 1-200 ký tự
// Check: session status === 'live'
// Check: display_name không bị block
// Insert vào Supabase → Realtime broadcast tự động
```

```typescript
// hooks/useComments.ts — Subscribe comment realtime
// @supabase/supabase-js 2.108.x — API không thay đổi
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useComments(sessionId: string) {
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    if (!sessionId) return;

    // Load existing comments
    supabase
      .from('comments')
      .select('*')
      .eq('session_id', sessionId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .then(({ data }) => setComments(data ?? []));

    // Subscribe new comments
    const channel = supabase
      .channel(`comments:${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
        filter: `session_id=eq.${sessionId}`
      }, ({ new: comment }) => {
        if (!comment.is_deleted) {
          setComments(prev => [...prev, comment as Comment]);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'comments',
        filter: `session_id=eq.${sessionId}`
      }, ({ new: comment }) => {
        if (comment.is_deleted) {
          setComments(prev => prev.filter(c => c.id !== comment.id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  return comments;
}
```

### Pass Criteria Phase 4

- [x] Admin đăng nhập được bằng password (hash-based cookie, check với ADMIN_PASSWORD env)
- [x] Dashboard hiển thị trạng thái session hiện tại (Live Monitor)
- [x] Viewer gửi được comment, xuất hiện realtime (Postgres Changes CDC)
- [x] Admin xóa được comment (soft-delete via is_deleted)
- [x] Admin ban được IP (banned_ips table + bulk delete)
- [x] Rate limit 1 comment/5s/IP
- [x] Offline: chat bị khóa
- [x] React Error Boundary cô lập LiveChat
- [x] Mobile landscape: ẩn chat
- [x] iOS Safari: text-base 16px, h-dvh
- [ ] Admin tạo được live session với title + stream key (deferred)
- [ ] Viewer count cập nhật mỗi 10 giây (deferred)
- [ ] Admin có thể end session thủ công (deferred)

---

## Phase 5 — Production Hardening

### Mục tiêu

- Monitoring + alerts
- CDN cho scale
- Auto-cleanup
- Backup

### 5a. Monitoring Stack

```yaml
# Đã thêm vào docker-compose.yml (Phase 5)
services:
  uptime-kuma:
    image: louislam/uptime-kuma:1
    volumes:
      - uptime-kuma-data:/app/data
    ports:
      - "127.0.0.1:3002:3001"  # bound to localhost, accessible qua SSH tunnel hoặc Traefik

  netdata:
    image: netdata/netdata:stable
    pid: host
    network_mode: host           # cần host network để lấy system metrics đầy đủ
    cap_add:
      - SYS_PTRACE
      - SYS_ADMIN
    security_opt:
      - apparmor:unconfined
    volumes:
      - netdata-config:/etc/netdata
      - netdata-cache:/var/cache/netdata
      - netdata-lib:/var/lib/netdata
      - /etc/passwd:/host/etc/passwd:ro
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
    environment:
      - NETDATA_LISTENER_PORT=19999
```

**Alerts cần setup (thực hiện qua Uptime Kuma Web UI sau khi deploy):**
- Uptime Kuma monitor `https://live.mecwish.com/api/health` → Email alert nếu down
- **Cấu hình Email Notification (Resend SMTP):**
  - SMTP Host: `smtp.resend.com`
  - Port: `587` (TLS)
  - Username: `resend`
  - Password: `${RESEND_API_KEY}` (lấy từ file `.env`)
  - From: `alerts@mecwish.com`
  - To: `${ALERT_EMAIL_TARGET}` (lấy từ file `.env`)
- Netdata alert khi CPU > 80%, RAM > 85%, Disk > 90%

### 5b. CDN (khi > 200 CCU)

Xem hướng dẫn chi tiết: [`DOCS/cdn-setup.md`](../../DOCS/cdn-setup.md)

Tóm tắt:
- Tạo BunnyCDN Pull Zone, Origin: `https://live.mecwish.com/hls/`
- Cache rule: `.m3u8` = 0s (no cache), `.ts` = 600s
- Cập nhật `NEXT_PUBLIC_HLS_URL` → CDN URL

Chi phí: **~$1/100GB**. Free trial 14 ngày.

### 5c. Disk Cleanup Cron

Đã triển khai qua **Docker Cron container** (không cần host cronjob):

```yaml
# docker-compose.yml (service cleanup)
cleanup:
  image: alpine:3.21
  container_name: cleanup-cron
  restart: always
  volumes:
    - hls-temp:/tmp/hls
    - nginx-logs:/var/log/nginx
    - ./scripts/cleanup-hls.sh:/usr/local/bin/cleanup-hls.sh:ro
  entrypoint: ["/bin/sh", "-c"]
  command:
    - |
      echo '*/5 * * * * sh /usr/local/bin/cleanup-hls.sh' > /etc/crontabs/root
      crond -f -l 2
```

Script `scripts/cleanup-hls.sh`:
- Xóa `*.ts` và `*.m3u8` cũ hơn **10 phút** trong `/tmp/hls/` (mỗi 5 phút)
- Xóa `ffmpeg-*.log` cũ hơn **7 ngày** trong `/var/log/nginx/` (hàng ngày lúc 3:00 AM)

> **Đã fix triệt để lỗi "No space left on device" từ Phase 4.**

### 5d. Recording (Optional)

```nginx
# Thêm vào nginx.conf rtmp block nếu muốn ghi lại
application live {
    live on;
    record all;
    record_path /recordings;
    record_unique on;
    record_suffix -%Y%m%d-%H%M%S.mp4;

    # Tự chuyển sang mp4 sau khi ghi xong
    exec_record_done ffmpeg -y -i $path
        -c copy /recordings/$basename.mp4
        && rm $path;
}
```

### Pass Criteria Phase 5

- [x] Uptime Kuma monitor hoạt động
- [x] Docker cron cleanup `/tmp/hls` và logs
- [x] API `/api/viewer-count` parse Nginx RTMP stat XML
- [x] Next.js 16 middleware migrated to `proxy.ts`
- [x] CDN integration guide (BunnyCDN)
- [ ] Load test: 200 CCU đồng thời tải được HLS không lag
- [ ] Backup strategy (Hetzner Snapshot hàng ngày) — deferred
- [ ] Cert expiry monitor — deferred

---

## 11. Frontend — Next.js 16 + HLS.js

### 11.1 Project Setup

```bash
# Next.js 16.2.x + Tailwind v4 + TypeScript
npx create-next-app@latest frontend --typescript --tailwind --app
cd frontend

# Cài dependencies
npm install hls.js@1.6.16 @supabase/supabase-js@2

# Kiểm tra phiên bản
npx next --version   # → 16.2.x
node --version       # → v24.x.x (phải dùng Node 24)
```

> **Tailwind v4 trong Next.js 16:** `create-next-app` với `--tailwind` flag tự động cài Tailwind v4 và cấu hình đúng. Không cần `tailwind.config.js` — thay vào đó, theme được define trong `globals.css` với `@theme { }` directive.

### 11.2 LivePlayer Component — Production Ready

```tsx
// components/LivePlayer.tsx
// Next.js 16 + HLS.js 1.6.16 — API hoàn toàn tương thích với v1.5.x
'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

type PlayerState = 'loading' | 'playing' | 'buffering' | 'error' | 'offline';

interface LivePlayerProps {
  hlsUrl: string;
  autoPlay?: boolean;
}

export function LivePlayer({ hlsUrl, autoPlay = true }: LivePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [state, setState] = useState<PlayerState>('loading');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl) return;

    const initPlayer = () => {
      setState('loading');

      if (Hls.isSupported()) {
        // Chrome, Firefox, Android
        // HLS.js 1.6.x: thêm lowLatencyMode config option
        const hls = new Hls({
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 10,
          enableWorker: true,
          lowLatencyMode: false,  // Tắt LL-HLS (nginx-rtmp không hỗ trợ)
          xhrSetup: (xhr) => {
            xhr.timeout = 10000;
          }
        });
        hlsRef.current = hls;

        hls.loadSource(hlsUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setState('playing');
          if (autoPlay) video.play().catch(console.error);
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                // Stream chưa bắt đầu hoặc đã kết thúc
                setState('offline');
                // Tự retry sau 5 giây
                setTimeout(() => {
                  setRetryCount(c => c + 1);
                }, 5000);
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                setState('error');
                break;
            }
          }
        });

        hls.on(Hls.Events.FRAG_BUFFERED, () => {
          if (state !== 'playing') setState('playing');
        });

      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari iOS 17.1+ — HLS.js 1.6.x có thể dùng MMS API nếu available
        // Nhưng native playback qua src= vẫn là cách đơn giản và ổn định nhất
        video.src = hlsUrl;
        video.addEventListener('loadedmetadata', () => {
          setState('playing');
          if (autoPlay) video.play().catch(console.error);
        });
        video.addEventListener('error', () => setState('offline'));
      } else {
        setState('error');
      }
    };

    initPlayer();

    return () => {
      hlsRef.current?.destroy();
    };
  }, [hlsUrl, retryCount, autoPlay]);

  return (
    <div className="relative w-full aspect-video bg-black">
      <video
        ref={videoRef}
        className="w-full h-full"
        playsInline
        controls
      />

      {/* Loading overlay */}
      {state === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-white text-center">
            <div className="animate-spin text-4xl mb-2">⟳</div>
            <p className="text-sm">Đang kết nối...</p>
          </div>
        </div>
      )}

      {/* Offline overlay */}
      {state === 'offline' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90">
          <div className="text-white text-center">
            <div className="text-5xl mb-3">📡</div>
            <p className="text-lg font-medium">Stream chưa bắt đầu</p>
            <p className="text-sm text-gray-400 mt-1">
              Đang chờ kết nối... (thử lần {retryCount})
            </p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {state === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90">
          <div className="text-white text-center">
            <div className="text-5xl mb-3">⚠️</div>
            <p className="text-lg">Lỗi phát video</p>
            <button
              onClick={() => setRetryCount(c => c + 1)}
              className="mt-3 px-4 py-2 bg-red-600 rounded text-sm hover:bg-red-700"
            >
              Thử lại
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 11.3 Route Structure (đã cập nhật Phase 4)

```
/                      → Landing Page (kiểm tra live_sessions, nút "ĐANG LIVE" nếu có phiên)
/live                  → Phòng xem (LivePlayer + LiveChat)
/admin                 → Admin Dashboard overview
/admin/login           → Admin đăng nhập (password form)
/admin/live            → Admin Live Control (video monitor + moderation)
/api/on-publish        → Nginx-RTMP callback (Next.js Route Handler)
/api/on-publish-done   → Nginx-RTMP callback (Next.js Route Handler)
/api/comments          → POST create comment (rate limit + ban check + session validation)
/api/comments/[id]     → DELETE soft-delete (admin, cookie auth)
/api/comments/ban      → POST ban IP + bulk delete (admin, cookie auth)
/api/admin/login       → POST verify password, set httpOnly cookie
```

---

## 12. Admin Dashboard UI

### 12.1 Setup Screen

```tsx
// app/admin/dashboard/page.tsx
// Next.js 16 — App Router không thay đổi cú pháp so với v15
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
  const [title, setTitle] = useState('');
  const [streamKey] = useState(() =>
    // Generate random stream key
    Math.random().toString(36).substring(2, 10)
  );

  const createSession = async () => {
    await supabase.from('live_sessions').insert({
      title,
      stream_key: streamKey,
      status: 'idle'
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      <div className="bg-gray-800 rounded-lg p-6 max-w-lg">
        <h2 className="text-lg font-semibold mb-4">Tạo phiên live mới</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Tiêu đề</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-gray-700 rounded px-3 py-2 text-white"
              placeholder="Tên phiên live..."
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Stream Key</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-900 rounded px-3 py-2 font-mono text-green-400">
                {streamKey}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(streamKey)}
                className="px-3 py-2 bg-gray-600 rounded text-sm hover:bg-gray-500"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="bg-gray-900 rounded p-4 text-sm">
            <p className="text-gray-400 mb-2">Cấu hình Larix:</p>
            <p>URL: <code className="text-green-400">rtmp://live.mecwish.com/live</code></p>
            <p>Stream Key: <code className="text-green-400">{streamKey}</code></p>
          </div>

          <button
            onClick={createSession}
            disabled={!title}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 py-3 rounded-lg font-bold transition-colors"
          >
            Tạo phiên
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 12.2 Admin Live Monitor (iPhone Landscape)

```tsx
// app/admin/live/page.tsx
// Dùng khi admin đang live — hiển thị landscape trên iPhone

'use client';

import { useLiveStatus } from '@/hooks/useLiveStatus';
import { useComments } from '@/hooks/useComments';

async function deleteComment(id: string) {
  await fetch(`/api/comments/${id}`, { method: 'DELETE' });
}

export default function AdminLivePage() {
  const { session, status } = useLiveStatus();
  const comments = useComments(session?.id ?? '');

  if (status !== 'live' || !session) {
    return (
      <div className="h-screen bg-black flex items-center justify-center text-white">
        <p>Chưa có stream nào đang live</p>
      </div>
    );
  }

  return (
    // Landscape layout: flex-row
    <div className="h-screen bg-black flex flex-row overflow-hidden">

      {/* Left: Stream status */}
      <div className="flex-1 flex flex-col p-4">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <span className="text-red-500 font-bold">ĐANG LIVE</span>
          <span className="text-gray-400 text-sm">{session.title}</span>
        </div>

        {/* Viewer count */}
        <div className="text-4xl font-bold text-white mb-1">
          👁 {session.viewer_peak}
        </div>
        <div className="text-gray-400 text-sm">đang xem</div>

        {/* Force end button */}
        <button
          onClick={async () => {
            if (confirm('Kết thúc live?')) {
              await fetch(`/api/sessions/${session.id}/end`, { method: 'POST' });
            }
          }}
          className="mt-auto w-full bg-gray-700 hover:bg-red-700 text-white py-3 rounded-lg font-bold transition-colors"
        >
          ⏹ Kết thúc Live
        </button>
      </div>

      {/* Right: Comments */}
      <div className="w-64 border-l border-gray-800 flex flex-col">
        <div className="p-3 border-b border-gray-800">
          <h3 className="text-white text-sm font-semibold">
            Bình luận ({comments.length})
          </h3>
        </div>

        {/* Comment list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {comments.map(comment => (
            <div key={comment.id} className="bg-gray-800 rounded p-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-blue-400 text-xs font-medium">
                    {comment.display_name}
                  </span>
                  <p className="text-white text-xs mt-0.5">{comment.content}</p>
                </div>
                <button
                  onClick={() => deleteComment(comment.id)}
                  className="text-gray-600 hover:text-red-400 text-xs shrink-0"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## 13. Viewer UI — Cinema Layout

```tsx
// app/live/page.tsx — FULL VIEWER UI
'use client';

import { useState, useRef, useEffect } from 'react';
import { LivePlayer } from '@/components/LivePlayer';
import { useComments } from '@/hooks/useComments';
import { useLiveStatus } from '@/hooks/useLiveStatus';
import { useRouter } from 'next/navigation';

export default function LivePage() {
  const router = useRouter();
  const { session, status } = useLiveStatus();
  const comments = useComments(session?.id ?? '');
  const [displayName, setDisplayName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll comments
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // Redirect khi stream kết thúc
  useEffect(() => {
    if (status === 'ended') {
      const timer = setTimeout(() => router.push('/'), 5000);
      return () => clearTimeout(timer);
    }
  }, [status, router]);

  const sendComment = async () => {
    if (!displayName.trim() || !commentText.trim() || !session) return;
    setSending(true);
    try {
      await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.id,
          display_name: displayName.trim(),
          content: commentText.trim()
        })
      });
      setCommentText('');
    } finally {
      setSending(false);
    }
  };

  return (
    // Cinema layout: full viewport, no header/footer
    <div className="w-screen h-svh flex flex-col bg-black overflow-hidden">

      {/* Video section */}
      <div className="w-full shrink-0" style={{ aspectRatio: '16/9' }}>
        {session?.hls_url ? (
          <div className="relative w-full h-full">
            <LivePlayer hlsUrl={session.hls_url} />

            {/* Top bar overlay */}
            <div className="absolute top-0 left-0 right-0 flex items-center gap-3 p-3 bg-gradient-to-b from-black/70 to-transparent">
              {status === 'live' && (
                <>
                  <span className="flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                  <span className="text-red-400 text-sm font-bold">LIVE</span>
                </>
              )}
              <span className="text-white text-sm truncate">{session.title}</span>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-white text-center">
              <div className="text-5xl mb-3">📡</div>
              <p>Chưa có stream</p>
            </div>
          </div>
        )}
      </div>

      {/* Ended banner */}
      {status === 'ended' && (
        <div className="bg-gray-800 text-center py-2 text-white text-sm">
          Phiên live đã kết thúc · Chuyển về trang chủ sau 5 giây...
        </div>
      )}

      {/* Comment section */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-950">

        {/* Comment list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {comments.map(comment => (
            <div key={comment.id} className="flex gap-2">
              <span className="text-blue-400 text-sm font-medium shrink-0">
                {comment.display_name}:
              </span>
              <span className="text-gray-300 text-sm">{comment.content}</span>
            </div>
          ))}
          <div ref={commentsEndRef} />
        </div>

        {/* Comment input */}
        {status === 'live' && (
          <div className="p-3 border-t border-gray-800 space-y-2">
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Tên của bạn"
              maxLength={30}
              className="w-full bg-gray-800 text-white rounded px-3 py-2 text-sm placeholder-gray-500"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendComment()}
                placeholder="Nhập bình luận..."
                maxLength={200}
                className="flex-1 bg-gray-800 text-white rounded px-3 py-2 text-sm placeholder-gray-500"
              />
              <button
                onClick={sendComment}
                disabled={sending || !displayName.trim() || !commentText.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white px-4 py-2 rounded text-sm transition-colors"
              >
                Gửi
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 14. Homepage — Live Discovery

Xem code tại Mục 3c (Phase 3). Homepage là entry point, hiển thị:
- Badge "🔴 ĐANG LIVE" khi có stream
- Nút "Vào xem ngay" link đến `/live`
- Trạng thái offline khi không có stream

---

## 15. Comment System

### 15.1 API Route — POST comment

```typescript
// api/src/routes/comments.js
// Node.js 24 — Map built-in, không cần dependencies thêm cho rate limit đơn giản
const rateLimit = new Map(); // IP → last comment timestamp

router.post('/comments', async (req, res) => {
  const { session_id, display_name, content } = req.body;
  const ip = req.ip;

  // Rate limit: 1 comment / 5 giây / IP
  const lastTime = rateLimit.get(ip) || 0;
  if (Date.now() - lastTime < 5000) {
    return res.status(429).json({ error: 'Gửi quá nhanh, đợi chút' });
  }

  // Validate
  if (!display_name?.trim() || display_name.length > 30)
    return res.status(400).json({ error: 'Tên không hợp lệ (1-30 ký tự)' });
  if (!content?.trim() || content.length > 200)
    return res.status(400).json({ error: 'Nội dung quá dài (tối đa 200 ký tự)' });

  // Check session đang live
  const { data: session } = await supabase
    .from('live_sessions')
    .select('status')
    .eq('id', session_id)
    .single();

  if (session?.status !== 'live')
    return res.status(403).json({ error: 'Phiên live đã kết thúc' });

  // Check blocked
  const { data: blocked } = await supabase
    .from('blocked_viewers')
    .select('id')
    .eq('session_id', session_id)
    .eq('display_name', display_name.trim())
    .maybeSingle();

  if (blocked)
    return res.status(403).json({ error: 'Bạn đã bị chặn khỏi phiên này' });

  // Insert
  const { data, error } = await supabase
    .from('comments')
    .insert({
      session_id,
      display_name: display_name.trim(),
      content: content.trim()
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'Lỗi server' });

  rateLimit.set(ip, Date.now());
  res.status(201).json(data);
});

// DELETE comment (admin only)
router.delete('/comments/:id', adminAuth, async (req, res) => {
  await supabase
    .from('comments')
    .update({ is_deleted: true, deleted_by: 'admin' })
    .eq('id', req.params.id);
  res.json({ success: true });
});

// Block viewer
router.post('/blocked-viewers', adminAuth, async (req, res) => {
  const { session_id, display_name } = req.body;
  await supabase.from('blocked_viewers').insert({ session_id, display_name });
  res.json({ success: true });
});
```

---

## 16. Database Schema — Supabase

```sql
-- ============================================================
-- LIVE SESSIONS — Mỗi buổi live là 1 record
-- ============================================================
CREATE TABLE live_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  stream_key    TEXT UNIQUE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'idle'
                CHECK (status IN ('idle', 'live', 'ended')),
  hls_url       TEXT,
  started_at    TIMESTAMPTZ,
  ended_at      TIMESTAMPTZ,
  viewer_peak   INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index để query nhanh session đang live
CREATE INDEX idx_live_sessions_status ON live_sessions(status)
  WHERE status = 'live';

-- Index để lookup bằng stream_key (dùng trong on_publish callback)
CREATE INDEX idx_live_sessions_stream_key ON live_sessions(stream_key);

-- ============================================================
-- COMMENTS — Bình luận của viewer
-- ============================================================
CREATE TABLE comments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 30),
  content       TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 200),
  is_deleted    BOOLEAN DEFAULT false,
  deleted_by    TEXT,              -- 'admin' | 'system'
  is_pinned     BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_session ON comments(session_id, created_at DESC);
CREATE INDEX idx_comments_active  ON comments(session_id)
  WHERE is_deleted = false;

-- ============================================================
-- BLOCKED VIEWERS — Danh sách bị chặn theo display_name
-- ============================================================
CREATE TABLE blocked_viewers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, display_name)
);

-- ============================================================
-- VIEWER COUNTS — Lịch sử số lượng viewer (optional)
-- ============================================================
CREATE TABLE viewer_counts (
  id          BIGSERIAL PRIMARY KEY,
  session_id  UUID REFERENCES live_sessions(id) ON DELETE CASCADE,
  count       INTEGER DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Viewer chỉ đọc được comment chưa xóa
CREATE POLICY "viewers_read_active_comments"
  ON comments FOR SELECT
  USING (is_deleted = false);

-- Admin (service_role) có full access — không cần policy thêm

-- Viewer có thể insert comment (qua API, không phải direct)
-- API dùng service_role key nên không bị RLS chặn

-- ============================================================
-- REALTIME — Bật cho các bảng cần realtime
-- ============================================================
-- Trong Supabase Dashboard:
-- Table Editor → comments → Enable Realtime ✅
-- Table Editor → live_sessions → Enable Realtime ✅
--
-- Lưu ý 06/2026: Supabase Realtime hỗ trợ binary payload broadcast
-- (tính năng mới). SPEC này dùng JSON broadcast — không cần thay đổi.
```

---

## 17. API Routes

### 17.1 Node.js API Structure

```
api/
├── src/
│   ├── index.js              # Entry point, Express setup
│   ├── middleware/
│   │   ├── auth.js           # Admin JWT verify
│   │   └── rateLimit.js      # Per-IP rate limiting
│   └── routes/
│       ├── rtmp.js           # on_publish, on_publish_done
│       ├── sessions.js       # GET/POST/PATCH sessions
│       ├── comments.js       # CRUD comments
│       ├── viewers.js        # Viewer count từ Nginx stat
│       └── health.js         # Health check
├── package.json
└── Dockerfile
```

### 17.2 API Entry Point

```javascript
// api/src/index.js
// Node.js 24 LTS — Express 4.x, tương thích đầy đủ
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({ origin: process.env.ALLOWED_ORIGINS }));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Nginx RTMP gửi form data

// Routes
app.use('/rtmp', require('./routes/rtmp'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/viewers', require('./routes/viewers'));
app.get('/health', (req, res) => res.send('OK'));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
```

### 17.3 Session Routes

```javascript
// api/src/routes/sessions.js

// GET /api/sessions/current — Lấy session đang live
router.get('/current', async (req, res) => {
  const { data } = await supabase
    .from('live_sessions')
    .select('*')
    .eq('status', 'live')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  res.json(data || null);
});

// POST /api/sessions — Tạo session mới (admin only)
router.post('/', adminAuth, async (req, res) => {
  const { title, stream_key } = req.body;

  // Chỉ 1 session live tại một thời điểm
  const { count } = await supabase
    .from('live_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'live');

  if (count > 0)
    return res.status(409).json({ error: 'Đang có session live khác' });

  const { data, error } = await supabase
    .from('live_sessions')
    .insert({ title, stream_key, status: 'idle' })
    .select()
    .single();

  if (error) return res.status(500).json({ error });
  res.status(201).json(data);
});

// POST /api/sessions/:id/end — Force end session (admin only)
router.post('/:id/end', adminAuth, async (req, res) => {
  await supabase
    .from('live_sessions')
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq('id', req.params.id);

  // Broadcast tới viewer
  await supabase.channel('live_status').send({
    type: 'broadcast',
    event: 'status_changed',
    payload: { status: 'ended' }
  });

  res.json({ success: true });
});
```

### 17.4 Phase 5 API Endpoints (Next.js Route Handlers)

**`GET /api/health`** — Health check cho Uptime Kuma monitoring:
```typescript
// app/api/health/route.ts
export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}
```

**`GET /api/viewer-count`** — Parse XML từ Nginx RTMP `/stat` endpoint, trả về CCU:
```typescript
// Response JSON:
{
  "streamKey": "testkey",
  "nclients": 5,        // số RTMP clients đang kết nối
  "bytesIn": 1234567,
  "bytesOut": 9876543,
  "uptimeMs": 3600000
}
```
> Kết quả được poll mỗi 10 giây từ Admin Dashboard (`useViewerCount` hook).

---

## 18. Firewall & Port Matrix

### 18.1 Ports cần mở (Hetzner Firewall)

| Port | Protocol | Service | Expose | Note |
|------|----------|---------|--------|------|
| 22 | TCP | SSH | Giới hạn IP | Admin access |
| 80 | TCP | HTTP redirect | Public | Coolify auto-redirect → 443 |
| 443 | TCP | HTTPS | Public | Next.js + HLS qua SSL |
| 1935 | TCP | RTMP | **Public** | **Bắt buộc cho Larix** |
| 3001 | TCP | Node.js API | Nội bộ | Chỉ Docker network |
| 8000 | TCP | Coolify Dashboard | Giới hạn IP | Admin access |
| 8080 | TCP | Nginx HLS | Nội bộ | Không expose trực tiếp, qua proxy |

> **RTMP port 1935 PHẢI mở.** Đây là lý do phổ biến nhất khiến Larix không kết nối được.

### 18.2 Hetzner Firewall Setup

```bash
# Vào Hetzner Console → Firewall → Create Firewall

# Inbound rules:
# 22/TCP     → My IP only (SSH)
# 80/TCP     → Any (0.0.0.0/0)
# 443/TCP    → Any
# 1935/TCP   → Any (RTMP)
# 8000/TCP   → My IP only (Coolify)

# Gắn firewall vào server
# Servers → Select server → Firewalls → Add firewall
```

---

## 19. Docker Compose & Coolify Deploy

### 19.1 docker-compose.yml

```yaml
# docker-compose.yml
# Docker 29.4.x — format 'version' key đã deprecated, bỏ đi cho thoáng
# (Docker Compose v2+ không cần khai báo version)

services:
  # ────────────────────────────────────────────────
  # NGINX RTMP — RTMP ingest + HLS serve
  # ────────────────────────────────────────────────
  nginx-rtmp:
    build:
      context: ./nginx-rtmp
      dockerfile: Dockerfile
    container_name: nginx-rtmp
    restart: always
    ports:
      - "1935:1935"                  # RTMP — PHẢI expose ra ngoài cho Larix
      - "127.0.0.1:8080:8080"        # HLS HTTP — chỉ localhost, qua proxy ra
    volumes:
      - hls-temp:/tmp/hls            # HLS segments tạm
      - nginx-logs:/var/log/nginx    # Logs
    networks:
      - livestream

  # ────────────────────────────────────────────────
  # NODE.JS API — RTMP callbacks + Business logic
  # Node.js 24 LTS image
  # ────────────────────────────────────────────────
  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    container_name: api
    restart: always
    environment:
      - NODE_ENV=production
      - PORT=3001
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - HLS_BASE_URL=${HLS_BASE_URL}
      - ADMIN_JWT_SECRET=${ADMIN_JWT_SECRET}
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
    ports:
      - "127.0.0.1:3001:3001"  # Chỉ internal
    networks:
      - livestream
    depends_on:
      - nginx-rtmp

  # ────────────────────────────────────────────────
  # NEXT.JS FRONTEND — Next.js 16.2.x
  # Coolify quản lý SSL, expose ra https://live.mecwish.com
  # ────────────────────────────────────────────────
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: frontend
    restart: always
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - NEXT_PUBLIC_HLS_URL=${NEXT_PUBLIC_HLS_URL}
      - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
    ports:
      - "127.0.0.1:3000:3000"
    networks:
      - livestream

volumes:
  hls-temp:
  nginx-logs:

networks:
  livestream:
    driver: bridge
```

### 19.2 Dockerfile — Node.js API

```dockerfile
# api/Dockerfile
# Node.js 24 LTS — thay thế Node.js 20 LTS (đã EOL)
FROM node:24-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/

EXPOSE 3001
CMD ["node", "src/index.js"]
```

### 19.3 Dockerfile — Next.js Frontend

```dockerfile
# frontend/Dockerfile
# Node.js 24 LTS — Next.js 16 yêu cầu Node.js 20+, dùng 24 để future-proof
FROM node:24-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
```

### 19.4 Coolify Configuration

```
1. Coolify Dashboard → Projects → New Project: "livestream"
2. Add Resource → Docker Compose
3. Paste nội dung compose.yml
4. Environment Variables (Mục 20)
5. Domains:
   - live.mecwish.com → frontend:3000 (SSL auto)
6. Proxy config cho /hls/ (xem bên dưới)
7. Deploy
```

### 19.5 Proxy /hls/ qua SSL

Cần forward `https://live.mecwish.com/hls/` → `http://localhost:8080/hls/`.

Trong Coolify, thêm custom Traefik label vào service `nginx-rtmp`:

```yaml
# Thêm labels vào service nginx-rtmp trong compose.yml
services:
  nginx-rtmp:
    labels:
      - traefik.enable=true
      - traefik.http.routers.hls.rule=Host(`live.mecwish.com`) && PathPrefix(`/hls`)
      - traefik.http.routers.hls.entrypoints=websecure
      - traefik.http.routers.hls.tls=true
      - traefik.http.services.hls.loadbalancer.server.port=8080
```

---

## 20. Environment Variables

```env
# ============================================================
# SERVER-SIDE (KHÔNG commit lên git)
# ============================================================

# Supabase
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...   # Key có full access, KHÔNG expose ra client

# API Config
ADMIN_JWT_SECRET=<openssl rand -hex 32>   # JWT secret cho admin auth
HLS_BASE_URL=https://live.mecwish.com     # Base URL cho HLS (dùng trong on_publish)
ALLOWED_ORIGINS=https://live.mecwish.com  # CORS

# ============================================================
# CLIENT-SIDE (NEXT_PUBLIC_ prefix — có thể thấy trong browser)
# ============================================================

NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...   # Key chỉ có read access theo RLS
NEXT_PUBLIC_HLS_URL=https://live.mecwish.com/hls/STREAM_KEY.m3u8
NEXT_PUBLIC_API_URL=https://live.mecwish.com/api
```

> **Lưu ý:** `NEXT_PUBLIC_HLS_URL` sẽ bao gồm stream key. Nếu muốn dynamic (nhiều session), cần fetch URL từ API thay vì hardcode trong env.

---

## 21. Monitoring & Alerts

### 21.1 Uptime Kuma Setup

```
1. Truy cập http://VPS_IP:3002 (Uptime Kuma)
2. Add Monitor:
   - Type: HTTP(s)
   - URL: https://live.mecwish.com/health
   - Interval: 60 seconds
   - Telegram notification: Add → Bot Token + Chat ID
```

### 21.2 Key Metrics cần theo dõi

| Metric | Normal | Alert threshold |
|--------|--------|----------------|
| CPU usage | 20–40% | > 80% trong 5 phút |
| RAM usage | 50–60% | > 85% |
| Disk `/tmp/hls` | < 500 MB | > 2 GB |
| RTMP connections | 1 (admin) | > 2 (phát hiện unauthorized) |
| HTTP 5xx rate | 0 | > 5/phút |

### 21.3 Log Monitoring

```bash
# Xem RTMP connections realtime
watch -n 2 'curl -s http://localhost:8080/stat | grep -oP "(?<=<nclients>)[0-9]+" | head -1'

# Xem FFmpeg đang chạy
ps aux | grep ffmpeg

# Xem log Nginx RTMP
docker exec nginx-rtmp tail -f /var/log/nginx/error.log

# Xem HLS segments đang được tạo
watch -n 2 'ls -la /tmp/hls/ | tail -5'
```

---

## 22. Scale Strategy

### 22.1 Bandwidth tính toán

```
500 viewers × 2.5 Mbps (720p HLS) = 1.25 Gbps

Hetzner CX32: 20 TB/tháng = ~6.5 Gbps sustained (thực tế)
→ Đủ cho 500 CCU không cần CDN (băng thông share, burst OK)

Nếu > 200 CCU liên tục nhiều giờ → thêm CDN để tránh overage
```

### 22.2 Scale Thresholds

| CCU Range | Strategy | Action |
|-----------|----------|--------|
| 0–50 | VPS direct | Không cần làm gì |
| 50–200 | VPS direct | Monitor CPU/RAM |
| 200–500 | VPS + BunnyCDN | Setup CDN Pull Zone |
| 500+ | CDN bắt buộc | Upgrade VPS lên CX42 |

### 22.3 BunnyCDN Setup

```
1. Đăng ký BunnyCDN
2. Pull Zone → Create:
   - Name: live-mecwish
   - Origin URL: https://live.mecwish.com/hls/
3. CDN URL: https://live-mecwish.b-cdn.net/

4. Cập nhật NEXT_PUBLIC_HLS_URL:
   Từ: https://live.mecwish.com/hls/STREAM_KEY.m3u8
   Thành: https://live-mecwish.b-cdn.net/STREAM_KEY.m3u8
```

---

## 23. Kịch bản sự cố & Xử lý

| # | Sự cố | Nguyên nhân | Phát hiện | Fix |
|---|-------|-------------|-----------|-----|
| 1 | Larix báo "Connection failed" | Port 1935 chưa mở | Kết nối bị từ chối ngay | `ufw allow 1935/tcp`; kiểm tra Hetzner firewall |
| 2 | Larix kết nối nhưng ngắt sau 2–3s | on_publish trả 403 | Log nginx RTMP | Kiểm tra stream key trong DB; tắt tạm auth |
| 3 | .m3u8 không được tạo | FFmpeg lỗi | `/tmp/hls/` trống | Xem FFmpeg log; kiểm tra FFmpeg version |
| 4 | Viewer thấy video freeze | Admin stop stream | HLS.js error | Hiển thị "Stream kết thúc" overlay |
| 5 | Viewer thấy video delay > 30s | Segment quá lớn hoặc network | Trải nghiệm người dùng | Giảm `-hls_time` xuống 1s (tăng disk IO) |
| 6 | Disk đầy `/tmp/hls` | Không cleanup segments | df alert | Cron cleanup; tăng `-hls_list_size 3` |
| 7 | Nhiều admin cùng stream | Không có auth | RTMP stat > 1 connection | on_publish check DB trước khi allow |
| 8 | Frontend không load HLS | Mixed Content (HTTP trong HTTPS) | Console error | Đảm bảo HLS URL dùng HTTPS |
| 9 | Supabase Realtime không hoạt động | RLS chặn | Viewer không thấy update | Kiểm tra RLS policy; bật Realtime trong dashboard |
| 10 | Safari iOS không play | Không có HTTPS | Console error | HTTPS bắt buộc cho video trên iOS |
| 11 | FFmpeg crash khi transcode | Input bitrate quá cao | Process died | Giảm bitrate Larix xuống 2000 Kbps |
| 12 | API timeout trên on_publish | API chậm hoặc Supabase timeout | Nginx timeout 3s → deny | Tăng timeout hoặc cache session data |
| 13 | `node: command not found` trong Docker | Base image sai version | Build fail | Đảm bảo dùng `node:24-alpine`, không phải `node:20` |
| 14 | Tailwind classes không apply | Config v4 sai | UI bị naked | Kiểm tra `@import "tailwindcss"` trong globals.css |

---

## 24. Chi phí ước tính

### 24.1 Chi phí cố định / tháng

| Item | Provider | Cost |
|------|----------|------|
| VPS CX32 (MVP) | Hetzner | ~€6.80 |
| VPS CX42 (production) | Hetzner | ~€16.40 |
| Domain | Cloudflare | ~$1/tháng (~$10/năm) |
| SSL | Let's Encrypt | Miễn phí |
| Coolify | Self-host | Miễn phí |
| Nginx-RTMP | Open Source | Miễn phí |
| Supabase | Free tier | Miễn phí (up to 500MB DB, 50k MAU) |
| **Total MVP** | | **~€8–9/tháng** |

### 24.2 Chi phí scale

| Scenario | CDN | Cost thêm |
|----------|-----|-----------|
| 100 CCU × 2h/ngày × 30 ngày | Không cần | €0 |
| 300 CCU × 2h/ngày | BunnyCDN ~150GB | ~$1.5/tháng |
| 500 CCU × 4h/ngày | BunnyCDN ~600GB | ~$6/tháng |

---

## 25. Checklist triển khai theo Phase

### Phase 0 — VPS + Nginx-RTMP ✅ HOÀN THÀNH (16/06/2026)

- [x] Tạo VPS Hetzner CX32, Ubuntu 24.04 LTS — **VPS IP: 34.126.84.171**
- [x] Cài **Docker 29.x** (`curl -fsSL https://get.docker.com | sh`)
- [x] Cài **Coolify v4.0.0-beta.472+** — **Dashboard: http://34.126.84.171:8000**
- [x] Tạo file `nginx.conf`, `Dockerfile`, `docker-compose.yml` (Mục 4) — **Repo: doanquangkien/livemw, branch: main**
- [x] Deploy qua Coolify API — **Project: "LiveMecwish", App UUID: o4qznvdedjjzpjmhns3el9qg**
- [x] Mở port 1935 và 8080 trong firewall — **RTMP 1935 public, HTTP 8088 internal (Coolify Traefik proxy)**
- [x] Test stream bằng ffmpeg từ local → `rtmp://34.126.84.171/live/testkey`
- [x] `curl http://127.0.0.1:8088/hls/testkey.m3u8` → playlist HLS hợp lệ
- [x] Infrastructure as Code: toàn bộ deploy qua Git push → Coolify auto-deploy, không SSH tạo file thủ công

**Kết quả Phase 0:**
- RTMP ingest (port 1935): hoạt động, nhận stream từ ffmpeg local
- Built-in HLS generation: nginx-rtmp tự tạo .m3u8 + .ts segments trong `/tmp/hls/`
- HTTP serving (port 8088): trả về HLS playlist và segments hợp lệ (CORS enabled)
- Health check (`/health`): trả về `OK`
- FFmpeg transcoding: hoãn lại Phase 1 (RTMP play bị lỗi trên Ubuntu 24.04 `libnginx-mod-rtmp` package)

### Phase 1 — Admin phát từ iPhone ✅ DONE (2026-06-16)

- [x] Tải Larix trên iPhone
- [x] Cấu hình Larix: URL + stream key
- [x] Nhấn Start trên Larix → stream đến `rtmp://live.mecwish.com/live`
- [x] SSH vào VPS: `ls /tmp/hls/` → thấy .m3u8 và .ts files
- [x] `curl https://live.mecwish.com/hls/testkey.m3u8` → playlist HLS hợp lệ qua HTTPS
- [x] Fix Traefik: entrypoint `https` (không phải `websecure`), certresolver `letsencrypt`
- [x] Base image: `tiangolo/nginx-rtmp:latest` (nginx 1.23.2 + nginx-rtmp 1.2.2 source-compiled, Debian)
- [x] FFmpeg transcoding hoãn: dùng built-in HLS (`hls on;`), RTMP Play + exec_publish FLV broken
- [x] Coolify deploy API trigger hoạt động

### Phase 2 — Viewer xem được ✅ MILESTONE (2026-06-16)

- [x] Setup DNS `live.mecwish.com` → VPS IP (đã hoàn thành từ Phase 1)
- [x] Coolify deploy **Next.js 16** frontend — container `frontend` up, port 3000
- [x] SSL tự động qua Coolify (Let's Encrypt) — Traefik certresolver
- [x] Proxy `/hls/` qua HTTPS (Traefik labels) — giữ nguyên từ Phase 1
- [x] Tạo `app/page.tsx` (trang chủ `/`) + `components/LivePlayer.tsx` với HLS.js + Safari native fallback
- [x] Set `NEXT_PUBLIC_HLS_URL` trong env + Docker build args
- [x] Deploy và test: `https://live.mecwish.com/` load được, render HTML Next.js
- [x] FFmpeg test stream → HLS playlist + TS segments accessible qua HTTPS
- [x] Frontend hiển thị LivePlayer, kết nối tới HLS URL
- [x] Safari iOS → thấy video live (user đã test)
- [x] Larix iPhone → stream thật, viewer xem qua browser (user đã test)

> **Kiến trúc Phase 2:** Trang viewer chính đặt tại `/` (root), không phải `/live`. Lý do: Phase 2 minimal — chưa có homepage riêng, chưa có auth. Khi thêm homepage ở Phase 3, có thể chuyển viewer qua `/live`.

### Phase 3 — Live Status Realtime

- [x] Tạo Supabase project (đã có từ trước, env vars trong `.env`)
- [x] Run SQL schema — bảng `live_sessions` với RLS + Realtime (Mục 16)
- [x] Bật Realtime cho bảng `live_sessions` (`ALTER PUBLICATION supabase_realtime ADD TABLE`)
- [x] Deploy API callbacks: **Next.js Route Handlers** (`app/api/on-publish/route.ts`) thay vì Express app riêng
- [x] Cập nhật `nginx.conf`: `on_publish` và `on_publish_done` → `http://frontend:3000/api/...`
- [x] Frontend tích hợp `useLiveStatus` hook (Supabase Realtime Postgres Changes)
- [x] Homepage (`/`) hiển thị badge "LIVE" động với animated red dot
- [x] Test end-to-end: Admin stream → homepage tự update → Admin stop → homepage về offline
- [x] Larix iPhone real test

### Phase 4 — Admin Dashboard + Comments

- [x] Admin login page (`/admin/login`) — hash-based cookie auth, no Supabase Auth dependency
- [x] Admin dashboard with sidebar layout
- [x] Admin live control (`/admin/live`) — video monitor + comment moderation
- [x] Comment input trên viewer page — YouTube Mobile layout
- [x] Comment realtime subscription (Postgres Changes CDC: INSERT + UPDATE)
- [x] Admin delete comment (soft-delete via is_deleted)
- [x] Admin ban IP (banned_ips table + bulk delete comments)
- [x] Rate limiting (1 comment/5s/IP, in-memory Map)
- [x] Strict session isolation (comments filtered by session_id)
- [x] Offline chat disabled ("Stream is offline. Chat is disabled.")
- [x] React Error Boundary isolating LiveChat from video
- [x] Mobile landscape: chat hidden (CSS media query)
- [x] iOS Safari fix: input text-base (16px), h-dvh
- [x] localStorage display name (auto-fill after first comment)
- [x] CSS container fullscreen (no native video fullscreen)
- [x] Next.js middleware bảo vệ `/admin/*` (cookie check)
- [x] Viewer count polling từ Nginx stat (Phase 5: `/api/viewer-count`)
- [x] Admin force-end session route (Phase 5: `/api/admin/force-end`)

### Phase 5 — Production Hardening

- [x] Uptime Kuma deploy + Resend Email alert (SMTP)
- [x] Netdata system metrics (Docker, host network mode)
- [x] Cron cleanup `/tmp/hls` và logs (Docker alpine cron, mỗi 5 phút)
- [x] Health endpoint `/api/health` cho Uptime Kuma monitoring
- [x] API `/api/viewer-count` parse Nginx RTMP stat XML
- [x] Next.js 16 middleware → `proxy.ts` migration
- [x] BunnyCDN Pull Zone setup guide (`DOCS/cdn-setup.md`)
- [ ] Load test 200 CCU (pending)
- [ ] Hetzner Snapshot tự động hàng ngày (deferred)
- [ ] Cert expiry monitor (deferred)

---

## 26. Quyết định kiến trúc đã chốt

| # | Quyết định | Lý do |
|---|-----------|-------|
| 1 | RTMP → HLS thay vì WebRTC | Đơn giản, battle-tested, không cần ICE/TURN, Larix stable |
| 2 | Larix Broadcaster trên iPhone | Free, native RTMP, stable, không phụ thuộc browser quirks |
| 3 | Nginx-RTMP thay vì OvenMediaEngine | Đơn giản hơn, ít moving parts, docs nhiều hơn, dễ debug |
| 4 | Built-in HLS (`hls on;`) thay vì FFmpeg exec | RTMP Play broken trên nginx-rtmp 1.2.2, exec_publish gửi FLV non-standard. Built-in HLS đủ dùng cho Phase 1-2. Sẽ nâng cấp ở Phase 5 (sidecar transcoder hoặc patched nginx-rtmp) |
| 5 | HLS.js cho viewer | Chạy mọi browser (Chrome/Firefox), Safari dùng native HLS |
| 6 | HLS segment 2 giây | Cân bằng latency và stability |
| 7 | Supabase Realtime cho live status | Zero-config WebSocket, Auth + DB + Realtime trong 1 service |
| 8 | Next.js Route Handlers cho RTMP callbacks | Dùng `app/api/on-publish/route.ts` thay vì Express container riêng — tối ưu docker-compose, không cần container API riêng, giảm cold start |
| 9 | Viewer ẩn danh (tên + comment) | Friction thấp nhất, không cần signup |
| 10 | Phase-based deploy: Phase 2 là milestone sống còn | Đảm bảo core flow hoạt động trước khi build features |
| 11 | HLS qua HTTPS (proxy qua Coolify) | Safari iOS và Chrome chặn mixed content |
| 12 | Stream key auth trong on_publish | Ngăn unauthorized stream, 1 session tại 1 thời điểm |
| 13 | Hetzner CX32 (không GCP) | Chi phí thấp hơn 10x, đủ cho use case này |
| 14 | Docker + Coolify | Dễ deploy, rollback, manage services |
| 15 | `/tmp/hls` cho segments | Không cần persistent volume, cleanup đơn giản |
| 16 | BunnyCDN Pull Zone cho scale | Rẻ nhất ($0.01/GB), không cần config phức tạp |
| 17 | **Node.js 24 LTS** (v2.0) | Node 20 EOL tháng 04/2026; 24 là Active LTS đến 04/2028 |
| 18 | **Tailwind CSS v4** (v2.0) | CSS-first config, 10x faster build, v3 sẽ ngừng hỗ trợ |
| 19 | **Next.js 16.2.x** (v2.0) | Current stable; Turbopack default giúp dev build nhanh hơn 400% |
| 20 | **Soft-delete comments** (is_deleted BOOLEAN) | UPDATE events broadcast qua Realtime thay vì DELETE events (cần quyền đặc biệt). Frontend filter is_deleted=false |
| 21 | **Hash-based admin auth** (SHA256 cookie) | Không dependency JWT. Login API hash password → set httpOnly cookie. Middleware check cookie format. API routes verify hash |
| 22 | **In-memory rate limiter** (Map<IP, timestamp>) | Zero dependency, 1 comment/5s/IP. Reset khi container restart |
| 23 | **CSS Container Fullscreen** (không native video) | Fullscreen API trên wrapper div, ẩn chat khi fullscreen mobile |
| 24 | **Mobile landscape: ẩn chat** | CSS `@media (orientation: landscape) and (max-width: 1023px)` → `.chat-column { display: none }` |
| 25 | **React Error Boundary** bao LiveChat | Fault isolation: comment system crash không làm sập video player |
| 26 | **banned_ips table** (ip TEXT PK) | IP-based ban, không block theo display_name (dễ fake). Admin bấm [Cấm] → upsert IP + soft-delete tất cả comment từ IP đó |
| 27 | **localStorage display_name** | Lần đầu hiện ô nhập tên, các lần sau tự động điền từ localStorage |

---

## 27. Câu hỏi thường gặp

**Q: Latency bao lâu từ khi admin stream đến khi viewer thấy?**  
A: Với HLS segment 2s và list_size 6: khoảng **5–15 giây**. Đây là acceptable cho livestream nói chuyện/trình bày. Nếu cần dưới 5s, cần giảm segment xuống 1s (tăng server load).

**Q: iPhone Safari có xem được không?**  
A: Có, Safari có native HLS support. Không cần HLS.js. Chỉ cần URL phải là HTTPS. Từ iOS 17.1+, HLS.js 1.6.x còn hỗ trợ Managed Media Source API giúp tối ưu hơn nữa.

**Q: Nếu mạng 4G của admin yếu thì sao?**  
A: Larix có tự động reconnect. Giảm bitrate trong Larix xuống 1500 Kbps nếu mạng không ổn định. Nginx-RTMP nhận lại stream tự động.

**Q: Có thể live bằng OBS thay vì Larix không?**  
A: Có. OBS: Settings → Stream → Service: Custom → URL: `rtmp://live.mecwish.com/live` → Stream Key: `STREAM_KEY`. Tất cả config server giữ nguyên.

**Q: Có thể có nhiều stream key không?**  
A: Có. Mỗi session trong DB có stream key riêng. Tuy nhiên, hệ thống chỉ cho phép 1 session `status=live` tại một thời điểm (single admin policy).

**Q: Tại sao không dùng WebRTC như dự án cũ?**  
A: WebRTC trên Safari iOS có rất nhiều quirks (ICE negotiation, DTLS, TURN requirement, CORS). Larix dùng RTMP protocol trưởng thành, không có vấn đề này. Trade-off là latency cao hơn (5–15s vs <1s) nhưng stability cao hơn nhiều.

**Q: Node.js 20 → 24 có breaking changes không?**  
A: Không đáng kể cho project này. Express 4.x và `@supabase/supabase-js` 2.x đều tương thích Node.js 24. Chỉ cần đổi base image trong Dockerfile từ `node:20-alpine` → `node:24-alpine`.

**Q: Tailwind v3 → v4 có phá vỡ code UI không?**  
A: Đây là dự án mới nên dùng v4 ngay từ đầu, không cần migrate. Nếu bạn copy component từ project cũ dùng v3, chạy `npx @tailwindcss/upgrade` để convert tự động.

---

## 28. Changelog v1.0 → v2.0

Bảng tổng hợp toàn bộ thay đổi phiên bản trong tài liệu này.

| Component | v1.0 (tháng 06/2025) | v2.0 (tháng 06/2026) | Ghi chú |
|-----------|---------------------|---------------------|---------|
| **Next.js** | 15.x | **16.2.x** | Turbopack default; ~400% faster dev startup; Node min 20+ |
| **Node.js** | 20 LTS | **24 LTS** | Node 20 EOL 04/2026; Node 24 Active LTS đến 04/2028 |
| **FFmpeg** | 6.x | **8.1.x** (Ubuntu pkg vẫn là 6.x) | FFmpeg 8.1.1 stable 05/2026; Ubuntu 24.04 apt vẫn dùng được 6.x |
| **HLS.js** | 1.x | **1.6.16** | Stable nhất; thêm MMS API cho iOS 17.1+ |
| **Tailwind CSS** | 3.x | **4.3.x** | CSS-first config; không còn tailwind.config.js |
| **@supabase/supabase-js** | 2.x | **2.108.x** | API tương thích ngược; binary broadcast mới |
| **Docker** | 26.x | **29.4.x** | `version:` key trong compose đã deprecated |
| **Coolify** | v4.x | **v4.0.0-beta.472+** | Vẫn là v4, không có v5 |
| **Ubuntu** | 24.04 LTS | **24.04 LTS** | Không thay đổi |
| **nginx-rtmp-module** | 1.2.2 | **1.2.2** | Không thay đổi |
| **Express** | 4.x | **4.x** | Không thay đổi |

**Kiến trúc, logic nghiệp vụ, API contracts, database schema: không thay đổi.**

---

*Tài liệu này là Source of Truth duy nhất cho dự án Livestream WebApp v2.0.*  
*Mọi thay đổi kiến trúc phải cập nhật tài liệu này trước khi triển khai.*  
*Nguyên tắc tối thượng: Phase 2 phải pass trước khi build bất kỳ feature nào khác.*

---
**END OF DOCUMENT — v2.0 · Cập nhật phiên bản stack 06/2026 · 16/06/2026**
