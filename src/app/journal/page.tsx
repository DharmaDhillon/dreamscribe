"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function JournalRedirect() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    async function go() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("users")
        .select("username")
        .eq("id", user.id)
        .single();
      router.replace(`/profile/${profile?.username || "me"}`);
    }
    go();
  }, [router]);

  return (
    <div className="pt-[200px] text-center">
      <div className="text-2xl mb-4" style={{ animation: "flame-flicker-icon 0.8s ease-in-out infinite" }}>🕯️</div>
      <p className="font-cormorant italic text-parchment-dark opacity-50">Taking you to your scroll...</p>
    </div>
  );
}
