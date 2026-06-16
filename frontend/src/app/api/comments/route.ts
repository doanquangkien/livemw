import { createServerClient } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rate-limit";

function extractIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

export async function POST(request: Request) {
  let body: { session_id?: string; user_name?: string; content?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const { session_id, user_name, content } = body;
  const ip = extractIp(request);

  if (!session_id || !user_name || !content) {
    return Response.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
  }

  if (user_name.length < 1 || user_name.length > 30) {
    return Response.json({ error: "Tên phải từ 1-30 ký tự" }, { status: 400 });
  }
  if (content.length < 1 || content.length > 200) {
    return Response.json({ error: "Nội dung phải từ 1-200 ký tự" }, { status: 400 });
  }

  // Rate limit
  const { allowed, retryAfterMs } = checkRateLimit(ip);
  if (!allowed) {
    return Response.json(
      { error: "Gửi bình luận quá nhanh. Vui lòng đợi.", retry_after_ms: retryAfterMs },
      { status: 429 },
    );
  }

  const supabase = createServerClient();

  // Check banned
  const { data: banEntry } = await supabase
    .from("banned_ips")
    .select("ip")
    .eq("ip", ip)
    .maybeSingle();

  if (banEntry) {
    return Response.json({ error: "Bạn đã bị cấm bình luận" }, { status: 403 });
  }

  // Validate session is live
  const { data: session } = await supabase
    .from("live_sessions")
    .select("id, status")
    .eq("id", session_id)
    .maybeSingle();

  if (!session) {
    return Response.json({ error: "Không tìm thấy phiên live" }, { status: 404 });
  }
  if (session.status !== "live") {
    return Response.json({ error: "Phiên live không hoạt động" }, { status: 403 });
  }

  // Insert comment
  const { data: comment, error } = await supabase
    .from("comments")
    .insert({
      session_id,
      user_name,
      content,
      user_ip: ip,
      is_deleted: false,
    })
    .select()
    .single();

  if (error) {
    console.error("[comments] insert error:", error.message);
    return Response.json({ error: "Lưu bình luận thất bại" }, { status: 500 });
  }

  return Response.json(comment, { status: 201 });
}
