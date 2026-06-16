import { createServerClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(20, Math.max(1, parseInt(searchParams.get("limit") ?? "5", 10) || 5));
  const offset = (page - 1) * limit;

  const supabase = createServerClient();

  const { data, error, count } = await supabase
    .from("live_sessions")
    .select("id, stream_key, started_at, ended_at, vod_url, vod_created_at", { count: "exact" })
    .not("vod_url", "is", null)
    .order("vod_created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return Response.json({ error: "Failed to fetch VODs" }, { status: 500 });
  }

  const total = count ?? 0;

  const dataWithDuration = (data ?? []).map((row) => {
    const started = row.started_at ? new Date(row.started_at).getTime() : null;
    const ended = row.ended_at ? new Date(row.ended_at).getTime() : null;
    return {
      id: row.id,
      title: row.started_at
        ? `Phiên live ngày ${new Date(row.started_at).toLocaleDateString("vi-VN")}`
        : "Phiên live",
      vod_url: row.vod_url,
      vod_created_at: row.vod_created_at,
      started_at: row.started_at,
      ended_at: row.ended_at,
      duration_seconds: started && ended ? Math.round((ended - started) / 1000) : null,
    };
  });

  return Response.json({
    data: dataWithDuration,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
