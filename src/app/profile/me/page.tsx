"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import ScrollContainer from "@/components/ScrollContainer";
import type { Database } from "@/lib/supabase";

type User = Database["public"]["Tables"]["users"]["Row"];
type Entry = Database["public"]["Tables"]["entries"]["Row"];

const ARCHETYPES = [
  { name: "The Seeker", emoji: "🔍" },
  { name: "The Alchemist", emoji: "⚗️" },
  { name: "The Oracle", emoji: "🔮" },
  { name: "The Wanderer", emoji: "🌙" },
  { name: "The Healer", emoji: "🌿" },
  { name: "The Architect", emoji: "🏛️" },
];

export default function MyProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<User | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [bio, setBio] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [archetype, setArchetype] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: p } = await supabase.from("users").select("*").eq("id", user.id).single();
      if (p) {
        setProfile(p);
        setBio(p.bio || "");
        setDisplayName(p.display_name || "");
        setArchetype(p.avatar_archetype || "The Seeker");
        setAvatarUrl(p.avatar_url || null);
      }

      const { data: e } = await supabase
        .from("entries")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setEntries(e || []);
    }
    load();
  }, [router]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    // Validate file
    if (!file.type.startsWith("image/")) return;
    if (file.size > 2 * 1024 * 1024) return; // 2MB max

    setUploadingAvatar(true);
    const supabase = createClient();

    const ext = file.name.split(".").pop() || "jpg";
    const filePath = `${profile.id}/avatar.${ext}`;

    // Delete old avatar if exists
    await supabase.storage.from("avatars").remove([filePath]);

    // Upload new
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      console.error("Avatar upload failed:", uploadError);
      setUploadingAvatar(false);
      return;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    // Update user record
    await supabase
      .from("users")
      .update({ avatar_url: publicUrl })
      .eq("id", profile.id);

    setAvatarUrl(publicUrl + "?t=" + Date.now()); // cache bust
    setUploadingAvatar(false);
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("users").update({
      bio,
      display_name: displayName,
      avatar_archetype: archetype,
    }).eq("id", profile.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const togglePublic = async (entryId: string, currentPublic: boolean) => {
    const supabase = createClient();
    await supabase.from("entries").update({ is_public: !currentPublic }).eq("id", entryId);
    setEntries((prev) =>
      prev.map((e) => (e.id === entryId ? { ...e, is_public: !currentPublic } : e))
    );
  };

  if (!profile) {
    return (
      <div className="pt-[200px] text-center">
        <div className="text-2xl mb-4" style={{ animation: "flame-flicker-icon 0.8s ease-in-out infinite" }}>🕯️</div>
      </div>
    );
  }

  const inputClass = "w-full bg-[#e8d8a8] border border-[rgba(139,100,40,0.3)] rounded-none px-4 py-3 font-fell text-ink-sepia text-sm outline-none focus:border-amber transition-colors";

  return (
    <>
      <div className="pt-[130px] w-full flex flex-col items-center">
        <div style={{ opacity: 0, animation: "ember-in 2s ease forwards 0.3s" }}>
          <ScrollContainer className="mb-8">
            <div className="relative z-[2]">
              <div className="text-center mb-6">
                <div className="flex items-center gap-3 justify-center mb-4">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-parchment-aged to-transparent opacity-50" />
                  <span className="font-cormorant text-parchment-aged text-sm opacity-60">✦ ❧ ✦</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-parchment-aged to-transparent opacity-50" />
                </div>

                {/* Avatar upload */}
                <div className="flex justify-center mb-4">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="relative group"
                    style={{ cursor: "none" }}
                    disabled={uploadingAvatar}
                  >
                    <div
                      className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(201,124,42,0.3)]"
                      style={{
                        background: avatarUrl
                          ? "transparent"
                          : "radial-gradient(circle at 35% 35%, rgba(201,124,42,0.3), rgba(61,32,16,0.5))",
                        border: "2px solid rgba(201,124,42,0.3)",
                      }}
                    >
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatarUrl}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-3xl">
                          {ARCHETYPES.find((a) => a.name === archetype)?.emoji || "🔍"}
                        </span>
                      )}
                    </div>
                    {/* Hover overlay */}
                    <div className="absolute inset-0 rounded-full flex items-center justify-center bg-[rgba(10,7,5,0.6)] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <span className="font-fell italic text-[0.6rem] text-parchment opacity-80 tracking-[0.05em]">
                        {uploadingAvatar ? "uploading..." : "change"}
                      </span>
                    </div>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>

                <h1 className="font-pinyon text-[2.8rem] text-amber-pale mb-2" style={{ textShadow: "0 0 20px rgba(232,168,74,0.4)" }}>
                  Your Scroll
                </h1>
                <p className="font-fell italic text-[0.7rem] text-ink-sepia opacity-40">@{profile.username}</p>
              </div>

              <div className="max-w-sm mx-auto">
                <div className="mb-5">
                  <label className="font-fell italic text-[0.7rem] text-ink-sepia opacity-50 tracking-[0.1em] block mb-2">Display Name</label>
                  <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputClass} style={{ cursor: "none" }} />
                </div>

                <div className="mb-5">
                  <label className="font-fell italic text-[0.7rem] text-ink-sepia opacity-50 tracking-[0.1em] block mb-2">Bio</label>
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className={`${inputClass} resize-none`} placeholder="Tell your story..." style={{ cursor: "none" }} />
                </div>

                <div className="mb-6">
                  <label className="font-fell italic text-[0.7rem] text-ink-sepia opacity-50 tracking-[0.1em] block mb-3">Archetype</label>
                  <div className="grid grid-cols-3 gap-2">
                    {ARCHETYPES.map((a) => (
                      <button
                        key={a.name}
                        type="button"
                        onClick={() => setArchetype(a.name)}
                        className={`py-3 px-2 border transition-all duration-300 text-center ${
                          archetype === a.name
                            ? "border-amber bg-[rgba(201,124,42,0.15)] shadow-[0_0_12px_rgba(201,124,42,0.2)]"
                            : "border-[rgba(139,100,40,0.2)] bg-[rgba(232,216,168,0.3)]"
                        }`}
                        style={{ cursor: "none" }}
                      >
                        <div className="text-xl mb-1">{a.emoji}</div>
                        <div className="font-fell italic text-[0.6rem] text-ink-sepia opacity-60">{a.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full py-3 font-pinyon text-lg text-[rgba(255,220,180,0.9)] transition-all duration-300 hover:scale-[1.02] disabled:opacity-50"
                  style={{
                    background: "radial-gradient(circle at 35% 35%, #c0302a, #8b1a1a, #5a0f0f)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.5), 0 0 20px rgba(139,26,26,0.3)",
                    cursor: "none",
                    textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                  }}
                >
                  {saving ? "Sealing..." : saved ? "Sealed ✦" : "Seal Changes"}
                </button>
              </div>
            </div>
          </ScrollContainer>
        </div>
      </div>

      {/* All entries with privacy toggle */}
      {entries.length > 0 && (
        <div className="w-[min(720px,98vw)] mx-auto mt-8" style={{ opacity: 0, animation: "ember-in 1.5s ease forwards 0.8s" }}>
          <div className="text-center mb-6">
            <div className="font-fell text-[0.6rem] tracking-[0.25em] text-amber opacity-50 uppercase mb-2">your scrolls</div>
            <div className="font-pinyon text-[2rem] text-amber-pale opacity-90" style={{ textShadow: "0 0 15px rgba(232,168,74,0.3)" }}>
              All Entries ({entries.length})
            </div>
          </div>

          {entries.map((entry) => (
            <div key={entry.id} className="relative">
              <button
                onClick={() => togglePublic(entry.id, entry.is_public)}
                className="absolute top-5 right-8 z-10 font-fell italic text-[0.6rem] tracking-[0.1em] px-3 py-1 transition-all duration-300 border"
                style={{
                  cursor: "none",
                  background: entry.is_public ? "rgba(201,124,42,0.1)" : "rgba(44,24,16,0.05)",
                  borderColor: entry.is_public ? "rgba(201,124,42,0.3)" : "rgba(139,100,40,0.2)",
                  color: "rgba(44,24,16,0.6)",
                }}
              >
                {entry.is_public ? "🔓 public" : "🔒 private"}
              </button>

              <div className="entry-scroll relative mb-4 cursor-none">
                <div className="entry-scroll-rod" />
                <div className="entry-scroll-body">
                  <div className="flex items-center gap-3 mb-2 relative z-[2]">
                    <span className="font-fell italic text-[0.7rem] text-ink-sepia opacity-55 tracking-[0.1em]">
                      {entry.entry_type === "dream" ? "🌙 Dream" : "☀️ Daily"} · {new Date(entry.created_at).toLocaleDateString()}
                    </span>
                    {entry.mood_label && (
                      <span className="font-fell italic text-[0.6rem] text-ink-sepia opacity-35">{entry.mood_label}</span>
                    )}
                  </div>
                  <p className="font-pinyon text-[1.4rem] text-ink-sepia leading-[1.8] relative z-[2]">
                    {entry.transcript ? `"${entry.transcript.substring(0, 150)}${entry.transcript.length > 150 ? "..." : ""}"` : `Audio · ${entry.duration_seconds || 0}s`}
                  </p>
                  {entry.claude_insight && (
                    <div className="mt-3 pt-3 border-t border-[rgba(139,100,40,0.15)] relative z-[2]">
                      <p className="font-cormorant italic text-[0.82rem] leading-[1.7] text-ink-sepia opacity-60">
                        {entry.claude_insight.substring(0, 120)}...
                      </p>
                    </div>
                  )}
                  <div className="mt-2 font-fell italic text-[0.6rem] text-ink-sepia opacity-30 relative z-[2]">
                    ✦ {entry.star_count} stars · {entry.duration_seconds || 0}s
                  </div>
                </div>
                <div className="entry-scroll-rod bottom" />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
