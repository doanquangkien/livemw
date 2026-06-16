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
    .select("id, status")
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

  await supabase
    .from("live_sessions")
    .update({ status: "live", started_at: now, hls_url: hlsUrl })
    .eq("id", session.id);

  console.log(`[on-publish] ${name} is now LIVE`);
  return new Response("OK", { status: 200 });
}
