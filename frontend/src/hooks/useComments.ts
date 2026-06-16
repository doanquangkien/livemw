"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";

export interface Comment {
  id: string;
  session_id: string;
  user_name: string;
  content: string;
  user_ip: string | null;
  is_deleted: boolean;
  created_at: string;
}

export function useComments(sessionId: string | null) {
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    let cancelled = false;

    // Clear old comments immediately when session changes
    setComments([]);

    if (!sessionId) return;

    // Fetch existing comments for the current session only
    supabase
      .from("comments")
      .select("*")
      .eq("session_id", sessionId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (!cancelled && data) {
          setComments(data as Comment[]);
        }
      });

    // Subscribe to new comments AND soft-deletes for this session only
    const channel = supabase
      .channel(`comments:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "comments",
          filter: `session_id=eq.${sessionId}`,
        },
        ({ new: row }) => {
          const comment = row as Comment;
          if (!comment.is_deleted) {
            setComments((prev) => [...prev, comment]);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "comments",
          filter: `session_id=eq.${sessionId}`,
        },
        ({ new: row }) => {
          const comment = row as Comment;
          if (comment.is_deleted) {
            setComments((prev) => prev.filter((c) => c.id !== comment.id));
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return comments;
}
