"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useComments } from "@/hooks/useComments";

interface LiveChatProps {
  sessionId: string | null;
  isLive: boolean;
}

function SendIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}

const STORAGE_KEY = "livemw_display_name";

export function LiveChat({ sessionId, isLive }: LiveChatProps) {
  const comments = useComments(sessionId);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameStored, setNameStored] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setName(stored);
      setNameStored(true);
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  const handleSubmit = useCallback(async () => {
    const trimmedContent = content.trim();
    const trimmedName = name.trim();

    if (!trimmedContent || !trimmedName || !sessionId) return;

    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          user_name: trimmedName,
          content: trimmedContent,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Gửi thất bại");
        return;
      }

      setContent("");
      if (!nameStored) {
        localStorage.setItem(STORAGE_KEY, trimmedName);
        setNameStored(true);
      }
    } catch {
      setError("Lỗi mạng. Vui lòng thử lại.");
    } finally {
      setSending(false);
    }
  }, [content, name, sessionId, nameStored]);

  const canSend = !sending && content.trim().length > 0 && name.trim().length > 0;

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-gray-800">
        <span className="text-sm font-semibold text-white">
          Bình luận ({comments.length})
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
        {comments.length === 0 && (
          <p className="text-xs text-gray-600 text-center mt-4">
            {isLive ? "Chưa có bình luận. Hãy là người đầu tiên!" : "Đang chờ phiên live bắt đầu..."}
          </p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="flex gap-2 text-sm">
            <span className="text-blue-400 font-medium shrink-0">
              {c.user_name}
            </span>
            <span className="text-gray-200 break-words">{c.content}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-gray-800 p-3 space-y-2">
        {!isLive ? (
          <p className="text-xs text-gray-600 text-center py-2">
            Phiên live đã kết thúc. Chat đã tắt.
          </p>
        ) : (
          <>
            {!nameStored && (
              <input
                type="text"
                className="w-full bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none"
                placeholder="Tên của bạn (1-30 ký tự)"
                value={name}
                maxLength={30}
                onChange={(e) => setName(e.target.value)}
                disabled={sending}
                autoComplete="off"
              />
            )}
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 bg-gray-900 border border-gray-700 px-3 py-2 text-base text-white placeholder-gray-500 outline-none"
                placeholder={isLive ? "Gửi tin nhắn..." : "Đang chờ phiên live..."}
                value={content}
                maxLength={200}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canSend) handleSubmit();
                }}
                disabled={sending || !isLive}
                autoComplete="off"
              />
              <button
                type="button"
                className="shrink-0 bg-gray-900 border border-gray-700 px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors disabled:opacity-30"
                onClick={handleSubmit}
                disabled={!canSend}
              >
                {sending ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <SendIcon />
                )}
              </button>
            </div>
          </>
        )}
        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
      </div>
    </div>
  );
}
