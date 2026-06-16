@tags #epic-prompt #phase-3 #realtime #supabase

# 🎯 EPIC PROMPT: THỰC THI PHASE 3 (Database + Live Status Realtime)

## 1. Ngữ cảnh & Nguồn chân lý (BẮT BUỘC ĐỌC)
Bạn là Principal Engineer thực thi **Phase 3** của dự án Livestream Webapp.
Trước khi phân tích hay đưa ra bất kỳ đề xuất nào, bạn **BẮT BUỘC** phải dùng công cụ đọc file để nạp các tài liệu sau vào context:

1. `D:\LiveMecwish\DOCS\SoT\SOT_v2.md` (Đọc kỹ phần mục tiêu Phase 3: Supabase Realtime, RTMP Callbacks, Cấu trúc Schema và kiến trúc UI).
2. `D:\LiveMecwish\.env` (Kiểm tra xem đã có biến môi trường Supabase chưa).
3. `D:\LiveMecwish\docker-compose.yml` (Nắm kiến trúc mạng để cấu hình Webhook URL chính xác).
4. `D:\LiveMecwish\DOCS\SoT\PHASE_2.md` (Đọc kỹ phần "Nhật ký gỡ lỗi" để ôm bài học xương máu: BẮT BUỘC phải pass các biến `NEXT_PUBLIC_SUPABASE_*` qua Docker `--build-arg` nếu không Web sẽ trắng tinh).

*Mọi quyết định và hành động của bạn phải dựa trên các file này.*

## 2. Mục tiêu tối thượng (The GATE)
**Phase 3 chỉ được coi là hoàn thành khi:** 
Khi Admin (USER) bấm nút "Go Live" trên điện thoại, giao diện trang chủ của Khán giả (đang mở sẵn) sẽ **TỰ ĐỘNG** lóe sáng huy hiệu "🔴 ĐANG LIVE" và tự động phát luồng Video mới nhất mà **TUYỆT ĐỐI KHÔNG CẦN F5/REFRESH**. Khi Admin tắt Live, giao diện tự động mờ đi và báo "Luồng đã kết thúc".

## 3. Các bài toán bạn cần TỰ CHỦ giải quyết
Dựa vào ngữ cảnh đã nạp, hãy tự lên phương án xử lý các hạng mục sau:

- **Khởi tạo Hạ tầng Supabase:** Đọc file `.env` để lấy các biến môi trường Supabase (User đã cung cấp đầy đủ). Dùng các thông số này để kết nối và tự động gọi API (hoặc hướng dẫn User chạy SQL) để tạo bảng `live_sessions` (gồm các cột id, status, stream_key, hls_url, started_at, ended_at) có hỗ trợ Realtime.
- **Quy tắc Thiết kế UI/UX BẮT BUỘC (Kế thừa Phase 2):** 
  1. Tuyệt đối KHÔNG sử dụng EMOJI.
  2. Viền vuông góc (`rounded-none`).
  3. Không hiệu ứng Glow lòa loẹt.
  4. Font chữ **Be Vietnam Pro**.
  5. Clean Code (< 300 dòng/file Component).
- **Xây dựng API Webhook (RTMP Callbacks):** Xây dựng các endpoint nhận webhook từ Nginx-RTMP. Nginx-RTMP sẽ gọi các API này khi có luồng đẩy lên (`on_publish`) hoặc ngắt kết nối (`on_publish_done`). 
  *Lưu ý kiến trúc:* Thay vì dựng nguyên 1 container Node.js Express rời rạc như trong bản nháp SoT, hãy ưu tiên dùng **Next.js App Router (Route Handlers)** (Ví dụ: `app/api/on-publish/route.ts`) nằm ngay trong `frontend` container để tối ưu hiệu năng và giản lược `docker-compose.yml`.
- **Giải quyết lỗi "Bóng ma" (Cache-busting):** Đảm bảo rằng khi phiên Live mới bắt đầu, `hls_url` lưu vào database và trả về cho Frontend phải kèm theo một ID phiên (Session ID) hoặc Timestamp ở dạng query string (VD: `testkey.m3u8?session=170123...`) để **ép** trình duyệt và `hls.js` tải `.m3u8` mới nhất, triệt tiêu hoàn toàn lỗi phát lại video cũ (Cache).
- **Cấu hình Nginx-RTMP:** Sửa file `nginx.conf` (phần ứng dụng `live`) để thêm directive `on_publish` và `on_publish_done` trỏ chính xác về API Webhook của Next.js (chú ý thiết lập IP routing trong Docker: `http://frontend:3000/api/...`).
- **Tích hợp Supabase Realtime Frontend:** Sửa lại file `page.tsx` và Component, kết hợp hook lắng nghe sóng WebSocket từ Supabase. Giao diện phải phản ứng chớp nhoáng (Realtime) với các event đổi trạng thái.
- **Triển khai & Kiểm thử tự động:** Push code, force deploy Coolify, và dùng FFmpeg test ngầm để mô phỏng sự kiện bật/tắt luồng nhằm tự nghiệm thu luồng Realtime.

## 4. Bàn giao & Tài liệu sống (Living Document)
Khi tính năng Realtime đã chạy mượt mà:
- Đánh dấu check `[x]` vào checklist Phase 3 trong `SOT_v2.md`.
- Cập nhật lại `SOT_v2.md` với quyết định sử dụng Next.js Route Handlers thay cho Express App.
- Ghi bổ sung "Nhật ký gỡ lỗi Phase 3" vào cuối file `PHASE_3.md` này.

Áp dụng Agent Manifesto: Bỏ qua mọi lời chào hỏi, bắt tay ngay vào việc gọi tool đọc file ngữ cảnh. Lưu ý: File .env đã có đủ 3 Key của Supabase, không được hỏi lại User.

---

# 🩺 NHẬT KÝ GỠ LỖI PHASE 3 (2026-06-16)

## Bài học #1: Next.js Route Handlers thay thế Express container riêng

**Quyết định:** Dùng Next.js App Router Route Handlers (`app/api/on-publish/route.ts`) thay vì dựng container Node.js/Express riêng.

**Lý do:**
- Giảm 1 service trong docker-compose (không cần container `api`)
- Route Handler chạy trong cùng process với frontend, không cần network hop riêng
- Nginx-RTMP `on_publish` chỉ gọi HTTP POST đơn giản — cold start không phải vấn đề (request ngắn, 1 lần/stream)
- Service role key được inject qua runtime `environment` (không cần NEXT_PUBLIC_ prefix)

**Cấu hình:**
```nginx
on_publish http://frontend:3000/api/on-publish;
on_publish_done http://frontend:3000/api/on-publish-done;
```

---

## Bài học #2: Supabase Realtime — dùng Postgres Changes thay vì Broadcast

**Triệu chứng:** SoT gốc dùng `channel.send()` (Broadcast) để push event từ API về frontend. Cách này yêu cầu API route phải subscribe channel trước khi send, phức tạp và không cần thiết.

**Fix:** Dùng Postgres Changes (CDC) — frontend subscribe trực tiếp vào thay đổi của bảng `live_sessions`:
```typescript
supabase.channel("live_sessions_changes")
  .on("postgres_changes", { event: "*", schema: "public", table: "live_sessions" }, callback)
  .subscribe()
```

API route chỉ cần UPDATE row trong DB, Realtime tự broadcast change đến tất cả clients.

**Lợi ích:**
- Không cần API route duy trì WebSocket connection
- Tự động broadcast khi có thay đổi — không miss event
- Code API route đơn giản hơn (chỉ là CRUD)

---

## Bài học #3: Cache-busting HLS URL bằng timestamp query param

**Vấn đề:** Trình duyệt cache file `.m3u8` cũ, khi session mới bắt đầu, `hls.js` có thể load playlist cũ (đã expired) dẫn đến lỗi playback.

**Fix:** Trong `on-publish` handler, set `hls_url` kèm `?t=<Date.now()>`:
```
https://live.mecwish.com/hls/testkey.m3u8?t=1718500000000
```

Query param không ảnh hưởng đến Nginx serve file (nginx bỏ qua khi map path). Mỗi lần stream mới có URL khác → trình duyệt bắt buộc fetch playlist mới.

---

## Bài học #4: Static prerendering với client-side hydration

**Phát hiện:** Next.js build prerender trang `/` ở dạng static (`○`). Component `useLiveStatus` chạy `createClient()` trong module scope, nhưng Supabase client yêu cầu `supabaseUrl` không được rỗng.

**Fix:** Đảm bảo `NEXT_PUBLIC_SUPABASE_URL` có giá trị ở BUILD TIME (giống bài học Phase 2 #1). Khi có giá trị, static prerender thành công — HTML tĩnh load nhanh, sau đó hydration attach realtime subscription.

---

## Kết quả Phase 3

| Item | Status |
|------|--------|
| Supabase `live_sessions` table with RLS + Realtime | ✅ |
| Seed data (stream_key=testkey) | ✅ |
| Next.js Route Handlers (`/api/on-publish`, `/api/on-publish-done`) | ✅ |
| nginx.conf `on_publish`/`on_publish_done` → frontend:3000 | ✅ |
| `useLiveStatus` hook (Postgres Changes) | ✅ |
| Homepage LIVE badge with animated ping dot | ✅ |
| Docker build args: `NEXT_PUBLIC_SUPABASE_*` | ✅ |
| Docker runtime env: `SUPABASE_SERVICE_ROLE_KEY` | ✅ |
| End-to-end realtime test (FFmpeg simulation) | ✅ Verified — FFmpeg → nginx on_publish → API → Supabase → Realtime |
| Larix iPhone real test | ✅ User confirmed — realtime badge + auto-play hoạt động đúng |

---

## Phiên làm việc 2026-06-16 — Kết luận

**Phase 3 GATE PASSED.** Admin bấm "Go Live" trên Larix iPhone → nginx-rtmp gọi `on_publish` → Next.js Route Handler cập nhật Supabase → Realtime Postgres Changes đẩy xuống browser → homepage tự động hiện badge LIVE (animated red dot) + `hls.js` tự load playlist mới. Admin tắt Live → `on_publish_done` → homepage tự về trạng thái OFFLINE. **Toàn bộ flow hoạt động không cần F5/refresh.**

**Không có vấn đề tồn đọng.** Sẵn sàng chuyển sang Phase 4 (Admin Dashboard + Comment System).
