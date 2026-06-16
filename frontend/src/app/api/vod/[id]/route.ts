import { createServerClient } from "@/lib/supabase-server";
import { unlink } from "fs/promises";
import path from "path";

// Internal — called by vod-recorder after finalizing VOD file
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const vodUrl = body.vod_url as string | undefined;

  if (!vodUrl) {
    return Response.json({ error: "Missing vod_url" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { error } = await supabase
    .from("live_sessions")
    .update({ vod_url: vodUrl, vod_created_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return Response.json({ error: "Failed to update VOD" }, { status: 500 });
  }

  return Response.json({ success: true });
}

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
