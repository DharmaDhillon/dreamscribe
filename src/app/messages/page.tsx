"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import ScrollContainer from "@/components/ScrollContainer";

interface Connection {
  userId: string;
  username: string;
  displayName: string;
  archetype: string | null;
  avatarUrl: string | null;
  lastMessage: string | null;
  lastTime: string | null;
  unread: boolean;
}

const EMOJI: Record<string, string> = {
  "The Seeker": "🔍",
  "The Alchemist": "⚗️",
  "The Oracle": "🔮",
  "The Wanderer": "🌙",
  "The Healer": "🌿",
  "The Architect": "🏛️",
};

export default function MessagesPage() {
  const router = useRouter();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Get all approved follow connections (either direction)
      const { data: follows } = await supabase
        .from("follows")
        .select("follower_id, following_id")
        .eq("status", "approved")
        .or(
          `follower_id.eq.${user.id},following_id.eq.${user.id}`
        );

      if (!follows || follows.length === 0) {
        setLoading(false);
        return;
      }

      // Collect unique partner IDs
      const partnerIds = new Set<string>();
      for (const f of follows) {
        if (f.follower_id === user.id) partnerIds.add(f.following_id);
        if (f.following_id === user.id) partnerIds.add(f.follower_id);
      }

      // Fetch profiles
      const { data: profiles } = await supabase
        .from("users")
        .select("id, username, display_name, avatar_archetype, avatar_url")
        .in("id", Array.from(partnerIds));

      // Fetch latest message per partner
      const { data: messages } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      // Build last message map
      const lastMsgMap = new Map<
        string,
        { content: string; time: string; unread: boolean }
      >();
      for (const msg of messages || []) {
        const partnerId =
          msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        if (!lastMsgMap.has(partnerId)) {
          lastMsgMap.set(partnerId, {
            content: msg.content,
            time: msg.created_at,
            unread: msg.receiver_id === user.id && !msg.read_at,
          });
        }
      }

      // Build connections list
      const conns: Connection[] = (profiles || []).map((p) => {
        const lastMsg = lastMsgMap.get(p.id);
        return {
          userId: p.id,
          username: p.username,
          displayName: p.display_name || p.username,
          archetype: p.avatar_archetype,
          avatarUrl: p.avatar_url,
          lastMessage: lastMsg
            ? lastMsg.content.substring(0, 60) +
              (lastMsg.content.length > 60 ? "..." : "")
            : null,
          lastTime: lastMsg
            ? new Date(lastMsg.time).toLocaleDateString()
            : null,
          unread: lastMsg?.unread || false,
        };
      });

      // Sort: unread first, then those with messages, then alphabetical
      conns.sort((a, b) => {
        if (a.unread && !b.unread) return -1;
        if (!a.unread && b.unread) return 1;
        if (a.lastMessage && !b.lastMessage) return -1;
        if (!a.lastMessage && b.lastMessage) return 1;
        return a.displayName.localeCompare(b.displayName);
      });

      setConnections(conns);
      setLoading(false);
    }

    load();
  }, [router]);

  return (
    <>
      <section className="pt-[130px] text-center max-w-[700px] mb-8">
        <h1
          className="font-pinyon text-[clamp(3rem,8vw,5rem)] text-amber-pale leading-[0.85] mb-4"
          style={{
            textShadow: "0 0 30px rgba(232,168,74,0.5)",
            opacity: 0,
            animation: "ember-in 2s ease forwards 0.3s",
          }}
        >
          Messages
        </h1>
        <p
          className="font-cormorant italic text-base text-parchment-dark opacity-60"
          style={{
            opacity: 0,
            animation: "ember-in 1.5s ease forwards 0.6s",
          }}
        >
          Private scrolls between kindred spirits
        </p>
      </section>

      <div
        style={{ opacity: 0, animation: "ember-in 2s ease forwards 0.8s" }}
      >
        <ScrollContainer>
          <div className="relative z-[2]">
            {loading ? (
              <div className="text-center py-12">
                <div
                  className="text-2xl mb-4"
                  style={{
                    animation:
                      "flame-flicker-icon 0.8s ease-in-out infinite",
                  }}
                >
                  🕯️
                </div>
              </div>
            ) : connections.length === 0 ? (
              <div className="text-center py-12">
                <p className="font-cormorant italic text-lg text-ink-sepia opacity-50 mb-3">
                  No connections yet
                </p>
                <p className="font-fell italic text-[0.7rem] text-ink-sepia opacity-35">
                  Follow someone from The Bonfire — once connected, they&apos;ll
                  appear here
                </p>
              </div>
            ) : (
              <div>
                <div className="font-fell italic text-[9px] tracking-[0.2em] text-ink-sepia opacity-35 uppercase mb-4">
                  ✦ your connections
                </div>
                <div className="space-y-1">
                  {connections.map((conn) => (
                    <Link
                      key={conn.userId}
                      href={`/messages/${conn.username}`}
                      className="flex items-center gap-3 no-underline px-4 py-4 transition-all duration-300 hover:bg-[rgba(201,124,42,0.06)] border-b border-[rgba(139,100,40,0.1)]"
                      style={{ cursor: "none" }}
                    >
                      {/* Avatar */}
                      <span
                        className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 overflow-hidden"
                        style={{
                          background: conn.avatarUrl
                            ? "transparent"
                            : "radial-gradient(circle at 35% 35%, rgba(201,124,42,0.25), rgba(61,32,16,0.5))",
                          border:
                            "1px solid rgba(201,124,42,0.25)",
                        }}
                      >
                        {conn.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={conn.avatarUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          EMOJI[conn.archetype || ""] || "🔍"
                        )}
                      </span>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className={`font-cormorant italic text-sm text-ink-sepia ${
                              conn.unread ? "opacity-90" : "opacity-60"
                            }`}
                          >
                            {conn.displayName}
                          </span>
                          {conn.lastTime && (
                            <span className="font-fell italic text-[0.5rem] text-ink-sepia opacity-25">
                              {conn.lastTime}
                            </span>
                          )}
                          {conn.unread && (
                            <span
                              className="w-[6px] h-[6px] rounded-full bg-amber"
                              style={{
                                boxShadow:
                                  "0 0 6px rgba(201,124,42,0.5)",
                              }}
                            />
                          )}
                        </div>
                        <p
                          className={`font-cormorant italic text-[0.8rem] text-ink-sepia truncate ${
                            conn.lastMessage
                              ? conn.unread
                                ? "opacity-65"
                                : "opacity-35"
                              : "opacity-25"
                          }`}
                        >
                          {conn.lastMessage || "Start a conversation..."}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollContainer>
      </div>
    </>
  );
}
