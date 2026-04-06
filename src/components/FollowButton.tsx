"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";

interface FollowButtonProps {
  currentUserId: string;
  targetUserId: string;
  initialStatus: "none" | "pending" | "approved" | "declined";
}

export default function FollowButton({
  currentUserId,
  targetUserId,
  initialStatus,
}: FollowButtonProps) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);

  const handleFollow = async () => {
    if (loading) return;
    setLoading(true);
    const supabase = createClient();

    if (status === "none" || status === "declined") {
      const { error } = await supabase.from("follows").upsert(
        {
          follower_id: currentUserId,
          following_id: targetUserId,
          status: "pending" as const,
        },
      );

      if (!error) {
        setStatus("pending");
        // Send notification
        await supabase.from("notifications").insert({
          user_id: targetUserId,
          type: "follow_request" as const,
          from_user_id: currentUserId,
          message_text: "sent you a follow request",
        });
      }
    } else if (status === "approved") {
      // Unfollow
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", targetUserId);
      setStatus("none");
    }

    setLoading(false);
  };

  const label =
    status === "approved"
      ? "Following"
      : status === "pending"
      ? "Requested"
      : "Follow";

  return (
    <button
      onClick={handleFollow}
      disabled={loading || status === "pending"}
      className="font-fell italic text-[0.7rem] tracking-[0.1em] px-5 py-2 transition-all duration-300 disabled:opacity-50"
      style={{
        cursor: "none",
        background:
          status === "approved"
            ? "rgba(44,24,16,0.08)"
            : status === "pending"
            ? "rgba(44,24,16,0.05)"
            : "radial-gradient(circle at 35% 35%, #c0302a, #8b1a1a, #5a0f0f)",
        color:
          status === "approved" || status === "pending"
            ? "rgba(44,24,16,0.6)"
            : "rgba(255,220,180,0.9)",
        border:
          status === "approved"
            ? "1px solid rgba(139,100,40,0.3)"
            : status === "pending"
            ? "1px solid rgba(139,100,40,0.2)"
            : "none",
        boxShadow:
          status === "none" || status === "declined"
            ? "0 2px 8px rgba(0,0,0,0.4), 0 0 12px rgba(139,26,26,0.2)"
            : "none",
        textShadow:
          status === "none" || status === "declined"
            ? "0 1px 2px rgba(0,0,0,0.5)"
            : "none",
      }}
    >
      {loading ? "..." : label}
    </button>
  );
}
