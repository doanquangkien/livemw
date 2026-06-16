"use client";

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";

type PlayerState = "loading" | "playing" | "offline" | "error";

interface LivePlayerProps {
  hlsUrl: string;
}

export interface LivePlayerHandle {
  toggleFullscreen: () => void;
}

function Spinner() {
  return (
    <svg className="animate-spin h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function OfflineIcon() {
  return (
    <svg className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function FullscreenIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
    </svg>
  );
}

export const LivePlayer = forwardRef<LivePlayerHandle, LivePlayerProps>(function LivePlayer({ hlsUrl }, ref) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<{ destroy: () => void } | null>(null);
  const [state, setState] = useState<PlayerState>("loading");
  const [retryCount, setRetryCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const scheduleRetry = useCallback(() => {
    const timer = setTimeout(() => setRetryCount((c) => c + 1), 5000);
    return () => clearTimeout(timer);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useImperativeHandle(ref, () => ({ toggleFullscreen }), [toggleFullscreen]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!hlsUrl) {
      setState("offline");
      return;
    }

    let cancelled = false;
    let cleanupRetry: (() => void) | undefined;

    const init = async () => {
      setState("loading");
      const Hls = (await import("hls.js")).default;

      if (Hls.isSupported()) {
        const hls = new Hls({
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 10,
          enableWorker: true,
          lowLatencyMode: false,
        });

        hlsRef.current = hls;
        hls.loadSource(hlsUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (!cancelled) {
            setState("playing");
            video.play().catch(() => {});
          }
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (cancelled || !data.fatal) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            setState("offline");
            if (!cancelled) cleanupRetry = scheduleRetry();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            setState("error");
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = hlsUrl;
        video.addEventListener(
          "loadedmetadata",
          () => {
            if (!cancelled) {
              setState("playing");
              video.play().catch(() => {});
            }
          },
          { once: true },
        );
        video.addEventListener(
          "error",
          () => {
            if (!cancelled) {
              setState("offline");
              cleanupRetry = scheduleRetry();
            }
          },
          { once: true },
        );
      } else {
        setState("error");
      }
    };

    init();

    return () => {
      cancelled = true;
      hlsRef.current?.destroy();
      cleanupRetry?.();
    };
  }, [hlsUrl, retryCount, scheduleRetry]);

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black"
      style={{ aspectRatio: isFullscreen ? "auto" : "16/9" }}
    >
      <video
        ref={videoRef}
        className="w-full h-full block"
        playsInline
        controls={state === "playing"}
      />

      {/* Fullscreen button overlay */}
      <button
        type="button"
        className="absolute bottom-2 right-2 z-10 bg-black/60 border border-gray-600 p-1.5 hover:bg-black/80 transition-colors"
        onClick={toggleFullscreen}
        aria-label="Toggle fullscreen"
      >
        <FullscreenIcon />
      </button>

      {state === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black">
          <Spinner />
          <p className="text-sm text-gray-400 font-medium">Connecting to stream...</p>
        </div>
      )}

      {state === "offline" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black">
          <OfflineIcon />
          <div className="text-center">
            <p className="text-base font-semibold">Stream is offline</p>
            <p className="text-sm text-gray-500 mt-1">
              {retryCount > 0
                ? `Retrying... (attempt ${retryCount})`
                : "Waiting for stream to start"}
            </p>
          </div>
        </div>
      )}

      {state === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black">
          <ErrorIcon />
          <p className="text-base font-semibold">Playback error</p>
          <button
            type="button"
            className="inline-flex items-center gap-2 border border-white px-6 py-2 text-sm font-medium hover:bg-white hover:text-black transition-colors"
            onClick={() => setRetryCount((c) => c + 1)}
          >
            <PlayIcon />
            Retry
          </button>
        </div>
      )}
    </div>
  );
});
