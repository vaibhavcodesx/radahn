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
  { kind: "created", label: "remembered", tone: "text-green" },
  { kind: "confirmed", label: "confirmed", tone: "text-ink-2" },
  { kind: "superseded", label: "updated", tone: "text-t-preference" },
  { kind: "pending", label: "to approve", tone: "text-orange" },
  { kind: "blocked", label: "kept private", tone: "text-red" },
  { kind: "forgotten", label: "forgotten", tone: "text-ink-2" },
];

export function WriteChips({ events, waiting }: { events: LiveEvent[]; waiting: boolean }) {
  const [open, setOpen] = useState(false);
  // Extraction usually lands in 2–6 s; after 8 s with nothing, stop showing a spinner — chips
  // still appear whenever the events arrive.
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    if (!waiting) return;
    const t = setTimeout(() => setExpired(true), 8_000);
    return () => clearTimeout(t);
  }, [waiting]);
  const pending = waiting && !expired;
  const counts = KINDS.map((k) => ({ ...k, n: events.filter((e) => e.kind === k.kind).length })).filter((k) => k.n > 0);

  if (counts.length === 0) {
    return pending ? (
      <p className="flex items-center gap-2 text-[12.5px] text-ink-3" aria-live="polite">
        <span className="inline-flex gap-0.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-1 animate-pixel-on rounded-[1px] bg-ink-3" style={{ animationDelay: `${i * 160}ms` }} />
          ))}
        </span>
        Saving to memory
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
          <span key={c.kind} className="flex items-center gap-1.5 text-[13px]">
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
            <li key={e.id} className="flex items-start gap-2 text-[13.5px] text-ink-2">
              {e.type ? <TypeSwatch type={e.type as MemoryTypeName} size={12} className="mt-[3px]" /> : <span className="mt-[3px] size-3" />}
              <span>{e.summary}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
