"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import ScrollContainer from "@/components/ScrollContainer";
import type { Database } from "@/lib/supabase";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];
type NotifWithUser = Notification & {
  from_user?: { username: string; display_name: string; avatar_archetype: string | null } | null;
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotifWithUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setCurrentUserId(user.id);

      const { data: notifs } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!notifs) { setLoading(false); return; }

      // Fetch from_user profiles
      const fromIds = Array.from(new Set(notifs.map((n) => n.from_user_id).filter(Boolean))) as string[];
      const { data: profiles } = await supabase
        .from("users")
        .select("id, username, display_name, avatar_archetype")
        .in("id", fromIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      const enriched: NotifWithUser[] = notifs.map((n) => ({
        ...n,
        from_user: n.from_user_id ? profileMap.get(n.from_user_id) || null : null,
      }));

      setNotifications(enriched);

      // Mark all as read
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      setLoading(false);
    }

    load();
  }, [router]);

  const handleFollowResponse = async (notifId: string, fromUserId: string, accept: boolean) => {
    const supabase = createClient();
    if (!currentUserId) return;

    await supabase
      .from("follows")
      .update({ status: accept ? "approved" : "declined" })
      .eq("follower_id", fromUserId)
      .eq("following_id", currentUserId);

    if (accept) {
      // Auto-create the reverse follow (mutual)
      await supabase.from("follows").upsert({
        follower_id: currentUserId,
        following_id: fromUserId,
        status: "approved" as const,
      });

      // Notify the requester
      await supabase.from("notifications").insert({
        user_id: fromUserId,
        type: "follow_approved" as const,
        from_user_id: currentUserId,
        message_text: "approved your follow request — you now follow each other",
      });
    }

    // Update local state
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notifId
          ? { ...n, message_text: accept ? "follow request approved" : "follow request declined" }
          : n
      )
    );
  };

  const EMOJI: Record<string, string> = {
    "The Seeker": "🔍", "The Alchemist": "⚗️", "The Oracle": "🔮",
    "The Wanderer": "🌙", "The Healer": "🌿", "The Architect": "🏛️",
  };

  const NOTIF_ICONS: Record<string, string> = {
    follow_request: "📜",
    follow_approved: "✦",
    new_star: "★",
    new_comment: "💬",
    new_message: "✉",
    therapist_alert: "🔔",
  };

  return (
    <>
      <section className="pt-[130px] text-center max-w-[700px] mb-8">
        <h1
          className="font-pinyon text-[clamp(3rem,8vw,5rem)] text-amber-pale leading-[0.85] mb-4"
          style={{ textShadow: "0 0 30px rgba(232,168,74,0.5)", opacity: 0, animation: "ember-in 2s ease forwards 0.3s" }}
        >
          Notifications
        </h1>
      </section>

      <div style={{ opacity: 0, animation: "ember-in 2s ease forwards 0.6s" }}>
        <ScrollContainer>
          <div className="relative z-[2]">
            {loading ? (
              <div className="text-center py-12">
                <div className="text-2xl mb-4" style={{ animation: "flame-flicker-icon 0.8s ease-in-out infinite" }}>🕯️</div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12">
                <p className="font-cormorant italic text-lg text-ink-sepia opacity-50">
                  No notifications yet
                </p>
                <p className="font-fell italic text-[0.7rem] text-ink-sepia opacity-30 mt-2">
                  Stars, follow requests, and messages appear here
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map((notif) => {
                  const isFollowRequest = notif.type === "follow_request" && notif.message_text === "sent you a follow request";

                  return (
                    <div
                      key={notif.id}
                      className={`px-4 py-4 border-b border-[rgba(139,100,40,0.1)] transition-all duration-300 ${
                        !notif.is_read ? "bg-[rgba(201,124,42,0.04)]" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-base mt-0.5 opacity-60">
                          {NOTIF_ICONS[notif.type] || "✦"}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {notif.from_user && (
                              <>
                                <span className="text-sm">
                                  {EMOJI[notif.from_user.avatar_archetype || ""] || "🔍"}
                                </span>
                                <Link
                                  href={`/profile/${notif.from_user.username}`}
                                  className="font-cormorant italic text-sm text-ink-sepia opacity-70 hover:opacity-90 no-underline transition-opacity"
                                  style={{ cursor: "none" }}
                                >
                                  {notif.from_user.display_name || notif.from_user.username}
                                </Link>
                              </>
                            )}
                            <span className="font-fell italic text-[0.7rem] text-ink-sepia opacity-50">
                              {notif.message_text}
                            </span>
                          </div>
                          <span className="font-fell italic text-[0.55rem] text-ink-sepia opacity-25">
                            {new Date(notif.created_at).toLocaleDateString()} · {new Date(notif.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>

                          {/* Follow request actions */}
                          {isFollowRequest && notif.from_user_id && (
                            <div className="flex gap-3 mt-3">
                              <button
                                onClick={() => handleFollowResponse(notif.id, notif.from_user_id!, true)}
                                className="font-fell italic text-[0.65rem] tracking-[0.1em] px-4 py-1.5 text-[rgba(255,220,180,0.9)] transition-all duration-300"
                                style={{
                                  background: "radial-gradient(circle at 35% 35%, #c0302a, #8b1a1a, #5a0f0f)",
                                  boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                                  cursor: "none",
                                  textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                                }}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleFollowResponse(notif.id, notif.from_user_id!, false)}
                                className="font-fell italic text-[0.65rem] tracking-[0.1em] px-4 py-1.5 text-ink-sepia opacity-50 border border-[rgba(139,100,40,0.2)] hover:opacity-70 transition-opacity"
                                style={{ cursor: "none", background: "transparent" }}
                              >
                                Decline
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollContainer>
      </div>
    </>
  );
}
