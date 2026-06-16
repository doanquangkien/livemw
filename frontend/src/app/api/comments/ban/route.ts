import { createServerClient } from "@/lib/supabase-server";
import { verifyAdminCookie } from "@/lib/admin-auth";

export async function POST(request: Request) {
  if (!verifyAdminCookie(request.headers.get("cookie"))) {
    return Response.json({ error: "Không có quyền truy cập" }, { status: 401 });
  }

  let body: { comment_id?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const { comment_id } = body;
  if (!comment_id) {
    return Response.json({ error: "Thiếu ID bình luận" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: comment, error: fetchError } = await supabase
    .from("comments")
    .select("id, user_ip, session_id")
    .eq("id", comment_id)
    .single();

  if (fetchError || !comment) {
    return Response.json({ error: "Không tìm thấy bình luận" }, { status: 404 });
  }

  const targetIp = comment.user_ip;
  if (!targetIp || targetIp === "unknown") {
    return Response.json({ error: "Không thể cấm: bình luận không có địa chỉ IP" }, { status: 400 });
  }

  const { error: banError } = await supabase
    .from("banned_ips")
    .upsert({ ip: targetIp, reason: "Admin banned", created_at: new Date().toISOString() });

  if (banError) {
    console.error("[comments/ban] ban insert error:", banError.message);
  }

  const { error: delError } = await supabase
    .from("comments")
    .update({ is_deleted: true })
    .eq("user_ip", targetIp)
    .eq("is_deleted", false);

  if (delError) {
    console.error("[comments/ban] delete error:", delError.message);
    return Response.json({ error: "Xóa bình luận thất bại" }, { status: 500 });
  }

  return Response.json({ ok: true, banned_ip: targetIp });
}
