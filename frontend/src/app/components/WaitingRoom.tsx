"use client";

interface WaitingRoomProps {
  viewerCount: number;
}

export default function WaitingRoom({ viewerCount }: WaitingRoomProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-black px-6">
      <div className="text-center max-w-md">
        {/* Pulse animation circle */}
        <div className="inline-flex items-center justify-center mb-6">
          <span className="relative flex h-16 w-16">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-500 opacity-30" />
            <span className="relative inline-flex h-16 w-16 items-center justify-center border-2 border-yellow-500">
              <svg className="h-8 w-8 text-yellow-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </span>
          </span>
        </div>

        <h1 className="text-xl lg:text-2xl font-semibold text-white mb-3">
          Phòng chờ
        </h1>

        <p className="text-sm text-gray-400 mb-6">
          Hiện có <span className="text-yellow-500 font-semibold">{viewerCount}</span> người đang xem.
          Bạn đang trong hàng đợi để vào xem phiên live.
        </p>

        <div className="border border-gray-800 p-4 mb-4">
          <div className="flex items-center justify-center gap-2 text-yellow-500">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm font-medium">Đang chờ đến lượt...</span>
          </div>
          <p className="text-xs text-gray-600 mt-3">
            Trang sẽ tự động tải khi có chỗ trống. Vui lòng không đóng tab.
          </p>
        </div>

        <p className="text-xs text-gray-700">
          Thời gian chờ ước tính: ~{Math.ceil((viewerCount - 200) * 0.5)} phút
        </p>
      </div>
    </main>
  );
}
