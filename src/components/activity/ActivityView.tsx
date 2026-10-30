"use client";

import { Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, TypeSwatch } from "@/components/atoms";
import { useLive, type LiveEvent } from "@/components/realtime/LiveProvider";
import { MEMORY_TYPE_META, type MemoryTypeName } from "@/lib/memory-types";
import { cn } from "@/lib/utils";

interface Insights {
  byType: Array<{ type: MemoryTypeName; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
  recallHitRate: number;
  correctionsThisWeek: number;
  storageBytes: number;
}
interface Reflection {
  id: string;
  trigger: string;
  status: string;
  steps: Array<{ name: string; status: string; detail?: string }>;
  outputs: { merged: string[]; observations: string[]; strategies: string[] };
  startedAt: string;
}

const ACTOR_TONE: Record<string, string> = { user: "text-ink", radahn: "text-t-feedback", reflection: "text-t-strategy", external_agent: "text-t-outcome", system: "text-ink-3" };

/** Activity (design.md §6.8, PRD F-40): insights, reflection runs as task rows, live event feed. */
export function ActivityView() {
  const live = useLive();
  const [base, setBase] = useState<{ events: LiveEvent[]; insights: Insights | null; reflections: Reflection[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reflecting, setReflecting] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/activity");
    if (!r.ok) {
      setError("Couldn't load activity.");
      return;
    }
    setBase(await r.json());
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/activity")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => alive && setBase(j))
      .catch(() => alive && setError("Couldn't load activity."));
    return () => {
      alive = false;
    };
  }, []);

  const events = useMemo(() => {
    const seen = new Set<string>();
    return [...[...live.events].reverse(), ...(base?.events ?? [])].filter((e) => !seen.has(e.id) && seen.add(e.id)).slice(0, 120);
  }, [live.events, base]);

  async function reflect() {
    setReflecting(true);
    await fetch("/api/reflect", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    await load();
    setReflecting(false);
  }

  const ins = base?.insights;
  const total = ins?.byType.reduce((n, t) => n + t.count, 0) ?? 0;

  return (
    <main className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[1100px] px-5 pb-20 pt-8 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-[34px] leading-none tracking-[-0.01em]">Activity</h1>
            <p className="mono-label mt-3 flex items-center gap-2 text-[10.5px] text-ink-3">
              <span className={cn("size-1.5 rounded-full", live.connected ? "bg-green" : "bg-ink-3")} />
              {live.connected ? "Live · MongoDB change stream" : "Reconnecting…"}
            </p>
          </div>
          <Button variant="accent" size="sm" icon={<Sparkles className="size-3.5" />} onClick={reflect} disabled={reflecting}>
            {reflecting ? "Reflecting…" : "Reflect now"}
          </Button>
        </div>
        {error ? <p className="mt-6 text-[13px] text-red">{error}</p> : null}

        <section className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-card bg-line shadow-card md:grid-cols-4">
          <Stat label="Memories" value={base ? String(total) : "—"}>
            <div className="mt-3 flex h-2 overflow-hidden rounded-full">
              {ins?.byType.map((t) => (
                <span key={t.type} title={`${t.type} ${t.count}`} style={{ flexGrow: t.count, background: `var(${MEMORY_TYPE_META[t.type]?.colorVar ?? "--ink-3"})` }} />
              ))}
            </div>
          </Stat>
          <Stat label="Recall hit rate" value={ins ? `${Math.round(ins.recallHitRate * 100)}%` : "—"} note="cited ÷ recalled" />
          <Stat label="Corrections" value={ins ? String(ins.correctionsThisWeek) : "—"} note="this week" />
          <Stat label="Storage" value={ins ? `${(ins.storageBytes / 1024).toFixed(0)} KB` : "—"} note="of 512 MB (M0)" />
        </section>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <section>
            <h2 className="mono-label mb-3 text-[10.5px] text-ink-3">Reflection runs</h2>
            {!base?.reflections.length ? (
              <p className="text-[13px] leading-relaxed text-ink-3">
                No reflections yet. Reflection merges duplicates, writes observations with evidence, and turns repeated feedback into learned behaviour.
              </p>
            ) : (
              <ol className="flex flex-col gap-4">
                {base.reflections.map((r) => (
                  <li key={r.id} className="rounded-card bg-surface p-4 shadow-card">
                    <p className="mono-label flex justify-between text-[10px] text-ink-3">
                      <span>{r.trigger} · {r.status}</span>
                      <span>{new Date(r.startedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                    </p>
                    <ul className="mt-3 flex flex-col gap-1.5">
                      {r.steps.map((s) => (
                        <li key={s.name} className="flex items-center gap-2.5 text-[12.5px]">
                          <span className={cn("size-2 rounded-full", s.status === "done" ? "bg-green" : s.status === "running" ? "animate-pixel-on bg-t-preference" : s.status === "failed" ? "bg-red" : "bg-ink-3")} />
                          <span className="w-24 capitalize text-ink">{s.name}</span>
                          <span className="truncate text-ink-3">{s.detail}</span>
                        </li>
                      ))}
                    </ul>
                    {r.outputs.strategies.length || r.outputs.observations.length || r.outputs.merged.length ? (
                      <ul className="mt-3 flex flex-col gap-1 border-t border-line pt-3 text-[12.5px] text-ink-2">
                        {r.outputs.strategies.map((s) => (
                          <li key={s} className="flex gap-2"><TypeSwatch type="strategy" size={12} className="mt-[3px]" />{s}</li>
                        ))}
                        {r.outputs.observations.map((s) => (
                          <li key={s} className="flex gap-2"><TypeSwatch type="observation" size={12} className="mt-[3px]" />{s}</li>
                        ))}
                        {r.outputs.merged.map((s) => (
                          <li key={s} className="flex gap-2 text-ink-3"><span className="mono-label text-[9px]">merged</span>{s}</li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section>
            <h2 className="mono-label mb-3 text-[10.5px] text-ink-3">Live events</h2>
            {events.length === 0 ? (
              <p className="text-[13px] text-ink-3">{base ? "No memory events yet. Chat with Radahn and watch them land here." : "Loading…"}</p>
            ) : (
              <ol className="flex flex-col" aria-live="polite">
                {events.map((e) => (
                  <li key={e.id} className="flex animate-fade-up items-start gap-3 border-b border-line py-2.5 last:border-0">
                    <span className="w-12 shrink-0 pt-px font-mono text-[11px] tabular text-ink-3">
                      {new Date(e.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {e.type ? <TypeSwatch type={e.type as MemoryTypeName} size={12} className="mt-[3px]" /> : <span className="mt-[3px] size-3 shrink-0" />}
                    <span className={cn("mono-label w-20 shrink-0 pt-px text-[9.5px]", ACTOR_TONE[e.actor.kind] ?? "text-ink-3")}>{e.actor.name}</span>
                    <span className="min-w-0 flex-1 text-[12.5px] text-ink-2">
                      <span className="mono-label mr-2 text-[9.5px] text-ink-3">{e.kind}</span>
                      {e.summary}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value, note, children }: { label: string; value: string; note?: string; children?: React.ReactNode }) {
  return (
    <div className="bg-surface px-5 py-4">
      <p className="mono-label text-[9.5px] text-ink-3">{label}</p>
      <p className="mt-1.5 font-serif text-[28px] leading-none tabular">{value}</p>
      {note ? <p className="mt-1.5 text-[11.5px] text-ink-3">{note}</p> : null}
      {children}
    </div>
  );
}
