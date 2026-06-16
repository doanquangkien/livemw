"use client";

import { useEffect, useState, useCallback } from "react";

interface ViewerCount {
  streamKey: string | null;
  nclients: number;
  bytesIn: number;
  bytesOut: number;
  uptimeMs: number | null;
}

export function useViewerCount(enabled: boolean) {
  const [data, setData] = useState<ViewerCount | null>(null);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch("/api/viewer-count");
      if (res.ok) setData(await res.json());
    } catch {
      // silently ignore — stat endpoint may not be reachable
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    fetchCount();
    const interval = setInterval(fetchCount, 10_000);
    return () => clearInterval(interval);
  }, [enabled, fetchCount]);

  return data;
}
