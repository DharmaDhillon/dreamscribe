"use client";

import { useEffect, useRef } from "react";

export default function FeatherCursor() {
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (dotRef.current) {
        dotRef.current.style.left = e.clientX - 3 + "px";
        dotRef.current.style.top = e.clientY - 3 + "px";
      }
    };

    document.addEventListener("mousemove", onMouseMove);
    return () => document.removeEventListener("mousemove", onMouseMove);
  }, []);

  return <div className="cursor-dot" ref={dotRef} />;
}
