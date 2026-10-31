"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  sensitive: "Looks like sensitive information (health, finances, location, or another person's details).",
  personal: "Personal preference or constraint flagged for your review.",
  none: "Radahn wasn't confident enough to save this automatically.",
};

/**
 * Rolling odometer digits (adapted from Catalog #4 Approval Card, lines 778–850).
 * Changes roll up or down smoothly when the index updates.
 */
function RollingDigits({ value }: { value: string }) {
  const prevRef = useRef(value);
  const [oldVal, setOldVal] = useState(value);
  const [newVal, setNewVal] = useState(value);
  const [rolling, setRolling] = useState(false);
  const [shifted, setShifted] = useState(false);
  const [dir, setDir] = useState<"up" | "down">("up");

  useEffect(() => {
    if (prevRef.current === value) return;
    const from = prevRef.current;
    prevRef.current = value;
    const fromN = parseInt(from, 10);
    const toN = parseInt(value, 10);
    setDir(Number.isFinite(fromN) && Number.isFinite(toN) && toN < fromN ? "down" : "up");
    setOldVal(from);
    setNewVal(value);
    setRolling(true);
    setShifted(false);

    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setShifted(true));
    });
    const done = setTimeout(() => {
      setRolling(false);
      setOldVal(value);
      setShifted(false);
    }, 400);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(done);
    };
  }, [value]);

  const chars = rolling ? newVal : oldVal;

  return (
    <span className="inline-flex items-baseline" aria-label={value}>
      {Array.from({ length: chars.length }, (_, i) => {
        const o = oldVal[i] ?? "";
        const n = chars[i] ?? "";
        if (!rolling || o === n) {
          return <span key={`${i}-${n}`}>{n}</span>;
        }
        const top = dir === "down" ? n : o;
        const bottom = dir === "down" ? o : n;
        const restY = dir === "down" ? "0" : "-1em";
        const startY = dir === "down" ? "-1em" : "0";
        return (
          <span
            key={`${i}-${o}-${n}-${dir}`}
            className="relative inline-block h-[1em] overflow-hidden leading-[1em] align-[-0.05em]"
          >
            <span
              className="flex flex-col transition-transform duration-350 ease-out"
              style={{
                transform: `translateY(${shifted ? restY : startY})`,
                transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              <span className="h-[1em] leading-[1em]">{top}</span>
              <span className="h-[1em] leading-[1em]">{bottom}</span>
            </span>
          </span>
        );
      })}
    </span>
  );
}

/**
 * ReviewStack (tasks B2 & G5).
 * Approval Card adapted from Catalog #4 (lines 718–1138):
 * - Stack depth visuals with smooth odometer step counter
 * - Statement editor with clear typography
 * - Why-held callout and source quote
 * - Pill actions (Skip, Drop, Keep) with keyboard shortcuts
 * - Preserves every fetch call and request body
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
    const r = await fetch(`/api/memories/${item.id}/review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision, edits }),
    });
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

  if (!item) {
    return (
      <div className="mt-8 rounded-card border border-line bg-surface p-8 text-center shadow-card sm:p-10">
        <p className="font-serif text-[24px] text-ink">Nothing to review.</p>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          {done.length
            ? `You decided ${done.length} item${done.length > 1 ? "s" : ""}. Radahn will ask here when it is unsure.`
            : "Radahn will ask here when it is unsure about a memory or needs your approval."}
        </p>
      </div>
    );
  }

  const type = item.type as MemoryTypeName;
  const isEdited = text.trim() !== item.statement;

  return (
    <div className="relative mt-8">
      {/* stacked cards depth effect (Approval Card pattern) */}
      {items.length > 1 ? (
        <div aria-hidden className="absolute inset-x-3 -bottom-2 h-full rounded-card border border-line/40 bg-surface opacity-60 shadow-card" />
      ) : null}
      {items.length > 2 ? (
        <div aria-hidden className="absolute inset-x-6 -bottom-4 h-full rounded-card border border-line/20 bg-surface opacity-30 shadow-card" />
      ) : null}

      <article
        key={item.id}
        className="relative animate-pop-in rounded-card border border-line bg-surface-2 p-6 shadow-overlay sm:p-8"
        aria-label="Memory awaiting approval"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TypeSwatch type={type} size={14} label />
            {item.spaceName ? <span className="text-[13px] text-ink-3">· {item.spaceName}</span> : null}
            {item.demo ? <span className="text-[12px] font-medium text-ink-3">· DEMO</span> : null}
          </div>
          <span className="font-mono text-[12px] tabular text-ink-3">
            <RollingDigits value={String(index + 1)} /> of {items.length}
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
          className="mt-4 w-full resize-none rounded-control border border-transparent bg-transparent font-serif text-[20px] leading-snug text-ink transition-colors hover:border-line focus:border-line-strong focus:bg-canvas/50 focus:p-2 sm:text-[22px]"
          placeholder="Memory statement..."
        />

        {/* Why held banner */}
        <div className="mt-4 rounded-control bg-[color-mix(in_srgb,var(--orange)_10%,transparent)] px-3.5 py-2.5 text-[13.5px] leading-relaxed text-ink-2">
          <span className="mr-2 font-medium text-orange">Why held:</span>
          {WHY[item.sensitivity] ?? WHY.none}
        </div>

        {/* Source quote */}
        {item.source.quote ? (
          <blockquote className="mt-4 border-l-2 border-line-strong pl-3 text-[13.5px] italic text-ink-3">
            &ldquo;{item.source.quote}&rdquo;
          </blockquote>
        ) : null}

        {/* Action buttons (pill actions) */}
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Button
            variant="accent"
            size="md"
            kbd="↵"
            onClick={() => decide("approve")}
            disabled={busy}
            className="min-h-[44px] min-w-[120px] px-5 text-[14px]"
          >
            {isEdited ? "Keep edited" : "Keep"}
          </Button>
          <Button
            variant="secondary"
            size="md"
            kbd="X"
            onClick={() => decide("reject")}
            disabled={busy}
            className="min-h-[44px] min-w-[100px] px-5 text-[14px]"
          >
            Drop
          </Button>
          {items.length > 1 ? (
            <Button
              variant="ghost"
              size="md"
              onClick={skip}
              className="min-h-[44px] px-4 text-[14px]"
            >
              Skip <Kbd className="ml-1.5">S</Kbd>
            </Button>
          ) : null}
        </div>

        <p className="mt-5 text-[13px] text-ink-3">
          {MEMORY_TYPE_META[type].blurb} · Keeping this makes it usable in your next answers.
        </p>
      </article>
    </div>
  );
}
