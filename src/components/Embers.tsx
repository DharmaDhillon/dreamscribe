"use client";

import { useEffect, useRef } from "react";

export default function Embers() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    for (let i = 0; i < 30; i++) {
      const ember = document.createElement("div");
      ember.className = "ember";
      const startX = 40 + (Math.random() - 0.5) * 15;
      ember.style.cssText = `
        --start-x:${startX}%;
        --start-y:${10 + Math.random() * 5}%;
        --drift:${(Math.random() - 0.5) * 80}px;
        --d:${4 + Math.random() * 6}s;
        --delay:${Math.random() * 6}s;
        width:${1 + Math.random() * 2}px;
        height:${1 + Math.random() * 2}px;
      `;
      el.appendChild(ember);
    }
    return () => {
      el.innerHTML = "";
    };
  }, []);

  return <div className="embers-container" ref={ref} />;
}
