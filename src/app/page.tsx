"use client";

import Link from "next/link";
import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { createClient } from "@/lib/supabase";
import ScrollContainer from "@/components/ScrollContainer";
import QuillSvg from "@/components/QuillSvg";

const FULL_TITLE = "DreamScribe";
const TYPING_SPEED = 180;

// Custom hook — fires once when an element scrolls into view
function useInView<T extends HTMLElement>(rootMargin = "0px 0px -120px 0px") {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.15, rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return [ref, inView] as const;
}

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [typedTitle, setTypedTitle] = useState("");
  const [isWriting, setIsWriting] = useState(false);
  const [quillX, setQuillX] = useState(0);
  const [showQuill, setShowQuill] = useState(false);
  const titleRef = useRef<HTMLSpanElement>(null);
  const titleContainerRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);

  // IntersectionObserver refs for each scroll
  const [heroRef, heroInView] = useInView<HTMLDivElement>("0px 0px -50px 0px");
  const [howItWorksRef, howItWorksInView] = useInView<HTMLDivElement>(
    "0px 0px -100px 0px"
  );

  useEffect(() => {
    mounted.current = true;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });
    return () => {
      mounted.current = false;
    };
  }, []);

  // Start typing the title when hero is in view (after scroll unfurl + brief delay)
  useEffect(() => {
    if (!heroInView) return;
    let i = 0;
    const startTimer = setTimeout(() => {
      setShowQuill(true);
      setIsWriting(true);
      const tick = () => {
        if (!mounted.current) return;
        if (i < FULL_TITLE.length) {
          i++;
          setTypedTitle(FULL_TITLE.substring(0, i));
          setTimeout(tick, TYPING_SPEED + Math.random() * 100);
        } else {
          setTimeout(() => {
            if (!mounted.current) return;
            setIsWriting(false);
            setTimeout(() => mounted.current && setShowQuill(false), 1200);
          }, 600);
        }
      };
      tick();
    }, 1400);
    return () => clearTimeout(startTimer);
  }, [heroInView]);

  // Track right-edge of typed text to position the quill nib
  useLayoutEffect(() => {
    if (titleRef.current && titleContainerRef.current) {
      const titleRect = titleRef.current.getBoundingClientRect();
      const containerRect = titleContainerRef.current.getBoundingClientRect();
      setQuillX(titleRect.right - containerRect.left);
    }
  }, [typedTitle]);

  return (
    <div className="pt-[90px] pb-20 w-full flex flex-col items-center">
      {/* SCROLL 1 — HERO */}
      <section className="w-full mx-auto relative z-[10] mb-32">
        <div ref={heroRef} className={`scroll-unroll ${heroInView ? "in-view" : ""}`}>
          <ScrollContainer>
            <div className="relative z-[2] scroll-unroll-content">
              {/* Ornament */}
              <div className="text-center mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-parchment-aged to-transparent opacity-60" />
                  <span className="font-cormorant italic text-parchment-aged text-base">
                    ✦ ❧ ✦
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-parchment-aged to-transparent opacity-60" />
                </div>
              </div>

              {/* Hero */}
              <div className="text-center mb-8">
                <span className="font-fell italic text-[0.75rem] tracking-[0.3em] text-ink-sepia opacity-70 block mb-3">
                  dream journal &middot; daily journal &middot; neural analysis
                  &middot; powered by TRIBE v2
                </span>
                <div
                  ref={titleContainerRef}
                  className="relative inline-block mb-3"
                  style={{ minHeight: "1em" }}
                >
                  <h1 className="font-pinyon text-[clamp(3.5rem,10vw,6.5rem)] text-ink-sepia leading-[0.9] min-h-[1em] inline-block">
                    <span ref={titleRef}>{typedTitle || "\u00A0"}</span>
                  </h1>

                  {showQuill && (
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        left: `${quillX - 18}px`,
                        top: "-50%",
                        width: "70px",
                        height: "120px",
                        transformOrigin: "60% 95%",
                        transform: "rotate(-25deg)",
                        animation: isWriting
                          ? "quill-write 0.4s ease-in-out infinite"
                          : "quill-idle 3s ease-in-out infinite",
                        filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.35))",
                        transition: "left 0.18s ease-out, opacity 0.6s ease",
                        opacity: isWriting ? 1 : 0,
                      }}
                    >
                      <QuillSvg />
                    </div>
                  )}
                </div>
                <p className="font-cormorant italic text-[clamp(1rem,2.2vw,1.25rem)] text-ink-sepia leading-[1.7] max-w-[480px] mx-auto">
                  Your dreams and your days, read by the light of a single
                  flame. Speak. Your neurons remember everything.
                </p>
              </div>

              {/* CTAs */}
              <div className="flex flex-col items-center gap-4">
                {isLoggedIn ? (
                  <>
                    <Link
                      href="/feed"
                      className="no-underline font-pinyon text-xl px-10 py-4 text-[rgba(255,220,180,0.95)] transition-all duration-300 hover:scale-105"
                      style={{
                        background:
                          "radial-gradient(circle at 35% 35%, #c0302a, #8b1a1a, #5a0f0f)",
                        boxShadow:
                          "0 4px 12px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,100,80,0.2), 0 0 20px rgba(139,26,26,0.3)",
                        textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                        cursor: "none",
                      }}
                    >
                      Enter The Bonfire
                    </Link>
                    <Link
                      href="/journal"
                      className="no-underline font-cormorant italic text-base text-ink-sepia hover:text-amber transition-colors"
                      style={{ cursor: "none" }}
                    >
                      or speak a new scribe &rarr;
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/signup"
                      className="no-underline font-pinyon text-xl px-10 py-4 text-[rgba(255,220,180,0.95)] transition-all duration-300 hover:scale-105"
                      style={{
                        background:
                          "radial-gradient(circle at 35% 35%, #c0302a, #8b1a1a, #5a0f0f)",
                        boxShadow:
                          "0 4px 12px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,100,80,0.2), 0 0 20px rgba(139,26,26,0.3)",
                        textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                        cursor: "none",
                      }}
                    >
                      Begin Your First Scroll
                    </Link>
                    <Link
                      href="/login"
                      className="no-underline font-cormorant italic text-base text-ink-sepia hover:text-amber transition-colors"
                      style={{ cursor: "none" }}
                    >
                      Already a Dreamer? Return to the scriptorium &rarr;
                    </Link>
                  </>
                )}
              </div>
            </div>
          </ScrollContainer>
        </div>
      </section>

      {/* GAP — let the candle and embers breathe */}
      <div className="h-[40vh] w-full" />

      {/* SCROLL 2 — HOW IT WORKS */}
      <section className="w-full mx-auto relative z-[10]">
        <div
          ref={howItWorksRef}
          className={`scroll-unroll ${howItWorksInView ? "in-view" : ""}`}
        >
          <ScrollContainer>
            <div className="relative z-[2] scroll-unroll-content">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-parchment-aged to-transparent opacity-50" />
                <span className="font-fell italic text-[0.7rem] text-ink-sepia opacity-70 tracking-[0.2em] uppercase">
                  How It Works
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-parchment-aged to-transparent opacity-50" />
              </div>

              <div className="text-center mb-6">
                <h2 className="font-pinyon text-[2rem] text-ink-sepia mb-1">
                  How DreamScribe Works
                </h2>
                <p className="font-fell italic text-[0.75rem] text-ink-sepia opacity-70 tracking-[0.15em]">
                  four steps from voice to insight
                </p>
              </div>

              <div className="space-y-4 max-w-[560px] mx-auto">
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
                ].map((step) => (
                  <div
                    key={step.title}
                    className="flex gap-4 items-start px-4 py-3"
                    style={{
                      borderLeft: "2px solid rgba(139,100,40,0.3)",
                      background: "rgba(44,24,16,0.05)",
                    }}
                  >
                    <span className="text-2xl mt-0.5 shrink-0">{step.icon}</span>
                    <div>
                      <h3 className="font-cormorant italic text-lg text-ink-sepia mb-1">
                        {step.title}
                      </h3>
                      <p className="font-cormorant italic text-[0.95rem] leading-[1.6] text-ink-sepia opacity-85">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 mt-8">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-parchment-aged to-transparent opacity-50" />
                <span className="font-cormorant italic text-parchment-aged text-base">
                  ✦
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-parchment-aged to-transparent opacity-50" />
              </div>
            </div>
          </ScrollContainer>
        </div>
      </section>
    </div>
  );
}
