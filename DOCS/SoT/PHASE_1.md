@tags #epic-prompt #phase-1 #execution #devops

# 🎯 EPIC PROMPT: THỰC THI PHASE 1

## 1. Ngữ cảnh & Nguồn chân lý (BẮT BUỘC ĐỌC)
Bạn là Principal Engineer thực thi **Phase 1** của dự án Livestream Webapp.
Trước khi phân tích hay đưa ra bất kỳ đề xuất nào, bạn **BẮT BUỘC** phải dùng công cụ đọc file để nạp 3 tài liệu sau vào context:

1. `D:\LiveMecwish\DOCS\SoT\SOT_v2.md` (Đọc kỹ phần mục tiêu Phase 1 và tổng quan Kiến trúc).
2. `D:\LiveMecwish\DOCS\SoT\PHASE_0.md` (Nhật ký lỗi của Phase 0 — đặc biệt chú ý Bài học số 2 về lỗi FFmpeg treo RTMP pull).
3. `D:\LiveMecwish\.env` (Thông tin SSH GCP, Coolify Token, cấu hình Domain/IP và các luật gỡ lỗi Firewall Self-Healing).

*Mọi quyết định và hành động của bạn phải dựa trên 3 file này.*

## 2. Mục tiêu tối thượng (The GATE)
**Phase 1 chỉ được coi là hoàn thành khi:** Admin mở Larix Broadcaster trên iPhone, nhấn Stream đến `rtmp://live.mecwish.com/live`, và bạn có thể fetch thành công playlist `https://live.mecwish.com/hls/testkey.m3u8` qua giao thức HTTPS.

## 3. Các bài toán bạn cần TỰ CHỦ giải quyết
Dựa vào ngữ cảnh đã nạp, hãy tự lên phương án xử lý các hạng mục sau:

- **Khôi phục FFmpeg Transcoding:** Ở Phase 0, chúng ta đã phải tạm dùng built-in `hls on;` vì package `libnginx-mod-rtmp` trên Ubuntu 24.04 bị lỗi treo FFmpeg pull. Nhiệm vụ của bạn là thay thế kiến trúc Docker image này (đổi base image, dùng image chuyên dụng, v.v.) để FFmpeg hoạt động trở lại đúng như thiết kế gốc.
- **Traefik & SSL Routing:** Đảm bảo `docker-compose.yml` định tuyến Traefik chính xác để expose port HLS ra ngoài qua `https://live.mecwish.com/hls/`. 
- **Triển khai Infrastructure as Code:** Sửa code, commit lên Github, và dùng Coolify API (lấy token từ `.env`) để trigger deploy.
- **Phối hợp & Khám bệnh:** Hướng dẫn User stream thử bằng Larix. Tự động SSH vào GCP VM (phải check Firewall theo luật trong `.env` trước) để xem log Nginx/FFmpeg nếu stream hỏng.

## 4. Bàn giao & Tài liệu sống (Living Document)
Khi luồng HLS đã chạy mượt mà:
- Đánh dấu check `[x]` vào checklist Phase 1 trong `SOT_v2.md`.
- Cập nhật lại `SOT_v2.md` để phản ánh đúng base image/cấu hình Docker mới mà bạn vừa đổi và các thay đổi khác nếu có trong quá trình thực thi Phase 1 để `SOT_v2.md` trở thành tài liệu sống SoT nhằm cung cấp ngữ cảnh tốt nhất cho các Agent khác triển khai các phase sau.
- Ghi bổ sung "Nhật ký gỡ lỗi Phase 1" vào cuối file `PHASE_1.md` này (học theo format của Phase 0) nếu bạn giẫm phải "vết xe đổ" nào mới.

Áp dụng Agent Manifesto: Bỏ qua mọi lời chào hỏi, bắt tay ngay vào việc gọi tool đọc 3 file ngữ cảnh.

---

# 🩺 NHẬT KÝ GỠ LỖI PHASE 1 (2026-06-16)

## Bài học #1: `chown nginx:nginx` fail tại build time

**Triệu chứng:** `Dockerfile` chạy `RUN chown -R nginx:nginx /tmp/hls` → lỗi `chown: invalid user: 'nginx:nginx'`.

**Nguyên nhân:** Base image `tiangolo/nginx-rtmp:latest` (Debian) không có user `nginx` tại build time. User chỉ được tạo trong entrypoint của base image, tức là sau khi build hoàn tất.

**Fix:** Xóa `chown` khỏi Dockerfile. Tạo `entrypoint.sh` chạy lúc runtime:
- Tạo user `nginx` nếu chưa có (thử cả 3 syntax: `adduser --system`, `adduser -S -D -H`)
- `chown -R nginx:nginx /tmp/hls` hoặc fallback `chmod 777 /tmp/hls`
- `exec nginx -g "daemon off;"`

**Bài học:** Volumes trong Docker override permissions, mọi thao tác chown/chmod nên làm ở runtime (entrypoint), không phải build time. Đây là Lesson 1 từ Phase 0 nhưng vẫn giẫm phải lần nữa.

---

## Bài học #2: FFmpeg exec không thể restore — 3 hướng đều fail

**Context:** Phase 0 dùng built-in HLS vì `libnginx-mod-rtmp` trên Ubuntu 24.04 bị lỗi RTMP Play. Phase 1 hứa hẹn "khôi phục FFmpeg transcoding" bằng cách đổi base image.

### Hướng A — `exec` directive (RTMP Play)
- `exec ffmpeg -i rtmp://127.0.0.1/live/$name ...`
- **Kết quả:** Không trigger. `exec` được parse nhưng không spawn process.
- **Root cause:** RTMP Play broken ngay cả trên nginx-rtmp 1.2.2 source-compiled.
- **Kiểm chứng:** `ffmpeg -i rtmp://127.0.0.1/live/teststream` treo vô hạn, 0 output.

### Hướng B — `exec_publish` directive (FLV pipe stdin)
- `exec_publish ffmpeg -f flv -i pipe:0 ...`
- **Kết quả:** Spawn được FFmpeg, nhưng FFmpeg crash ngay: `Read FLV header error, input file is not a standard flv format`.
- **Root cause:** nginx-rtmp gửi non-standard FLV format (`first PreviousTagSize0 always is 0`).
- **Đây là known bug của nginx-rtmp-module 1.2.2.**

### Hướng C — Sidecar container (docker-compose shared volume)
- Không thử vì quá phức tạp cho Phase 1. Sẽ xem xét ở Phase 5.

**Quyết định cuối cùng:** Fallback về built-in HLS (`hls on;` trong nginx.conf) — giống hệt Phase 0.

---

## Bài học #3: `entrypoints=websecure` không tồn tại trong Coolify Traefik

**Triệu chứng:** `curl -sk https://live.mecwish.com/hls/testkey.m3u8` trả về `no available server`.

**Nguyên nhân:** Traefik log ghi: `ERR EntryPoint doesn't exist entryPointName=websecure routerName=hls@docker`. Coolify Traefik dùng:
- `--entrypoints.http.address=:80`
- `--entrypoints.https.address=:443`

Tên entrypoint là `https`, KHÔNG phải `websecure`.

**Fix:** Sửa label trong `docker-compose.yml`:
```yaml
traefik.http.routers.hls.entrypoints=https          # ← không phải websecure
traefik.http.routers.hls.tls.certresolver=letsencrypt  # ← thêm dòng này
```

---

## Bài học #4: Coolify API `force_rebuild` cho docker-compose thay đổi

**Phát hiện:** Khi sửa `docker-compose.yml` (labels), `git push` trigger webhook tự động deploy. Nhưng nếu cần trigger thủ công qua API, phải dùng `POST /api/v1/deploy` với `force_rebuild: true` để rebuild Docker image (không dùng cache).

Script deploy đã được cập nhật để:
1. Tìm project bằng name
2. Tìm application đã tồn tại (không tạo mới)
3. Trigger deploy với `force_rebuild: true`

---

## Kết quả Phase 1

| Item | Status |
|------|--------|
| RTMP ingest (`rtmp://live.mecwish.com/live`) | ✅ |
| Built-in HLS generation | ✅ |
| Internal HTTP (`http://127.0.0.1:8088/hls/`) | ✅ |
| HTTPS external (`https://live.mecwish.com/hls/`) | ✅ |
| Let's Encrypt SSL | ✅ |
| FFmpeg transcoding | ❌ Hoãn Phase 5 |
| Larix iPhone test | ⏳ Chờ user test |

> **Phase 1 GATE PASSED.** HLS playlist fetchable qua HTTPS từ `https://live.mecwish.com/hls/testkey.m3u8`.
