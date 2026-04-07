"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import ScrollContainer from "@/components/ScrollContainer";
import QuillSvg from "@/components/QuillSvg";
import EntryCard from "@/components/EntryCard";
import { createClient } from "@/lib/supabase";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import type { Database } from "@/lib/supabase";

type Entry = Database["public"]["Tables"]["entries"]["Row"];
type EntryType = "dream" | "daily";

const PROC_STEP_LABELS = [
  "Downloading your voice...",
  "TRIBE v2 mapping your neurons...",
  "Scoring 20,484 cortical points...",
  "Finding your peak emotional moment...",
  "Claude writing your insight by candlelight...",
  "Mnemo storing your pattern to memory...",
];

const MAX_RECORDING_SECONDS = 180; // 3 minutes

interface JournalRecorderProps {
  userId: string;
  onEntrySaved?: (entry: Entry) => void;
}

export default function JournalRecorder({ userId, onEntrySaved }: JournalRecorderProps) {
  const [entryType, setEntryType] = useState<EntryType>("daily");
  const [processing, setProcessing] = useState(false);
  const [processingSteps, setProcessingSteps] = useState<boolean[]>(
    Array(6).fill(false)
  );
  const [showInsight, setShowInsight] = useState(false);
  const [insightText, setInsightText] = useState("");
  const [quillWriting, setQuillWriting] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [savingError, setSavingError] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [lastEntry, setLastEntry] = useState<Entry | null>(null);

  const {
    isRecording,
    elapsedSeconds,
    error: micError,
    analyserNode,
    startRecording,
    stopRecording,
  } = useAudioRecorder();

  const barRefs = useRef<(HTMLDivElement | null)[]>([]);
  const animFrameRef = useRef<number>(0);
  const mounted = useRef(true);
  const durationRef = useRef(0);

  useEffect(() => {
    durationRef.current = elapsedSeconds;
  }, [elapsedSeconds]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Real waveform visualization
  useEffect(() => {
    if (!analyserNode || !isRecording) {
      cancelAnimationFrame(animFrameRef.current);
      return;
    }
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const barCount = barRefs.current.length;

    function draw() {
      if (!analyserNode) return;
      analyserNode.getByteFrequencyData(dataArray);
      for (let i = 0; i < barCount; i++) {
        const bar = barRefs.current[i];
        if (!bar) continue;
        const idx = Math.floor((i / barCount) * bufferLength * 0.6);
        const value = dataArray[idx] || 0;
        bar.style.height = `${Math.max(3, (value / 255) * 36)}px`;
      }
      animFrameRef.current = requestAnimationFrame(draw);
    }
    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [analyserNode, isRecording]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, "0")}`;
  };

  // Auto-stop at max length
  useEffect(() => {
    if (isRecording && elapsedSeconds >= MAX_RECORDING_SECONDS) {
      (async () => {
        const blob = await stopRecording();
        if (blob) await handleSaveAndAnalyze(blob);
      })();
    }
  }, [isRecording, elapsedSeconds, stopRecording]);

  const handleToggleRecording = useCallback(async () => {
    if (!isRecording) {
      setShowInsight(false);
      setInsightText("");
      setCursorVisible(true);
      setSavingError("");
      await startRecording();
    } else {
      const recordedDuration = durationRef.current;
      const blob = await stopRecording();

      // Guard: must be at least 3 seconds AND blob must have actual audio data
      if (!blob || recordedDuration < 3 || blob.size < 2000) {
        setSavingError("Too short — please speak for at least 3 seconds.");
        return;
      }

      await handleSaveAndAnalyze(blob);
    }
  }, [isRecording, startRecording, stopRecording]);

  const handleSaveAndAnalyze = async (blob: Blob) => {
    setProcessing(true);
    setProcessingSteps(Array(6).fill(false));
    setProcessingSteps((p) => { const n = [...p]; n[0] = true; return n; });

    const supabase = createClient();
    const timestamp = Date.now();
    const ext = blob.type.includes("webm") ? "webm" : "mp4";
    const filePath = `${userId}/${entryType}/${timestamp}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("audio-entries")
      .upload(filePath, blob, { contentType: blob.type });

    if (uploadError) {
      setSavingError("Failed to upload audio: " + uploadError.message);
      setProcessing(false);
      return;
    }

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("audio-entries")
      .createSignedUrl(filePath, 3600);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      setSavingError("Failed to generate audio URL: " + (signedUrlError?.message || "Unknown error"));
      setProcessing(false);
      return;
    }

    const audioUrl = signedUrlData.signedUrl;
    setProcessingSteps((p) => { const n = [...p]; n[1] = true; return n; });

    const { data: newEntry, error: insertError } = await supabase
      .from("entries")
      .insert({
        user_id: userId,
        entry_type: entryType,
        audio_url: audioUrl,
        duration_seconds: durationRef.current,
        is_public: isPublic,
      })
      .select()
      .single();

    if (insertError || !newEntry) {
      setSavingError("Failed to save entry: " + (insertError?.message || "Unknown error"));
      setProcessing(false);
      return;
    }

    setProcessingSteps((p) => { const n = [...p]; n[2] = true; return n; });

    try {
      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entry_id: newEntry.id,
          user_id: userId,
          audio_url: audioUrl,
          entry_type: entryType,
          duration_seconds: durationRef.current,
        }),
      });

      setProcessingSteps((p) => { const n = [...p]; n[3] = true; return n; });

      if (!analyzeRes.ok) throw new Error(await analyzeRes.text());

      const result = await analyzeRes.json();

      // Guard: if Whisper couldn't transcribe anything, delete the entry
      const transcriptText = (result.transcript || "").trim();
      if (transcriptText.length < 5) {
        await supabase.from("entries").delete().eq("id", newEntry.id);
        setProcessing(false);
        setSavingError(
          "We couldn't hear you clearly. Please check your microphone and try again."
        );
        return;
      }

      setProcessingSteps((p) => { const n = [...p]; n[4] = true; return n; });
      setProcessingSteps((p) => { const n = [...p]; n[5] = true; return n; });

      await new Promise((r) => setTimeout(r, 600));

      const analyzedEntry: Entry = {
        ...newEntry,
        transcript: result.transcript || null,
        amygdala_score: result.roi_scores?.emotional_load ?? null,
        dlpfc_score: result.roi_scores?.rational_processing ?? null,
        dmn_score: result.roi_scores?.self_referential ?? null,
        stg_score: result.roi_scores?.emotional_voice ?? null,
        acc_score: result.roi_scores?.internal_conflict ?? null,
        fatigue_score: result.roi_scores?.mental_fatigue ?? null,
        peak_moment_time: result.moments?.peak?.time ?? null,
        peak_moment_quote: result.moments?.peak?.quote ?? null,
        calm_moment_time: result.moments?.calm?.time ?? null,
        calm_moment_quote: result.moments?.calm?.quote ?? null,
        claude_insight: result.claude_insight || null,
        mood_label: result.mood_label || null,
      };
      setLastEntry(analyzedEntry);
      onEntrySaved?.(analyzedEntry);

      setProcessing(false);
      setShowInsight(true);
      setQuillWriting(true);

      const insight = result.claude_insight || "Your entry was saved.";
      let iChar = 0;
      const writeChar = () => {
        if (!mounted.current) return;
        if (iChar < insight.length) {
          setInsightText(insight.substring(0, iChar + 1));
          iChar++;
          setTimeout(writeChar, 35 + Math.random() * 25);
        } else {
          setCursorVisible(false);
          setQuillWriting(false);
        }
      };
      writeChar();
    } catch (err) {
      console.error("Analysis failed:", err);
      setProcessing(false);
      setShowInsight(true);
      setQuillWriting(false);
      setCursorVisible(false);
      setInsightText("");
      setSavingError(
        "The flame flickered — analysis incomplete. Your entry was saved. Try again shortly."
      );
    }
  };

  const BAR_COUNT = 20;

  return (
    <>
      <div style={{ opacity: 0, animation: "ember-in 1.5s ease forwards 0.4s" }}>
        <ScrollContainer>
          {/* Ornament */}
          <div className="text-center mb-6 relative z-[2]">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-parchment-aged to-transparent opacity-50" />
              <div className="font-cormorant text-parchment-aged text-base opacity-60">
                ✦ ❧ ✦
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-parchment-aged to-transparent opacity-50" />
            </div>
            <div className="font-fell italic text-[0.8rem] text-ink-sepia tracking-[0.15em] uppercase opacity-80">
              Speak Your Scribe
            </div>
          </div>

          {/* Entry type toggle */}
          <div className="relative z-[2] flex justify-center gap-1 mb-4">
            {(["dream", "daily"] as EntryType[]).map((type) => (
              <button
                key={type}
                onClick={() => setEntryType(type)}
                className={`px-6 py-2.5 font-fell italic text-[0.85rem] tracking-[0.1em] transition-all duration-300 border-b-2 ${
                  entryType === type
                    ? "text-ink-sepia border-amber shadow-[0_2px_8px_rgba(201,124,42,0.3)]"
                    : "text-ink-sepia opacity-50 border-transparent hover:opacity-80"
                }`}
                style={{
                  cursor: "none",
                  background: entryType === type ? "rgba(201,124,42,0.08)" : "transparent",
                }}
              >
                {type === "dream" ? "🌙 Dream Journal" : "☀️ Daily Journal"}
              </button>
            ))}
          </div>

          {/* Privacy toggle */}
          <div className="relative z-[2] flex justify-center mb-8">
            <button
              onClick={() => setIsPublic(!isPublic)}
              className="font-fell italic text-[0.75rem] tracking-[0.1em] px-4 py-1.5 transition-all duration-300 border"
              style={{
                cursor: "none",
                background: isPublic ? "rgba(201,124,42,0.1)" : "rgba(44,24,16,0.05)",
                borderColor: isPublic ? "rgba(201,124,42,0.4)" : "rgba(139,100,40,0.3)",
                color: "rgba(44,24,16,0.85)",
              }}
            >
              {isPublic ? "🔓 public · visible on the bonfire" : "🔒 private · only you"}
            </button>
          </div>

          {/* Quill area */}
          <div className="relative z-[2] min-h-[180px]">
            <div
              className="absolute -top-[60px] -right-5 w-[120px] pointer-events-none origin-[85%_90%]"
              style={{
                animation: quillWriting || isRecording
                  ? "quill-write 0.4s ease-in-out infinite"
                  : "quill-idle 4s ease-in-out infinite",
                filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
              }}
            >
              <QuillSvg />
            </div>
            <div className="font-pinyon text-[1.5rem] text-ink-sepia leading-[2.1] min-h-[140px] relative">
              {!showInsight && !isRecording && !processing && !savingError && (
                <span className="opacity-60">
                  {entryType === "dream"
                    ? "Speak your dream into the flame..."
                    : "Let the candle hear your heart..."}
                </span>
              )}
              {isRecording && (
                <span className="opacity-70">Recording your voice...</span>
              )}
              {showInsight && <span>{insightText}</span>}
              <span className={`ink-cursor ${cursorVisible && (isRecording || showInsight) ? "visible" : ""}`}>
                |
              </span>
            </div>
          </div>

          {/* Record area */}
          {!processing && (
            <div className="relative z-[2] flex flex-col items-center gap-4 mt-6">
              <div className="flex items-center gap-4 w-full mb-2">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[rgba(139,100,40,0.3)] to-transparent" />
                <div className="font-fell italic text-[0.8rem] text-ink-sepia opacity-70 tracking-[0.1em] whitespace-nowrap">
                  {isRecording ? "press the seal to stop" : "press the seal to speak"}
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[rgba(139,100,40,0.3)] to-transparent" />
              </div>

              <button
                className={`seal-btn ${isRecording ? "recording" : ""}`}
                onClick={handleToggleRecording}
              >
                <div className="seal-ring" />
                <div className="seal-ring" />
                <div className="seal-ring" />
                <div className="seal-wax">
                  <span
                    className="font-pinyon text-[1.6rem] text-[rgba(255,220,180,0.8)]"
                    style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
                  >
                    D
                  </span>
                </div>
              </button>

              {/* Waveform */}
              <div
                className={`flex items-end gap-[2px] h-9 transition-opacity duration-500 ${
                  isRecording ? "opacity-100" : "opacity-0"
                }`}
              >
                {Array.from({ length: BAR_COUNT }).map((_, i) => (
                  <div
                    key={i}
                    ref={(el) => { barRefs.current[i] = el; }}
                    className="w-[3px] rounded-sm"
                    style={{
                      height: "3px",
                      background: "linear-gradient(to top, var(--ink-sepia), rgba(44,24,16,0.3))",
                      transition: "height 0.08s ease-out",
                    }}
                  />
                ))}
              </div>

              {/* Timer with limit */}
              <div className={`flex items-center gap-2 transition-opacity duration-300 ${isRecording ? "opacity-100" : "opacity-0"}`}>
                <span
                  className="font-fell italic text-lg tracking-[0.1em]"
                  style={{
                    color: elapsedSeconds >= MAX_RECORDING_SECONDS - 30
                      ? "#8b1a1a"
                      : "var(--ink-sepia)",
                  }}
                >
                  {formatTime(elapsedSeconds)}
                </span>
                <span className="font-fell italic text-[0.75rem] text-ink-sepia opacity-70">
                  / {formatTime(MAX_RECORDING_SECONDS)}
                </span>
              </div>

              {!isRecording && (
                <div className="font-fell italic text-[0.75rem] text-ink-sepia opacity-60 tracking-[0.05em]">
                  ⏱ max {Math.floor(MAX_RECORDING_SECONDS / 60)} min recording
                </div>
              )}

              <div className="font-fell italic text-[0.75rem] text-ink-sepia tracking-[0.15em] opacity-80">
                {isRecording ? "speaking..." : "seal of truth"}
              </div>

              {micError && (
                <p className="font-cormorant italic text-sm text-[#8b1a1a] opacity-90 text-center mt-2 max-w-xs">{micError}</p>
              )}
              {savingError && (
                <p className="font-cormorant italic text-sm text-ink-sepia opacity-80 text-center mt-4 max-w-sm leading-relaxed">{savingError}</p>
              )}
            </div>
          )}

          {/* Processing state */}
          {processing && (
            <div className="flex flex-col items-center gap-5 text-center relative z-[2]">
              <div className="text-[2rem]" style={{ animation: "flame-flicker-icon 0.8s ease-in-out infinite" }}>🕯️</div>
              <div className="font-pinyon text-[1.8rem] text-ink-sepia opacity-90">
                The quill is writing your truth...
              </div>
              <div className="flex flex-col gap-2 text-left">
                {PROC_STEP_LABELS.map((label, i) => (
                  <div
                    key={i}
                    className={`font-fell italic text-[0.85rem] text-ink-sepia flex items-center gap-2 tracking-[0.05em] transition-opacity duration-500 ${
                      processingSteps[i] ? "opacity-100" : "opacity-40"
                    }`}
                  >
                    <span className="text-amber">{processingSteps[i] ? "✦" : "◦"}</span>
                    {label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollContainer>
      </div>

      {/* Last recorded entry preview */}
      {lastEntry && !processing && (
        <div
          className="w-[min(720px,98vw)] mx-auto mt-10"
          style={{ animation: "ember-in 1.5s ease forwards" }}
        >
          <div className="text-center mb-6">
            <div className="flex items-center gap-4 justify-center mb-2">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[rgba(201,124,42,0.25)] to-transparent" />
              <div className="font-fell text-[0.7rem] tracking-[0.25em] text-amber opacity-70 uppercase">
                your latest scribe
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[rgba(201,124,42,0.25)] to-transparent" />
            </div>
          </div>

          <EntryCard
            dateLabel={`${lastEntry.entry_type === "dream" ? "🌙 Dream" : "☀️ Daily"} · ${new Date(lastEntry.created_at).toLocaleString()}`}
            moodLabel={lastEntry.mood_label || (lastEntry.entry_type === "dream" ? "dream recorded" : "daily recorded")}
            excerpt={
              lastEntry.transcript
                ? `"${lastEntry.transcript.substring(0, 250)}${lastEntry.transcript.length > 250 ? "..." : ""}"`
                : `Audio recorded · ${lastEntry.duration_seconds || 0}s`
            }
            barsTitle={lastEntry.entry_type === "dream" ? "✦ subconscious neural activation" : "✦ conscious neural activation"}
            bars={[
              { label: "Emotional Load", emoji: "💔", score: lastEntry.amygdala_score ? Number(lastEntry.amygdala_score) : 0, delay: "0.1s" },
              { label: "Self-Referential (DMN)", emoji: "🔁", score: lastEntry.dmn_score ? Number(lastEntry.dmn_score) : 0, delay: "0.3s" },
              { label: "Internal Conflict", emoji: "⚡", score: lastEntry.acc_score ? Number(lastEntry.acc_score) : 0, delay: "0.5s" },
              { label: "Rational Processing", emoji: "🧠", score: lastEntry.dlpfc_score ? Number(lastEntry.dlpfc_score) : 0, delay: "0.7s" },
            ]}
            neuralScores={{
              amygdala_score: lastEntry.amygdala_score,
              dmn_score: lastEntry.dmn_score,
              dlpfc_score: lastEntry.dlpfc_score,
              stg_score: lastEntry.stg_score,
              acc_score: lastEntry.acc_score,
              fatigue_score: lastEntry.fatigue_score,
            }}
            peakMoments={{
              peak_moment_time: lastEntry.peak_moment_time,
              peak_moment_quote: lastEntry.peak_moment_quote,
              calm_moment_time: lastEntry.calm_moment_time,
              calm_moment_quote: lastEntry.calm_moment_quote,
            }}
            insightLabel="✦ what the flame heard"
            insightText={lastEntry.claude_insight || ""}
            footer={`${lastEntry.is_public ? "🔓 public" : "🔒 private"} · ${lastEntry.duration_seconds || 0}s`}
          />
        </div>
      )}
    </>
  );
}
