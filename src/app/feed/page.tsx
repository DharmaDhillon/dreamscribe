"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import StarButton from "@/components/StarButton";
import Comments from "@/components/Comments";
import type { Database } from "@/lib/supabase";

type Entry = Database["public"]["Tables"]["entries"]["Row"];

type FeedEntry = Entry & {
  users: {
    username: string;
    display_name: string;
    avatar_archetype: string | null;
    avatar_url: string | null;
  } | null;
  user_starred: boolean;
};

type FilterType = "all" | "dream" | "daily" | "starred" | "mine";

const ARCHETYPE_EMOJI: Record<string, string> = {
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
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function FeedPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Allow unauthenticated browsing of public feed
      if (user) setUserId(user.id);

      let query = supabase
        .from("entries")
        .select(
          "*, users!entries_user_id_fkey(username, display_name, avatar_archetype, avatar_url)"
        )
        .order("created_at", { ascending: false })
        .limit(50);

      if (filter === "mine") {
        if (!user) {
          router.push("/login");
          return;
        }
        query = query.eq("user_id", user.id);
      } else {
        query = query.eq("is_public", true);
        if (filter === "dream") query = query.eq("entry_type", "dream");
        if (filter === "daily") query = query.eq("entry_type", "daily");
        if (filter === "starred") {
          query = query
            .gt("star_count", 0)
            .order("star_count", { ascending: false });
        }
      }

      const { data } = await query;

      // Check user stars
      let starredIds = new Set<string>();
      if (user) {
        const { data: userStars } = await supabase
          .from("stars")
          .select("entry_id")
          .eq("user_id", user.id);
        starredIds = new Set((userStars || []).map((s) => s.entry_id));
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const feedEntries: FeedEntry[] = (data || []).map((e: any) => ({
        ...e,
        users: e.users || null,
        user_starred: starredIds.has(e.id),
      }));

      setEntries(feedEntries);
      setLoading(false);
    }

    setLoading(true);
    load();
  }, [router, filter]);

  const toggleEntryPublic = async (
    entryId: string,
    currentPublic: boolean
  ) => {
    const supabase = createClient();
    await supabase
      .from("entries")
      .update({ is_public: !currentPublic })
      .eq("id", entryId);
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId ? { ...e, is_public: !currentPublic } : e
      )
    );
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "dream", label: "🌙 Dreams" },
    { key: "daily", label: "☀️ Daily" },
    { key: "starred", label: "★ Top" },
    { key: "mine", label: "My Scrolls" },
  ];

  return (
    <div className="pt-[100px] pb-[300px]">
      {/* Header */}
      <div
        className="text-center mb-6"
        style={{ opacity: 0, animation: "ember-in 1.5s ease forwards 0.2s" }}
      >
        <h1
          className="font-pinyon text-[3.5rem] text-amber-pale mb-2"
          style={{
            textShadow:
              "0 0 30px rgba(232,168,74,0.5), 0 0 60px rgba(201,124,42,0.3)",
          }}
        >
          The Bonfire
        </h1>
        <p className="font-cormorant italic text-sm text-parchment-dark opacity-50">
          Where dreamers gather to share what the fire revealed
        </p>
      </div>

      {/* Filter tabs */}
      <div
        className="flex justify-center gap-1 mb-8 px-4 flex-wrap"
        style={{ opacity: 0, animation: "ember-in 1.5s ease forwards 0.4s" }}
      >
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 font-fell italic text-[0.65rem] tracking-[0.08em] transition-all duration-300 rounded-sm ${
              filter === f.key
                ? "text-parchment opacity-90 bg-[rgba(201,124,42,0.15)] border-b-2 border-amber"
                : "text-parchment-dark opacity-40 hover:opacity-70 border-b-2 border-transparent"
            }`}
            style={{ cursor: "none" }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div
        className="w-[min(700px,98vw)] mx-auto"
        style={{ opacity: 0, animation: "ember-in 1.5s ease forwards 0.6s" }}
      >
        {loading ? (
          <div className="text-center py-16">
            <div
              className="text-2xl mb-4"
              style={{
                animation: "flame-flicker-icon 0.8s ease-in-out infinite",
              }}
            >
              🕯️
            </div>
            <p className="font-cormorant italic text-parchment-dark opacity-40">
              Loading scrolls...
            </p>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-cormorant italic text-lg text-parchment-dark opacity-50">
              {filter === "starred"
                ? "No starred scrolls yet. Star a scroll you connect with."
                : filter === "mine"
                ? "You haven't recorded any scrolls yet."
                : filter === "dream"
                ? "No public dream scrolls yet."
                : filter === "daily"
                ? "No public daily scrolls yet."
                : "No public scrolls yet. Be the first to share."}
            </p>
            {!userId && (
              <Link
                href="/signup"
                className="font-fell italic text-sm text-amber opacity-60 hover:opacity-90 no-underline mt-4 inline-block"
                style={{ cursor: "none" }}
              >
                Join DreamScribe &rarr;
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => {
              const emoji =
                ARCHETYPE_EMOJI[entry.users?.avatar_archetype || ""] || "🔍";
              const isOwn = userId && entry.user_id === userId;
              const isExpanded = expandedId === entry.id;

              return (
                <div
                  key={entry.id}
                  className="relative transition-all duration-300"
                  style={{
                    background: "rgba(30,18,8,0.4)",
                    border: "1px solid rgba(139,100,40,0.12)",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  {/* Header row — avatar + name + time */}
                  <div className="flex items-center gap-3 px-5 pt-4 pb-2">
                    <Link
                      href={`/profile/${entry.users?.username || ""}`}
                      className="no-underline shrink-0"
                      style={{ cursor: "none" }}
                    >
                      <span
                        className="w-9 h-9 rounded-full flex items-center justify-center text-lg overflow-hidden"
                        style={{
                          background: entry.users?.avatar_url
                            ? "transparent"
                            : "radial-gradient(circle at 35% 35%, rgba(201,124,42,0.25), rgba(61,32,16,0.5))",
                          border: "1px solid rgba(201,124,42,0.25)",
                        }}
                      >
                        {entry.users?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={entry.users.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          emoji
                        )}
                      </span>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/profile/${entry.users?.username || ""}`}
                        className="no-underline group"
                        style={{ cursor: "none" }}
                      >
                        <span className="font-cormorant italic text-sm text-parchment opacity-80 group-hover:text-amber-pale transition-colors">
                          {entry.users?.display_name ||
                            entry.users?.username ||
                            "Anonymous"}
                        </span>
                        <span className="font-fell italic text-[0.55rem] text-parchment-dark opacity-30 ml-2">
                          @{entry.users?.username}
                        </span>
                      </Link>
                      <div className="flex items-center gap-2">
                        <span className="font-fell italic text-[0.55rem] text-parchment-dark opacity-25">
                          {entry.entry_type === "dream"
                            ? "🌙 dream"
                            : "☀️ daily"}{" "}
                          · {timeAgo(entry.created_at)}
                        </span>
                        {entry.mood_label && (
                          <span className="font-fell italic text-[0.5rem] text-amber opacity-40">
                            {entry.mood_label}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Privacy toggle for own entries */}
                    {isOwn && (
                      <button
                        onClick={() =>
                          toggleEntryPublic(entry.id, entry.is_public)
                        }
                        className="font-fell italic text-[0.55rem] tracking-[0.05em] px-2 py-1 transition-all duration-300 border shrink-0"
                        style={{
                          cursor: "none",
                          background: entry.is_public
                            ? "rgba(201,124,42,0.1)"
                            : "rgba(44,24,16,0.15)",
                          borderColor: entry.is_public
                            ? "rgba(201,124,42,0.25)"
                            : "rgba(139,100,40,0.15)",
                          color: "rgba(212,188,138,0.6)",
                        }}
                      >
                        {entry.is_public ? "🔓" : "🔒"}
                      </button>
                    )}
                  </div>

                  {/* Transcript */}
                  <div className="px-5 pb-3">
                    {entry.transcript ? (
                      <p className="font-cormorant italic text-[0.95rem] leading-[1.7] text-parchment opacity-70">
                        &ldquo;
                        {isExpanded
                          ? entry.transcript
                          : entry.transcript.substring(0, 180) +
                            (entry.transcript.length > 180 ? "..." : "")}
                        &rdquo;
                      </p>
                    ) : (
                      <p className="font-cormorant italic text-sm text-parchment-dark opacity-35">
                        Audio entry · {entry.duration_seconds || 0}s
                      </p>
                    )}
                  </div>

                  {/* Claude insight preview */}
                  {entry.claude_insight && (
                    <div
                      className="mx-5 mb-3 px-3 py-2"
                      style={{
                        borderLeft: "2px solid rgba(201,124,42,0.2)",
                        background: "rgba(201,124,42,0.04)",
                      }}
                    >
                      <span className="font-fell text-[7px] tracking-[0.2em] text-amber opacity-40 uppercase block mb-1">
                        ✦ what the flame heard
                      </span>
                      <p className="font-cormorant italic text-[0.8rem] leading-[1.6] text-parchment opacity-55">
                        {isExpanded
                          ? entry.claude_insight
                          : entry.claude_insight.substring(0, 140) +
                            (entry.claude_insight.length > 140 ? "..." : "")}
                      </p>
                    </div>
                  )}

                  {/* Brain scores mini bar (compact) */}
                  {entry.amygdala_score !== null && (
                    <div className="px-5 pb-2">
                      <div className="flex gap-3 items-center">
                        {[
                          {
                            label: "emotional",
                            score: Number(entry.amygdala_score || 0),
                          },
                          {
                            label: "reflective",
                            score: Number(entry.dmn_score || 0),
                          },
                          {
                            label: "conflict",
                            score: Number(entry.acc_score || 0),
                          },
                          {
                            label: "rational",
                            score: Number(entry.dlpfc_score || 0),
                          },
                        ].map((b) => (
                          <div key={b.label} className="flex-1">
                            <div className="h-[2px] bg-[rgba(212,188,138,0.1)] rounded-sm overflow-hidden">
                              <div
                                className="h-full rounded-sm"
                                style={{
                                  width: `${b.score}%`,
                                  background:
                                    b.score >= 60
                                      ? "rgba(232,80,58,0.5)"
                                      : b.score >= 35
                                      ? "rgba(201,124,42,0.5)"
                                      : "rgba(107,158,107,0.5)",
                                }}
                              />
                            </div>
                            <span className="font-fell italic text-[6px] text-parchment-dark opacity-25 tracking-[0.05em]">
                              {b.label} {b.score}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer — star + comments + expand */}
                  <div className="flex items-center justify-between px-5 py-3 border-t border-[rgba(139,100,40,0.08)]">
                    <div className="flex items-center gap-4">
                      {userId ? (
                        <StarButton
                          entryId={entry.id}
                          userId={userId}
                          initialStarCount={entry.star_count}
                          initialStarred={entry.user_starred}
                        />
                      ) : (
                        <span className="font-fell italic text-[0.6rem] text-parchment-dark opacity-35">
                          ★ {entry.star_count}
                        </span>
                      )}
                      <Comments
                        entryId={entry.id}
                        currentUserId={userId}
                        entryOwnerId={entry.user_id}
                      />
                    </div>
                    {(entry.transcript?.length || 0) > 180 && (
                      <button
                        onClick={() =>
                          setExpandedId(isExpanded ? null : entry.id)
                        }
                        className="font-fell italic text-[0.6rem] text-parchment-dark opacity-35 hover:opacity-60 transition-opacity bg-transparent border-none tracking-[0.05em]"
                        style={{ cursor: "none" }}
                      >
                        {isExpanded ? "show less" : "read more"}
                      </button>
                    )}
                  </div>

                  {/* Comments section (renders inline when expanded) */}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
