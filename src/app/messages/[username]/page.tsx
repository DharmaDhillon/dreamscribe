"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import ScrollContainer from "@/components/ScrollContainer";
import type { Database } from "@/lib/supabase";

type Message = Database["public"]["Tables"]["messages"]["Row"];

export default function MessageThreadPage() {
  const router = useRouter();
  const params = useParams();
  const username = params.username as string;

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [canMessage, setCanMessage] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setCurrentUserId(user.id);

      // Get partner profile
      const { data: partner } = await supabase
        .from("users")
        .select("id, username, display_name")
        .eq("username", username)
        .single();

      if (!partner) return;
      setPartnerId(partner.id);
      setPartnerName(partner.display_name || partner.username);

      // Check if there's any approved follow between the two users (either direction)
      const { data: anyFollow } = await supabase
        .from("follows")
        .select("status")
        .eq("status", "approved")
        .or(
          `and(follower_id.eq.${user.id},following_id.eq.${partner.id}),and(follower_id.eq.${partner.id},following_id.eq.${user.id})`
        );

      setCanMessage(!!(anyFollow && anyFollow.length > 0));

      // Load messages
      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${partner.id}),and(sender_id.eq.${partner.id},receiver_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true });

      setMessages(msgs || []);

      // Mark unread messages as read
      await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("sender_id", partner.id)
        .eq("receiver_id", user.id)
        .is("read_at", null);
    }

    load();
  }, [router, username]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Real-time subscription
  useEffect(() => {
    if (!currentUserId || !partnerId) return;
    const supabase = createClient();

    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${currentUserId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          if (msg.sender_id === partnerId) {
            setMessages((prev) => [...prev, msg]);
            // Mark as read
            supabase
              .from("messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", msg.id);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, partnerId]);

  const handleSend = async () => {
    if (!newMessage.trim() || !currentUserId || !partnerId || sending) return;
    setSending(true);

    const supabase = createClient();
    const { data: msg } = await supabase
      .from("messages")
      .insert({
        sender_id: currentUserId,
        receiver_id: partnerId,
        content: newMessage.trim(),
      })
      .select()
      .single();

    if (msg) {
      setMessages((prev) => [...prev, msg]);
      setNewMessage("");

      // Notification
      await supabase.from("notifications").insert({
        user_id: partnerId,
        type: "new_message" as const,
        from_user_id: currentUserId,
        message_text: "sent you a message",
      });
    }
    setSending(false);
  };

  return (
    <>
      <section className="pt-[130px] text-center mb-6">
        <Link
          href="/messages"
          className="font-fell italic text-[0.65rem] text-parchment-dark opacity-40 hover:opacity-70 transition-opacity no-underline tracking-[0.1em]"
          style={{ cursor: "none" }}
        >
          &larr; All messages
        </Link>
        <h1
          className="font-pinyon text-[2.5rem] text-amber-pale mt-3"
          style={{ textShadow: "0 0 20px rgba(232,168,74,0.4)", opacity: 0, animation: "ember-in 1.5s ease forwards 0.2s" }}
        >
          {partnerName}
        </h1>
      </section>

      <div style={{ opacity: 0, animation: "ember-in 2s ease forwards 0.4s" }}>
        <ScrollContainer>
          <div className="relative z-[2] min-h-[400px] flex flex-col">
            {/* Messages */}
            <div className="flex-1 space-y-4 mb-6">
              {messages.length === 0 && (
                <p className="font-cormorant italic text-base text-ink-sepia opacity-70 text-center py-8">
                  No messages yet. Begin the conversation.
                </p>
              )}
              {messages.map((msg) => {
                const isMine = msg.sender_id === currentUserId;
                return (
                  <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div
                      className="max-w-[80%] px-5 py-3"
                      style={{
                        background: isMine
                          ? "rgba(201,124,42,0.18)"
                          : "rgba(44,24,16,0.12)",
                        borderLeft: isMine ? "none" : "3px solid rgba(201,169,110,0.6)",
                        borderRight: isMine ? "3px solid rgba(201,124,42,0.6)" : "none",
                      }}
                    >
                      <p className="font-cormorant italic text-[1.1rem] leading-[1.7] text-ink-sepia">
                        {msg.content}
                      </p>
                      <span className="font-fell italic text-[0.7rem] text-ink-sepia opacity-70 mt-1.5 block">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Send area */}
            {canMessage ? (
              <div className="flex gap-3 items-end border-t border-[rgba(139,100,40,0.15)] pt-4">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  rows={2}
                  placeholder="Write your message..."
                  className="flex-1 bg-[#e8d8a8] border border-[rgba(139,100,40,0.4)] rounded-none px-4 py-3 font-cormorant italic text-ink-sepia text-base outline-none focus:border-amber transition-colors resize-none placeholder:text-ink-sepia placeholder:opacity-40"
                  style={{ cursor: "none" }}
                />
                <button
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sending}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 disabled:opacity-30"
                  style={{
                    background: "radial-gradient(circle at 35% 35%, #c0302a, #8b1a1a, #5a0f0f)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                    cursor: "none",
                  }}
                >
                  <span className="font-pinyon text-sm text-[rgba(255,220,180,0.8)]">D</span>
                </button>
              </div>
            ) : (
              <div className="text-center py-4 border-t border-[rgba(139,100,40,0.2)]">
                <p className="font-cormorant italic text-base text-ink-sepia opacity-70">
                  Mutual follow required to send messages
                </p>
              </div>
            )}
          </div>
        </ScrollContainer>
      </div>
    </>
  );
}
