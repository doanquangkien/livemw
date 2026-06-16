"use client";

import { useRef, useCallback, useState } from "react";
import { LivePlayer, type LivePlayerHandle } from "@/app/components/LivePlayer";
import { useLiveStatus } from "@/hooks/useLiveStatus";
import { useComments, type Comment } from "@/hooks/useComments";
import { useViewerCount } from "@/hooks/useViewerCount";
import ConfirmModal from "@/app/components/ConfirmModal";
import AlertModal from "@/app/components/AlertModal";

interface AlertState {
  open: boolean;
  title: string;
  message: string;
  variant: "danger" | "warning" | "info" | "success";
}

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  variant: "danger" | "warning" | "info";
  onConfirm: () => void;
}

export default function AdminLivePage() {
  const { status, session, hlsUrl } = useLiveStatus();
  const isLive = status === "live";
  const comments = useComments(session?.id ?? null);
  const playerRef = useRef<LivePlayerHandle>(null);
  const viewerCount = useViewerCount(isLive);

  const [alert, setAlert] = useState<AlertState>({ open: false, title: "", message: "", variant: "info" });
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false, title: "", message: "", confirmLabel: "Confirm", variant: "danger", onConfirm: () => {} });

  const showAlert = useCallback((title: string, message: string, variant: AlertState["variant"] = "danger") => {
    setAlert({ open: true, title, message, variant });
  }, []);

  const handleDelete = useCallback(async (commentId: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json();
        showAlert("Lỗi", body.error ?? "Xóa thất bại", "danger");
      }
    } catch {
      showAlert("Lỗi", "Lỗi mạng", "danger");
    }
  }, [showAlert]);

  const handleBan = useCallback(async (commentId: string) => {
    setConfirm({
      open: true,
      title: "Cấm người dùng",
      message: "Cấm người dùng này? Tất cả bình luận của họ sẽ bị xóa.",
      confirmLabel: "Cấm",
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch("/api/comments/ban", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ comment_id: commentId }),
          });
          if (!res.ok) {
            const body = await res.json();
            showAlert("Lỗi", body.error ?? "Cấm thất bại", "danger");
          }
        } catch {
          showAlert("Lỗi", "Lỗi mạng", "danger");
        }
        setConfirm((prev) => ({ ...prev, open: false }));
      },
    });
  }, [showAlert]);

  const handleForceEnd = useCallback(() => {
    setConfirm({
      open: true,
      title: "Kết thúc Live cưỡng chế",
      message: "Chắc chắn muốn cưỡng chế kết thúc Live bị kẹt trong Database?",
      confirmLabel: "Kết thúc",
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch("/api/admin/force-end", { method: "POST" });
          if (!res.ok) throw new Error("Failed to end");
          showAlert("Thành công", "Đã kết thúc Live thành công!", "success");
        } catch {
          showAlert("Lỗi", "Lỗi mạng hoặc Server từ chối", "danger");
        }
        setConfirm((prev) => ({ ...prev, open: false }));
      },
    });
  }, [showAlert]);

  return (
    <div className="flex flex-col lg:flex-row h-full bg-gray-950">
      {/* Video monitor */}
      <div className="shrink-0 lg:flex-1 lg:min-w-0">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">Giám sát Live</h2>
            <div className="flex items-center gap-3">
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
                  <span className="text-gray-500">NGOẠI TUYẾN</span>
                )}
              </span>
              {isLive && (
                <>
                  {viewerCount && (
                    <span className="text-xs text-gray-400">
                      {viewerCount.nclients} người xem
                    </span>
                  )}
                  <button
                    onClick={handleForceEnd}
                    className="px-2 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
                  >
                    Kết thúc ngay
                  </button>
                </>
              )}
            </div>
          </div>
          <LivePlayer ref={playerRef} hlsUrl={isLive ? hlsUrl : ""} />
          {session?.started_at && (
            <p className="text-xs text-gray-600 mt-2">
              Bắt đầu: {new Date(session.started_at).toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      {/* Comment moderation */}
      <div className="flex-1 lg:flex-none lg:w-[400px] border-t lg:border-t-0 lg:border-l border-gray-800 flex flex-col min-h-0">
        <div className="shrink-0 px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <span className="text-sm font-semibold text-white">
            Bình luận ({comments.length})
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0 chat-scrollbar">
          {comments.length === 0 && (
            <p className="text-xs text-gray-600 text-center mt-4">
              Chưa có bình luận
            </p>
          )}
          {comments.map((c: Comment) => (
            <div
              key={c.id}
              className="group bg-gray-900 border border-gray-800 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-sm font-medium text-blue-400">
                    {c.user_name}
                  </span>
                  <span className="text-xs text-gray-600 ml-2">
                    {new Date(c.created_at).toLocaleTimeString()}
                  </span>
                  <p className="text-sm text-gray-300 mt-0.5 break-words">
                    {c.content}
                  </p>
                  {c.user_ip && (
                    <p className="text-xs text-gray-700 mt-1">IP: {c.user_ip}</p>
                  )}
                </div>

                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    className="border border-red-800 px-2 py-1 text-xs text-red-400 hover:bg-red-900/50 transition-colors"
                    onClick={() => handleDelete(c.id)}
                  >
                    Xóa
                  </button>
                  <button
                    type="button"
                    className="border border-yellow-800 px-2 py-1 text-xs text-yellow-400 hover:bg-yellow-900/50 transition-colors"
                    onClick={() => handleBan(c.id)}
                  >
                    Cấm
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ConfirmModal
        open={confirm.open}
        onClose={() => setConfirm((prev) => ({ ...prev, open: false }))}
        onConfirm={confirm.onConfirm}
        title={confirm.title}
        message={confirm.message}
        confirmLabel={confirm.confirmLabel}
        variant={confirm.variant}
      />

      <AlertModal
        open={alert.open}
        onClose={() => setAlert((prev) => ({ ...prev, open: false }))}
        title={alert.title}
        message={alert.message}
        variant={alert.variant}
      />
    </div>
  );
}
