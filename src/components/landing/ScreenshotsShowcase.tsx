"use client";

import Image from "next/image";
import { useState, useSyncExternalStore } from "react";

const SCREENS = [
  {
    id: "chat",
    tab: "Chat & Memory Lens",
    title: "Chat with Memory Lens open",
    caption:
      "Every reply shows which memories shaped it. Citations link directly to the underlying memory with score breakdowns.",
    src: "/screens/chat-memory.webp",
    srcDark: "/screens/chat-memory-dark.webp",
    alt: "Radahn chat interface with the Memory Lens open showing recalled memories and scoring",
  },
  {
    id: "memory",
    tab: "Memory Atlas",
    title: "The full memory table",
    caption:
      "All active, superseded, and expiring memories organized in one place. Filter by type, space, or lifecycle.",
    src: "/screens/memory-list.webp",
    srcDark: "/screens/memory-list-dark.webp",
    alt: "Radahn Memory Atlas listing typed memory units with scores, spaces, and timestamps",
  },
  {
    id: "review",
    tab: "Review Queue",
    title: "Approval before storage",
    caption:
      "Sensitive facts, credentials, and conflicting updates are held here. Nothing enters long-term memory without you.",
    src: "/screens/review-queue.webp",
    srcDark: "/screens/review-queue-dark.webp",
    alt: "Radahn review queue showing pending memory items waiting for user approval",
  },
];

function useCurrentTheme(): "dark" | "light" {
  return useSyncExternalStore(
    (cb) => {
      if (typeof window === "undefined") return () => {};
      const mo = new MutationObserver(cb);
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      mql.addEventListener("change", cb);
      return () => {
        mo.disconnect();
        mql.removeEventListener("change", cb);
      };
    },
    () => {
      if (typeof document === "undefined") return "dark";
      const dt = document.documentElement.dataset.theme;
      if (dt === "light") return "light";
      if (dt === "dark") return "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    },
    () => "dark",
  );
}

export function ScreenshotsShowcase() {
  const [active, setActive] = useState(0);
  const theme = useCurrentTheme();
  const current = SCREENS[active];
  const isDark = theme === "dark";

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
                id={`tab-${s.id}`}
                aria-selected={active === idx}
                aria-controls={`panel-${s.id}`}
                onClick={() => setActive(idx)}
                className={`flex min-h-[36px] items-center rounded-full px-4 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-1 ${
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
          aria-labelledby={`tab-${current.id}`}
          className="mt-8 overflow-hidden rounded-[16px] border border-line bg-surface shadow-overlay"
        >
          {/* Browser chrome header */}
          <div className="flex items-center justify-between border-b border-line bg-canvas/60 px-4 py-3">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="size-2.5 rounded-full bg-line-strong" />
              <span className="size-2.5 rounded-full bg-line-strong" />
              <span className="size-2.5 rounded-full bg-line-strong" />
            </div>
            <p className="font-mono text-[11.5px] text-ink-3">radahn.app</p>
            <div className="w-8" aria-hidden="true" />
          </div>

          {/* Screenshot image (theme-aware picture swap) */}
          <div className="relative aspect-[16/10] w-full bg-canvas">
            <picture className="block size-full">
              <source srcSet={current.srcDark} media="(prefers-color-scheme: dark)" />
              <Image
                src={isDark ? current.srcDark : current.src}
                alt={current.alt}
                width={1440}
                height={900}
                sizes="(max-width: 1200px) 100vw, 1200px"
                priority={active === 0}
                className="size-full object-cover object-top"
              />
            </picture>
          </div>

          {/* Screenshot description */}
          <div className="flex flex-col justify-between gap-3 border-t border-line bg-surface p-6 sm:flex-row sm:items-center sm:p-7">
            <div>
              <p className="font-serif text-[20px] leading-snug text-ink sm:text-[22px]">
                {current.title}
              </p>
              <p className="mt-1.5 max-w-[68ch] text-[14.5px] leading-relaxed text-ink-2">
                {current.caption}
              </p>
            </div>
            <span className="shrink-0 font-mono text-[11.5px] tabular text-ink-3">
              {active + 1} / {SCREENS.length}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
