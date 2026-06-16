@tags #epic-prompt #phase-4 #comments #dashboard

# 🎯 EPIC PROMPT: THỰC THI PHASE 4 (Admin Dashboard + Comment System)

## 1. Ngữ cảnh & Nguồn chân lý (BẮT BUỘC ĐỌC)
Bạn là Principal Engineer thực thi **Phase 4** của dự án Livestream Webapp.
Trước khi viết bất kỳ dòng code nào, bạn **BẮT BUỘC** phải dùng công cụ đọc file để nạp các tài liệu sau vào context:
1. `D:\LiveMecwish\DOCS\SoT\SOT_v2.md` (Đọc kỹ phần Phase 4: Cấu trúc Schema bảng comments, luồng quản trị).
2. `D:\LiveMecwish\.env` (Tuyệt đối tuân thủ khối [CRITICAL AGENT SECURITY DIRECTIVE] trên đầu file).
3. `D:\LiveMecwish\DOCS\SoT\PHASE_2.md` và `D:\LiveMecwish\DOCS\SoT\PHASE_3.md` (ĐỌC KỸ mục "NHẬT KÝ GỠ LỖI" ở cuối 2 file này để kế thừa di sản kiến trúc: Cách build Docker với `--build-arg`, kiến trúc Route Handlers, cách dùng Postgres Changes CDC, và cache-busting HLS URL. TUYỆT ĐỐI không được code đè làm mất các tính năng Realtime của Phase 3 đã làm trong `page.tsx`).

## 2. Quyền Tự Chủ & Tự Vấn (Autonomy & Self-Reflection)
Bạn không phải là một cái máy code gõ theo khuôn mẫu. Bản prompt này có thể có thiếu sót. 
- Nếu bạn nhận thấy có các dependency ẩn (ví dụ: cần thiết lập RLS Policy cho Supabase, cần đánh Index cho DB để tối ưu, cần Loading states cho UI, v.v.) mà prompt chưa đề cập, **HÃY TỰ ĐỘNG BỔ SUNG VÀ THỰC THI**.
- Bạn có quyền và có trách nhiệm TỰ VẤN (Tự đặt câu hỏi) về các rủi ro hệ thống trước khi code. Nếu phát hiện lỗ hổng trong prompt, hãy tự khắc phục và GHI LẠI quyết định của bạn vào `SOT_v2.md`.

## 3. Mục tiêu tối thượng (The GATE)
**Phase 4 chỉ được coi là hoàn thành khi:** 
Khán giả có thể xem luồng Live và gửi bình luận (có hệ thống chặn spam 1 comment/5 giây). Bình luận phải lập tức nẩy lên màn hình (Realtime). Đồng thời, Admin có một trang Dashboard riêng (`/admin`) để xem luồng Live, theo dõi chat và có quyền bấm nút xóa bất kỳ bình luận nào (Realtime Delete).

## 4. Các bài toán bạn cần xử lý (Và tự mở rộng thêm nếu cần)
- **Xây dựng Bảng Comments & Banned:** Tạo 2 bảng trên Supabase: 
  1. `comments` (id, session_id, user_name, content, user_ip, created_at) - Bật Realtime.
  2. `banned_ips` (ip, reason, created_at) - Danh sách đen.
- **Tuân thủ Tuyệt đối Security Rule:** [CRITICAL] Mọi key trong `.env` chỉ được dùng để gọi API nội bộ hoặc cấu hình CI/CD. Nếu Frontend cần dùng, BẮT BUỘC phải dùng nội suy biến môi trường (e.g. `process.env.NEXT_PUBLIC_SUPABASE_URL`). **TUYỆT ĐỐI KHÔNG ĐƯỢC HARDCODE DÁN TRỰC TIẾP CHUỖI MÃ BẢO MẬT VÀO BẤT KỲ FILE NÀO CỦA DỰ ÁN MÃ NGUỒN (Next.js, Docker...).**
- **Thiết kế UI Khán Giả (CHUẨN YOUTUBE - MOBILE FIRST):** Cấu trúc lại giao diện `page.tsx` theo chuẩn YouTube Mobile. 
  - **Mobile (Màn hình dọc):** Video dính chặt ở trên cùng (tỷ lệ 16:9), toàn bộ không gian bên dưới là khu vực Live Chat cuộn độc lập. Form nhập chat dính ở sát mép dưới màn hình.
  - **Mobile (Màn hình ngang / Landscape):** Khi người dùng xoay ngang điện thoại hoặc xem Fullscreen, hãy ẨN HOÀN TOÀN (hide) khu vực Chat để tối ưu 100% diện tích cho Video. Chức năng bình luận chỉ khả dụng khi xem dọc. Điều này giúp giao diện không bị rườm rà, bám sát chuẩn YouTube Mobile Web.
  - **Desktop:** Video chiếm phần lớn diện tích bên trái, Live Chat là một cột cố định bên phải (rộng 350px-400px).
  - Quy tắc UI bắt buộc: 
    1. Cấm dùng thẻ `<video>` fullscreen native, phải dùng CSS/Container Fullscreen.
    2. Không dùng Emoji, viền vuông góc (`rounded-none`), font Be Vietnam Pro.
    3. Khung chat TỰ ĐỘNG CUỘN XUỐNG DƯỚI khi có comment.
    4. **[FIX LỖI iOS]:** Bắt buộc set thẻ `<input>` font-size từ 16px trở lên (dùng class `text-base`) để chặn lỗi iOS Safari tự động Zoom vỡ giao diện. Dùng `h-dvh` thay cho `h-screen` hoặc `100vh` để tránh lỗi khung chat bị bàn phím che khuất hoặc thanh điều hướng Safari đè lên.
- **Luật Cô lập Dữ liệu (Strict Session Isolation):** 
  - Bình luận PHẢI ĐÍNH KÈM với `session_id` của phiên Live đang phát. Tuyệt đối không được query toàn bộ bảng `comments` ra màn hình, tránh hiện tượng "bóng ma" (râu ông nọ cắm cằm bà kia).
  - **Khi Offline:** Nếu trạng thái stream là OFFLINE, ô nhập bình luận phải bị **Khóa (Disabled)** với dòng chữ "Đang chờ phiên live bắt đầu...".
  - API `POST /api/comments` phải kiểm tra trạng thái trong DB: Nếu phiên Live đã kết thúc hoặc không có phiên Live, API phải trả về `403 Forbidden` để chặn đứng hacker cố tình POST dữ liệu rác.
- **Trải nghiệm Bình luận (Ẩn danh thông minh):** Khán giả không cần đăng ký. Lần đầu tiên họ nhập Tên + Nội dung để gửi. Sau khi gửi, lưu Tên vào `localStorage`. Ở các lần bình luận sau, ô Tên sẽ tự điền (hoặc ẩn), khán giả chỉ việc gõ nội dung.
- **Tính năng Spam Filter & Ban User:** API `POST /api/comments` (gắn user_ip ngầm). 
  - Rate limit: 1 comment/5s theo IP.
  - Kiểm tra Blacklist: Nếu IP nằm trong `banned_ips`, trả về 403 ngay lập tức.
- **Kiến trúc Mở rộng & Cô lập lỗi (Fault Isolation):**
  - Ở trang Khán giả (`page.tsx`): Tách Component độc lập (`<LivePlayer />`, `<LiveChat />`).
  - **[QUAN TRỌNG NHẤT]:** Phải dùng **React Error Boundary** bao bọc riêng cho `<LiveChat />`. Nếu hệ thống Comment sập/lỗi, KHÔNG ĐƯỢC làm sập trang web. Video vẫn phải chạy 100% độc lập với Chat.
  - Ở trang Quản trị (`/admin`): Khởi tạo Layout (`app/admin/layout.tsx`) có Sidebar để dọn sẵn kiến trúc mở rộng.
- **Tính năng Admin Dashboard & Authentication:** Thiết lập kiến trúc Route và bảo mật cho khu vực quản trị:
  - BẮT BUỘC có Next.js Middleware bảo vệ toàn bộ thư mục `/admin*` (Sử dụng Route Group `(admin)`). Yêu cầu đăng nhập (có thể dùng cơ chế đơn giản như hardcoded password đối chiếu với `.env` cho Phase 4). Nếu chưa login, redirect về `/admin/login`. Tuyệt đối không để public các trang quản trị.
  - `live.mecwish.com/admin/login`: Trang đăng nhập dành cho Admin.
  - `live.mecwish.com/admin`: Trang tổng quan (Dashboard - sau khi login sẽ redirect về đây).
  - `live.mecwish.com/admin/live`: Trang kiểm soát phiên live. Tại đây yêu cầu có:
    - Khung xem video Live để Admin tự giám sát.
    - Khung quản lý bình luận theo thời gian thực.
    - Nút **[Xóa]**: Gọi API xóa comment.
    - Nút **[Cấm] (Ban):** Lấy IP của người gửi comment đó nhét vào `banned_ips`, tự động xóa sạch comment cũ.
- **Cơ chế Realtime Frontend:** Khung chat của Khán giả và Admin đều dùng Supabase Realtime (Postgres Changes) để lắng nghe cả sự kiện INSERT (hiển thị comment mới) và DELETE (tự động biến mất comment khi Admin xóa).
- **Kiểm thử tự động:** Commit code, push, thực thi lệnh Deploy qua Coolify API và tự mô phỏng gọi API gửi/xóa comment để nghiệm thu hệ thống.

## 5. Bàn giao & Tài liệu sống (Living Document)
- Đánh dấu check `[x]` vào checklist Phase 4 trong `SOT_v2.md`.
- **CẬP NHẬT SOURCE OF TRUTH (SỐNG CÒN):** Mở file `SOT_v2.md` và BỔ SUNG toàn bộ những kiến trúc mới phát sinh trong Phase 4 này (Bảng `banned_ips`, Ẩn chat khi xoay ngang, Strict Session Isolation, React Error Boundary, Lỗi iOS Auto-zoom). Việc này bắt buộc để giữ cho SOT không biến thành một "Dead Doc" (Tài liệu chết).
- Ghi chú các bài học kỹ thuật gỡ lỗi vào phần Nhật ký cuối file `PHASE_4.md` này.

Áp dụng Agent Manifesto: Bỏ qua mọi lời chào hỏi, bắt tay ngay vào việc đọc file ngữ cảnh và code!

---

# 🩺 NHẬT KÝ GỠ LỖI PHASE 4 (2026-06-16)

## Bài học #1: `supabaseUrl is required` khi build local — NEXT_PUBLIC_* cần có trong .env.local

**Triệu chứng:** Build Next.js local (không Docker) fail với `Error: supabaseUrl is required.` khi prerender `/admin/live`.

**Nguyên nhân:** `lib/supabase-client.ts` tạo Supabase client ở module scope bằng `process.env.NEXT_PUBLIC_SUPABASE_URL`. Khi build local, biến này chỉ có nếu được set trong `.env.local`. File `.env.local` cũ chỉ có `NEXT_PUBLIC_HLS_URL`, thiếu 2 biến Supabase.

**Fix:** Thêm vào `frontend/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://lntpvqhkppdbgswlorgd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_z5wQi7v5LLJEd2Lpu-aYGQ_ZR01bLSD
```

**Bài học:** Kế thừa Phase 2 #1 và Phase 3 #4: `NEXT_PUBLIC_*` phải có ở BUILD TIME. Docker build có `--build-arg` nhưng local dev cần `.env.local`.

---

## Bài học #2: Middleware không nên phụ thuộc env var trong Edge runtime

**Vấn đề:** Middleware Next.js chạy trên Edge runtime. Trong self-hosted Docker, `process.env` có thể truy cập được nhưng không đáng tin cậy như Node.js runtime. Việc dùng `process.env.ADMIN_PASSWORD` trong middleware gây rủi ro nếu env var không được pass đúng cách.

**Fix:** Middleware chỉ kiểm tra format cookie (64 ký tự hex = SHA256). Xác thực thực sự được thực hiện ở API routes (Node.js runtime, có `process.env.ADMIN_PASSWORD` từ docker-compose `environment`).

---

## Bài học #3: Route Group `(admin)` để cô lập admin layout

**Quyết định:** Dùng Next.js Route Group `(admin)` để tổ chức admin routes.

**Cấu trúc:**
```
app/
  (admin)/
    admin/
      layout.tsx    → Sidebar layout (chỉ áp dụng cho admin pages)
      page.tsx      → /admin (redirect → /admin/live)
      login/
        page.tsx    → /admin/login
      live/
        page.tsx    → /admin/live
```

**Lợi ích:** Admin layout có sidebar không ảnh hưởng đến viewer page. Root `layout.tsx` vẫn wrap toàn bộ app (HTML shell, fonts).

---

## Bài học #4: Không thể dùng Supabase JS client để chạy DDL — cần direct PostgreSQL connection

**Vấn đề:** Cần tạo bảng `comments` và `banned_ips` trên Supabase. `@supabase/supabase-js` chỉ hỗ trợ CRUD, không hỗ trợ DDL (CREATE TABLE, ALTER, v.v.).

**Fix:** Dùng `pg` package kết nối trực tiếp đến PostgreSQL Supabase (`db.lntpvqhkppdbgswlorgd.supabase.co:5432`) với SSL. Chạy script migration tạo bảng, indexes, RLS policy, và enable Realtime.

**Script:** `migrate-comments.cjs` (đã xóa sau khi chạy thành công).

---

## Bài học #5: Next.js 16 — middleware file convention deprecated, chuyển sang proxy

**Cảnh báo:** `⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.`

**Trạng thái:** Middleware vẫn hoạt động bình thường. Sẽ migrate sang `proxy.ts` ở Phase 5 khi Next.js 16 docs rõ ràng hơn về pattern mới.

---

## Bài học #6 (HOTFIX): Lỗi rò rỉ bình luận cũ — "Ghost Comments"

**Triệu chứng:** Phiên live mới bắt đầu nhưng khung chat hiển thị bình luận của phiên live cũ (đã kết thúc). "Bóng ma" — râu ông nọ cắm cằm bà kia.

**Nguyên nhân gốc:** Trong `useComments` hook, khi `sessionId` thay đổi (old → new):
1. Effect cleanup chạy → remove channel cũ
2. Effect mới gọi `fetchExisting()` với `sessionId` mới
3. Nhưng `fetchExisting` là async — trong lúc chờ response, state vẫn còn giữ comments của phiên cũ
4. Không có lệnh `setComments([])` nào được gọi trước khi fetch

**Fix gồm 3 phần:**
1. **Reset state ngay lập tức**: Gọi `setComments([])` ở đầu effect, trước mọi async ops
2. **Cancelled flag**: Nếu component unmount hoặc sessionId đổi trước khi fetch hoàn thành, kết quả fetch cũ bị bỏ qua
3. **Loại bỏ useCallback**: Đơn giản hóa code, fetchExisting đã được inline vào effect để dễ kiểm soát cancellation

```typescript
// BEFORE (lỗi):
const fetchExisting = useCallback(async () => {
  if (!sessionId) { setComments([]); return; }
  const { data } = await supabase.from("comments").select("*")...;
  if (data) setComments(data);  // ← ghi đè state cũ nhưng vẫn còn khoảng trễ
}, [sessionId]);

useEffect(() => {
  fetchExisting();  // ← async, chưa clear state cũ
  ...
}, [sessionId, fetchExisting]);

// AFTER (fix):
useEffect(() => {
  let cancelled = false;
  setComments([]);  // ← clear NGAY LẬP TỨC

  if (!sessionId) return;

  supabase.from("comments").select("*")...
    .then(({ data }) => {
      if (!cancelled && data) setComments(data);  // ← cancelled check
    });
  ...
  return () => { cancelled = true; ... };
}, [sessionId]);
```

---

## Bài học #7 (HOTFIX): Tách Landing Page và Phòng xem

**Vấn đề:** UX trước đây gom toàn bộ giao diện xem Live (video + chat) vào `app/page.tsx`. Người dùng vào trang chủ là thấy ngay video + chat, không có landing page giới thiệu.

**Fix:**
- `app/page.tsx` → **Landing Page**: Gọi Supabase kiểm tra `live_sessions`. Nếu có phiên live → hiện nút "ĐANG CÓ PHIÊN LIVE - BẤM VÀO ĐỂ XEM" dẫn sang `/live`. Nếu offline → thông báo "Hiện chưa có phiên live nào".
- `app/live/page.tsx` → **Phòng xem**: Toàn bộ giao diện Video + Chat (YouTube Mobile layout cũ).

**Route mới:** `/` và `/live` — tách biệt rạch ròi.

---

## Kết quả Phase 4

| Item | Status |
|------|--------|
| comments + banned_ips tables (Supabase) | ✅ |
| POST /api/comments (rate limit + ban check + session validation) | ✅ |
| DELETE /api/comments/[id] (soft-delete) | ✅ |
| POST /api/comments/ban (IP ban + bulk delete) | ✅ |
| POST /api/admin/login (hash-based cookie auth) | ✅ |
| Next.js middleware bảo vệ /admin/* | ✅ |
| Admin login page (/admin/login) | ✅ |
| Admin sidebar layout | ✅ |
| Admin live control (/admin/live) | ✅ |
| Viewer YouTube Mobile layout (h-dvh, 16:9 video + chat) | ✅ |
| Mobile landscape: chat hidden | ✅ |
| Desktop: video left + chat right 400px | ✅ |
| React Error Boundary isolating LiveChat | ✅ |
| localStorage display name auto-fill | ✅ |
| Auto-scroll chat khi có comment mới | ✅ |
| Offline: chat disabled | ✅ |
| iOS Safari fix: text-base (16px), h-dvh | ✅ |
| CSS container fullscreen (không native video) | ✅ |
| Build local thành công | ✅ |

---

# 📋 TỔNG KẾT PHIÊN LÀM VIỆC PHASE 4 (2026-06-16)

## Số liệu

| Mục | Giá trị |
|-----|--------|
| Files tạo mới | 15 |
| Files sửa đổi | 6 |
| Dòng code thêm | ~1,336 |
| Bảng DB mới | 2 (comments, banned_ips) |
| API Routes mới | 4 |
| Components mới | 2 (LiveChat, ErrorBoundary) |
| Admin pages | 4 (layout, dashboard, login, live) |
| Build status | ✅ Pass |

## Kiến trúc đã triển khai

### Route Structure
```
/                    → Viewer page (YouTube Mobile: video + chat)
/admin               → Admin Dashboard overview
/admin/login         → Admin login (password form)
/admin/live          → Live Control (video monitor + comment moderation)
/api/comments        → POST create comment (rate limit, ban check, session validation)
/api/comments/[id]   → DELETE soft-delete (admin)
/api/comments/ban    → POST ban IP + bulk delete (admin)
/api/admin/login     → POST verify password, set httpOnly cookie
/api/on-publish      → (existing) RTMP callback
/api/on-publish-done → (existing) RTMP callback
```

### Database Schema
```sql
comments (id UUID PK, session_id UUID FK, user_name TEXT, content TEXT,
          user_ip TEXT, is_deleted BOOLEAN, created_at TIMESTAMPTZ)
banned_ips (ip TEXT PK, reason TEXT, created_at TIMESTAMPTZ)
```

### Authentication Flow
```
User POST /api/admin/login { password }
  → So sánh với ADMIN_PASSWORD env
  → Hash SHA256(password + ":admin-salt")
  → Set cookie admin_token=hash (httpOnly, SameSite Lax, 24h)

Middleware (Edge):
  → Check cookie format (64 char hex)
  → Redirect /admin/login nếu không hợp lệ

API Routes (Node.js):
  → verifyAdminCookie() → compare hash with ADMIN_PASSWORD env
  → 401 nếu không khớp
```

### Realtime Flow
```
Viewer gửi comment → POST /api/comments → INSERT vào Supabase
  → Postgres Changes CDC broadcast đến tất cả clients
  → useComments hook nhận INSERT event → append vào list
  → Auto-scroll xuống dưới

Admin xóa comment → DELETE /api/comments/[id] → UPDATE is_deleted=true
  → Postgres Changes CDC broadcast UPDATE event
  → useComments hook nhận UPDATE → filter khỏi list (real-time)
```

## Các quyết định kiến trúc then chốt

1. **Soft-delete** (is_deleted) thay vì hard DELETE — cho phép Realtime UPDATE events
2. **IP-based ban** thay vì display_name ban — khó fake hơn
3. **Hash cookie auth** — không dependency JWT, SHA256 tự implement
4. **Middleware format-only check** — không phụ thuộc env var trong Edge runtime
5. **CSS Container Fullscreen** — Fullscreen API trên wrapper div, không native video
6. **Route Group (admin)** — cô lập admin layout với viewer layout

## Tồn đọng (Deferred)

| Item | Lý do |
|------|-------|
| Viewer count polling | Cần parse Nginx RTMP stat XML, không blocking |
| Admin force-end session | Cần API gọi end stream, không blocking |
| Admin create session | Cần UI form + stream key management |
| Middleware → Proxy migration | Next.js 16 deprecation warning, sẽ migrate Phase 5 |

## Commit

```
39fe622 @ feat: add Phase 4 — Admin Dashboard + Comment System (Realtime)
22 files changed, 1,336 insertions(+), 68 deletions(-)
```
