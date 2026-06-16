"use client";

import { useState, useEffect, useCallback } from "react";

interface VodItem {
  id: string;
  title: string;
  vod_url: string;
  vod_created_at: string;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
}

interface VodResponse {
  data: VodItem[];
  total: number;
  page: number;
  totalPages: number;
}

function PlayIcon() {
  return (
    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "--:--";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function VodList() {
  const [vods, setVods] = useState<VodItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 5;

  const fetchVods = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/vod?page=${p}&limit=${limit}`);
      if (!res.ok) throw new Error("Failed");
      const json: VodResponse = await res.json();
      setVods(json.data);
      setTotalPages(json.totalPages);
    } catch {
      setVods([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVods(page);
  }, [page, fetchVods]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="animate-spin h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (vods.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-gray-500">Chưa có video nào để xem lại</p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-3">
        {vods.map((vod) => (
          <a
            key={vod.id}
            href={vod.vod_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-3 border border-gray-800 p-3 hover:border-gray-600 transition-colors group"
          >
            {/* Thumbnail placeholder */}
            <div className="relative shrink-0 w-[160px] h-[90px] bg-gray-900 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900" />
              <PlayIcon />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            </div>

            {/* Info */}
            <div className="min-w-0 flex flex-col justify-center">
              <p className="text-sm font-semibold text-white truncate">{vod.title}</p>
              <p className="text-xs text-gray-500 mt-1">
                {formatDate(vod.started_at)}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                {formatDuration(vod.duration_seconds)}
              </p>
            </div>
          </a>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-800">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="border border-gray-700 px-4 py-2 text-xs font-medium text-gray-300 hover:bg-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← Trước
          </button>

          <span className="text-xs text-gray-500">
            Trang {page}/{totalPages}
          </span>

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="border border-gray-700 px-4 py-2 text-xs font-medium text-gray-300 hover:bg-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Sau →
          </button>
        </div>
      )}
    </div>
  );
}
