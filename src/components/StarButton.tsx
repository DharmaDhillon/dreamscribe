"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";

interface StarButtonProps {
  entryId: string;
  userId: string;
  initialStarCount: number;
  initialStarred: boolean;
}

export default function StarButton({
  entryId,
  userId,
  initialStarCount,
  initialStarred,
}: StarButtonProps) {
  const [starred, setStarred] = useState(initialStarred);
  const [count, setCount] = useState(initialStarCount);
  const [loading, setLoading] = useState(false);

  const toggleStar = async () => {
    if (loading) return;
    setLoading(true);
    const supabase = createClient();

    if (starred) {
      await supabase
        .from("stars")
        .delete()
        .eq("user_id", userId)
        .eq("entry_id", entryId);

      const newCount = Math.max(0, count - 1);
      setStarred(false);
      setCount(newCount);

      // Update star_count on entry
      await supabase
        .from("entries")
        .update({ star_count: newCount })
        .eq("id", entryId);
    } else {
      await supabase
        .from("stars")
        .insert({ user_id: userId, entry_id: entryId });

      const newCount = count + 1;
      setStarred(true);
      setCount(newCount);

      // Update star_count on entry
      await supabase
        .from("entries")
        .update({ star_count: newCount })
        .eq("id", entryId);

      // Create notification for entry owner
      const { data: entry } = await supabase
        .from("entries")
        .select("user_id")
        .eq("id", entryId)
        .single();

      if (entry && entry.user_id !== userId) {
        await supabase.from("notifications").insert({
          user_id: entry.user_id,
          type: "new_star" as const,
          from_user_id: userId,
          entry_id: entryId,
          message_text: "starred your entry",
        });
      }
    }
    setLoading(false);
  };

  return (
    <button
      onClick={toggleStar}
      disabled={loading}
      className="flex items-center gap-1.5 font-fell italic text-[0.65rem] tracking-[0.05em] transition-all duration-300 bg-transparent border-none disabled:opacity-50"
      style={{
        cursor: "none",
        color: starred ? "#c97c2a" : "rgba(44,24,16,0.45)",
      }}
    >
      <span
        className="text-sm transition-transform duration-300"
        style={{ transform: starred ? "scale(1.2)" : "scale(1)" }}
      >
        {starred ? "★" : "☆"}
      </span>
      {count} {count === 1 ? "star" : "stars"}
    </button>
  );
}
