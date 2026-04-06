"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import ScrollContainer from "@/components/ScrollContainer";
import type { Database } from "@/lib/supabase";

type Entry = Database["public"]["Tables"]["entries"]["Row"];

interface EmberInsight {
  id: string;
  scope: string;
  insight_type: string;
  title: string;
  body: string;
  data: { severity?: string; entry_count?: number; user_count?: number };
  created_at: string;
}

interface WeeklyMood {
  day: string;
  emotional: number;
  rational: number;
  count: number;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const SEVERITY_COLOR: Record<string, string> = {
  high: "#e8503a",
  medium: "#c97c2a",
  low: "#6b9e6b",
};

const TYPE_ICON: Record<string, string> = {
  emotional_trend: "💔",
  recurring_theme: "🔁",
  dream_pattern: "🌙",
  cross_pattern: "⚡",
  growth: "🌿",
  warning: "🔥",
  collective_dream: "🌙",
  emotional_wave: "🌊",
  trending_symbol: "✦",
  community_shift: "🔥",
};

export default function PatternsPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [weeklyMoods, setWeeklyMoods] = useState<WeeklyMood[]>([]);
  const [personalInsights, setPersonalInsights] = useState<EmberInsight[]>([]);
  const [globalInsights, setGlobalInsights] = useState<EmberInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStars, setTotalStars] = useState(0);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      // Fetch entries
      const { data: allEntries } = await supabase
        .from("entries")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const entries = allEntries || [];
      setEntries(entries);
      setTotalStars(entries.reduce((sum, e) => sum + (e.star_count || 0), 0));

      // Weekly mood chart
      const now = new Date();
      const weekData: WeeklyMood[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const dayEntries = entries.filter((e) => e.created_at.startsWith(dateStr));
        weekData.push({
          day: DAYS[date.getDay()],
          emotional: dayEntries.length > 0
            ? Math.round(dayEntries.reduce((s, e) => s + Number(e.amygdala_score || 0), 0) / dayEntries.length)
            : 0,
          rational: dayEntries.length > 0
            ? Math.round(dayEntries.reduce((s, e) => s + Number(e.dlpfc_score || 0), 0) / dayEntries.length)
            : 0,
          count: dayEntries.length,
        });
      }
      setWeeklyMoods(weekData);

      // Fetch Ember insights
      try {
        const res = await fetch("/api/ember");
        if (res.ok) {
          const data = await res.json();
          setPersonalInsights(data.personal || []);
          setGlobalInsights(data.global || []);
        }
      } catch {
        // Ember not available yet
      }

      setLoading(false);
    }

    load();
  }, [router]);

  if (loading) {
    return (
      <div className="pt-[200px] text-center">
        <div className="text-2xl mb-4" style={{ animation: "flame-flicker-icon 0.8s ease-in-out infinite" }}>🕯️</div>
        <p className="font-cormorant italic text-parchment-dark opacity-40">Ember is reading your patterns...</p>
      </div>
    );
  }

  const dreamCount = entries.filter((e) => e.entry_type === "dream").length;
  const dailyCount = entries.filter((e) => e.entry_type === "daily").length;

  return (
    <>
      <section className="pt-[130px] text-center max-w-[700px] mb-8 mx-auto">
        <h1
          className="font-pinyon text-[clamp(3rem,8vw,4.5rem)] text-amber-pale leading-[0.85] mb-2"
          style={{
            textShadow: "0 0 30px rgba(232,168,74,0.5)",
            opacity: 0,
            animation: "ember-in 2s ease forwards 0.3s",
          }}
        >
          Ember
        </h1>
        <p
          className="font-cormorant italic text-lg text-candle-white mb-1"
          style={{ opacity: 0, animation: "ember-in 1.5s ease forwards 0.5s" }}
        >
          Your pattern-watching AI
        </p>
        <p
          className="font-fell italic text-[0.75rem] text-amber tracking-[0.15em]"
          style={{ opacity: 0, animation: "ember-in 1.5s ease forwards 0.7s" }}
        >
          always watching · always remembering
        </p>
      </section>

      {/* Stats */}
      <div
        className="flex justify-center gap-6 mb-8"
        style={{ opacity: 0, animation: "ember-in 1.5s ease forwards 0.8s" }}
      >
        {[
          { value: entries.length, label: "entries" },
          { value: dreamCount, label: "dreams" },
          { value: dailyCount, label: "daily" },
          { value: totalStars, label: "stars" },
        ].map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="font-cormorant text-3xl text-candle-white">{stat.value}</div>
            <div className="font-fell italic text-[0.7rem] text-amber opacity-70 tracking-[0.1em] mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Weekly chart */}
      <div style={{ opacity: 0, animation: "ember-in 1.5s ease forwards 1s" }}>
        <ScrollContainer className="mb-8 w-[min(700px,98vw)] mx-auto">
          <div className="relative z-[2]">
            <div className="font-fell italic text-[0.8rem] tracking-[0.2em] text-ink-sepia uppercase mb-4">
              ✦ this week · brain activation
            </div>
            <div className="flex items-end justify-between gap-2 h-[100px] mb-2">
              {weeklyMoods.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  {day.count > 0 ? (
                    <>
                      <div
                        className="w-full max-w-[20px] rounded-sm"
                        style={{
                          height: `${Math.max(4, day.emotional)}%`,
                          background: day.emotional >= 60 ? "rgba(232,80,58,0.5)" : "rgba(201,124,42,0.4)",
                        }}
                      />
                      <div
                        className="w-full max-w-[20px] rounded-sm"
                        style={{ height: `${Math.max(4, day.rational)}%`, background: "rgba(107,158,107,0.4)" }}
                      />
                    </>
                  ) : (
                    <div className="w-full max-w-[20px] h-1 rounded-sm bg-[rgba(212,188,138,0.1)]" />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between gap-2">
              {weeklyMoods.map((day, i) => (
                <div key={i} className="flex-1 text-center">
                  <span className="font-fell italic text-[0.75rem] text-ink-sepia opacity-80">{day.day}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-6 mt-4 justify-center">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(201,124,42,0.7)" }} />
                <span className="font-fell italic text-[0.7rem] text-ink-sepia opacity-80">emotional</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(107,158,107,0.7)" }} />
                <span className="font-fell italic text-[0.7rem] text-ink-sepia opacity-80">rational</span>
              </div>
            </div>
          </div>
        </ScrollContainer>
      </div>

      {/* Ember's Personal Insights */}
      {personalInsights.length > 0 && (
        <div
          className="w-[min(700px,98vw)] mx-auto mb-10"
          style={{ opacity: 0, animation: "ember-in 1.5s ease forwards 1.2s" }}
        >
          <div className="flex items-center gap-3 mb-5">
            <span className="text-2xl">🔥</span>
            <span className="font-cormorant text-xl text-amber-pale">
              What Ember sees in your entries
            </span>
          </div>

          <div className="space-y-4">
            {personalInsights.map((insight) => (
              <div
                key={insight.id}
                className="px-6 py-5"
                style={{
                  background: "rgba(15,9,4,0.85)",
                  border: "1px solid rgba(201,124,42,0.25)",
                  borderLeft: `4px solid ${SEVERITY_COLOR[insight.data?.severity || "low"]}`,
                  backdropFilter: "blur(8px)",
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xl">{TYPE_ICON[insight.insight_type] || "✦"}</span>
                  <span className="font-cormorant text-lg text-candle-white">
                    {insight.title}
                  </span>
                  <span className="font-fell italic text-[0.6rem] text-amber opacity-60 ml-auto tracking-[0.05em]">
                    {insight.insight_type.replace("_", " ")}
                  </span>
                </div>
                <p className="font-cormorant text-[1rem] leading-[1.8] text-parchment">
                  {insight.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {personalInsights.length === 0 && entries.length >= 2 && (
        <div className="text-center py-6 mb-8">
          <p className="font-cormorant italic text-base text-parchment-dark opacity-40">
            Ember is still analyzing your entries. Record another scribe and check back.
          </p>
        </div>
      )}

      {personalInsights.length === 0 && entries.length < 2 && (
        <div className="text-center py-6 mb-8">
          <p className="font-cormorant italic text-base text-parchment-dark opacity-40">
            Ember needs at least 2 entries to start finding patterns. Keep speaking.
          </p>
        </div>
      )}

      {/* Ember's Global Insights */}
      {globalInsights.length > 0 && (
        <div
          className="w-[min(700px,98vw)] mx-auto mb-10"
          style={{ opacity: 0, animation: "ember-in 1.5s ease forwards 1.5s" }}
        >
          <div className="flex items-center gap-3 mb-5">
            <span className="text-2xl">🌍</span>
            <span className="font-cormorant text-xl text-amber-pale">
              What Ember sees across all dreamers
            </span>
          </div>

          <div className="space-y-4">
            {globalInsights.map((insight) => (
              <div
                key={insight.id}
                className="px-6 py-5"
                style={{
                  background: "rgba(15,9,4,0.85)",
                  border: "1px solid rgba(201,124,42,0.25)",
                  borderLeft: "4px solid rgba(201,124,42,0.6)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xl">{TYPE_ICON[insight.insight_type] || "🌍"}</span>
                  <span className="font-cormorant text-lg text-candle-white">
                    {insight.title}
                  </span>
                </div>
                <p className="font-cormorant text-[1rem] leading-[1.8] text-parchment">
                  {insight.body}
                </p>
                {insight.data?.entry_count && (
                  <span className="font-fell italic text-[0.65rem] text-amber opacity-50 mt-3 block tracking-[0.05em]">
                    based on {insight.data.entry_count} entries from {insight.data.user_count || "?"} dreamers
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
