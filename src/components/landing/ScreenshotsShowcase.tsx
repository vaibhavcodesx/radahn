"use client";

import Image from "next/image";
import { useState } from "react";

const SCREENS = [
  {
    id: "chat",
    tab: "Chat & Memory Lens",
    title: "Chat with Memory Lens open",
    caption:
      "Every reply shows which memories shaped it. Citations link directly to the underlying memory with score breakdowns.",
    src: "/screens/chat-memory.webp",
    alt: "Radahn chat interface with the Memory Lens open showing recalled memories and scoring",
  },
  {
    id: "memory",
    tab: "Memory Atlas",
    title: "The full memory table",
    caption:
      "All active, superseded, and expiring memories organized in one place. Filter by type, space, or lifecycle.",
    src: "/screens/memory-list.webp",
    alt: "Radahn Memory Atlas listing typed memory units with scores, spaces, and timestamps",
  },
  {
    id: "review",
    tab: "Review Queue",
    title: "Approval before storage",
    caption:
      "Sensitive facts, credentials, and conflicting updates are held here. Nothing enters long-term memory without you.",
    src: "/screens/review-queue.webp",
    alt: "Radahn review queue showing pending memory items waiting for user approval",
  },
];

export function ScreenshotsShowcase() {
  const [active, setActive] = useState(0);
  const current = SCREENS[active];

  return (
    <section id="screens" className="px-4 py-20 sm:px-6 md:px-10">
      <div className="mx-auto max-w-[1200px]">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="mono-label text-ink-3">Inside the product</p>
            <h2 className="mt-3 font-serif text-[clamp(32px,4vw,52px)] leading-[1.05] tracking-[-0.015em]">
              A memory engine you can see.
            </h2>
          </div>

          {/* Tab buttons */}
          <div
            role="tablist"
            aria-label="Product screenshots"
            className="flex flex-wrap gap-1 rounded-full bg-surface-2 p-1 shadow-card"
          >
            {SCREENS.map((s, idx) => (
              <button
                key={s.id}
                role="tab"
                aria-selected={active === idx}
                aria-controls={`panel-${s.id}`}
                onClick={() => setActive(idx)}
                className={`flex min-h-[36px] items-center rounded-full px-4 text-[13px] font-medium transition-colors ${
                  active === idx
                    ? "bg-accent text-accent-ink"
                    : "text-ink-2 hover:bg-hover hover:text-ink"
                }`}
              >
                {s.tab}
              </button>
            ))}
          </div>
        </div>

        {/* Browser framed showcase */}
        <div
          id={`panel-${current.id}`}
          role="tabpanel"
          className="mt-8 overflow-hidden rounded-[16px] border border-line bg-surface shadow-overlay"
        >
          {/* Browser chrome header */}
          <div className="flex items-center justify-between border-b border-line bg-canvas/60 px-4 py-3">
            <div className="flex items-center gap-1.5" aria-hidden>
              <span className="size-2.5 rounded-full bg-line-strong" />
              <span className="size-2.5 rounded-full bg-line-strong" />
              <span className="size-2.5 rounded-full bg-line-strong" />
            </div>
            <p className="font-mono text-[11.5px] text-ink-3">radahn.app</p>
            <div className="w-8" aria-hidden />
          </div>

          {/* Screenshot image */}
          <div className="relative aspect-[16/10] w-full bg-canvas">
            <Image
              src={current.src}
              alt={current.alt}
              width={1440}
              height={900}
              sizes="(max-width: 1200px) 100vw, 1200px"
              priority={active === 0}
              loading={active === 0 ? "eager" : "lazy"}
              className="h-full w-full object-cover object-top"
            />
          </div>

          {/* Caption */}
          <div className="border-t border-line bg-surface p-5 sm:p-6">
            <h3 className="font-serif text-[20px] text-ink">{current.title}</h3>
            <p className="mt-1.5 max-w-[70ch] text-[15px] leading-relaxed text-ink-2">
              {current.caption}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
