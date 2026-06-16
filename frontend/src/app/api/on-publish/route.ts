import { createServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const body = await request.text();
  const params = new URLSearchParams(body);
  const name = params.get("name");
  const addr = params.get("addr");

  console.log(`[on-publish] stream_key=${name} addr=${addr}`);

  if (!name) {
    return new Response("Missing stream key", { status: 400 });
  }

  const supabase = createServerClient();

  const { data: session, error: fetchError } = await supabase
    .from("live_sessions")
    .select("id, status, ended_at")
    .eq("stream_key", name)
    .single();

  if (fetchError || !session) {
    console.error(`[on-publish] Error fetching session:`, fetchError);
    return new Response("Unknown stream key", { status: 403 });
  }

  if (session.status === "live") {
    return new Response("Already live", { status: 403 });
  }

  const now = new Date().toISOString();
  const hlsUrl = `https://live.mecwish.com/hls/${name}.m3u8?t=${Date.now()}`;

  const { error: updateError } = await supabase
    .from("live_sessions")
    .update({ status: "live", started_at: now, hls_url: hlsUrl })
    .eq("id", session.id);

  if (updateError) {
    console.error(`[on-publish] Error updating session:`, updateError);
    return new Response("Database error", { status: 500 });
  }

  // Check if we need to clear chat (offline > 6 hours)
  if (session.status === "ended" && session.ended_at) {
    const endedAtTime = new Date(session.ended_at).getTime();
    if (Date.now() - endedAtTime > 6 * 60 * 60 * 1000) {
      console.log(`[on-publish] ${name} offline > 6 hours. Fire-and-forget clearing old comments.`);
      // FIRE-AND-FORGET: Không dùng await để tránh block Nginx-RTMP
      supabase
        .from("comments")
        .update({ is_deleted: true })
        .eq("session_id", session.id)
        .then(({ error }) => {
          if (error) console.error(`[on-publish] Failed to clear chat:`, error);
          else console.log(`[on-publish] Chat cleared successfully for session ${session.id}`);
        });
    }
  }

  console.log(`[on-publish] ${name} is now LIVE`);
  return new Response("OK", { status: 200 });
}
