"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase-client";

const MAX_VIEWERS = 200;
const FALLBACK_TIMEOUT_MS = 5000;

function getPresenceKey(): string {
  const key = "presence_key";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

export function useViewerPresence(sessionId: string | null) {
  const [viewerCount, setViewerCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setViewerCount(0);
      setIsConnected(false);
      return;
    }

    let cancelled = false;
    const presenceKey = getPresenceKey();

    const channel = supabase.channel(`viewers:${sessionId}`, {
      config: { presence: { key: presenceKey } },
    });

    // Fallback: if not connected within 5s, allow viewing
    fallbackTimer.current = setTimeout(() => {
      if (!cancelled && !isConnected) {
        setViewerCount(0);
        setIsConnected(false);
      }
    }, FALLBACK_TIMEOUT_MS);

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const count = Object.keys(state).length;
        if (!cancelled) {
          setViewerCount(count);
          setIsConnected(true);
          if (fallbackTimer.current) {
            clearTimeout(fallbackTimer.current);
            fallbackTimer.current = null;
          }
        }
      })
      .on("presence", { event: "join" }, () => {
        const state = channel.presenceState();
        if (!cancelled) setViewerCount(Object.keys(state).length);
      })
      .on("presence", { event: "leave" }, () => {
        const state = channel.presenceState();
        if (!cancelled) setViewerCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && !cancelled) {
          await channel.track({ joined_at: Date.now() });
        }
        if (status === "CHANNEL_ERROR" && !cancelled) {
          // Presence failed — allow viewing without limit
          setViewerCount(0);
          setIsConnected(false);
        }
      });

    return () => {
      cancelled = true;
      if (fallbackTimer.current) {
        clearTimeout(fallbackTimer.current);
        fallbackTimer.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [sessionId, isConnected]);

  const isWaitingRoom = viewerCount >= MAX_VIEWERS;

  return { viewerCount, isWaitingRoom, isConnected };
}
