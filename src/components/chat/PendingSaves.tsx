"use client";

import { useEffect, useState } from "react";
import { TypeSwatch } from "@/components/atoms";
import type { LiveEvent } from "@/components/realtime/LiveProvider";
import type { MemoryTypeName } from "@/lib/memory-types";

interface Item {
  id: string;
  type: MemoryTypeName;
  statement: string;
}

/**
 * "Save this to memory?" right above the composer (PRD F-23, inline). When the last turn produced
 * memories the engine wasn't sure about (sensitive or low-confidence → pending_review), ask now
 * instead of making the user find the Review page. Decisions use the same review endpoint.
 */
export function PendingSaves({ events }: { events: LiveEvent[] }) {
  const ids = [...new Set(events.filter((e) => e.kind === "pending" && e.memoryId).map((e) => e.memoryId!))];
  const key = ids.join(",");
  const [items, setItems] = useState<Item[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!key) return;
    let live = true;
    Promise.all(
      key.split(",").map((id) =>
        fetch(`/api/memories/${id}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => (d?.memory?.status === "pending_review" ? { id, type: d.memory.type, statement: d.memory.statement } : null))
          .catch(() => null),
      ),
    ).then((rows) => live && setItems(rows.filter((r): r is Item => Boolean(r))));
    return () => {
      live = false;
    };
  }, [key]);

  async function decide(item: Item, decision: "approve" | "reject") {
    setDone((d) => new Set(d).add(item.id));
    await fetch(`/api/memories/${item.id}/review`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision }) }).catch(() => {});
  }

  const open = items.filter((i) => !done.has(i.id));
  if (!open.length) return null;
  const item = open[0];
  return (
    <div className="mb-2 flex animate-fade-up flex-wrap items-center gap-x-3 gap-y-2 rounded-card bg-surface px-4 py-3 shadow-card" role="region" aria-label="Memory awaiting your decision">
      <TypeSwatch type={item.type} size={13} />
      <p className="min-w-0 flex-1 text-[14px] text-ink">
        <span className="text-ink-3">Remember this? </span>
        {item.statement}
      </p>
      <div className="flex items-center gap-1.5">
        <button onClick={() => decide(item, "approve")} className="h-8 rounded-full bg-accent px-3.5 text-[13px] font-medium text-accent-ink">
          Remember
        </button>
        <button onClick={() => decide(item, "reject")} className="h-8 rounded-full px-3.5 text-[13px] text-ink-2 shadow-[inset_0_0_0_1px_var(--line-strong)] hover:bg-hover">
          Don&apos;t
        </button>
        {open.length > 1 ? <span className="ml-1 text-[12px] text-ink-3 tabular">+{open.length - 1}</span> : null}
      </div>
    </div>
  );
}
