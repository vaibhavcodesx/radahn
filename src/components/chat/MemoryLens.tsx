"use client";

import { Ghost, PanelRightClose } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ScoreBar, TypeSwatch } from "@/components/atoms";
import { useLive } from "@/components/realtime/LiveProvider";
import type { RadahnDataParts } from "@/lib/chat-types";
import { changedWords, wordDiff } from "@/lib/diff";
import { Markdown } from "@/lib/markdown";
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
  notices = [],
  ops = [],
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
  notices?: Array<RadahnDataParts["notice"]>;
  /** Changes the model made with its own tools during this reply (remember / correct / forget). */
  ops?: Array<RadahnDataParts["memory-op"]>;
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
  const toolOps = ops.filter((o) => o.op !== "recall" && o.status === "done");
  const savedCount = writes.length || toolOps.length;
  const tabs: Array<{ id: Tab; label: string; n?: number }> = [
    { id: "recalled", label: "Used", n: recall?.picks?.length },
    { id: "written", label: "Saved", n: savedCount || undefined },
    { id: "trace", label: "Why" },
    { id: "ghost", label: "Without memory" },
  ];

  return (
    <aside className={cn("flex h-full min-h-0 flex-col bg-grove text-grove-ink", className)} aria-label="Memory lens">
      <header className="flex h-14 items-center gap-2 border-b border-grove-line pl-5 pr-3">
        <h2 className="text-[15px] font-semibold text-grove-ink">Memory</h2>
        {recall?.status === "running" ? (
          <PixelLoader />
        ) : recall?.status === "done" ? (
          <span className="text-[13px] text-grove-ink-2">
            {recall.picks?.length ? `${recall.picks.length} used` : "none needed"}
            {recall.strategies?.length ? ` · ${recall.strategies.length} rule${recall.strategies.length > 1 ? "s" : ""}` : ""}
          </span>
        ) : null}
        <span className="flex-1" />
        {onClose ? (
          <button
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-control text-grove-ink-2 hover:bg-grove-2 hover:text-grove-ink"
            aria-label="Hide memory panel"
            title="Hide memory panel (Ctrl/Cmd + .)"
          >
            <PanelRightClose className="size-[18px]" strokeWidth={1.75} />
          </button>
        ) : null}
      </header>
      <div role="tablist" className="flex gap-1 border-b border-grove-line px-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => onTab(t.id)}
            className={cn(
              "-mb-px flex h-11 items-center gap-1.5 border-b-2 px-2.5 text-[13.5px] transition-colors",
              tab === t.id ? "border-grove-ink font-medium text-grove-ink" : "border-transparent text-grove-ink-2 hover:text-grove-ink",
            )}
          >
            {t.label}
            {t.n ? <span className="tabular text-[12px] opacity-70">{t.n}</span> : null}
          </button>
        ))}
      </div>
      <div className="relative min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {!recall && tab !== "ghost" ? (
          <p className="text-[14.5px] leading-relaxed text-grove-ink-2">Send a message. Each reply shows here which memories shaped it and why.</p>
        ) : tab === "recalled" ? (
          <Recalled recall={recall!} notices={notices} />
        ) : tab === "written" ? (
          <Written writes={writes} ops={toolOps} />
        ) : tab === "trace" ? (
          <Trace assistantId={assistantId} recall={recall!} />
        ) : (
          <GhostDiff ghost={ghost} replyText={replyText} recall={recall} />
        )}
      </div>
    </aside>
  );
}

function Recalled({ recall, notices }: { recall: RadahnDataParts["recall"]; notices: Array<RadahnDataParts["notice"]> }) {
  if (recall.status === "running") return <p className="shimmer text-[14px]">Searching memory…</p>;
  const picks = recall.picks ?? [];
  const changes = notices.filter((n) => n.kind === "changed");
  return (
    <div className="flex flex-col gap-6">
      {changes.length ? (
        <section className="rounded-control bg-grove-2 p-3.5">
          <p className="mb-1.5 text-[12.5px] font-medium text-grove-ink">Changed recently</p>
          {changes.map((n, i) => (
            <p key={i} className="text-[13.5px] leading-snug text-grove-ink-2">
              {n.text}
            </p>
          ))}
        </section>
      ) : null}
      {picks.length === 0 ? (
        <p className="text-[14px] text-grove-ink-2">Nothing in memory was relevant enough for this message.</p>
      ) : (
        <ol className="flex flex-col gap-4">
          {picks.map((p) => (
            <li key={p.ref} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <TypeSwatch type={p.type} size={14} label />
                <span className="ml-auto font-mono text-[12px] tabular text-grove-ink-2">{Number(p.ref.slice(1))}</span>
              </div>
              <Link href={`/app/memory/${p.memoryId}`} className="font-serif text-[16.5px] leading-snug text-grove-ink hover:underline">
                {p.statement}
              </Link>
              <ScoreBar scores={p.scores} />
              <p className="text-[13px] leading-snug text-grove-ink-2">{p.why}</p>
            </li>
          ))}
        </ol>
      )}
      {recall.strategies?.length ? (
        <section>
          <p className="mb-2 text-[12.5px] font-medium text-grove-ink">Learned rules applied</p>
          <ul className="flex flex-col gap-1.5">
            {recall.strategies.map((s) => (
              <li key={s.id} className="flex gap-2 text-[14px] leading-snug">
                <TypeSwatch type="strategy" size={12} className="mt-[3px]" />
                {s.statement}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {recall.core?.length ? (
        <section>
          <p className="mb-2 text-[12.5px] font-medium text-grove-ink">Pinned, always remembered</p>
          <ul className="flex flex-col gap-1.5">
            {recall.core.map((c) => (
              <li key={c.id} className="flex gap-2 text-[14px] leading-snug text-grove-ink-2">
                <TypeSwatch type={c.type} size={12} className="mt-[3px]" />
                {c.statement}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

const KIND_LABEL: Record<string, string> = {
  created: "Remembered",
  confirmed: "Confirmed",
  superseded: "Updated",
  pending: "Waiting for your OK",
  blocked: "Not saved (looked private)",
  forgotten: "Forgotten",
  approved: "Approved",
  rejected: "Rejected",
};

const OP_KIND: Record<string, string> = { remember: "Remembered", correct: "Corrected", forget: "Forgotten" };

function Written({ writes, ops }: { writes: ReturnType<ReturnType<typeof useLive>["forMessage"]>; ops: Array<RadahnDataParts["memory-op"]> }) {
  // Live events are only in memory for this session; after a reload, fall back to the reply's own record.
  if (writes.length === 0 && ops.length)
    return (
      <ul className="flex flex-col gap-3">
        {ops.map((o, i) => (
          <li key={i} className="flex flex-col gap-1">
            <span className="flex items-center gap-2 text-[14px] text-grove-ink">
              {o.type ? <TypeSwatch type={o.type} size={12} /> : null}
              {OP_KIND[o.op] ?? o.op}
              {o.type ? <span className="text-grove-ink-2">· {MEMORY_TYPE_META[o.type]?.label ?? o.type}</span> : null}
            </span>
            {o.before && o.after ? (
              <span className="text-[14px] leading-snug text-grove-ink">
                <del className="text-grove-ink-2">{o.before}</del> → {o.after}
              </span>
            ) : o.statement ? (
              <span className="text-[14px] leading-snug text-grove-ink">{o.statement}</span>
            ) : null}
            {o.memoryId && o.op !== "forget" ? (
              <Link href={`/app/memory/${o.memoryId}`} className="text-[13px] text-grove-ink-2 underline-offset-4 hover:text-grove-ink hover:underline">
                Open memory
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    );
  if (writes.length === 0)
    return <p className="text-[14px] leading-relaxed text-grove-ink-2">Nothing new was saved from this turn.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {writes.map((e) => (
        <li key={e.id} className="flex flex-col gap-1">
          <span className="flex items-center gap-2 text-[14px] text-grove-ink">
            {e.type ? <TypeSwatch type={e.type as MemoryTypeName} size={12} /> : null}
            {KIND_LABEL[e.kind] ?? e.kind}
            {e.type ? <span className="text-grove-ink-2">· {MEMORY_TYPE_META[e.type as MemoryTypeName]?.label ?? e.type}</span> : null}
          </span>
          {e.diff?.after ? (
            <span className="text-[14px] leading-snug text-grove-ink">{e.diff.after}</span>
          ) : e.memoryId && e.kind !== "forgotten" && e.kind !== "blocked" ? (
            <SavedStatement id={e.memoryId} />
          ) : null}
          {e.memoryId && e.kind !== "forgotten" && e.kind !== "blocked" ? (
            <Link href={`/app/memory/${e.memoryId}`} className="text-[13px] text-grove-ink-2 underline-offset-4 hover:text-grove-ink hover:underline">
              Open memory
            </Link>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** Saved-memory events carry ids, not text; fetch the statement so the user sees what was kept. */
const statementCache = new Map<string, Promise<string | null>>();
function SavedStatement({ id }: { id: string }) {
  const [text, setText] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    if (!statementCache.has(id))
      statementCache.set(
        id,
        fetch(`/api/memories/${id}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => (d?.memory?.statement as string | undefined) ?? null)
          .catch(() => null),
      );
    void statementCache.get(id)!.then((t) => alive && setText(t));
    return () => {
      alive = false;
    };
  }, [id]);
  if (text === undefined) return <span className="shimmer text-[13.5px]">Loading…</span>;
  if (!text) return null;
  return <span className="text-[14px] leading-snug text-grove-ink">{text}</span>;
}

/** Diff the words people read, not markdown syntax. */
function plain(md: string) {
  return md
    .replace(/\[\[m\d+\]\]/g, "")
    .replace(/```[a-z]*\n?/gi, "")
    .replace(/\*\*|__|`/g, "")
    .replace(/^#{1,6}\s+/gm, "");
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
      <p className="text-[13.5px] leading-relaxed text-grove-ink-2">
        Radahn searched by meaning, by your words and by time, ranked {trace.candidates.length} candidates and kept the best. Score = 0.55 relevance + 0.15 recency + 0.15 importance + 0.10 confidence.
      </p>
      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-control bg-grove-line font-mono text-[11px]">
        {Object.entries(trace.latencyMs).map(([k, v]) => (
          <div key={k} className="bg-grove px-2 py-1.5">
            <dt className="text-grove-ink-2">{k}</dt>
            <dd className="tabular">{Math.round(v)} ms</dd>
          </div>
        ))}
      </dl>
      <table className="w-full table-fixed border-collapse text-[12.5px]">
        <thead>
          <tr className="text-[12.5px] font-medium text-left text-grove-ink-2">
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
                {c.droppedBy ? <span className="text-[12.5px] font-medium text-grove-ink-2">dropped: {c.droppedBy}</span> : null}
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
  const ops = useMemo(() => (ghost.text ? wordDiff(plain(ghost.text), plain(replyText)) : []), [ghost.text, replyText]);
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
          <button key={m} onClick={() => setMode(m)} className={cn("text-[12.5px] font-medium h-7 rounded-full px-3", mode === m ? "bg-grove-ink text-grove" : "text-grove-ink-2 shadow-[inset_0_0_0_1px_var(--grove-line)]")}>
            {m === "diff" ? "Diff" : "Side by side"}
          </button>
        ))}
      </div>
      {mode === "diff" ? (
        <p className="whitespace-pre-wrap rounded-control bg-grove-2 p-3 text-[14px] leading-relaxed">
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
            <p className="text-[12.5px] font-medium mb-1.5 text-grove-ink-2">Without memory</p>
            <div className="text-[13.5px] leading-relaxed [&_*]:text-[13.5px]">
              <Markdown text={ghost.text ?? ""} cite={() => null} />
            </div>
          </section>
          <section className="rounded-control bg-grove-2 p-3">
            <p className="text-[12.5px] font-medium mb-1.5 text-grove-ink-2">With memory</p>
            <div className="text-[13.5px] leading-relaxed [&_*]:text-[13.5px]">
              <Markdown text={replyText.replace(/\[\[m\d+\]\]/g, "")} cite={() => null} />
            </div>
          </section>
        </div>
      )}
      <p className="text-[11px] text-grove-ink-2">
        <del className="text-grove-ink-2">Struck</del> = only without memory · <ins className="no-underline">highlighted</ins> = added by memory
      </p>
    </div>
  );
}
