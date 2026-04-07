"use client";

import { useState } from "react";

interface BrainBar {
  label: string;
  emoji: string;
  score: number;
  delay: string;
  customFill?: string;
}

interface NeuralScores {
  amygdala_score: number | null;
  dmn_score: number | null;
  dlpfc_score: number | null;
  stg_score: number | null;
  acc_score: number | null;
  fatigue_score: number | null;
}

interface PeakMoments {
  peak_moment_time: string | null;
  peak_moment_quote: string | null;
  calm_moment_time: string | null;
  calm_moment_quote: string | null;
}

interface EntryCardProps {
  dateLabel: string;
  moodLabel: string;
  moodColor?: string;
  excerpt: string;
  barsTitle: string;
  bars: BrainBar[];
  insightLabel: string;
  insightText: string;
  footer?: React.ReactNode;
  crossAnalysis?: {
    label: string;
    text: string;
  };
  neuralScores?: NeuralScores;
  peakMoments?: PeakMoments;
}

const NEURAL_REGIONS = [
  {
    key: "amygdala_score" as const,
    name: "Amygdala",
    role: "grief · fear",
    description:
      "This is where grief, fear, and emotional intensity live. When it fires high, your brain was carrying something heavy — even if your words stayed calm.",
  },
  {
    key: "dmn_score" as const,
    name: "Default mode network",
    role: "self-reflection",
    description:
      "Your self-referential thinking network. High activation means your brain was turning inward — processing your own story, your own past, your own feelings.",
  },
  {
    key: "dlpfc_score" as const,
    name: "Hippocampus",
    role: "emotional memory",
    description:
      "Emotional memory consolidation. Your brain was actively deciding this moment was worth remembering. It bridges who you were with who you are now.",
  },
  {
    key: "stg_score" as const,
    name: "Visual cortex",
    role: "dream imagery",
    description:
      "Even without images, this region activates when you describe what you saw — in dreams, in memories, in imagination. Your brain was seeing it again as you spoke.",
  },
  {
    key: "acc_score" as const,
    name: "Broca's area",
    role: "language",
    description:
      "The language center. When this is low, the experience was too large for words. When high, you were processing the meaning of what you said as you said it.",
  },
  {
    key: "fatigue_score" as const,
    name: "Prefrontal cortex",
    role: "rational thinking",
    description:
      "Rational thinking and analysis. When low, the heart was louder than the mind. This is not weakness — it means you felt rather than calculated.",
  },
];

function getScoreColor(score: number): string {
  if (score >= 70) return "#e8503a";
  if (score >= 50) return "#c97c2a";
  if (score >= 35) return "#c9a96e";
  if (score >= 20) return "#8b9dc3";
  return "#6b9e6b";
}

export default function EntryCard({
  dateLabel,
  moodLabel,
  moodColor,
  excerpt,
  barsTitle,
  bars,
  insightLabel,
  insightText,
  footer,
  crossAnalysis,
  neuralScores,
  peakMoments,
}: EntryCardProps) {
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null);

  const hasNeuralData =
    neuralScores &&
    Object.values(neuralScores).some((v) => v !== null && v !== undefined);

  const hasPeakMoments =
    peakMoments &&
    (peakMoments.peak_moment_quote || peakMoments.calm_moment_quote);

  return (
    <div className="entry-scroll relative mb-6 cursor-none">
      <div className="entry-scroll-rod" />
      <div className="entry-scroll-body">
        {/* Meta */}
        <div className="flex justify-between items-center mb-4 relative z-[2]">
          <span className="font-fell italic text-[0.85rem] text-ink-sepia tracking-[0.1em]">
            {dateLabel}
          </span>
          <span className="font-fell italic text-[0.8rem] text-ink-sepia flex items-center gap-1.5">
            <span
              className="mood-ember"
              style={
                moodColor
                  ? {
                      background: moodColor,
                      boxShadow: `0 0 6px ${moodColor}`,
                    }
                  : undefined
              }
            />
            {moodLabel}
          </span>
        </div>

        {/* Excerpt */}
        <div className="font-pinyon text-[1.5rem] text-ink-sepia leading-[1.9] mb-5 relative z-[2]">
          {excerpt}
        </div>

        {/* Brain bars (original) */}
        <div className="relative z-[2] mb-5">
          <div className="font-fell text-[0.75rem] tracking-[0.15em] text-ink-sepia opacity-80 mb-3 uppercase">
            {barsTitle}
          </div>
          {bars.map((bar, i) => (
            <div key={i} className="flex items-center gap-2 sm:gap-3 mb-2.5">
              <span className="font-fell italic text-[0.7rem] sm:text-[0.8rem] text-ink-sepia w-[110px] sm:w-[180px] shrink-0">
                {bar.emoji} {bar.label}
              </span>
              <div className="flex-1 h-[5px] bg-[rgba(44,24,16,0.18)] rounded-sm overflow-hidden">
                <div
                  className="pbar-fill"
                  style={{
                    width: `${bar.score}%`,
                    animationDelay: bar.delay,
                    ...(bar.customFill ? { background: bar.customFill } : {}),
                  }}
                />
              </div>
              <span className="font-fell italic text-[0.75rem] text-ink-sepia opacity-80 w-9 text-right">
                {bar.score}%
              </span>
            </div>
          ))}
        </div>

        {/* ═══ NEURAL DETAIL SECTION ═══ */}
        {hasNeuralData && (
          <div className="relative z-[2] mb-4">
            {/* Ornament divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[rgba(139,100,40,0.2)] to-transparent" />
              <span className="font-cormorant text-parchment-aged text-[0.7rem] opacity-40">
                ✦
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[rgba(139,100,40,0.2)] to-transparent" />
            </div>

            {/* Section label */}
            <div className="font-fell italic text-[0.75rem] tracking-[0.2em] text-ink-sepia opacity-80 uppercase mb-3">
              ✦ what fired · word by word
            </div>

            {/* Six region rows */}
            {NEURAL_REGIONS.map((region) => {
              const score = neuralScores
                ? Number(neuralScores[region.key] ?? 0)
                : 0;
              const isNull =
                neuralScores?.[region.key] === null ||
                neuralScores?.[region.key] === undefined;
              const color = getScoreColor(score);
              const isExpanded = expandedRegion === region.key;

              return (
                <div key={region.key} className="mb-1">
                  {/* Clickable row */}
                  <button
                    onClick={() =>
                      setExpandedRegion(isExpanded ? null : region.key)
                    }
                    className="w-full text-left flex items-center gap-3 py-1.5 group"
                    style={{ cursor: "none", background: "transparent", border: "none" }}
                  >
                    {/* Ember dot + name */}
                    <div className="w-[120px] sm:w-[170px] shrink-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-[7px] h-[7px] rounded-full shrink-0"
                          style={{
                            background: isNull ? "rgba(44,24,16,0.3)" : color,
                            boxShadow: isNull
                              ? "none"
                              : `0 0 6px ${color}`,
                          }}
                        />
                        <span className="font-cormorant italic text-[0.8rem] sm:text-[0.95rem] text-ink-sepia group-hover:text-amber transition-colors">
                          {region.name}
                        </span>
                      </div>
                      <span className="font-fell italic text-[0.65rem] text-ink-sepia opacity-60 ml-[15px] tracking-[0.05em]">
                        {region.role}
                      </span>
                    </div>

                    {/* Bar track */}
                    <div className="flex-1 h-[4px] bg-[rgba(44,24,16,0.15)] rounded-sm overflow-hidden">
                      {isNull ? (
                        <div className="h-full w-full bg-[rgba(44,24,16,0.06)]" />
                      ) : (
                        <div
                          className="h-full rounded-sm pbar-fill"
                          style={{
                            width: `${score}%`,
                            background: color,
                          }}
                        />
                      )}
                    </div>

                    {/* Score */}
                    <span className="font-fell italic text-[0.75rem] text-ink-sepia opacity-80 w-10 text-right shrink-0">
                      {isNull ? (
                        <span className="font-cormorant italic text-[0.7rem] opacity-50">
                          ...
                        </span>
                      ) : (
                        `${score}%`
                      )}
                    </span>
                  </button>

                  {/* Expandable description */}
                  <div
                    className="overflow-hidden transition-all duration-300 ease-in-out"
                    style={{
                      maxHeight: isExpanded ? "150px" : "0px",
                      opacity: isExpanded ? 1 : 0,
                    }}
                  >
                    <div
                      className="ml-[15px] mr-2 mt-1 mb-2 px-3 py-2 font-cormorant italic text-[0.95rem] leading-[1.7] text-ink-sepia"
                      style={{
                        background: "rgba(44,24,16,0.08)",
                        borderTop: "1px solid rgba(139,100,40,0.25)",
                      }}
                    >
                      {region.description}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Peak moments */}
            {hasPeakMoments && (
              <div
                className="mt-4 py-3 pl-4"
                style={{
                  borderLeft: "3px solid rgba(201,169,110,0.6)",
                  background: "rgba(44,24,16,0.08)",
                }}
              >
                {peakMoments!.peak_moment_quote && (
                  <div className="font-fell italic text-[0.85rem] text-ink-sepia mb-2 leading-relaxed">
                    🕯️ {peakMoments!.peak_moment_time || "—"} &middot; &ldquo;
                    {peakMoments!.peak_moment_quote}&rdquo;
                  </div>
                )}
                {peakMoments!.calm_moment_quote && (
                  <div className="font-fell italic text-[0.85rem] text-ink-sepia leading-relaxed">
                    ○ {peakMoments!.calm_moment_time || "—"} &middot; &ldquo;
                    {peakMoments!.calm_moment_quote}&rdquo;
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Claude insight */}
        <div className="relative z-[2] border-t-2 border-[rgba(139,100,40,0.3)] pt-5 mt-3">
          <span className="font-fell text-[0.75rem] tracking-[0.2em] text-amber uppercase mb-3 block">
            {insightLabel}
          </span>
          <p className="font-cormorant italic text-[1.1rem] leading-[1.85] text-ink-sepia">
            {insightText}
          </p>
        </div>

        {/* Cross-analysis */}
        {crossAnalysis && (
          <div
            className="mt-5 p-4 relative z-[2]"
            style={{
              background: "rgba(44,24,16,0.1)",
              borderLeft: "3px solid rgba(201,124,42,0.5)",
            }}
          >
            <span className="font-fell text-[0.75rem] tracking-[0.15em] text-amber uppercase block mb-2">
              {crossAnalysis.label}
            </span>
            <p className="font-cormorant italic text-[1rem] leading-[1.8] text-ink-sepia">
              {crossAnalysis.text}
            </p>
          </div>
        )}

        {/* Footer */}
        {footer && (
          <div className="mt-4 flex items-center gap-2 relative z-[2]">
            <span className="font-fell italic text-[0.8rem] text-ink-sepia opacity-80">
              {footer}
            </span>
          </div>
        )}
      </div>
      <div className="entry-scroll-rod bottom" />
    </div>
  );
}
