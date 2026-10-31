"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, TypeSwatch } from "@/components/atoms";
import type { MemoryTypeName } from "@/lib/memory-types";
import { timeAgo } from "@/lib/utils";

interface Side {
  id: string;
  type: string;
  statement: string;
  updatedAt: string;
  demo?: boolean;
}

interface Pair {
  id: string;
  left: Side;
  right: Side;
  similarity: number;
  reason: "same_slot" | "model";
}

/**
 * Signal / similarity meter adapted from Catalog #9 (Recommendation Card, lines 2803–2815).
 */
function SignalMeter({ signal, tone = "var(--orange)" }: { signal: number; tone?: string }) {
  const activeCount = signal >= 0.8 ? 3 : signal >= 0.4 ? 2 : 1;
  return (
    <span className="flex items-end gap-1" title={`${Math.round(signal * 100)}% similarity signal`}>
      {[1, 2, 3].map((bar) => (
        <span
          key={bar}
          className="w-1 rounded-full transition-colors duration-300"
          style={{
            height: 7 + bar * 2.5,
            background: bar <= activeCount ? tone : "var(--line-strong)",
          }}
        />
      ))}
    </span>
  );
}

/**
 * ConflictList (tasks B2 & G5).
 * Recommendation Card adapted from Catalog #9 (lines 2716–2911):
 * - Clear question: "Which is current?"
 * - Signal meter displaying match strength
 * - Recommendation options side by side on desktop, stacked on mobile
 * - Prominent "Keep this as current" actions and "Keep both" alternative
 * - Preserves all fetch URLs, payloads, and state behavior
 */
export function ConflictList() {
  const router = useRouter();
  const [pairs, setPairs] = useState<Pair[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  function loadConflicts() {
    setFailed(false);
    fetch("/api/conflicts")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d: { conflicts: Pair[] }) => setPairs(d.conflicts))
      .catch(() => setFailed(true));
  }

  useEffect(() => {
    let live = true;
    fetch("/api/conflicts")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d: { conflicts: Pair[] }) => live && setPairs(d.conflicts))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);

  async function resolveKeep(pair: Pair, keepSide: "left" | "right") {
    const keepSideObj = keepSide === "left" ? pair.left : pair.right;
    const dropSideObj = keepSide === "left" ? pair.right : pair.left;
    setBusy(pair.id);
    const r = await fetch("/api/conflicts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ keepId: keepSideObj.id, dropIds: [dropSideObj.id] }),
    });
    setBusy(null);
    if (!r.ok) return;
    setPairs((p) => p?.filter((x) => x.id !== pair.id && x.left.id !== dropSideObj.id && x.right.id !== dropSideObj.id) ?? null);
    router.refresh();
  }

  function keepBoth(pair: Pair) {
    // Both items remain active in memory without superseding either one
    setPairs((p) => p?.filter((x) => x.id !== pair.id) ?? null);
  }

  return (
    <section className="mt-14" aria-busy={pairs === null && !failed}>
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-[22px] text-ink">Contradictions</h2>
        {pairs && pairs.length > 0 ? (
          <span className="text-[13px] text-ink-3">
            {pairs.length} {pairs.length === 1 ? "pair" : "pairs"} found
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-[14px] text-ink-2">
        When two memories disagree, pick which one is current. The other becomes history.
      </p>

      {failed ? (
        <div className="mt-4 rounded-card border border-line bg-surface p-6 text-center shadow-card">
          <p className="text-[14px] text-red">Couldn&apos;t check for contradictions right now.</p>
          <Button variant="secondary" size="sm" onClick={loadConflicts} className="mt-3">
            Try again
          </Button>
        </div>
      ) : pairs === null ? (
        <div className="mt-4 rounded-card border border-line bg-surface p-6 text-center shadow-card">
          <p className="text-[14px] text-ink-3">Checking memories for contradictions…</p>
        </div>
      ) : pairs.length === 0 ? (
        <div className="mt-4 rounded-card border border-line bg-surface p-6 text-center shadow-card">
          <p className="text-[14px] text-ink-3">No conflicting memories found. All facts are in agreement.</p>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-6">
          {pairs.map((pair) => (
            <li
              key={pair.id}
              className="overflow-hidden rounded-card border border-line bg-surface p-5 shadow-card sm:p-6"
            >
              {/* Card top banner with SignalMeter */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3.5">
                <div>
                  <span className="text-[14px] font-medium text-ink">Which is current?</span>
                  <p className="mt-0.5 text-[12.5px] text-orange">
                    {pair.reason === "same_slot"
                      ? "Same fact with different values"
                      : "These statements contradict each other"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <SignalMeter signal={pair.similarity} />
                  <span className="font-mono text-[11px] tabular text-ink-3">
                    {Math.round(pair.similarity * 100)}% match
                  </span>
                </div>
              </div>

              {/* Recommendation options comparison: side by side on desktop, stacked on mobile */}
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {/* Left Option */}
                <div className="flex flex-col justify-between rounded-control border border-line bg-surface-2 p-4 transition-colors hover:border-line-strong">
                  <div>
                    <div className="flex items-center gap-2">
                      <TypeSwatch type={pair.left.type as MemoryTypeName} size={13} label />
                      {pair.left.demo ? <span className="text-[11.5px] text-ink-3">· DEMO</span> : null}
                    </div>
                    <p className="mt-3 font-serif text-[16px] leading-snug text-ink sm:text-[17px]">
                      {pair.left.statement}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3">
                    <span className="font-mono text-[11px] text-ink-3">{timeAgo(pair.left.updatedAt)}</span>
                    <Button
                      variant="accent"
                      size="sm"
                      disabled={busy === pair.id}
                      onClick={() => resolveKeep(pair, "left")}
                      className="min-h-[36px] px-3.5 text-[13px]"
                    >
                      Keep this as current
                    </Button>
                  </div>
                </div>

                {/* Right Option */}
                <div className="flex flex-col justify-between rounded-control border border-line bg-surface-2 p-4 transition-colors hover:border-line-strong">
                  <div>
                    <div className="flex items-center gap-2">
                      <TypeSwatch type={pair.right.type as MemoryTypeName} size={13} label />
                      {pair.right.demo ? <span className="text-[11.5px] text-ink-3">· DEMO</span> : null}
                    </div>
                    <p className="mt-3 font-serif text-[16px] leading-snug text-ink sm:text-[17px]">
                      {pair.right.statement}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3">
                    <span className="font-mono text-[11px] text-ink-3">{timeAgo(pair.right.updatedAt)}</span>
                    <Button
                      variant="accent"
                      size="sm"
                      disabled={busy === pair.id}
                      onClick={() => resolveKeep(pair, "right")}
                      className="min-h-[36px] px-3.5 text-[13px]"
                    >
                      Keep this as current
                    </Button>
                  </div>
                </div>
              </div>

              {/* Bottom alternative action */}
              <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-3">
                <Button
                  variant="quiet"
                  size="xs"
                  onClick={() => keepBoth(pair)}
                  className="text-[12.5px] text-ink-3 hover:text-ink"
                >
                  Keep both as active
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
