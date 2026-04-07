import type { Metadata } from "next";
import "./globals.css";
import FeatherCursor from "@/components/FeatherCursor";
import RoomAtmosphere from "@/components/RoomAtmosphere";
import Candle from "@/components/Candle";
import Embers from "@/components/Embers";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "DreamScribe — Speak. Remember. Awaken.",
  description:
    "A voice-first neural journal that reads your dreams and your days by candlelight. Powered by TRIBE v2 and Claude AI.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0a0705",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Pinyon+Script&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400;1,600&family=IM+Fell+English:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <FeatherCursor />
        <RoomAtmosphere />
        <Embers />
        <Candle />
        <Nav />
        <main className="relative z-10 min-h-screen flex flex-col items-center pb-[180px] sm:pb-[250px] px-2 sm:px-4">
          {children}
        </main>
        <footer className="relative z-10 text-center py-12">
          <div
            className="font-pinyon text-[2.5rem] text-amber opacity-40 mb-1"
          >
            DreamScribe
          </div>
          <p className="font-fell italic text-[0.7rem] tracking-[0.15em] text-parchment-dark opacity-50 mb-3">
            speak freely &middot; your neurons remember &middot; powered by
            TRIBE v2 + Claude
          </p>
          <div className="flex items-center justify-center gap-4 mb-2">
            <a
              href="/privacy"
              className="font-fell italic text-[0.7rem] tracking-[0.1em] text-parchment-dark opacity-70 hover:opacity-100 hover:text-amber transition-colors no-underline"
            >
              Privacy Policy
            </a>
            <span className="text-parchment-dark opacity-30">·</span>
            <a
              href="/terms"
              className="font-fell italic text-[0.7rem] tracking-[0.1em] text-parchment-dark opacity-70 hover:opacity-100 hover:text-amber transition-colors no-underline"
            >
              Terms of Service
            </a>
          </div>
          <p className="font-fell italic text-[0.6rem] tracking-[0.1em] text-parchment-dark opacity-40">
            &copy; {new Date().getFullYear()} Dharma Universal Inc. &middot; All
            rights reserved
          </p>
        </footer>
      </body>
    </html>
  );
}
