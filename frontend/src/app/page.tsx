"use client";

import { useLiveStatus } from "@/hooks/useLiveStatus";

function LiveIndicator() {
  return (
    <span className="relative flex h-3 w-3">
      <span className="absolute inline-flex h-full w-full animate-ping bg-red-500 opacity-75" />
      <span className="relative inline-flex h-3 w-3 bg-red-500" />
    </span>
  );
}

export default function LandingPage() {
  const { status } = useLiveStatus();
  const isLive = status === "live";
  const isLoading = status === "loading";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-black px-6">
      <div className="text-center max-w-md">
        <h1 className="text-2xl lg:text-3xl font-semibold tracking-wide text-white mb-3">
          LiveMecwish
        </h1>
        <p className="text-sm text-gray-500 mb-10">
          Nền tảng livestream tinh gọn cho mọi người.
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 text-gray-400">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm">Đang kiểm tra...</span>
          </div>
        ) : isLive ? (
          <a
            href="/live"
            className="inline-flex items-center gap-3 border border-red-500 px-8 py-4 text-base font-semibold text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <LiveIndicator />
            ĐANG CÓ PHIÊN LIVE - BẤM VÀO ĐỂ XEM
          </a>
        ) : (
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-gray-600">
              <span className="block h-2 w-2 bg-gray-700" />
              <span className="text-sm font-medium">Hiện chưa có phiên live nào</span>
            </div>
            <p className="text-xs text-gray-700">
              Quay lại sau khi admin bắt đầu phiên live.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
