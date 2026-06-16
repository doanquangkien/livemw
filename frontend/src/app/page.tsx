"use client";

import { LivePlayer } from "./components/LivePlayer";
import { useLiveStatus } from "@/hooks/useLiveStatus";

export default function Home() {
  const { status, hlsUrl } = useLiveStatus();
  const isLive = status === "live";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black px-4">
      <div className="w-full max-w-5xl">
        <header className="mb-6 flex items-center justify-between">
          <span className="text-lg font-semibold tracking-wide">
            LiveMecwish
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium">
            {isLive ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 bg-red-500" />
                </span>
                <span className="text-red-500 font-bold">LIVE</span>
              </>
            ) : (
              <span className="text-gray-400">OFFLINE</span>
            )}
          </span>
        </header>

        <LivePlayer hlsUrl={isLive ? hlsUrl : ""} />

        <footer className="mt-4 flex items-center justify-between text-xs text-gray-600">
          <span>
            {status === "loading"
              ? "Checking stream status..."
              : isLive
                ? `HLS: ${new URL(hlsUrl).pathname}`
                : status === "ended"
                  ? "Stream ended"
                  : "Waiting for stream"}
          </span>
          <span>Powered by HLS.js</span>
        </footer>
      </div>
    </main>
  );
}
