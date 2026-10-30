"use client";

import { useEffect, useState } from "react";

/** Headline line two cycles through what Radahn remembers (design.md §6.1 "Text Morphing"). */
const PHRASES = ["what you decided.", "what you prefer.", "what changed.", "when to forget."];

export function MorphWord() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((x) => (x + 1) % PHRASES.length), 2600);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="relative inline-block text-ink-2" aria-live="off">
      <span key={i} className="inline-block animate-[blur-in_600ms_var(--ease-out)_both]">
        {PHRASES[i]}
      </span>
      <span className="sr-only">{PHRASES.join(" ")}</span>
    </span>
  );
}
