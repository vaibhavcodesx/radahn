"use client";

import { Check, Copy, Ghost, RotateCcw } from "lucide-react";
import { useState } from "react";
import { CitationSquare, TypeSwatch } from "@/components/atoms";
import { useLive } from "@/components/realtime/LiveProvider";
import type { RadahnDataParts, RadahnUIMessage, RecallPickWire } from "@/lib/chat-types";
import { normalizeCitations } from "@/lib/citations";
import { Markdown } from "@/lib/markdown";
import { MEMORY_TYPE_META } from "@/lib/memory-types";
import { cn } from "@/lib/utils";
import { dataPart, dataParts, messageText } from "./parts";
import { WriteChips } from "./WriteChips";

export function UserMessage({ message }: { message: RadahnUIMessage }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] whitespace-pre-wrap rounded-card bg-surface-2 px-4 py-2.5 text-[14px] leading-relaxed text-ink shadow-card">
        {messageText(message)}
      </div>
    </div>
  );
}

export function AssistantMessage({
  message,
  userMessageId,
  selected,
  onSelect,
  onOpenMemory,
  onGhost,
  onRetry,
  streaming,
  isLatest,
}: {
  message: RadahnUIMessage;
  isLatest: boolean;
  userMessageId?: string;
  selected: boolean;
  onSelect: () => void;
  onOpenMemory: (id: string) => void;
  onGhost?: () => void;
  onRetry?: () => void;
  streaming: boolean;
}) {
  const live = useLive();
  const recall = dataPart(message, "recall");
  const notices = dataParts(message, "notice");
  const ops = dataParts(message, "memory-op");
  const redaction = dataPart(message, "redaction");
  const model = dataPart(message, "model");
  const text = messageText(message);
  const picks = new Map((recall?.picks ?? []).map((p) => [p.ref, p] as const));
  const [copied, setCopied] = useState(false);
  const writes = userMessageId ? live.forMessage(userMessageId) : [];

  const cite = (ref: string, key: string) => {
    const p = picks.get(ref);
    if (!p) return null; // unknown ref → render nothing, never a link to an arbitrary id
    const idx = Number(ref.slice(1));
    return <Citation key={key} pick={p} index={idx} onOpen={() => onOpenMemory(p.memoryId)} />;
  };

  return (
    <article
      onClick={onSelect}
      className={cn(
        "group relative -mx-3 rounded-card px-3 py-2 transition-colors",
        selected ? "bg-[color-mix(in_srgb,var(--grove)_45%,transparent)]" : "hover:bg-hover",
      )}
      aria-label="Radahn's reply"
    >
      {redaction ? (
        <p className="mono-label mb-2 text-[10.5px] text-red">Not saved — looked like a credential ({redaction.kinds.join(", ").replaceAll("_", " ")})</p>
      ) : null}
      {notices.map((n, i) => (
        <p key={i} className="mono-label mb-2 text-[10.5px] text-t-preference">
          {n.kind === "changed" ? "Updated since last time: " : "Needs a check: "}
          <span className="normal-case tracking-normal">{n.text}</span>
        </p>
      ))}

      <RecallLine recall={recall} />

      {ops.length ? (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {ops.map((o, i) => (
            <li key={i} className="flex h-6 items-center gap-1.5 rounded-chip bg-hover px-2 text-[11.5px] text-ink-2">
              {o.type ? <TypeSwatch type={o.type} size={11} /> : null}
              <span className="mono-label text-[10px]">{o.op}</span>
              <span className="max-w-[40ch] truncate">
                {o.status === "blocked" ? "blocked: looked unsafe" : o.before && o.after ? `${o.before} → ${o.after}` : (o.statement ?? o.status)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="text-[14.5px] leading-[1.65] text-ink-2 [&_strong]:text-ink">
        {text ? <Markdown text={normalizeCitations(text)} cite={cite} /> : streaming ? <span className="shimmer">Thinking…</span> : null}
      </div>

      <div className="mt-3 flex min-h-6 flex-wrap items-center gap-x-4 gap-y-2">
        <WriteChips events={writes} waiting={isLatest && !streaming && Boolean(text)} />
        {!streaming && text ? (
          <div className="ml-auto flex items-center gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
            {model ? <span className="mono-label mr-2 text-[10px] text-ink-3">{model.fallback ? `fell back to ${model.label}` : model.label}</span> : null}
            <IconBtn
              label={copied ? "Copied" : "Copy"}
              onClick={(e) => {
                e.stopPropagation();
                void navigator.clipboard.writeText(text.replace(/\[\[m\d+\]\]/g, ""));
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              }}
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </IconBtn>
            {onRetry ? (
              <IconBtn label="Retry" onClick={(e) => (e.stopPropagation(), onRetry())}>
                <RotateCcw className="size-3.5" />
              </IconBtn>
            ) : null}
            {onGhost ? (
              <button
                onClick={(e) => (e.stopPropagation(), onGhost())}
                className="mono-label ml-1 flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[10.5px] text-ink shadow-[inset_0_0_0_1px_var(--line-strong)] hover:bg-hover"
              >
                <Ghost className="size-3.5" /> Without memory
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function RecallLine({ recall }: { recall?: RadahnDataParts["recall"] }) {
  if (!recall) return null;
  if (recall.status === "running")
    return (
      <p className="mono-label mb-2 flex items-center gap-2 text-[10.5px]">
        <PixelLoader />
        <span className="shimmer">Recalling…</span>
      </p>
    );
  if (recall.status === "error") return <p className="mono-label mb-2 text-[10.5px] text-ink-3">Memory unavailable for this turn</p>;
  const n = recall.picks?.length ?? 0;
  return (
    <p className="mono-label mb-2 flex items-center gap-2 text-[10.5px] text-ink-3">
      <span className="flex gap-0.5" aria-hidden>
        {(recall.picks ?? []).slice(0, 8).map((p) => (
          <span key={p.ref} className="size-2 rounded-[1px]" style={{ background: `var(${MEMORY_TYPE_META[p.type].colorVar})` }} />
        ))}
      </span>
      {n === 0 ? "No memories needed" : `Recalled ${n} · ${Math.round(recall.latencyMs ?? 0)} ms`}
      {recall.strategies?.length ? <span>· {recall.strategies.length} learned behaviour{recall.strategies.length > 1 ? "s" : ""}</span> : null}
    </p>
  );
}

export function PixelLoader() {
  return (
    <span className="grid grid-cols-3 gap-[2px]" aria-hidden>
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className="size-[3px] animate-pixel-on bg-grove-ink" style={{ animationDelay: `${(i * 137) % 900}ms` }} />
      ))}
    </span>
  );
}

function Citation({ pick, index, onOpen }: { pick: RecallPickWire; index: number; onOpen: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={(e) => (e.stopPropagation(), onOpen())}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
        aria-label={`Memory ${index}: ${pick.statement}`}
        className="mx-0.5 inline-flex rounded-[3px] align-middle focus-visible:outline-2"
      >
        <CitationSquare type={pick.type} index={index} />
      </button>
      {hover ? (
        <span role="tooltip" className="absolute bottom-6 left-1/2 z-30 w-72 -translate-x-1/2 animate-pop-in rounded-card bg-tooltip-bg p-3 text-left shadow-overlay">
          <span className="mono-label flex items-center justify-between text-[10px] text-tooltip-muted">
            <span>{MEMORY_TYPE_META[pick.type].label}</span>
            <span className="tabular">score {pick.final.toFixed(2)}</span>
          </span>
          <span className="mt-1 block font-serif text-[14px] leading-snug text-tooltip-fg">{pick.statement}</span>
          <span className="mt-1.5 block text-[11.5px] text-tooltip-muted">{pick.why}</span>
        </span>
      ) : null}
    </span>
  );
}

function IconBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="rounded-control p-1.5 text-ink-3 hover:bg-hover hover:text-ink">
      {children}
    </button>
  );
}
