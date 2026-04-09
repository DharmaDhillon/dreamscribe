"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

interface Comment {
  id: string;
  entry_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: {
    username: string;
    display_name: string;
    avatar_url: string | null;
    avatar_archetype: string | null;
  };
}

interface CommentsProps {
  entryId: string;
  currentUserId: string | null;
  entryOwnerId: string;
}

const EMOJI: Record<string, string> = {
  "The Seeker": "🔍",
  "The Alchemist": "⚗️",
  "The Oracle": "🔮",
  "The Wanderer": "🌙",
  "The Healer": "🌿",
  "The Architect": "🏛️",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export default function Comments({
  entryId,
  currentUserId,
  entryOwnerId,
}: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [commentCount, setCommentCount] = useState(0);

  useEffect(() => {
    loadComments();
  }, [entryId]);

  const loadComments = async () => {
    const supabase = createClient();

    // Get count first
    const { count } = await supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("entry_id", entryId);
    setCommentCount(count || 0);

    if (!expanded) return;

    // Load full comments with user info
    const { data } = await supabase
      .from("comments")
      .select("*")
      .eq("entry_id", entryId)
      .order("created_at", { ascending: true });

    if (!data) return;

    // Fetch user profiles
    const userIds = Array.from(new Set(data.map((c) => c.user_id)));
    const { data: profiles } = await supabase
      .from("users")
      .select("id, username, display_name, avatar_url, avatar_archetype")
      .in("id", userIds);

    const profileMap = new Map(
      (profiles || []).map((p) => [p.id, p])
    );

    setComments(
      data.map((c) => ({
        ...c,
        user: profileMap.get(c.user_id) || undefined,
      }))
    );
  };

  useEffect(() => {
    if (expanded) loadComments();
  }, [expanded]);

  const handleSubmit = async () => {
    if (!newComment.trim() || !currentUserId || sending) return;
    setSending(true);

    const supabase = createClient();
    const { data: comment } = await supabase
      .from("comments")
      .insert({
        entry_id: entryId,
        user_id: currentUserId,
        content: newComment.trim(),
      })
      .select()
      .single();

    if (comment) {
      // Get current user profile for display
      const { data: profile } = await supabase
        .from("users")
        .select("id, username, display_name, avatar_url, avatar_archetype")
        .eq("id", currentUserId)
        .single();

      setComments((prev) => [
        ...prev,
        { ...comment, user: profile || undefined },
      ]);
      setCommentCount((c) => c + 1);
      setNewComment("");

      // Notify entry owner that someone left a comment
      if (entryOwnerId !== currentUserId) {
        await supabase.from("notifications").insert({
          user_id: entryOwnerId,
          type: "new_comment" as const,
          from_user_id: currentUserId,
          entry_id: entryId,
          message_text: "commented on your scroll",
        });
      }
    }
    setSending(false);
  };

  const handleDelete = async (commentId: string) => {
    const supabase = createClient();
    await supabase.from("comments").delete().eq("id", commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setCommentCount((c) => Math.max(0, c - 1));
  };

  return (
    <div className="mt-2 w-full">
      {/* Toggle button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="font-fell italic text-[1rem] text-ink-sepia hover:text-amber transition-colors bg-transparent border-none tracking-[0.05em] flex items-center gap-2"
        style={{ cursor: "none" }}
      >
        <span className="text-lg">💬</span>
        <span>
          {commentCount} {commentCount === 1 ? "comment" : "comments"}
        </span>
        <span className="font-fell text-[0.7rem] opacity-60">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {/* Expanded comments */}
      {expanded && (
        <div
          className="mt-4 pt-4 px-4 pb-4"
          style={{
            borderTop: "1px solid rgba(139,100,40,0.3)",
            background: "rgba(44,24,16,0.05)",
            borderRadius: 0,
          }}
        >
          {/* Comment list */}
          {comments.length > 0 ? (
            <div className="space-y-4 mb-5">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="flex gap-3 pb-3"
                  style={{
                    borderBottom: "1px solid rgba(139,100,40,0.15)",
                  }}
                >
                  {/* Avatar */}
                  <Link
                    href={`/profile/${comment.user?.username || ""}`}
                    className="shrink-0 no-underline"
                    style={{ cursor: "none" }}
                  >
                    <span
                      className="w-9 h-9 rounded-full flex items-center justify-center text-base overflow-hidden"
                      style={{
                        background: comment.user?.avatar_url
                          ? "transparent"
                          : "radial-gradient(circle at 35% 35%, rgba(201,124,42,0.5), rgba(61,32,16,0.7))",
                        border: "2px solid rgba(201,124,42,0.5)",
                      }}
                    >
                      {comment.user?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={comment.user.avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        EMOJI[comment.user?.avatar_archetype || ""] || "🔍"
                      )}
                    </span>
                  </Link>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <Link
                        href={`/profile/${comment.user?.username || ""}`}
                        className="font-cormorant italic text-[1rem] text-ink-sepia hover:text-amber no-underline transition-colors"
                        style={{ cursor: "none" }}
                      >
                        {comment.user?.display_name ||
                          comment.user?.username ||
                          "Anonymous"}
                      </Link>
                      <span className="font-fell italic text-[0.7rem] text-ink-sepia opacity-70">
                        {timeAgo(comment.created_at)}
                      </span>
                      {/* Delete button — only for comment author */}
                      {currentUserId === comment.user_id && (
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className="font-fell text-[0.85rem] text-ink-sepia opacity-50 hover:opacity-100 hover:text-[#8b1a1a] transition-all bg-transparent border-none ml-auto"
                          style={{ cursor: "none" }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <p className="font-cormorant italic text-[1rem] leading-[1.6] text-ink-sepia">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-cormorant italic text-[0.95rem] text-ink-sepia opacity-70 text-center mb-5">
              No comments yet. Be the first to leave a thought.
            </p>
          )}

          {/* Write comment */}
          {currentUserId ? (
            <div className="flex gap-3 items-end">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="Leave a thought..."
                className="flex-1 bg-[#e8d8a8] border border-[rgba(139,100,40,0.4)] px-4 py-3 font-cormorant italic text-[1rem] text-ink-sepia outline-none focus:border-amber transition-colors placeholder:text-ink-sepia placeholder:opacity-50"
                style={{ cursor: "none" }}
              />
              <button
                onClick={handleSubmit}
                disabled={!newComment.trim() || sending}
                className="font-pinyon text-base px-5 py-2.5 transition-all duration-300 hover:scale-105 disabled:opacity-40"
                style={{
                  background:
                    "radial-gradient(circle at 35% 35%, #c0302a, #8b1a1a, #5a0f0f)",
                  boxShadow:
                    "0 2px 8px rgba(0,0,0,0.4), 0 0 12px rgba(139,26,26,0.2)",
                  textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                  color: "rgba(255,220,180,0.95)",
                  cursor: "none",
                }}
              >
                {sending ? "..." : "Send"}
              </button>
            </div>
          ) : (
            <p className="font-cormorant italic text-[0.95rem] text-ink-sepia opacity-70 text-center">
              Log in to leave a comment
            </p>
          )}
        </div>
      )}
    </div>
  );
}
