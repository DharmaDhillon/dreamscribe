"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import ScrollContainer from "@/components/ScrollContainer";

export default function TherapistLoginPage() {
  return (
    <Suspense>
      <TherapistLoginForm />
    </Suspense>
  );
}

function TherapistLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (!authData.user) {
      setError("Authentication failed.");
      setLoading(false);
      return;
    }

    // Verify therapist role and approval
    const { data: profile } = await supabase
      .from("users")
      .select("role, is_therapist_verified")
      .eq("id", authData.user.id)
      .single();

    if (!profile || profile.role !== "therapist") {
      setError(
        "This portal is for licensed therapists only. If you are a journaler, please use the main login."
      );
      setLoading(false);
      return;
    }

    if (!profile.is_therapist_verified) {
      setError(
        "Your therapist account is pending approval. You will receive an email once your license has been verified."
      );
      setLoading(false);
      return;
    }

    router.push("/therapist/dashboard");
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
                className="font-pinyon text-[2.8rem] text-amber-pale mb-3"
                style={{
                  textShadow:
                    "0 0 20px rgba(232,168,74,0.4), 0 0 40px rgba(201,124,42,0.2)",
                }}
              >
                Therapist &amp; Counselor Portal
              </h1>
              <p className="font-cormorant italic text-sm text-ink-sepia opacity-45 max-w-xs mx-auto leading-relaxed">
                This portal is for licensed mental health professionals only.
                Access is reviewed manually.
              </p>
            </div>

            {urlError === "not_approved" && (
              <p className="font-cormorant italic text-sm text-[#8b1a1a] opacity-70 text-center mb-4">
                Your account has not been approved yet or you do not have
                therapist access.
              </p>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="max-w-sm mx-auto">
              <div className="mb-6">
                <label className="font-fell italic text-[0.7rem] text-ink-sepia opacity-50 tracking-[0.1em] block mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="doctor@practice.com"
                  style={{ cursor: "none" }}
                />
              </div>

              <div className="mb-8">
                <label className="font-fell italic text-[0.7rem] text-ink-sepia opacity-50 tracking-[0.1em] block mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="••••••••"
                  style={{ cursor: "none" }}
                />
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
                {loading ? "Verifying credentials..." : "Enter Clinical Portal"}
              </button>
            </form>

            {/* Links */}
            <div className="text-center mt-8 space-y-3">
              <div>
                <Link
                  href="/signup"
                  className="font-cormorant italic text-sm text-ink-sepia opacity-50 hover:opacity-80 transition-opacity"
                  style={{ cursor: "none" }}
                >
                  Apply for Therapist Access &rarr;
                </Link>
              </div>
              <div>
                <Link
                  href="/login"
                  className="font-fell italic text-[0.65rem] text-ink-sepia opacity-35 hover:opacity-60 tracking-[0.1em] transition-opacity"
                  style={{ cursor: "none" }}
                >
                  I am a Journaler, take me to main login &rarr;
                </Link>
              </div>
            </div>
          </div>
        </ScrollContainer>
      </div>
    </div>
  );
}
