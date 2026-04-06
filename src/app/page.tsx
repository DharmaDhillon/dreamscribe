"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });
  }, []);

  return (
    <>
      {/* Hero */}
      <section className="pt-[130px] text-center max-w-[95vw] mb-16 mx-auto">
        <span
          className="font-fell italic text-[0.7rem] tracking-[0.3em] text-amber block mb-5"
          style={{ opacity: 0, animation: "ember-in 1.5s ease forwards 0.3s" }}
        >
          dream journal &middot; daily journal &middot; neural analysis &middot;
          powered by TRIBE v2
        </span>
        <h1
          className="font-pinyon text-[clamp(4rem,12vw,8rem)] text-amber-pale leading-[0.85] mb-[0.3em]"
          style={{
            textShadow:
              "0 0 30px rgba(232,168,74,0.5), 0 0 60px rgba(201,124,42,0.3), 0 0 100px rgba(180,80,10,0.2)",
            opacity: 0,
            animation: "ember-in 2s ease forwards 0.6s",
          }}
        >
          DreamScribe
        </h1>
        <p
          className="font-cormorant italic text-[clamp(1rem,2.5vw,1.35rem)] text-parchment-dark leading-[1.8] max-w-[480px] mx-auto mb-10"
          style={{ opacity: 0, animation: "ember-in 1.5s ease forwards 1.1s" }}
        >
          Your dreams and your days, read by the light of a single flame. Speak.
          Your neurons remember everything.
        </p>

        {/* CTA */}
        <div
          className="flex flex-col items-center gap-4"
          style={{ opacity: 0, animation: "ember-in 1.5s ease forwards 1.4s" }}
        >
          {isLoggedIn ? (
            <>
              <Link
                href="/feed"
                className="no-underline font-pinyon text-xl px-10 py-4 text-[rgba(255,220,180,0.9)] transition-all duration-300 hover:scale-105"
                style={{
                  background: "radial-gradient(circle at 35% 35%, #c0302a, #8b1a1a, #5a0f0f)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,100,80,0.2), 0 0 20px rgba(139,26,26,0.3)",
                  textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                }}
              >
                Enter The Bonfire
              </Link>
              <Link
                href="/journal"
                className="no-underline font-cormorant italic text-sm text-parchment-dark opacity-50 hover:opacity-80 transition-opacity"
              >
                or speak a new scribe &rarr;
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/signup"
                className="no-underline font-pinyon text-xl px-10 py-4 text-[rgba(255,220,180,0.9)] transition-all duration-300 hover:scale-105"
                style={{
                  background: "radial-gradient(circle at 35% 35%, #c0302a, #8b1a1a, #5a0f0f)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,100,80,0.2), 0 0 20px rgba(139,26,26,0.3)",
                  textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                }}
              >
                Begin Your First Scroll
              </Link>
              <Link
                href="/login"
                className="no-underline font-cormorant italic text-sm text-parchment-dark opacity-50 hover:opacity-80 transition-opacity"
              >
                Already a Dreamer? Return to the scriptorium &rarr;
              </Link>
            </>
          )}
        </div>
      </section>

      {/* How it works */}
      <section
        className="max-w-[500px] mx-auto mb-20 px-6 py-8 relative z-[10]"
        style={{
          opacity: 0,
          animation: "ember-in 1.5s ease forwards 1.8s",
          background: "rgba(15,9,4,0.6)",
          border: "1px solid rgba(139,100,40,0.12)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div className="text-center mb-8">
          <div className="flex items-center gap-4 justify-center mb-2">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[rgba(201,124,42,0.25)] to-transparent" />
            <div className="font-fell text-[0.55rem] tracking-[0.25em] text-parchment opacity-60 uppercase">
              how it works
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[rgba(201,124,42,0.25)] to-transparent" />
          </div>
        </div>

        <div className="space-y-8">
          {[
            {
              icon: "🕯️",
              title: "Speak into the flame",
              desc: "Record your dream or daily journal entry by voice. Say what you saw, felt, and carried.",
            },
            {
              icon: "🧠",
              title: "Your brain tells the truth",
              desc: "TRIBE v2 maps your neural activation across 20,484 cortical points. Whisper transcribes your words.",
            },
            {
              icon: "✦",
              title: "Claude writes your insight",
              desc: "AI reads what your neurons revealed and writes a personalized insight — naming what you couldn't.",
            },
            {
              icon: "🔥",
              title: "Share on The Bonfire",
              desc: "Make entries public. Star others. Comment. Follow dreamers. See patterns across your mind over time.",
            },
          ].map((step, i) => (
            <div key={i} className="flex gap-4 items-start">
              <span className="text-xl mt-0.5 shrink-0">{step.icon}</span>
              <div>
                <h3 className="font-cormorant italic text-base text-candle-white opacity-90 mb-1">
                  {step.title}
                </h3>
                <p className="font-cormorant italic text-[0.85rem] leading-[1.6] text-parchment opacity-70">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
