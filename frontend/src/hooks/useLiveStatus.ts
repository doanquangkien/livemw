"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase-client";

export type LiveStatus = "loading" | "live" | "idle" | "ended";

export interface LiveSession {
  id: string;
  status: LiveStatus;
  stream_key: string;
  hls_url: string | null;
  started_at: string | null;
}

export function useLiveStatus() {
  const [status, setStatus] = useState<LiveStatus>("loading");
  const [session, setSession] = useState<LiveSession | null>(null);
  const [hlsUrl, setHlsUrl] = useState<string>("");

  const fetchCurrent = useCallback(async () => {
    const { data } = await supabase
      .from("live_sessions")
      .select("*")
      .eq("status", "live")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setSession(data);
      setStatus("live");
      setHlsUrl(data.hls_url ?? "");
    } else {
      setSession(null);
      setStatus("idle");
    }
  }, []);

  useEffect(() => {
    fetchCurrent();

    const channel = supabase
      .channel("live_sessions_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_sessions" },
        (payload) => {
          const row = payload.new as Record<string, unknown> | null;
          if (!row) return;

          if (row.status === "live") {
            setStatus("live");
            setSession(row as unknown as LiveSession);
            setHlsUrl((row.hls_url as string) ?? "");
          } else if (row.status === "ended" || row.status === "idle") {
            setStatus("ended");
            setSession(null);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCurrent]);

  return { status, session, hlsUrl };
}
