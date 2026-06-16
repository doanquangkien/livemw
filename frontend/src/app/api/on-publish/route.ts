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

  const { data: session } = await supabase
    .from("live_sessions")
    .select("id, status, ended_at")
    .eq("stream_key", name)
    .single();

  if (!session) {
    return new Response("Unknown stream key", { status: 403 });
  }

  if (session.status === "live") {
    return new Response("Already live", { status: 403 });
  }

  const now = new Date().toISOString();
  const hlsUrl = `https://live.mecwish.com/hls/${name}.m3u8?t=${Date.now()}`;

  // Check if this is a completely new stream (offline > 5 mins) or just a reconnect
  let shouldClearChat = false;
  if (session.status === "ended" && session.ended_at) {
    const endedAtTime = new Date(session.ended_at).getTime();
    // Tăng timeout lên 6 tiếng (6 * 60 * 60 * 1000) để admin có thể nghỉ giữa hiệp
    if (Date.now() - endedAtTime > 6 * 60 * 60 * 1000) {
      shouldClearChat = true;
    }
  }

  await supabase
    .from("live_sessions")
    .update({ status: "live", started_at: now, hls_url: hlsUrl })
    .eq("id", session.id);

  if (shouldClearChat) {
    console.log(`[on-publish] ${name} offline > 6 hours. Clearing old comments.`);
    await supabase
      .from("comments")
      .update({ is_deleted: true })
      .eq("session_id", session.id);
  }

  console.log(`[on-publish] ${name} is now LIVE`);
  return new Response("OK", { status: 200 });
}
