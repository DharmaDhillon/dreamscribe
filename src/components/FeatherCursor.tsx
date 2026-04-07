"use client";

import { useEffect, useRef } from "react";

export default function FeatherCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let rafId = 0;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let curX = targetX;
    let curY = targetY;

    const onMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      // Detect if cursor is over an interactive/text element to grow the spotlight
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const isInteractive = !!el?.closest(
        "a, button, input, textarea, [role='button'], h1, h2, h3, h4, p, li, span"
      );
      if (spotlightRef.current) {
        spotlightRef.current.dataset.active = isInteractive ? "true" : "false";
      }
    };

    const animate = () => {
      // Smooth easing
      curX += (targetX - curX) * 0.18;
      curY += (targetY - curY) * 0.18;

      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${curX - 4}px, ${curY - 4}px)`;
      }
      if (haloRef.current) {
        haloRef.current.style.transform = `translate(${curX - 75}px, ${curY - 75}px)`;
      }
      if (spotlightRef.current) {
        spotlightRef.current.style.setProperty("--cx", `${curX}px`);
        spotlightRef.current.style.setProperty("--cy", `${curY}px`);
      }

      rafId = requestAnimationFrame(animate);
    };

    document.addEventListener("mousemove", onMouseMove);
    rafId = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <>
      <div className="cursor-spotlight" ref={spotlightRef} />
      <div className="cursor-halo" ref={haloRef} />
      <div className="cursor-dot" ref={dotRef} />
    </>
  );
}
