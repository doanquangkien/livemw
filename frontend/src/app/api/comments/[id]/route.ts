import { createServerClient } from "@/lib/supabase-server";
import { verifyAdminCookie } from "@/lib/admin-auth";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!verifyAdminCookie(request.headers.get("cookie"))) {
    return Response.json({ error: "Không có quyền truy cập" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return Response.json({ error: "Thiếu ID bình luận" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { error } = await supabase
    .from("comments")
    .update({ is_deleted: true })
    .eq("id", id);

  if (error) {
    console.error("[comments/delete] error:", error.message);
    return Response.json({ error: "Xóa bình luận thất bại" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
