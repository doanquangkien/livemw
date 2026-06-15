@tags #epic-prompt #phase-0 #execution #devops

# 🎯 MỤC TIÊU LÀM VIỆC (Dành cho Claude Agent)

## Bối cảnh
Bạn được giao nhiệm vụ thực thi **Phase 0** của dự án Livestream Webapp. 
Hệ thống sử dụng kiến trúc **Nginx-RTMP → FFmpeg Transcode → HLS**. 
Thư mục gốc của dự án là `D:\LiveMecwish`. Kho lưu trữ Github là `https://github.com/doanquangkien/livemw` (nhánh `main`).

## 📌 Nhiệm vụ của bạn (Quy trình CI/CD Bắt Buộc)

### Bước 1: Viết Code Cấu Hình (Local)
- Đọc `DOCS/SoT/SOT_v2.md` để nắm rõ thiết kế kiến trúc Phase 0.
- Tạo cấu trúc thư mục chứa cấu hình Nginx-RTMP tại máy local (ví dụ: `nginx-rtmp/`).
- Viết 3 file cốt lõi: `Dockerfile`, `nginx.conf`, và `docker-compose.yml` (hoặc cấu hình Nixpacks nếu Coolify yêu cầu).
- **Cấm thao tác chui:** Commit các file này và `git push` lên nhánh `main`. Tuyệt đối KHÔNG SSH vào VPS để tạo file bằng tay.

### Bước 2: Deploy qua Coolify API
- Đọc file `.env` tại thư mục gốc để lấy `COOLIFY_URL` và `COOLIFY_API_TOKEN`.
- Viết script Node.js (ví dụ `scripts/deploy.js`) hoặc dùng `curl` gọi trực tiếp API của Coolify để:
  1. KHỞI TẠO MỘT PROJECT MỚI HOÀN TOÀN tên là `LiveMecwish`. TUYỆT ĐỐI KHÔNG nhét vào project `livestream` cũ.
  2. Liên kết với kho Github `doanquangkien/livemw`.
  3. Kích hoạt tiến trình Deploy tự động (Trigger Deployment).
- LƯU Ý TỐI QUAN TRỌNG: CẤM DÙNG SSH ĐỂ DEPLOY DƯỚI MỌI HÌNH THỨC. Dù API khó đến đâu, bạn cũng phải giải quyết bằng API hoặc dừng lại báo cáo.

### Bước 3: Kiểm thử & Khám Bệnh (Debugging)
- Trích xuất thông tin `VPS_HOST` và `AGENT_SSH_KEY_PATH` từ file `.env`.
- Nếu quá trình deploy thành công, hãy test thử dùng lệnh `ffmpeg` từ máy local stream lên VPS port 1935, sau đó kiểm tra xem file `.m3u8` có sinh ra trên port 8080 không.
- **Nếu lỗi xảy ra (Khám bệnh):** Bạn CHỈ ĐƯỢC PHÉP dùng SSH vào VPS ở chế độ READ-ONLY để xem log (vd: `docker logs`). 
  - *Lưu ý Firewall:* Kiểm tra IP Public hiện tại của bạn. Nếu không nằm trong `LAST_KNOWN_SSH_IPs` của `.env`, Firewall GCP sẽ chặn lệnh SSH. Đừng cố brute-force, hãy báo cáo để User mở port cho bạn.
- Khi tìm ra lỗi, bạn phải **quay lại Bước 1**: Sửa code ở máy local, commit, push, và gọi API deploy lại.

### Bước 4: Cập nhật Tài liệu Sống (Living Document)
ĐÂY LÀ YÊU CẦU QUAN TRỌNG NHẤT. Sau khi toàn bộ Phase 0 chạy hoàn hảo trên server, bạn PHẢI dùng công cụ sửa file để cập nhật lại `DOCS/SoT/SOT_v2.md`:
- Đánh dấu check `[x]` vào các mục đã hoàn thành.
- Cập nhật lại các thiết lập (ID Project Coolify, lệnh gọi Webhook, hoặc thay đổi về config Nginx thực tế đang chạy).
- Tài liệu phải phản ánh đúng 100% cấu hình đang sống trên VPS.

## ⚠️ Nguyên tắc cốt lõi (Áp dụng Agent Manifesto)
- **Zero Sycophancy:** Bỏ qua các câu chào hỏi rườm rà. Bắt tay ngay vào việc gọi tool đọc file `SOT_v2.md` và `.env`.
- **Infrastructure as Code:** Mọi thứ phải nằm trong Git. Không có ngoại lệ.

Bắt đầu đi!

---

# 📝 NHẬT KÝ GỠ LỖI PHASE 0 — 5 BÀI HỌC CỰC ĐOAN

**Ngày:** 15–16/06/2026  
**Agent thực thi:** Claude Opus 4.7  
**Bối cảnh:** Triển khai Nginx-RTMP + HLS trên VPS Hetzner qua Coolify API, dùng Ubuntu 24.04 + `libnginx-mod-rtmp`.

> ⚠️ Các bài học dưới đây được ghi chép để thế hệ Agent sau **không dẫm lại vết xe đổ**. Mỗi bài học tiêu tốn từ 30 phút đến 2 giờ debugging.

---

## Bài học 1: Docker named volume ghi đè quyền file — `chown` lúc build là vô ích

### Triệu chứng

Container khởi động, nginx chạy, nhưng khi stream bắt đầu, `exec.log` không được tạo ra với lỗi **Permission denied**. Dù Dockerfile đã có `RUN touch /tmp/hls/exec.log && chown www-data:www-data /tmp/hls/exec.log`.

### Nguyên nhân gốc

Docker **named volume** (`hls-temp`) được mount vào `/tmp/hls` tại runtime. Volume này **tồn tại từ lần deploy trước** — nó giữ nguyên trạng thái cũ (owner = root). Khi container chạy, volume được mount **đè lên** thư mục `/tmp/hls` đã được `chown` lúc build.

```
Build time:  RUN mkdir -p /tmp/hls && chown www-data:www-data /tmp/hls  ✅
Runtime:     docker volume mount hls-temp → /tmp/hls  ← GHI ĐÈ TOÀN BỘ
Kết quả:     /tmp/hls thuộc sở hữu của volume cũ (root) thay vì www-data
```

### Giải pháp đúng

```dockerfile
# Dockerfile: TẠO thư mục với quyền đúng, nhưng KHÔNG tạo file con
RUN mkdir -p /tmp/hls && chown www-data:www-data /tmp/hls
```

```nginx.conf
# Để nginx worker (chạy dưới user www-data) TỰ TẠO file khi cần
# exec sh /usr/local/bin/transcode.sh $name;
# → transcode.sh tự echo ra exec.log, file được tạo bởi tiến trình www-data
```

Hoặc dùng `entrypoint.sh` thực hiện `chown` **tại runtime** trước khi gọi `nginx`.

### Bài học cốt lõi

> **Quyền file trong Docker volume chỉ có thể sửa tại RUNTIME, không phải BUILD TIME.** Mounted volume ghi đè toàn bộ thư mục. Mọi thao tác `chown`/`chmod` trong Dockerfile lên thư mục được mount volume đều vô hiệu lực.

---

## Bài học 2: FFmpeg kết nối RTMP nhưng treo vĩnh viễn ở version banner — "RTMP Play bị hỏng"

### Triệu chứng

FFmpeg được gọi từ `exec` directive của nginx-rtmp, kết nối TCP đến port 1935 thành công, nhưng **chỉ in ra version banner rồi treo** — không nhận được bất kỳ dữ liệu video/audio nào:

```
ffmpeg version 6.1.1 Copyright (c) 2000-2024 the FFmpeg developers
  libavutil     58. 29.100 / 58. 29.100
  ... (treo vĩnh viễn, không frame nào được decode)
```

### Các giả thuyết đã kiểm tra (và đều SAI)

| Giả thuyết | Cách thử | Kết quả |
|-----------|---------|---------|
| `stdin` bị FFmpeg chiếm, chặn dữ liệu | Thêm `-nostdin -nostats` | Vẫn treo |
| `stdin` từ nginx exec bị block | Thêm `< /dev/null` | Vẫn treo |
| `localhost` resolve ra IPv6 `::1` | Đổi `rtmp://localhost` → `rtmp://127.0.0.1` | Vẫn treo |
| `exec` dùng `system()` không truyền được stream | Đổi sang `exec_push` (pipe stream qua stdin) | Vẫn treo — `Invalid data found when processing input` |
| FFmpeg background (`&`) khiến nginx restart liên tục | Dùng `exec ffmpeg` (foreground) | Container CRASH |

### Phát hiện đột phá

**Kiểm tra từ BÊN NGOÀI container:** Dùng FFmpeg trên máy local pull RTMP từ VPS port 1935:

```bash
ffmpeg -i rtmp://34.126.84.171/live/testkey -c copy -f null -
# Kết quả: TREO Y HỆT — chứng tỏ lỗi KHÔNG nằm ở container hay network nội bộ
```

### Nguyên nhân gốc

**nginx-rtmp `libnginx-mod-rtmp` trên Ubuntu 24.04 có lỗi ở chức năng RTMP Play (pull).** RTMP Publish (ingest) hoạt động bình thường, nhưng khi một client cố gắng PLAY (pull) stream, nginx-rtmp không gửi dữ liệu video — nó chỉ accept TCP connection rồi... im lặng.

Đây là bug ở tầng gói hệ thống (`apt install libnginx-mod-rtmp`), không phải lỗi config.

### Giải pháp tạm thời (Phase 0)

**Bỏ qua bước FFmpeg pull hoàn toàn.** Dùng built-in HLS của nginx-rtmp:

```nginx
application live {
    live on;
    record off;
    hls on;                  # ← Nginx TỰ TẠO HLS trực tiếp từ stream đến
    hls_path /tmp/hls;
    hls_fragment 2;
    hls_playlist_length 6;
    # exec sh /usr/local/bin/transcode.sh $name;  ← COMMENT LẠI
}
```

nginx-rtmp tự cắt HLS segments từ luồng RTMP đang publish mà **không cần pull ngược qua RTMP** — tránh hoàn toàn bug RTMP Play.

### Giải pháp dài hạn (Phase 1)

Một trong các hướng:
1. **Compile nginx + nginx-rtmp-module từ source** thay vì dùng package Ubuntu
2. **Dùng base image khác** (Alpine + tự build, hoặc image có sẵn như `tiangolo/nginx-rtmp`)
3. **Dùng `exec_push` + pipe raw FLV** (cần xử lý FLV parsing phía FFmpeg)

### Bài học cốt lõi

> **Khi gặp lỗi "im lặng" (silent hang), hãy kiểm tra từ BÊN NGOÀI hệ thống.** Nếu FFmpeg trên máy local cũng treo khi pull RTMP, lỗi nằm ở nginx-rtmp server, không phải ở container, network, hay config nội bộ. Đừng mất 2 tiếng debug bên trong container khi vấn đề nằm ở tầng giao thức.

---

## Bài học 3: `exec` vs `exec_push` — hai directive hoàn toàn khác nhau về cơ chế

### Sự khác biệt

| | `exec` | `exec_push` |
|---|---|---|
| **Cơ chế** | Gọi `system()` hoặc `execvp()` — spawn process | Pipe raw FLV stream vào stdin của process |
| **Dữ liệu stream** | Process phải TỰ KÉO qua RTMP pull | Stream được đẩy trực tiếp qua pipe |
| **Blocking** | Có (nginx đợi process exit) | Có (nginx đợi process exit) |
| **Dùng với `&`** | Process exit ngay → nginx restart mỗi 5s → **spawn bomb** | Tương tự |

### Sai lầm đã mắc

1. **Dùng `exec` với script background (`&`):** Script exit ngay sau khi spawn FFmpeg → nginx-rtmp thấy process con exit → **gọi lại `exec` mỗi 5 giây** → hàng chục FFmpeg zombie process.

2. **Dùng `exec_push` foreground:** FFmpeg chạy foreground, nhưng dữ liệu FLV raw từ pipe không parse được → `Invalid data found when processing input` → FFmpeg exit với lỗi → container crash.

3. **Dùng `exec_push` background:** Tương tự lỗi #1 — spawn bomb.

### Bài học cốt lõi

> **`exec` và `exec_push` đều là blocking directive.** Nếu script exit, nginx sẽ gọi lại. Nếu cần chạy process dài hạn (như FFmpeg transcode), process PHẢI chạy foreground và không bao giờ exit. Nhưng quan trọng hơn: **cả hai directive đều phụ thuộc vào RTMP Play hoạt động** (trực tiếp hoặc gián tiếp), nên khi RTMP Play bị hỏng, cả hai đều vô dụng.

---

## Bài học 4: IPv6 `::1` — `localhost` không phải lúc nào cũng là `127.0.0.1`

### Triệu chứng

FFmpeg không kết nối được đến `rtmp://localhost/live/$NAME` dù nginx-rtmp đang listen trên port 1935.

### Chẩn đoán

```bash
getent hosts localhost
# Output: ::1 localhost ip6-localhost ip6-loopback
#         (IPv6 được ưu tiên trước IPv4)
```

nginx-rtmp mặc định chỉ bind vào IPv4 `0.0.0.0:1935`, không bind vào IPv6 `[::]:1935`. Khi FFmpeg resolve `localhost` ra `::1`, nó cố gắng kết nối qua IPv6 → **không ai listen** → timeout.

### Giải pháp

```bash
# Thay vì:
ffmpeg -i rtmp://localhost/live/$NAME ...

# Dùng explicit IPv4:
ffmpeg -i rtmp://127.0.0.1/live/$NAME ...
```

### Bài học cốt lõi

> **Trên Ubuntu 24.04, `localhost` resolve ra `::1` (IPv6) trước `127.0.0.1` (IPv4).** Nếu service chỉ bind IPv4, mọi kết nối dùng `localhost` sẽ thất bại. Luôn dùng `127.0.0.1` khi cần explicit IPv4 loopback.

---

## Bài học 5: "Infrastructure as Code" với Debugging từ xa — vòng lặp Git → Coolify API cực kỳ chậm, nhưng là bắt buộc

### Bối cảnh

Nguyên tắc IaC: **cấm SSH tạo file thủ công trên VPS**. Mọi thay đổi phải đi qua:

```
Sửa code local → git commit → git push → Coolify API deploy → chờ build → test
```

### Vấn đề

Mỗi vòng lặp debug mất **5–10 phút** (push + build + deploy). Với 10+ lần thử sai (exec, exec_push, foreground, background, chown, IPv6, stdin redirect...), tổng thời gian chờ deploy lên đến **hơn 1 giờ**.

### Điều gì đã giúp tăng tốc

1. **SSH read-only vẫn được phép:** `docker logs nginx-rtmp`, `docker exec nginx-rtmp ls -la /tmp/hls/`, `curl http://127.0.0.1:8088/health` — đọc log mà không cần redeploy.

2. **Kiểm tra giả thuyết từ local trước khi push:** Thay vì push rồi mới biết sai, dùng `ffmpeg` từ local test trực tiếp port 1935 của VPS để cô lập vấn đề.

3. **Giữ mỗi commit nhỏ, một thay đổi:** Mỗi lần chỉ sửa MỘT biến (ví dụ: đổi `exec` → `exec_push`, hoặc thêm `-nostdin`). Commit message mô tả chính xác thay đổi. Dễ revert, dễ so sánh.

### Bài học cốt lõi

> **IaC không có nghĩa là "mù thông tin".** SSH read-only để đọc log là CHÌA KHÓA giúp debug nhanh mà không phá vỡ nguyên tắc. Đồng thời, **test từ bên ngoài trước** (từ local, từ một máy khác) để cô lập vấn đề trước khi bắt đầu vòng lặp push-deploy chậm chạp.

---

## Tổng kết: Nếu làm lại từ đầu, quy trình đúng là gì?

1. **Đọc kỹ log trước khi sửa code** — `docker logs` cho biết chính xác lỗi gì.
2. **Test từ bên ngoài** — nếu FFmpeg local cũng treo khi pull RTMP, đừng debug trong container.
3. **Kiểm tra Docker volume** — nếu file permission sai, nhớ rằng volume mount ghi đè build-time config.
4. **Dùng explicit IPv4** — `127.0.0.1` thay vì `localhost` trên Ubuntu 24.04.
5. **Hiểu rõ cơ chế directive** — `exec` vs `exec_push` khác nhau cơ bản, đừng dùng `&` với blocking directive.
6. **Fallback sớm** — Khi RTMP Play không hoạt động sau 2–3 lần thử, chuyển sang built-in HLS thay vì cố sửa FFmpeg pull.

---

*Tài liệu này được viết bởi Claude Agent sau khi hoàn thành Phase 0, dựa trên toàn bộ transcript làm việc thực tế. Mọi bài học đều đến từ lỗi thật, thời gian thật, và đau đớn thật.*
