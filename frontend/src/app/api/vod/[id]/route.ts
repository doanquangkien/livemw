import { createServerClient } from "@/lib/supabase-server";
import { unlink } from "fs/promises";
import path from "path";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: session, error: fetchError } = await supabase
    .from("live_sessions")
    .select("id, vod_url")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !session) {
    return Response.json({ error: "VOD not found" }, { status: 404 });
  }

  // Delete physical file if stored locally
  if (session.vod_url) {
    try {
      const filename = path.basename(new URL(session.vod_url).pathname);
      const filePath = path.join("/tmp/vod", filename);
      await unlink(filePath);
    } catch {
      // File may already be deleted or stored remotely — ignore
    }
  }

  const { error: deleteError } = await supabase
    .from("live_sessions")
    .update({ vod_url: null, vod_created_at: null })
    .eq("id", id);

  if (deleteError) {
    return Response.json({ error: "Failed to delete VOD" }, { status: 500 });
  }

  return Response.json({ success: true });
}
