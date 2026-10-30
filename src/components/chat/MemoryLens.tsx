"use client";

import { Ghost, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ScoreBar, TypeSwatch } from "@/components/atoms";
import { useLive } from "@/components/realtime/LiveProvider";
import type { RadahnDataParts } from "@/lib/chat-types";
import { changedWords, wordDiff } from "@/lib/diff";
import { MEMORY_TYPE_META, type MemoryTypeName } from "@/lib/memory-types";
import { cn, formatScore } from "@/lib/utils";
import { PixelLoader } from "./MessageItem";

type Tab = "recalled" | "written" | "trace" | "ghost";

interface TraceCandidate {
  memoryId: string;
  statement: string;
  type: MemoryTypeName;
  selected: boolean;
  droppedBy?: string;
  reasons: string[];
  scores: { vector?: number; rrf: number; recency: number; importance: number; confidence: number; typeBoost: number; final: number };
}
interface TraceDoc {
  intent: string;
  channelsRan: string[];
  candidates: TraceCandidate[];
  latencyMs: Record<string, number>;
}

export interface GhostState {
  status: "idle" | "loading" | "done" | "error";
  text?: string;
  model?: string;
  error?: string;
}

/**
 * The Memory lens (design.md §6.4): the grove "memory room" beside the conversation. Shows,
 * for the selected reply, what was recalled and why (real scores), what was written, the raw
 * trace, and the ghost diff.
 */
export function MemoryLens({
  recall,
  assistantId,
  userMessageId,
  replyText,
  ghost,
  tab,
  onTab,
  onClose,
  className,
}: {
  recall?: RadahnDataParts["recall"];
  assistantId?: string;
  userMessageId?: string;
  replyText: string;
  ghost: GhostState;
  tab: Tab;
  onTab: (t: Tab) => void;
  onClose?: () => void;
  className?: string;
}) {
  const live = useLive();
  const writes = userMessageId ? live.forMessage(userMessageId) : [];
  const tabs: Array<{ id: Tab; label: string; n?: number }> = [
    { id: "recalled", label: "Recalled", n: recall?.picks?.length },
    { id: "written", label: "Written", n: writes.length || undefined },
    { id: "trace", label: "Trace" },
    { id: "ghost", label: "Without" },
  ];

  return (
    <aside className={cn("flex h-full min-h-0 flex-col bg-grove text-grove-ink", className)} aria-label="Memory lens">
      <header className="flex items-center gap-2 border-b border-grove-line px-4 py-3">
        <span className="mono-label text-grove-ink">Memory lens</span>
        {recall?.status === "running" ? <PixelLoader /> : null}
        <span className="flex-1" />
        {onClose ? (
          <button onClick={onClose} className="rounded-control p-1 text-grove-ink-2 hover:text-grove-ink" aria-label="Close memory lens">
            <X className="size-4" />
          </button>
        ) : null}
      </header>
      <FieldStrip picks={recall?.picks ?? []} running={recall?.status === "running"} />
      <div role="tablist" className="flex gap-px border-b border-grove-line px-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => onTab(t.id)}
            className={cn(
              "mono-label -mb-px flex h-9 items-center gap-1.5 border-b px-2.5 text-[10.5px] transition-colors",
              tab === t.id ? "border-grove-ink text-grove-ink" : "border-transparent text-grove-ink-2 hover:text-grove-ink",
            )}
          >
            {t.label}
            {t.n ? <span className="tabular opacity-70">{t.n}</span> : null}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {!recall && tab !== "ghost" ? (
          <p className="text-[13px] leading-relaxed text-grove-ink-2">
            Send a message. Every reply shows which memories shaped it, with the real scores behind each pick.
          </p>
        ) : tab === "recalled" ? (
          <Recalled recall={recall!} />
        ) : tab === "written" ? (
          <Written writes={writes} />
        ) : tab === "trace" ? (
          <Trace assistantId={assistantId} recall={recall!} />
        ) : (
          <GhostDiff ghost={ghost} replyText={replyText} recall={recall} />
        )}
      </div>
    </aside>
  );
}

/** A 40px glyph strip: recalled memories light up as their type blocks (design.md §5). */
function FieldStrip({ picks, running }: { picks: NonNullable<RadahnDataParts["recall"]["picks"]>; running: boolean }) {
  const cells = 36;
  const glyphs = "·:;/\\|";
  const lit = new Map(picks.slice(0, cells).map((p, i) => [Math.floor(((i * 7 + 3) % cells)), p]));
  return (
    <div className="flex h-10 items-center gap-[3px] overflow-hidden border-b border-grove-line px-4 font-mono text-[11px]" aria-hidden>
      {Array.from({ length: cells }, (_, i) => {
        const p = lit.get(i);
        return p ? (
          <span key={i} className="inline-flex size-3.5 shrink-0 animate-pop-in items-center justify-center rounded-[2px] text-[8px]" style={{ background: `var(${MEMORY_TYPE_META[p.type].colorVar})`, color: MEMORY_TYPE_META[p.type].onSwatch === "dark" ? "var(--t-ink-dark)" : "var(--t-ink-light)", animationDelay: `${i * 18}ms` }}>
            {MEMORY_TYPE_META[p.type].glyph}
          </span>
        ) : (
          <span key={i} className={cn("w-3.5 shrink-0 text-center text-grove-ink-2", running ? "animate-pixel-on" : "opacity-30")} style={running ? { animationDelay: `${(i * 97) % 1100}ms` } : undefined}>
            {glyphs[(i * 5) % glyphs.length]}
          </span>
        );
      })}
    </div>
  );
}

function Recalled({ recall }: { recall: RadahnDataParts["recall"] }) {
  if (recall.status === "running") return <p className="shimmer text-[13px]">Searching memory…</p>;
  const picks = recall.picks ?? [];
  return (
    <div className="flex flex-col gap-5">
      <p className="mono-label text-[10px] text-grove-ink-2">
        Intent {recall.intent} · {recall.channels?.join(" + ")} · {recall.candidateCount ?? 0} candidates · {recall.latencyMs ?? 0} ms
      </p>
      {picks.length === 0 ? (
        <p className="text-[13px] text-grove-ink-2">Nothing in memory was relevant enough (score ≥ 0.35) for this message.</p>
      ) : (
        <ol className="flex flex-col gap-4">
          {picks.map((p) => (
            <li key={p.ref} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <TypeSwatch type={p.type} size={14} label />
                <span className="mono-label ml-auto text-[10px] text-grove-ink-2">{p.ref}</span>
              </div>
              <Link href={`/app/memory/${p.memoryId}`} className="font-serif text-[15.5px] leading-snug text-grove-ink hover:underline">
                {p.statement}
              </Link>
              <ScoreBar scores={p.scores} />
              <p className="text-[11.5px] leading-snug text-grove-ink-2">{p.why}</p>
            </li>
          ))}
        </ol>
      )}
      {recall.strategies?.length ? (
        <section>
          <p className="mono-label mb-2 text-[10px] text-grove-ink-2">Learned behaviours (always applied)</p>
          <ul className="flex flex-col gap-1.5">
            {recall.strategies.map((s) => (
              <li key={s.id} className="flex gap-2 text-[12.5px] leading-snug">
                <TypeSwatch type="strategy" size={12} className="mt-[3px]" />
                {s.statement}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {recall.core?.length ? (
        <section>
          <p className="mono-label mb-2 text-[10px] text-grove-ink-2">Core (pinned, always in context)</p>
          <ul className="flex flex-col gap-1.5">
            {recall.core.map((c) => (
              <li key={c.id} className="flex gap-2 text-[12.5px] leading-snug text-grove-ink-2">
                <TypeSwatch type={c.type} size={12} className="mt-[3px]" />
                {c.statement}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <p className="text-[11px] leading-relaxed text-grove-ink-2">
        final = 0.55·relevance + 0.15·recency + 0.15·importance + 0.10·confidence + type boost
      </p>
    </div>
  );
}

function Written({ writes }: { writes: ReturnType<ReturnType<typeof useLive>["forMessage"]> }) {
  if (writes.length === 0)
    return <p className="text-[13px] leading-relaxed text-grove-ink-2">Nothing written for this turn yet. Memory updates arrive a few seconds after the reply.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {writes.map((e) => (
        <li key={e.id} className="flex flex-col gap-1">
          <span className="mono-label flex items-center gap-2 text-[10px] text-grove-ink-2">
            {e.type ? <TypeSwatch type={e.type as MemoryTypeName} size={11} /> : null}
            {e.kind} · {e.actor.name}
          </span>
          <span className="text-[13px] leading-snug">{e.summary}</span>
          {e.memoryId && e.kind !== "forgotten" ? (
            <Link href={`/app/memory/${e.memoryId}`} className="mono-label text-[10px] text-grove-ink-2 hover:text-grove-ink">
              Open memory →
            </Link>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function Trace({ assistantId, recall }: { assistantId?: string; recall: RadahnDataParts["recall"] }) {
  const [trace, setTrace] = useState<TraceDoc | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!assistantId || recall.status !== "done") return;
    let alive = true;
    fetch(`/api/recalls/${assistantId}`)
      .then(async (r) => (r.ok ? r.json() : Promise.reject((await r.json()).error?.message)))
      .then((j) => alive && setTrace(j.trace))
      .catch((e) => alive && setErr(String(e ?? "Trace unavailable")));
    return () => {
      alive = false;
    };
  }, [assistantId, recall.status]);

  if (err) return <p className="text-[13px] text-grove-ink-2">{err}</p>;
  if (!trace) return <p className="shimmer text-[13px]">Loading trace…</p>;
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-control bg-grove-line font-mono text-[11px]">
        {Object.entries(trace.latencyMs).map(([k, v]) => (
          <div key={k} className="bg-grove px-2 py-1.5">
            <dt className="text-grove-ink-2">{k}</dt>
            <dd className="tabular">{v} ms</dd>
          </div>
        ))}
      </dl>
      <p className="mono-label text-[10px] text-grove-ink-2">
        {trace.candidates.length} candidates · {trace.channelsRan.join(" + ")}
      </p>
      <table className="w-full table-fixed border-collapse text-[11.5px]">
        <thead>
          <tr className="mono-label text-left text-[9.5px] text-grove-ink-2">
            <th className="w-5 pb-1.5" />
            <th className="pb-1.5">Memory</th>
            <th className="w-11 pb-1.5 text-right">vec</th>
            <th className="w-11 pb-1.5 text-right">final</th>
          </tr>
        </thead>
        <tbody>
          {trace.candidates.map((c) => (
            <tr key={c.memoryId} className={cn("border-t border-grove-line align-top", !c.selected && "opacity-55")}>
              <td className="py-1.5">
                <TypeSwatch type={c.type} size={10} />
              </td>
              <td className="py-1.5 pr-2">
                <span className="line-clamp-2">{c.statement}</span>
                {c.droppedBy ? <span className="mono-label text-[9px] text-grove-ink-2">dropped: {c.droppedBy}</span> : null}
              </td>
              <td className="py-1.5 text-right font-mono tabular">{formatScore(c.scores.vector)}</td>
              <td className="py-1.5 text-right font-mono tabular">{formatScore(c.scores.final)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GhostDiff({ ghost, replyText, recall }: { ghost: GhostState; replyText: string; recall?: RadahnDataParts["recall"] }) {
  const [mode, setMode] = useState<"diff" | "side">("diff");
  const ops = useMemo(() => (ghost.text ? wordDiff(ghost.text, replyText) : []), [ghost.text, replyText]);
  if (ghost.status === "idle")
    return (
      <p className="flex items-start gap-2 text-[13px] leading-relaxed text-grove-ink-2">
        <Ghost className="mt-0.5 size-4 shrink-0" /> Click “Without memory” on a reply to see what Radahn would have said if it remembered nothing.
      </p>
    );
  if (ghost.status === "loading") return <p className="shimmer text-[13px]">Asking again with memory switched off…</p>;
  if (ghost.status === "error") return <p className="text-[13px] text-grove-ink-2">{ghost.error}</p>;
  const n = changedWords(ops);
  const used = recall?.picks?.length ?? 0;
  return (
    <div className="flex flex-col gap-3">
      <p className="font-serif text-[17px] leading-snug">
        {n} words differ{used ? ` · ${used} memories made the difference` : ""}.
      </p>
      <div className="flex gap-1">
        {(["diff", "side"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} className={cn("mono-label h-7 rounded-full px-3 text-[10px]", mode === m ? "bg-grove-ink text-grove" : "text-grove-ink-2 shadow-[inset_0_0_0_1px_var(--grove-line)]")}>
            {m === "diff" ? "Diff" : "Side by side"}
          </button>
        ))}
        <span className="mono-label ml-auto self-center text-[10px] text-grove-ink-2">{ghost.model}</span>
      </div>
      {mode === "diff" ? (
        <p className="whitespace-pre-wrap rounded-control bg-grove-2 p-3 text-[13px] leading-relaxed">
          {ops.map((o, i) =>
            o.op === "same" ? (
              <span key={i}>{o.text}</span>
            ) : o.op === "add" ? (
              <ins key={i} className="rounded-[2px] bg-[color-mix(in_srgb,var(--t-outcome)_35%,transparent)] no-underline">{o.text}</ins>
            ) : (
              <del key={i} className="rounded-[2px] bg-[color-mix(in_srgb,var(--t-constraint)_28%,transparent)] text-grove-ink-2">{o.text}</del>
            ),
          )}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          <section className="rounded-control bg-grove-2 p-3">
            <p className="mono-label mb-1.5 text-[10px] text-grove-ink-2">Without memory</p>
            <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed">{ghost.text}</p>
          </section>
          <section className="rounded-control bg-grove-2 p-3">
            <p className="mono-label mb-1.5 text-[10px] text-grove-ink-2">With memory</p>
            <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed">{replyText.replace(/\[\[m\d+\]\]/g, "")}</p>
          </section>
        </div>
      )}
      <p className="text-[11px] text-grove-ink-2">
        <del className="text-grove-ink-2">Struck</del> = only without memory · <ins className="no-underline">highlighted</ins> = added by memory
      </p>
    </div>
  );
}
