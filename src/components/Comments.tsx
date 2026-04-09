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

      // Notify entry owner
      if (entryOwnerId !== currentUserId) {
        await supabase.from("notifications").insert({
          user_id: entryOwnerId,
          type: "new_star" as const, // reusing type for now
          from_user_id: currentUserId,
          entry_id: entryId,
          message_text: "commented on your entry",
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
    <div className="mt-2">
      {/* Toggle button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="font-fell italic text-[0.8rem] text-ink-sepia opacity-80 hover:opacity-100 transition-opacity bg-transparent border-none tracking-[0.05em]"
        style={{ cursor: "none" }}
      >
        💬 {commentCount} {commentCount === 1 ? "comment" : "comments"}
      </button>

      {/* Expanded comments */}
      {expanded && (
        <div
          className="mt-3 pt-3"
          style={{ borderTop: "1px solid rgba(139,100,40,0.1)" }}
        >
          {/* Comment list */}
          {comments.length > 0 && (
            <div className="space-y-3 mb-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-2.5">
                  {/* Avatar */}
                  <Link
                    href={`/profile/${comment.user?.username || ""}`}
                    className="shrink-0 no-underline"
                    style={{ cursor: "none" }}
                  >
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs overflow-hidden"
                      style={{
                        background: comment.user?.avatar_url
                          ? "transparent"
                          : "radial-gradient(circle at 35% 35%, rgba(201,124,42,0.25), rgba(61,32,16,0.5))",
                        border: "1px solid rgba(201,124,42,0.2)",
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
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/profile/${comment.user?.username || ""}`}
                        className="font-cormorant italic text-[0.75rem] text-ink-sepia opacity-85 hover:opacity-90 no-underline transition-opacity"
                        style={{ cursor: "none" }}
                      >
                        {comment.user?.display_name ||
                          comment.user?.username ||
                          "Anonymous"}
                      </Link>
                      <span className="font-fell italic text-[0.45rem] text-ink-sepia opacity-25">
                        {timeAgo(comment.created_at)}
                      </span>
                      {/* Delete button — only for comment author */}
                      {currentUserId === comment.user_id && (
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className="font-fell text-[0.5rem] text-ink-sepia opacity-20 hover:opacity-50 transition-opacity bg-transparent border-none ml-auto"
                          style={{ cursor: "none" }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <p className="font-cormorant italic text-[0.82rem] leading-[1.5] text-ink-sepia opacity-85">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Write comment */}
          {currentUserId ? (
            <div className="flex gap-2 items-end">
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
                className="flex-1 bg-transparent border-b border-[rgba(139,100,40,0.15)] px-1 py-1.5 font-cormorant italic text-[0.82rem] text-ink-sepia opacity-85 outline-none focus:border-[rgba(201,124,42,0.4)] transition-colors placeholder:text-ink-sepia placeholder:opacity-25"
                style={{ cursor: "none" }}
              />
              <button
                onClick={handleSubmit}
                disabled={!newComment.trim() || sending}
                className="font-fell italic text-[0.6rem] text-amber opacity-50 hover:opacity-80 transition-opacity bg-transparent border-none disabled:opacity-20 tracking-[0.05em] pb-1.5"
                style={{ cursor: "none" }}
              >
                {sending ? "..." : "send"}
              </button>
            </div>
          ) : (
            <p className="font-cormorant italic text-[0.75rem] text-ink-sepia opacity-30">
              Log in to comment
            </p>
          )}
        </div>
      )}
    </div>
  );
}
