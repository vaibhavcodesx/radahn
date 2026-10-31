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
 * Contradictions (PRD F-23, engine C11): two live memories that can't both be true. Keeping one
 * supersedes the other with history, so the choice is reversible from the memory's detail page.
 */
export function ConflictList() {
  const router = useRouter();
  const [pairs, setPairs] = useState<Pair[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

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

  async function keep(pair: Pair, side: Side) {
    const drop = side.id === pair.left.id ? pair.right : pair.left;
    setBusy(pair.id);
    const r = await fetch("/api/conflicts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ keepId: side.id, dropIds: [drop.id] }) });
    setBusy(null);
    if (!r.ok) return;
    setPairs((p) => p?.filter((x) => x.id !== pair.id && x.left.id !== drop.id && x.right.id !== drop.id) ?? null);
    router.refresh();
  }

  return (
    <section className="mt-14" aria-busy={pairs === null && !failed}>
      <h2 className="mono-label mb-3 text-[10.5px] text-ink-3">Contradictions · pick what&apos;s true</h2>
      {failed ? (
        <p className="text-[13px] text-ink-3">Couldn&apos;t check for contradictions right now. Reload to try again.</p>
      ) : pairs === null ? (
        <p className="text-[13px] text-ink-3">Checking recent memories for contradictions…</p>
      ) : pairs.length === 0 ? (
        <p className="text-[13px] text-ink-3">No contradictions in your recent memories.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pairs.map((pair) => (
            <li key={pair.id} className="rounded-card bg-surface p-4 shadow-card">
              <p className="mono-label mb-3 text-[9.5px] text-orange">
                {pair.reason === "same_slot" ? "Same fact, different values" : "These can't both be true"} · {Math.round(pair.similarity * 100)}% similar
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[pair.left, pair.right].map((side) => (
                  <div key={side.id} className="flex flex-col gap-3 rounded-control bg-surface-2 p-3">
                    <p className="flex items-start gap-2 text-[13.5px] leading-snug text-ink">
                      <TypeSwatch type={side.type as MemoryTypeName} size={13} className="mt-[3px]" />
                      {side.statement}
                    </p>
                    <div className="mt-auto flex items-center justify-between gap-2">
                      <span className="font-mono text-[10.5px] text-ink-3">
                        {timeAgo(side.updatedAt)}
                        {side.demo ? " · DEMO" : ""}
                      </span>
                      <Button variant="secondary" size="sm" disabled={busy === pair.id} onClick={() => keep(pair, side)}>
                        Keep this
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
