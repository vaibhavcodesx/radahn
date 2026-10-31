"use client";

import {
  AlertCircle,
  Bookmark,
  CheckCircle2,
  Clock,
  Pin,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, TypeSwatch } from "@/components/atoms";
import { useLive, type LiveEvent } from "@/components/realtime/LiveProvider";
import { MEMORY_TYPE_META, type MemoryTypeName } from "@/lib/memory-types";
import { cn, timeAgo } from "@/lib/utils";

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
  outputs: Record<"merged" | "observations" | "strategies", Array<{ id: string; statement: string }>>;
  startedAt: string;
}

type FilterCategory = "all" | "saved" | "updated" | "reviewed" | "forgotten";

const FILTER_LABELS: Record<FilterCategory, string> = {
  all: "All",
  saved: "Saved",
  updated: "Updated",
  reviewed: "Reviewed",
  forgotten: "Forgotten",
};

function getDayGroup(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today.getTime() - eventDay.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(d);
}

function EventIcon({ kind }: { kind: string }) {
  const cls = "size-3.5 shrink-0";
  switch (kind) {
    case "created":
    case "confirmed":
      return <Bookmark className={cn(cls, "text-green")} />;
    case "pinned":
      return <Pin className={cn(cls, "text-t-goal")} />;
    case "updated":
    case "superseded":
      return <RefreshCw className={cn(cls, "text-t-preference")} />;
    case "reflected":
      return <Sparkles className={cn(cls, "text-t-strategy")} />;
    case "forgotten":
    case "purged":
      return <Trash2 className={cn(cls, "text-red")} />;
    case "expired":
      return <Clock className={cn(cls, "text-ink-3")} />;
    case "approved":
      return <CheckCircle2 className={cn(cls, "text-green")} />;
    case "rejected":
      return <XCircle className={cn(cls, "text-red")} />;
    case "pending":
      return <AlertCircle className={cn(cls, "text-orange")} />;
    case "blocked":
      return <ShieldAlert className={cn(cls, "text-red")} />;
    default:
      return <Bookmark className={cn(cls, "text-ink-3")} />;
  }
}

/**
 * ActivityView (design.md §6.8, task B3).
 * A readable timeline with day group headers, small icons per kind,
 * relative time on the right, statement as main text, quiet Live indicator,
 * compact filter segmented control, and loading/error/empty states.
 */
export function ActivityView() {
  const live = useLive();
  const [base, setBase] = useState<{ events: LiveEvent[]; insights: Insights | null; reflections: Reflection[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reflecting, setReflecting] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("all");

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await fetch("/api/activity");
      if (!r.ok) {
        setError("Couldn't load activity. Please try again.");
        return;
      }
      setBase(await r.json());
    } catch {
      setError("Couldn't load activity. Please check your connection.");
    }
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/activity")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => alive && setBase(j))
      .catch(() => alive && setError("Couldn't load activity. Please try again."));
    return () => {
      alive = false;
    };
  }, []);

  const allEvents = useMemo(() => {
    const seen = new Set<string>();
    return [...[...live.events].reverse(), ...(base?.events ?? [])]
      .filter((e) => !seen.has(e.id) && seen.add(e.id))
      .slice(0, 150);
  }, [live.events, base]);

  const filteredEvents = useMemo(() => {
    if (activeFilter === "all") return allEvents;
    return allEvents.filter((e) => {
      const k = e.kind;
      if (activeFilter === "saved") return k === "created" || k === "confirmed" || k === "pinned";
      if (activeFilter === "updated") return k === "updated" || k === "superseded" || k === "reflected";
      if (activeFilter === "reviewed") return k === "pending" || k === "approved" || k === "rejected" || k === "blocked";
      if (activeFilter === "forgotten") return k === "forgotten" || k === "expired" || k === "purged";
      return true;
    });
  }, [allEvents, activeFilter]);

  // Group events by day
  const groupedEvents = useMemo(() => {
    const groups: Array<{ day: string; events: LiveEvent[] }> = [];
    let currentDay = "";
    let currentList: LiveEvent[] = [];

    for (const event of filteredEvents) {
      const day = getDayGroup(event.at);
      if (day !== currentDay) {
        if (currentList.length > 0) {
          groups.push({ day: currentDay, events: currentList });
        }
        currentDay = day;
        currentList = [event];
      } else {
        currentList.push(event);
      }
    }
    if (currentList.length > 0) {
      groups.push({ day: currentDay, events: currentList });
    }
    return groups;
  }, [filteredEvents]);

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
      <div className="mx-auto w-full max-w-[1100px] px-4 pb-24 pt-8 sm:px-6 md:px-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-[32px] leading-none tracking-[-0.01em] sm:text-[36px]">Activity</h1>
              {live.connected ? (
                <span className="rounded-full bg-green/10 px-2.5 py-0.5 text-[12px] font-medium text-green">
                  Live
                </span>
              ) : (
                <span className="text-[12px] text-ink-3">Connecting…</span>
              )}
            </div>
            <p className="mt-2 text-[15px] text-ink-2">
              Everything Radahn remembers, updates, and forgets in real time.
            </p>
          </div>
          <Button
            variant="accent"
            size="sm"
            icon={<Sparkles className="size-3.5" />}
            onClick={reflect}
            disabled={reflecting}
            className="min-h-[38px] px-4"
          >
            {reflecting ? "Reflecting…" : "Reflect now"}
          </Button>
        </div>

        {/* Error state */}
        {error ? (
          <div className="mt-6 flex items-center justify-between rounded-control border border-red/20 bg-red/5 p-4 text-[14px] text-red">
            <span>{error}</span>
            <Button variant="secondary" size="xs" onClick={load}>
              Retry
            </Button>
          </div>
        ) : null}

        {/* Stats summary row */}
        <section className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line shadow-card md:grid-cols-4">
          <Stat label="Memories" value={base ? String(total) : "—"}>
            <div className="mt-3 flex h-2 overflow-hidden rounded-full">
              {ins?.byType.map((t) => (
                <span
                  key={t.type}
                  title={`${t.type}: ${t.count}`}
                  style={{ flexGrow: t.count, background: `var(${MEMORY_TYPE_META[t.type]?.colorVar ?? "--ink-3"})` }}
                />
              ))}
            </div>
          </Stat>
          <Stat label="Recall hit rate" value={ins ? `${Math.round(ins.recallHitRate * 100)}%` : "—"} note="cited of recalled" />
          <Stat label="Corrections" value={ins ? String(ins.correctionsThisWeek) : "—"} note="this week" />
          <Stat label="Storage" value={ins ? `${(ins.storageBytes / 1024).toFixed(0)} KB` : "—"} note="used capacity" />
        </section>

        {/* Main content grid */}
        <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr] [&>*]:min-w-0">
          {/* Timeline of events (left / primary) */}
          <section>
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4">
              <h2 className="font-serif text-[22px] text-ink">Timeline</h2>

              {/* Segmented control filters */}
              <div
                role="tablist"
                aria-label="Filter events"
                className="flex max-w-full overflow-x-auto rounded-full border border-line bg-surface p-0.5"
              >
                {(Object.keys(FILTER_LABELS) as FilterCategory[]).map((cat) => (
                  <button
                    key={cat}
                    role="tab"
                    aria-selected={activeFilter === cat}
                    onClick={() => setActiveFilter(cat)}
                    className={cn(
                      "rounded-full px-3 py-1 text-[12.5px] font-medium transition-colors",
                      activeFilter === cat
                        ? "bg-accent text-accent-ink"
                        : "text-ink-2 hover:text-ink",
                    )}
                  >
                    {FILTER_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>

            {/* Loading state */}
            {base === null && !error ? (
              <div className="mt-6 rounded-card border border-line bg-surface p-8 text-center shadow-card">
                <p className="text-[14px] text-ink-3">Loading timeline…</p>
              </div>
            ) : filteredEvents.length === 0 ? (
              /* Empty state */
              <div className="mt-6 rounded-card border border-line bg-surface p-8 text-center shadow-card">
                <p className="font-serif text-[20px] text-ink">No activity yet</p>
                <p className="mt-1.5 text-[14px] text-ink-2">
                  {activeFilter === "all"
                    ? "Chat with Radahn and watch memory events land here in real time."
                    : `No ${FILTER_LABELS[activeFilter].toLowerCase()} events recorded yet.`}
                </p>
              </div>
            ) : (
              /* Grouped day timeline */
              <div className="mt-4 flex flex-col gap-6" aria-live="polite">
                {groupedEvents.map((group) => (
                  <div key={group.day} className="flex flex-col">
                    {/* Day group header */}
                    <div className="sticky top-0 z-10 bg-canvas/90 py-2 backdrop-blur-sm">
                      <span className="text-[12px] font-semibold tracking-wider text-ink-3">
                        {group.day}
                      </span>
                    </div>

                    {/* Events for this day */}
                    <ol className="flex flex-col divide-y divide-line rounded-card border border-line bg-surface shadow-card">
                      {group.events.map((e) => (
                        <li
                          key={e.id}
                          className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-hover sm:px-5"
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <EventIcon kind={e.kind} />
                            {e.type ? (
                              <TypeSwatch type={e.type as MemoryTypeName} size={11} />
                            ) : null}
                            <span className="min-w-0 flex-1 truncate text-[14px] text-ink">
                              {e.summary}
                            </span>
                          </div>

                          <div className="flex shrink-0 items-center gap-3">
                            <span className="hidden text-[11.5px] text-ink-3 sm:inline">
                              {e.actor.name}
                            </span>
                            <span className="font-mono text-[11px] tabular text-ink-3">
                              {timeAgo(e.at)}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Reflection runs (right) */}
          <section>
            <h2 className="font-serif text-[22px] text-ink">Reflection runs</h2>
            <p className="mt-1 text-[13.5px] text-ink-3">
              Background passes that merge duplicates, link observations, and extract learned behaviors.
            </p>

            {!base?.reflections.length ? (
              <div className="mt-4 rounded-card border border-line bg-surface p-6 text-[13.5px] leading-relaxed text-ink-3 shadow-card">
                No reflections run yet. Reflection runs automatically after conversations or when you click &ldquo;Reflect now&rdquo;.
              </div>
            ) : (
              <ol className="mt-4 flex flex-col gap-4">
                {base.reflections.map((r) => (
                  <li key={r.id} className="rounded-card border border-line bg-surface p-4 shadow-card">
                    <div className="flex items-center justify-between border-b border-line pb-2.5">
                      <span className="text-[13px] font-medium text-ink">
                        {r.trigger}
                      </span>
                      <span className="font-mono text-[11px] text-ink-3">
                        {new Date(r.startedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <ul className="mt-3 flex flex-col gap-1.5">
                      {r.steps.map((s) => (
                        <li key={s.name} className="flex items-center gap-2.5 text-[13px]">
                          <span
                            className={cn(
                              "size-2 rounded-full",
                              s.status === "done"
                                ? "bg-green"
                                : s.status === "running"
                                ? "animate-pixel-on bg-t-preference"
                                : s.status === "failed"
                                ? "bg-red"
                                : "bg-ink-3",
                            )}
                          />
                          <span className="w-24 capitalize text-ink">{s.name}</span>
                          <span className="truncate text-ink-3">{s.detail}</span>
                        </li>
                      ))}
                    </ul>

                    {r.outputs.strategies.length || r.outputs.observations.length || r.outputs.merged.length ? (
                      <ul className="mt-3 flex flex-col gap-1.5 border-t border-line pt-3 text-[13px] text-ink-2">
                        {r.outputs.strategies.map((s) => (
                          <li key={s.id}>
                            <Link href={`/app/memory/${s.id}`} className="flex items-center gap-2 hover:text-ink">
                              <TypeSwatch type="strategy" size={12} />
                              <span className="truncate">{s.statement}</span>
                            </Link>
                          </li>
                        ))}
                        {r.outputs.observations.map((s) => (
                          <li key={s.id}>
                            <Link href={`/app/memory/${s.id}`} className="flex items-center gap-2 hover:text-ink">
                              <TypeSwatch type="observation" size={12} />
                              <span className="truncate">{s.statement}</span>
                            </Link>
                          </li>
                        ))}
                        {r.outputs.merged.map((s) => (
                          <li key={s.id}>
                            <Link href={`/app/memory/${s.id}`} className="flex items-center gap-2 text-ink-3 hover:text-ink">
                              <span className="text-[11.5px] font-medium uppercase">merged</span>
                              <span className="truncate">{s.statement}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
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
      <p className="text-[13px] font-medium text-ink-3">{label}</p>
      <p className="mt-1.5 font-serif text-[28px] leading-none tabular text-ink">{value}</p>
      {note ? <p className="mt-1.5 text-[12px] text-ink-3">{note}</p> : null}
      {children}
    </div>
  );
}
