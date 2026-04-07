"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import StarButton from "@/components/StarButton";
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
        query = query.eq("is_public", true).not("transcript", "is", null).neq("transcript", "");
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

      {/* Signup prompt banner for non-logged-in users */}
      {!userId && !loading && (
        <div
          className="w-[min(700px,98vw)] mx-auto mb-8 px-6 py-5 text-center"
          style={{
            background: "rgba(15,9,4,0.85)",
            border: "1px solid rgba(201,124,42,0.4)",
            borderLeft: "4px solid rgba(201,124,42,0.7)",
            backdropFilter: "blur(8px)",
            opacity: 0,
            animation: "ember-in 1.5s ease forwards 0.5s",
          }}
        >
          <p className="font-cormorant italic text-base text-candle-white mb-3">
            ✦ Welcome, traveler. Step closer to the bonfire.
          </p>
          <p className="font-cormorant italic text-sm text-parchment opacity-80 mb-4 max-w-md mx-auto">
            DreamScribe reads your dreams and your days through brain activation
            and AI insight. Join the circle to record your own scribes, follow
            dreamers, and see what the flame hears in your voice.
          </p>
          <Link
            href="/signup"
            className="no-underline inline-block font-pinyon text-lg px-8 py-3 text-[rgba(255,220,180,0.95)] transition-all duration-300 hover:scale-105"
            style={{
              background: "radial-gradient(circle at 35% 35%, #c0302a, #8b1a1a, #5a0f0f)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,100,80,0.2), 0 0 20px rgba(139,26,26,0.3)",
              textShadow: "0 1px 2px rgba(0,0,0,0.5)",
              cursor: "none",
            }}
          >
            Begin Your First Scroll
          </Link>
          <div className="mt-3">
            <Link
              href="/login"
              className="font-fell italic text-[0.7rem] text-parchment-dark hover:text-amber opacity-70 hover:opacity-100 tracking-[0.1em] transition-colors no-underline"
              style={{ cursor: "none" }}
            >
              Already have a scroll? Login &rarr;
            </Link>
          </div>
        </div>
      )}

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
          <div className="space-y-3">
            {entries.map((entry) => {
              const emoji =
                ARCHETYPE_EMOJI[entry.users?.avatar_archetype || ""] || "🔍";
              const profileHref = userId
                ? `/profile/${entry.users?.username || ""}#entry-${entry.id}`
                : "/signup";
              const preview = entry.transcript
                ? entry.transcript.substring(0, 140) +
                  (entry.transcript.length > 140 ? "..." : "")
                : `Audio entry · ${entry.duration_seconds || 0}s`;

              return (
                <Link
                  key={entry.id}
                  href={profileHref}
                  className="block no-underline group"
                  style={{ cursor: "none" }}
                >
                  <div className="entry-scroll relative cursor-none transition-all duration-300 group-hover:brightness-110">
                    <div className="entry-scroll-rod" />
                    <div className="entry-scroll-body">
                      <div className="flex gap-4 relative z-[2]">
                        {/* Avatar */}
                        <span
                          className="w-12 h-12 rounded-full flex items-center justify-center text-xl overflow-hidden shrink-0"
                          style={{
                            background: entry.users?.avatar_url
                              ? "transparent"
                              : "radial-gradient(circle at 35% 35%, rgba(201,124,42,0.5), rgba(61,32,16,0.7))",
                            border: "2px solid rgba(139,100,40,0.5)",
                          }}
                        >
                          {entry.users?.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={entry.users.avatar_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            emoji
                          )}
                        </span>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Header row */}
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="font-cormorant italic text-base text-ink-sepia group-hover:text-amber transition-colors">
                              {entry.users?.display_name ||
                                entry.users?.username ||
                                "Anonymous"}
                            </span>
                            <span className="font-fell italic text-[0.75rem] text-ink-sepia opacity-70">
                              @{entry.users?.username}
                            </span>
                            <span className="font-fell italic text-[0.7rem] text-ink-sepia opacity-50">
                              ·
                            </span>
                            <span className="font-fell italic text-[0.75rem] text-ink-sepia opacity-80">
                              {entry.entry_type === "dream"
                                ? "🌙 dream"
                                : "☀️ daily"}
                            </span>
                            <span className="font-fell italic text-[0.7rem] text-ink-sepia opacity-50">
                              ·
                            </span>
                            <span className="font-fell italic text-[0.75rem] text-ink-sepia opacity-70">
                              {timeAgo(entry.created_at)}
                            </span>
                            {entry.mood_label && (
                              <>
                                <span className="font-fell italic text-[0.7rem] text-ink-sepia opacity-50">
                                  ·
                                </span>
                                <span className="font-fell italic text-[0.7rem] text-ink-sepia opacity-70">
                                  {entry.mood_label}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Preview text */}
                          <p className="font-cormorant italic text-[1rem] leading-[1.7] text-ink-sepia mb-3">
                            &ldquo;{preview}&rdquo;
                          </p>

                          {/* Footer */}
                          <div
                            className="flex items-center gap-4 mt-2 pt-2 border-t border-[rgba(139,100,40,0.2)]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {userId ? (
                              <StarButton
                                entryId={entry.id}
                                userId={userId}
                                initialStarCount={entry.star_count}
                                initialStarred={entry.user_starred}
                              />
                            ) : (
                              <span className="font-fell italic text-[0.7rem] text-ink-sepia opacity-70">
                                ★ {entry.star_count}
                              </span>
                            )}
                            <span className="font-fell italic text-[0.7rem] text-amber opacity-80">
                              {userId ? "tap to read full scroll →" : "sign up to read more →"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="entry-scroll-rod bottom" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
