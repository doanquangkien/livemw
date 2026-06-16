import { createServerClient } from "@/lib/supabase-server";

// Internal API — used by vod-recorder to poll current live status
export async function GET() {
  const supabase = createServerClient();

  const { data: live } = await supabase
    .from("live_sessions")
    .select("id, stream_key, status, ended_by")
    .eq("status", "live")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (live) {
    return Response.json({
      isLive: true,
      sessionId: live.id,
      streamKey: live.stream_key,
      endedBy: null,
    });
  }

  // No live session — check most recent ended for admin force-end context
  const { data: lastEnded } = await supabase
    .from("live_sessions")
    .select("id, ended_by")
    .eq("status", "ended")
    .order("ended_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return Response.json({
    isLive: false,
    sessionId: null,
    streamKey: null,
    endedBy: lastEnded?.ended_by ?? null,
  });
}
