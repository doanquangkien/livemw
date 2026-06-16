import { createServerClient } from "@/lib/supabase-server";

const GHOST_THRESHOLD_MS = 15_000; // m3u8 Last-Modified older than 15s → ghost stream

async function isHlsActuallyAlive(streamKey: string): Promise<boolean> {
  try {
    const url = `http://nginx-rtmp:8088/hls/${streamKey}.m3u8`;
    const res = await fetch(url, { method: "HEAD" });

    if (!res.ok) {
      // m3u8 doesn't exist yet — stream just started, trust DB
      return true;
    }

    const lastModified = res.headers.get("last-modified");
    if (!lastModified) {
      // No Last-Modified header — fallback to trusting DB
      return true;
    }

    const fileTime = new Date(lastModified).getTime();
    const age = Date.now() - fileTime;

    return age < GHOST_THRESHOLD_MS;
  } catch {
    // Fetch error (network, DNS, etc.) — fallback to trusting DB
    return true;
  }
}

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
    const actuallyAlive = await isHlsActuallyAlive(live.stream_key);

    if (!actuallyAlive) {
      const now = new Date().toISOString();
      await supabase
        .from("live_sessions")
        .update({ status: "ended", ended_at: now, ended_by: "system" })
        .eq("id", live.id);

      console.log(
        `[live-now] Auto-healed ghost stream: ${live.id} (key=${live.stream_key})`,
      );

      return Response.json({
        isLive: false,
        sessionId: null,
        streamKey: null,
        endedBy: "system",
      });
    }

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
