"use client";

import { LivePlayer } from "../components/LivePlayer";
import { LiveChat } from "../components/LiveChat";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { useLiveStatus } from "@/hooks/useLiveStatus";
import { useViewerPresence } from "@/hooks/useViewerPresence";
import WaitingRoom from "../components/WaitingRoom";

export default function LivePage() {
  const { status, session, hlsUrl } = useLiveStatus();
  const isLive = status === "live";
  const { isWaitingRoom, viewerCount } = useViewerPresence(session?.id ?? null);

  // Show waiting room when >= 200 CCU (only when live)
  if (isLive && isWaitingRoom) {
    return <WaitingRoom viewerCount={viewerCount} />;
  }

  return (
    <main className="flex flex-col lg:flex-row h-dvh bg-black overflow-hidden">
      {/* Video section */}
      <div className="shrink-0 w-full lg:flex-1 lg:min-w-0">
        <div className="relative flex items-center justify-center h-full">
          <div className="w-full max-h-full">
            {/* Header bar */}
            <div className="flex items-center justify-between px-4 py-2 lg:py-3">
              <a href="/" className="text-sm lg:text-lg font-semibold tracking-wide text-white hover:text-gray-300 transition-colors">
                LiveMecwish
              </a>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                {isLive ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping bg-red-500 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 bg-red-500" />
                    </span>
                    <span className="text-red-500 font-bold">LIVE</span>
                    <span className="ml-2 flex items-center gap-1 text-gray-400 bg-gray-900 px-1.5 py-0.5 rounded border border-gray-800">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      {viewerCount}
                    </span>
                  </>
                ) : (
                  <span className="text-gray-400">
                    {status === "loading" ? "CHECKING..." : "OFFLINE"}
                  </span>
                )}
              </span>
            </div>

            {/* Player */}
            <LivePlayer hlsUrl={isLive ? hlsUrl : ""} />

            {/* Status bar (mobile only) */}
            <div className="lg:hidden px-4 py-1 text-xs text-gray-600">
              {status === "loading"
                ? "Checking stream status..."
                : isLive
                  ? "Streaming live"
                  : status === "ended"
                    ? "Stream ended"
                    : "Waiting for stream"}
            </div>
          </div>
        </div>
      </div>

      {/* Chat sidebar */}
      <div className="chat-column flex-1 lg:flex-none lg:w-[400px] min-h-0 border-t lg:border-t-0 lg:border-l border-gray-800">
        <ErrorBoundary>
          <LiveChat sessionId={session?.id ?? null} isLive={isLive} />
        </ErrorBoundary>
      </div>
    </main>
  );
}
