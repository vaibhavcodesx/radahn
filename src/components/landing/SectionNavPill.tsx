"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import React, { useState } from "react";

const SECTIONS = [
  { id: "proof", label: "Proof" },
  { id: "screens", label: "Product" },
  { id: "how", label: "How it works" },
  { id: "trust", label: "Control" },
];

export function SectionNavPill() {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const scrollToSection = (id: string, idx: number) => {
    setActiveIdx(idx);
    const el = document.getElementById(id);
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  };

  const step = (dir: -1 | 1) => {
    const current = activeIdx ?? 0;
    const nextIdx = (current + dir + SECTIONS.length) % SECTIONS.length;
    scrollToSection(SECTIONS[nextIdx].id, nextIdx);
  };

  return (
    <nav
      aria-label="Page sections"
      className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-line/60 bg-surface-2/95 p-1 shadow-overlay backdrop-blur-md"
    >
      <button
        type="button"
        onClick={() => step(-1)}
        className="flex size-7 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
        aria-label="Previous section"
      >
        <ChevronLeft className="size-3.5" />
      </button>

      {SECTIONS.map(({ id, label }, idx) => (
        <a
          key={id}
          href={`#${id}`}
          onClick={(e) => {
            e.preventDefault();
            scrollToSection(id, idx);
          }}
          className="mono-label flex min-h-[30px] items-center rounded-full px-3 py-1 text-[11px] text-ink-2 transition-colors hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
        >
          {label}
        </a>
      ))}

      <button
        type="button"
        onClick={() => step(1)}
        className="flex size-7 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
        aria-label="Next section"
      >
        <ChevronRight className="size-3.5" />
      </button>
    </nav>
  );
}
