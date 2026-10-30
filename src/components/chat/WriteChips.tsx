"use client";

import { useEffect, useState } from "react";
import { TypeSwatch } from "@/components/atoms";
import type { LiveEvent } from "@/components/realtime/LiveProvider";
import type { MemoryTypeName } from "@/lib/memory-types";
import { cn } from "@/lib/utils";

/**
 * Write chips under a reply (PRD F-13): `+2 REMEMBERED · 1 UPDATED · 1 NEEDS REVIEW · 1 BLOCKED`,
 * built from live memory events tagged with this turn's user message id. Expand to see each op.
 */
const KINDS: Array<{ kind: string; label: string; tone: string }> = [
  { kind: "created", label: "REMEMBERED", tone: "text-green" },
  { kind: "confirmed", label: "CONFIRMED", tone: "text-ink-2" },
  { kind: "superseded", label: "UPDATED", tone: "text-t-preference" },
  { kind: "pending", label: "NEEDS REVIEW", tone: "text-orange" },
  { kind: "blocked", label: "BLOCKED", tone: "text-red" },
  { kind: "forgotten", label: "FORGOTTEN", tone: "text-ink-2" },
];

export function WriteChips({ events, waiting }: { events: LiveEvent[]; waiting: boolean }) {
  const [open, setOpen] = useState(false);
  // Extraction usually lands in 2–6 s; after 20 s with nothing, the turn simply wrote nothing.
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    if (!waiting) return;
    const t = setTimeout(() => setExpired(true), 20_000);
    return () => clearTimeout(t);
  }, [waiting]);
  const pending = waiting && !expired;
  const counts = KINDS.map((k) => ({ ...k, n: events.filter((e) => e.kind === k.kind).length })).filter((k) => k.n > 0);

  if (counts.length === 0) {
    return pending ? (
      <p className="mono-label flex items-center gap-2 text-[10.5px] text-ink-3" aria-live="polite">
        <span className="inline-flex gap-0.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-1 animate-pixel-on rounded-[1px] bg-ink-3" style={{ animationDelay: `${i * 160}ms` }} />
          ))}
        </span>
        Updating memory…
      </p>
    ) : null;
  }

  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-fit flex-wrap items-center gap-1.5 rounded-chip px-1 py-0.5 hover:bg-hover"
      >
        {counts.map((c, i) => (
          <span key={c.kind} className="mono-label flex items-center gap-1.5 text-[10.5px]">
            {i > 0 ? <span className="text-ink-3">·</span> : null}
            <span className={cn("tabular", c.tone)}>
              {c.kind === "created" ? "+" : ""}
              {c.n} {c.label}
            </span>
          </span>
        ))}
      </button>
      {open ? (
        <ul className="flex animate-fade-up flex-col gap-1 border-l border-line pl-3">
          {events.map((e) => (
            <li key={e.id} className="flex items-start gap-2 text-[12.5px] text-ink-2">
              {e.type ? <TypeSwatch type={e.type as MemoryTypeName} size={12} className="mt-[3px]" /> : <span className="mt-[3px] size-3" />}
              <span>{e.summary}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
