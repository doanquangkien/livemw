"use client";

import { useRef, useCallback } from "react";
import { LivePlayer, type LivePlayerHandle } from "@/app/components/LivePlayer";
import { useLiveStatus } from "@/hooks/useLiveStatus";
import { useComments, type Comment } from "@/hooks/useComments";

export default function AdminLivePage() {
  const { status, session, hlsUrl } = useLiveStatus();
  const isLive = status === "live";
  const comments = useComments(session?.id ?? null);
  const playerRef = useRef<LivePlayerHandle>(null);

  const handleDelete = useCallback(async (commentId: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json();
        alert(body.error ?? "Failed to delete");
      }
    } catch {
      alert("Network error");
    }
  }, []);

  const handleBan = useCallback(async (commentId: string) => {
    if (!confirm("Ban this user? All their comments will be removed.")) return;
    try {
      const res = await fetch("/api/comments/ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment_id: commentId }),
      });
      if (!res.ok) {
        const body = await res.json();
        alert(body.error ?? "Failed to ban");
      }
    } catch {
      alert("Network error");
    }
  }, []);

  const handleForceEnd = useCallback(async () => {
    if (!confirm("Chắc chắn muốn cưỡng chế kết thúc Live bị kẹt trong Database?")) return;
    try {
      const res = await fetch("/api/admin/force-end", { method: "POST" });
      if (!res.ok) throw new Error("Failed to end");
      alert("Đã kết thúc Live thành công!");
    } catch {
      alert("Lỗi mạng hoặc Server từ chối");
    }
  }, []);

  return (
    <div className="flex flex-col lg:flex-row h-full bg-gray-950">
      {/* Video monitor */}
      <div className="shrink-0 lg:flex-1 lg:min-w-0">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">Live Monitor</h2>
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
                  <span className="text-gray-500">OFFLINE</span>
                )}
              </span>
              {isLive && (
                <button
                  onClick={handleForceEnd}
                  className="px-2 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
                >
                  Force End
                </button>
              )}
            </div>
          </div>
          <LivePlayer ref={playerRef} hlsUrl={isLive ? hlsUrl : ""} />
          {session?.started_at && (
            <p className="text-xs text-gray-600 mt-2">
              Started: {new Date(session.started_at).toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      {/* Comment moderation */}
      <div className="flex-1 lg:flex-none lg:w-[400px] border-t lg:border-t-0 lg:border-l border-gray-800 flex flex-col min-h-0">
        <div className="shrink-0 px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <span className="text-sm font-semibold text-white">
            Comments ({comments.length})
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0 chat-scrollbar">
          {comments.length === 0 && (
            <p className="text-xs text-gray-600 text-center mt-4">
              No comments yet
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
                    Delete
                  </button>
                  <button
                    type="button"
                    className="border border-yellow-800 px-2 py-1 text-xs text-yellow-400 hover:bg-yellow-900/50 transition-colors"
                    onClick={() => handleBan(c.id)}
                  >
                    Ban
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
