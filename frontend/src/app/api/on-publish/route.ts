import { createServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  let name = "";

  try {
    const body = await request.text();
    const params = new URLSearchParams(body);
    name = params.get("name") ?? "";
    const addr = params.get("addr") ?? "";

    console.log(`[on-publish] stream_key=${name} addr=${addr}`);

    if (!name) {
      return new Response("Missing stream key", { status: 400 });
    }

    const supabase = createServerClient();

    const { data: session, error: fetchError } = await supabase
      .from("live_sessions")
      .select("id, status, ended_at, ended_by")
      .eq("stream_key", name)
      .single();

    // DB error → allow stream (don't kill video because of database)
    if (fetchError) {
      console.error(`[on-publish] DB fetch error for ${name}:`, fetchError);
      return new Response("OK", { status: 200 });
    }

    // Unknown stream key → reject (legitimate security)
    if (!session) {
      console.warn(`[on-publish] Unknown stream key: ${name}`);
      return new Response("Unknown stream key", { status: 403 });
    }

    // Already live → reject (prevent hijacking)
    if (session.status === "live") {
      console.log(`[on-publish] ${name} already live — rejecting duplicate`);
      return new Response("Already live", { status: 403 });
    }

    const now = new Date().toISOString();
    const hlsUrl = `https://live.mecwish.com/hls/${name}.m3u8?t=${Date.now()}`;

    // Reconnect / new session logic
    if (session.status === "ended") {
      const endedAt = session.ended_at ? new Date(session.ended_at).getTime() : 0;
      const minutesSinceEnd = (Date.now() - endedAt) / 60000;

      if (session.ended_by === "admin") {
        console.log(`[on-publish] ${name} was force-ended by admin — same session`);
      } else if (minutesSinceEnd <= 15) {
        console.log(`[on-publish] ${name} reconnecting after ${minutesSinceEnd.toFixed(1)}m — same session`);
      } else {
        console.log(`[on-publish] ${name} reconnecting after ${minutesSinceEnd.toFixed(1)}m — same session`);
      }
    }

    const { error: updateError } = await supabase
      .from("live_sessions")
      .update({ status: "live", started_at: now, hls_url: hlsUrl })
      .eq("id", session.id);

    if (updateError) {
      console.error(`[on-publish] DB update error for ${name}:`, updateError);
      // Still allow stream — status update failure shouldn't block video
    }

    // Clear old comments if offline > 6 hours (fire-and-forget)
    if (session.status === "ended" && session.ended_at) {
      const endedAtTime = new Date(session.ended_at).getTime();
      if (Date.now() - endedAtTime > 6 * 60 * 60 * 1000) {
        console.log(`[on-publish] ${name} offline > 6h — clearing old comments`);
        supabase
          .from("comments")
          .update({ is_deleted: true })
          .eq("session_id", session.id)
          .then(({ error }) => {
            if (error) console.error(`[on-publish] Failed to clear chat:`, error);
          });
      }
    }

    console.log(`[on-publish] ${name} is now LIVE`);
    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error(`[on-publish] CRITICAL unhandled error for ${name}:`, err);
    // Principle: video must never die because of DB/API errors
    return new Response("OK", { status: 200 });
  }
}
