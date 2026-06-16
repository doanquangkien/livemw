import { createServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const body = await request.text();
  const params = new URLSearchParams(body);
  const name = params.get("name");

  console.log(`[on-publish-done] stream_key=${name}`);

  if (!name) {
    return new Response("Missing stream key", { status: 400 });
  }

  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("live_sessions")
    .update({ status: "ended", ended_at: now })
    .eq("stream_key", name)
    .eq("status", "live");

  if (error) {
    console.error(`[on-publish-done] error:`, error.message);
  }

  console.log(`[on-publish-done] ${name} session ended`);
  return new Response("OK", { status: 200 });
}
