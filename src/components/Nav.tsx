"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function Nav() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsLoggedIn(true);
        const { data: profile } = await supabase
          .from("users")
          .select("username, avatar_url")
          .eq("id", user.id)
          .single();
        if (profile) {
          setUsername(profile.username);
          setAvatarUrl(profile.avatar_url || null);
        }

        // Unread notification count
        const { count } = await supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_read", false);
        setUnreadCount(count || 0);
      }
    }
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, [pathname]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const navLink = (href: string, label: string, badge?: number) => (
    <li key={href}>
      <Link
        href={href}
        className={`no-underline font-fell text-sm tracking-[0.15em] uppercase transition-all duration-300 relative ${
          isActive(href)
            ? "text-amber-bright opacity-100"
            : "text-parchment opacity-85 hover:opacity-100 hover:text-amber-pale"
        }`}
      >
        {label}
        {badge && badge > 0 ? (
          <span
            className="absolute -top-1.5 -right-3 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-fell text-[rgba(255,220,180,0.9)]"
            style={{
              background: "radial-gradient(circle at 35% 35%, #c0302a, #8b1a1a)",
              boxShadow: "0 0 6px rgba(200,50,30,0.4)",
            }}
          >
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </Link>
    </li>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] px-6 md:px-12 py-4 flex items-center justify-between bg-gradient-to-b from-[rgba(5,3,2,0.95)] to-transparent">
      <Link
        href={isLoggedIn ? "/feed" : "/"}
        className="font-pinyon text-3xl md:text-4xl text-amber-bright no-underline"
        style={{
          textShadow:
            "0 0 20px rgba(232,168,74,0.6), 0 0 40px rgba(201,124,42,0.3)",
        }}
      >
        DreamScribe
      </Link>
      <ul className="flex gap-6 md:gap-8 list-none items-center">
        {isLoggedIn ? (
          <>
            {navLink("/feed", "The Bonfire")}
            {navLink("/patterns", "Patterns")}
            {navLink("/messages", "Messages")}
            {navLink("/notifications", "Alerts", unreadCount)}
            <li>
              <Link
                href={`/profile/${username || "me"}`}
                className={`no-underline flex items-center gap-2 transition-all duration-300 hover:scale-105 ${
                  isActive("/profile")
                    ? "opacity-100"
                    : "opacity-90 hover:opacity-100"
                }`}
              >
                <span
                  className="w-10 h-10 rounded-full flex items-center justify-center text-base font-pinyon text-amber-pale overflow-hidden"
                  style={{
                    background: avatarUrl
                      ? "transparent"
                      : "radial-gradient(circle at 35% 35%, rgba(201,124,42,0.7), rgba(61,32,16,0.8))",
                    border: isActive("/profile")
                      ? "2px solid #e8a84a"
                      : "2px solid rgba(201,124,42,0.6)",
                    boxShadow: isActive("/profile")
                      ? "0 0 12px rgba(232,168,74,0.5)"
                      : "0 0 8px rgba(201,124,42,0.3)",
                  }}
                >
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    username ? username[0].toUpperCase() : "?"
                  )}
                </span>
              </Link>
            </li>
            <li>
              <button
                onClick={handleLogout}
                className="text-parchment font-fell text-sm tracking-[0.15em] uppercase opacity-85 hover:opacity-100 hover:text-amber-pale transition-all duration-300 bg-transparent border-none"
                style={{ cursor: "none" }}
              >
                Logout
              </button>
            </li>
          </>
        ) : (
          <>
            <li>
              <Link
                href="/login"
                className="text-parchment-dark no-underline font-fell text-xs tracking-[0.15em] uppercase opacity-50 hover:opacity-90 hover:text-amber-pale transition-all duration-300"
              >
                Login
              </Link>
            </li>
            <li>
              <Link
                href="/signup"
                className="no-underline font-fell text-xs tracking-[0.15em] uppercase px-4 py-2 transition-all duration-300 text-[rgba(255,220,180,0.9)] hover:scale-105"
                style={{
                  background: "radial-gradient(circle at 35% 35%, #c0302a, #8b1a1a, #5a0f0f)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.4), 0 0 12px rgba(139,26,26,0.2)",
                  textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                }}
              >
                Sign Up
              </Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}
