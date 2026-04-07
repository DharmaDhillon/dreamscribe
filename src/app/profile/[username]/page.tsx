"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import ScrollContainer from "@/components/ScrollContainer";
import EntryCard from "@/components/EntryCard";
import FollowButton from "@/components/FollowButton";
import StarButton from "@/components/StarButton";
import JournalRecorder from "@/components/JournalRecorder";
import type { Database } from "@/lib/supabase";

type User = Database["public"]["Tables"]["users"]["Row"];
type Entry = Database["public"]["Tables"]["entries"]["Row"];

const ARCHETYPE_EMOJI: Record<string, string> = {
  "The Seeker": "🔍",
  "The Alchemist": "⚗️",
  "The Oracle": "🔮",
  "The Wanderer": "🌙",
  "The Healer": "🌿",
  "The Architect": "🏛️",
};

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams();
  const username = params.username as string;

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followStatus, setFollowStatus] = useState<"none" | "pending" | "approved" | "declined">("none");
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setCurrentUserId(user.id);

      // Fetch profile
      const { data: profileData } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .single();

      if (!profileData) { setLoading(false); return; }
      setProfile(profileData);

      // Fetch entries — all entries if own profile, only public if someone else's
      let entryQuery = supabase
        .from("entries")
        .select("*")
        .eq("user_id", profileData.id)
        .order("created_at", { ascending: false });

      if (user.id !== profileData.id) {
        entryQuery = entryQuery.eq("is_public", true);
      }
      // Always exclude entries with no transcript (failed/empty recordings)
      entryQuery = entryQuery.not("transcript", "is", null).neq("transcript", "");

      const { data: entryData } = await entryQuery;
      setEntries(entryData || []);

      // Follower/following counts
      const { count: followers } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", profileData.id)
        .eq("status", "approved");
      setFollowerCount(followers || 0);

      const { count: following } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", profileData.id)
        .eq("status", "approved");
      setFollowingCount(following || 0);

      // Follow status
      if (user.id !== profileData.id) {
        const { data: followData } = await supabase
          .from("follows")
          .select("status")
          .eq("follower_id", user.id)
          .eq("following_id", profileData.id)
          .single();
        setFollowStatus((followData?.status as "pending" | "approved" | "declined") || "none");
      }

      // User's stars
      const { data: stars } = await supabase
        .from("stars")
        .select("entry_id")
        .eq("user_id", user.id);
      setStarredIds(new Set((stars || []).map((s) => s.entry_id)));

      setLoading(false);

      // Scroll to entry if hash is present
      setTimeout(() => {
        if (typeof window !== "undefined" && window.location.hash) {
          const el = document.getElementById(window.location.hash.slice(1));
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
      }, 300);
    }

    load();
  }, [router, username]);

  if (loading) {
    return (
      <div className="pt-[200px] text-center">
        <div className="text-2xl mb-4" style={{ animation: "flame-flicker-icon 0.8s ease-in-out infinite" }}>🕯️</div>
        <p className="font-cormorant italic text-parchment-dark opacity-40">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="pt-[200px] text-center">
        <p className="font-cormorant italic text-lg text-parchment-dark opacity-50">This dreamer could not be found.</p>
      </div>
    );
  }

  const isOwnProfile = currentUserId === profile.id;
  const emoji = ARCHETYPE_EMOJI[profile.avatar_archetype || ""] || "🔍";

  return (
    <>
      <div className="pt-[130px] w-full flex flex-col items-center">
        <div style={{ opacity: 0, animation: "ember-in 2s ease forwards 0.3s" }}>
          <ScrollContainer className="mb-8">
            <div className="relative z-[2] text-center">
              {/* Avatar */}
              <div className="flex justify-center mb-4">
                <div
                  className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center"
                  style={{
                    background: profile.avatar_url
                      ? "transparent"
                      : "radial-gradient(circle at 35% 35%, rgba(201,124,42,0.3), rgba(61,32,16,0.5))",
                    border: "2px solid rgba(201,124,42,0.3)",
                  }}
                >
                  {profile.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">{emoji}</span>
                  )}
                </div>
              </div>

              {/* Name */}
              <h1
                className="font-pinyon text-[3rem] text-ink-sepia mb-1"
                style={{ textShadow: "none" }}
              >
                {profile.display_name || profile.username}
              </h1>
              <p className="font-fell italic text-[0.95rem] text-ink-sepia tracking-[0.1em] mb-5">
                @{profile.username} · {profile.avatar_archetype || "The Seeker"}
              </p>

              {/* Bio */}
              {profile.bio && (
                <p className="font-cormorant italic text-base text-ink-sepia max-w-sm mx-auto mb-6 leading-relaxed">
                  {profile.bio}
                </p>
              )}

              {/* Stats */}
              <div className="flex justify-center gap-10 mb-6">
                <div className="text-center">
                  <div className="font-cormorant text-3xl text-ink-sepia">{entries.length}</div>
                  <div className="font-fell italic text-[0.8rem] text-ink-sepia opacity-80 tracking-[0.1em] mt-1">scrolls</div>
                </div>
                <div className="text-center">
                  <div className="font-cormorant text-3xl text-ink-sepia">{followerCount}</div>
                  <div className="font-fell italic text-[0.8rem] text-ink-sepia opacity-80 tracking-[0.1em] mt-1">followers</div>
                </div>
                <div className="text-center">
                  <div className="font-cormorant text-3xl text-ink-sepia">{followingCount}</div>
                  <div className="font-fell italic text-[0.8rem] text-ink-sepia opacity-80 tracking-[0.1em] mt-1">following</div>
                </div>
              </div>

              {/* Follow / Edit button */}
              {!isOwnProfile && currentUserId && (
                <FollowButton
                  currentUserId={currentUserId}
                  targetUserId={profile.id}
                  initialStatus={followStatus}
                />
              )}
              {isOwnProfile && (
                <a
                  href="/profile/me"
                  className="font-fell italic text-[0.85rem] text-ink-sepia hover:text-amber transition-colors tracking-[0.1em]"
                  style={{ cursor: "none" }}
                >
                  Edit profile &rarr;
                </a>
              )}
            </div>
          </ScrollContainer>
        </div>
      </div>

      {/* Journal Recorder — only on own profile */}
      {isOwnProfile && currentUserId && (
        <div className="w-[min(720px,98vw)] mx-auto mb-10">
          <JournalRecorder
            userId={currentUserId}
            onEntrySaved={(entry) => setEntries((prev) => [entry, ...prev])}
          />
        </div>
      )}

      {/* Public entries */}
      {entries.length > 0 && (
        <div
          className="w-[min(720px,98vw)] mx-auto"
          style={{ opacity: 0, animation: "ember-in 1.5s ease forwards 0.8s" }}
        >
          <div className="text-center mb-6">
            <div className="flex items-center gap-4 justify-center mb-2">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[rgba(201,124,42,0.25)] to-transparent" />
              <div className="font-fell text-[0.6rem] tracking-[0.25em] text-amber opacity-50 uppercase">public scrolls</div>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[rgba(201,124,42,0.25)] to-transparent" />
            </div>
          </div>

          {entries.map((entry) => (
            <div key={entry.id} id={`entry-${entry.id}`} className="scroll-mt-32">
            <EntryCard
              dateLabel={`${entry.entry_type === "dream" ? "🌙 Dream" : "☀️ Daily"} · ${new Date(entry.created_at).toLocaleDateString()}`}
              moodLabel={entry.mood_label || "shared"}
              excerpt={entry.transcript ? `"${entry.transcript.substring(0, 200)}${entry.transcript.length > 200 ? "..." : ""}"` : `Audio · ${entry.duration_seconds || 0}s`}
              barsTitle={entry.entry_type === "dream" ? "✦ subconscious neural activation" : "✦ conscious neural activation"}
              bars={[
                { label: "Emotional Load", emoji: "💔", score: entry.amygdala_score ? Number(entry.amygdala_score) : 0, delay: "0.1s" },
                { label: "Self-Referential", emoji: "🔁", score: entry.dmn_score ? Number(entry.dmn_score) : 0, delay: "0.3s" },
                { label: "Internal Conflict", emoji: "⚡", score: entry.acc_score ? Number(entry.acc_score) : 0, delay: "0.5s" },
                { label: "Rational Processing", emoji: "🧠", score: entry.dlpfc_score ? Number(entry.dlpfc_score) : 0, delay: "0.7s" },
              ]}
              neuralScores={{ amygdala_score: entry.amygdala_score, dmn_score: entry.dmn_score, dlpfc_score: entry.dlpfc_score, stg_score: entry.stg_score, acc_score: entry.acc_score, fatigue_score: entry.fatigue_score }}
              peakMoments={{ peak_moment_time: entry.peak_moment_time, peak_moment_quote: entry.peak_moment_quote, calm_moment_time: entry.calm_moment_time, calm_moment_quote: entry.calm_moment_quote }}
              insightLabel="✦ what the flame heard"
              insightText={entry.claude_insight || ""}
              footer={
                currentUserId ? (
                  <StarButton entryId={entry.id} userId={currentUserId} initialStarCount={entry.star_count} initialStarred={starredIds.has(entry.id)} />
                ) : `✦ ${entry.star_count} stars`
              }
            />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
