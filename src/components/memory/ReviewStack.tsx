"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Kbd, TypeSwatch } from "@/components/atoms";
import { MEMORY_TYPE_META, type MemoryTypeName } from "@/lib/memory-types";

interface Item {
  id: string;
  type: string;
  statement: string;
  sensitivity: string;
  confidence: number;
  spaceName: string;
  source: { quote?: string; actor: { name: string } };
  demo?: boolean;
}

const WHY: Record<string, string> = {
  sensitive: "Looks like sensitive information (health, money, location, or someone else's details).",
  personal: "Personal detail — kept for review under your policy.",
  none: "Radahn wasn't confident enough to save this on its own.",
};

/**
 * Approval cards, one at a time (design.md §6.7, PRD F-23). Approve makes the unit recallable
 * immediately; reject drops it (purged by TTL after 24 h). Enter approves, X rejects, S skips.
 */
export function ReviewStack({ items: initial }: { items: Item[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [index, setIndex] = useState(0);
  const [text, setText] = useState(initial[0]?.statement ?? "");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Array<{ statement: string; decision: string }>>([]);
  const item = items[index];

  async function decide(decision: "approve" | "reject") {
    if (!item || busy) return;
    setBusy(true);
    const edits = decision === "approve" && text.trim() !== item.statement ? { statement: text.trim() } : undefined;
    const r = await fetch(`/api/memories/${item.id}/review`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision, edits }) });
    setBusy(false);
    if (!r.ok) return;
    setDone((d) => [...d, { statement: edits?.statement ?? item.statement, decision }]);
    const next = items.filter((x) => x.id !== item.id);
    setItems(next);
    const ni = Math.min(index, Math.max(0, next.length - 1));
    setIndex(ni);
    setText(next[ni]?.statement ?? "");
    router.refresh();
  }

  function skip() {
    if (items.length < 2) return;
    const ni = (index + 1) % items.length;
    setIndex(ni);
    setText(items[ni].statement);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("textarea, input")) return;
      if (e.key === "Enter") void decide("approve");
      else if (e.key.toLowerCase() === "x") void decide("reject");
      else if (e.key.toLowerCase() === "s") skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!item)
    return (
      <div className="mt-10 rounded-card bg-surface p-8 text-center shadow-card">
        <p className="font-serif text-[22px]">All clear.</p>
        <p className="mt-2 text-[13px] text-ink-2">{done.length ? `You decided ${done.length} item${done.length > 1 ? "s" : ""}.` : "Nothing is waiting for your approval."}</p>
      </div>
    );

  const type = item.type as MemoryTypeName;
  return (
    <div className="relative mt-10">
      {/* stacked cards behind the current one */}
      {items.length > 1 ? <div aria-hidden className="absolute inset-x-4 -bottom-2 h-full rounded-card bg-surface opacity-60 shadow-card" /> : null}
      {items.length > 2 ? <div aria-hidden className="absolute inset-x-8 -bottom-4 h-full rounded-card bg-surface opacity-30 shadow-card" /> : null}
      <article key={item.id} className="relative animate-pop-in rounded-card bg-surface-2 p-6 shadow-overlay" aria-label="Memory awaiting approval">
        <div className="flex items-center justify-between">
          <p className="text-[12.5px] font-medium text-ink-3">Save this to memory?</p>
          <span className="font-mono text-[11px] tabular text-ink-3">
            {index + 1} / {items.length}
          </span>
        </div>
        <label htmlFor="review-statement" className="sr-only">
          Statement (editable)
        </label>
        <textarea
          id="review-statement"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={240}
          rows={3}
          className="mt-4 w-full resize-none bg-transparent font-serif text-[22px] leading-snug text-ink outline-none"
        />
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-ink-2">
          <TypeSwatch type={type} size={13} label />
          <span>{item.spaceName}</span>
          <span className="font-mono tabular">conf {item.confidence.toFixed(2)}</span>
          {item.demo ? <span className="text-[12.5px] font-medium text-ink-3">DEMO</span> : null}
        </div>
        <p className="mt-4 rounded-control bg-[color-mix(in_srgb,var(--orange)_10%,transparent)] px-3 py-2 text-[12.5px] text-ink-2">
          <span className="text-[12.5px] font-medium mr-2 text-orange">Why held</span>
          {WHY[item.sensitivity] ?? WHY.none}
        </p>
        {item.source.quote ? <blockquote className="mt-4 border-l-2 border-line-strong pl-3 text-[13px] italic text-ink-3">“{item.source.quote}”</blockquote> : null}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Button variant="accent" size="md" kbd="↵" onClick={() => decide("approve")} disabled={busy}>
            {text.trim() !== item.statement ? "Approve edited" : "Approve"}
          </Button>
          <Button variant="secondary" size="md" kbd="X" onClick={() => decide("reject")} disabled={busy}>
            Reject
          </Button>
          {items.length > 1 ? (
            <Button variant="ghost" size="md" onClick={skip}>
              Skip <Kbd className="ml-1">S</Kbd>
            </Button>
          ) : null}
        </div>
        <p className="mt-4 text-[11.5px] text-ink-3">{MEMORY_TYPE_META[type].blurb} · approving makes it usable in the next answer.</p>
      </article>
    </div>
  );
}
