"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import ScrollContainer from "@/components/ScrollContainer";

const archetypes = [
  { name: "The Seeker", emoji: "🔍" },
  { name: "The Alchemist", emoji: "⚗️" },
  { name: "The Oracle", emoji: "🔮" },
  { name: "The Wanderer", emoji: "🌙" },
  { name: "The Healer", emoji: "🌿" },
  { name: "The Architect", emoji: "🏛️" },
];

export default function SignupPage() {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [archetype, setArchetype] = useState("The Seeker");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();

    // Check username uniqueness
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("username", username.toLowerCase())
      .single();

    if (existing) {
      setError("That username is already taken. Choose another.");
      setLoading(false);
      return;
    }

    // Sign up with Supabase Auth — pass metadata for the DB trigger
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.toLowerCase(),
          display_name: displayName || username,
          avatar_archetype: archetype,
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (!authData.user) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    // Try to update the auto-created profile with full details
    // (the DB trigger creates a basic row, we enrich it here)
    const { error: profileError } = await supabase.from("users").upsert({
      id: authData.user.id,
      email,
      username: username.toLowerCase(),
      display_name: displayName || username,
      avatar_archetype: archetype,
      role: "user",
      is_therapist_verified: false,
    });

    if (profileError) {
      // Non-fatal — the trigger already created a basic row
      console.warn("Profile upsert warning:", profileError.message);
    }

    router.push("/feed");
    router.refresh();
  };

  const inputClass =
    "w-full bg-[#e8d8a8] border border-[rgba(139,100,40,0.3)] rounded-none px-4 py-3 font-fell text-ink-sepia text-sm outline-none focus:border-amber transition-colors placeholder:text-parchment-aged placeholder:opacity-50";

  return (
    <div className="pt-[130px] w-full flex flex-col items-center">
      <div style={{ opacity: 0, animation: "ember-in 2s ease forwards 0.3s" }}>
        <ScrollContainer className="mb-8">
          <div className="relative z-[2]">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex items-center gap-3 justify-center mb-4">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-parchment-aged to-transparent opacity-50" />
                <span className="font-cormorant text-parchment-aged text-sm opacity-60">
                  ✦ ❧ ✦
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-parchment-aged to-transparent opacity-50" />
              </div>
              <h1
                className="font-pinyon text-[3rem] text-amber-pale mb-3"
                style={{
                  textShadow:
                    "0 0 20px rgba(232,168,74,0.4), 0 0 40px rgba(201,124,42,0.2)",
                }}
              >
                Begin Your First Scroll
              </h1>
              <p className="font-cormorant italic text-base text-ink-sepia opacity-50">
                Every journal begins with a single flame
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="max-w-sm mx-auto">
              <div className="mb-5">
                <label className="font-fell italic text-[0.7rem] text-ink-sepia opacity-50 tracking-[0.1em] block mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="dharma"
                  pattern="[a-zA-Z0-9_]+"
                  title="Letters, numbers, and underscores only"
                  style={{ cursor: "none" }}
                />
              </div>

              <div className="mb-5">
                <label className="font-fell italic text-[0.7rem] text-ink-sepia opacity-50 tracking-[0.1em] block mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={inputClass}
                  placeholder="Dharma D."
                  style={{ cursor: "none" }}
                />
              </div>

              <div className="mb-5">
                <label className="font-fell italic text-[0.7rem] text-ink-sepia opacity-50 tracking-[0.1em] block mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="dharma@dreamscribe.com"
                  style={{ cursor: "none" }}
                />
              </div>

              <div className="mb-6">
                <label className="font-fell italic text-[0.7rem] text-ink-sepia opacity-50 tracking-[0.1em] block mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className={inputClass}
                  placeholder="••••••••"
                  style={{ cursor: "none" }}
                />
              </div>

              {/* Archetype selector */}
              <div className="mb-8">
                <label className="font-fell italic text-[0.7rem] text-ink-sepia opacity-50 tracking-[0.1em] block mb-3">
                  Choose Your Archetype
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {archetypes.map((a) => (
                    <button
                      key={a.name}
                      type="button"
                      onClick={() => setArchetype(a.name)}
                      className={`py-3 px-2 border transition-all duration-300 text-center ${
                        archetype === a.name
                          ? "border-amber bg-[rgba(201,124,42,0.15)] shadow-[0_0_12px_rgba(201,124,42,0.2)]"
                          : "border-[rgba(139,100,40,0.2)] bg-[rgba(232,216,168,0.3)] hover:border-[rgba(139,100,40,0.4)]"
                      }`}
                      style={{ cursor: "none" }}
                    >
                      <div className="text-xl mb-1">{a.emoji}</div>
                      <div className="font-fell italic text-[0.6rem] text-ink-sepia opacity-60 tracking-[0.05em]">
                        {a.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="font-cormorant italic text-sm text-[#8b1a1a] opacity-80 text-center mb-4">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-sm font-pinyon text-xl text-[rgba(255,220,180,0.9)] transition-all duration-300 hover:scale-[1.02] disabled:opacity-50"
                style={{
                  background:
                    "radial-gradient(circle at 35% 35%, #c0302a, #8b1a1a, #5a0f0f)",
                  boxShadow:
                    "0 4px 12px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,100,80,0.2), 0 0 20px rgba(139,26,26,0.3)",
                  cursor: "none",
                  textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                }}
              >
                {loading ? "Sealing your story..." : "Seal My Story"}
              </button>
            </form>

            {/* Link */}
            <div className="text-center mt-6">
              <Link
                href="/login"
                className="font-cormorant italic text-sm text-ink-sepia opacity-50 hover:opacity-80 transition-opacity"
                style={{ cursor: "none" }}
              >
                Already have a scroll? Return to the scriptorium &rarr;
              </Link>
            </div>
          </div>
        </ScrollContainer>
      </div>
    </div>
  );
}
