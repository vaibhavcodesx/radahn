"use client";

import { Check, Copy, Ghost, RotateCcw } from "lucide-react";
import { useState } from "react";
import { CitationSquare, TypeSwatch } from "@/components/atoms";
import { LoadingState, PixelGrid } from "@/components/atoms/LoadingState";
import { useLive } from "@/components/realtime/LiveProvider";
import type { RadahnDataParts, RadahnUIMessage, RecallPickWire } from "@/lib/chat-types";
import { normalizeCitations } from "@/lib/citations";
import { Markdown } from "@/lib/markdown";
import { MEMORY_TYPE_META } from "@/lib/memory-types";
import { cn } from "@/lib/utils";
import { dataPart, dataParts, messageText } from "./parts";
import { WriteChips } from "./WriteChips";

export function UserMessage({ message }: { message: RadahnUIMessage }) {
  const [copied, setCopied] = useState(false);
  const text = messageText(message);
  return (
    <div className="group flex flex-col items-end gap-1">
      <div className="max-w-[85%] whitespace-pre-wrap rounded-[18px] bg-surface-2 px-4 py-3 text-[15.5px] leading-relaxed text-ink shadow-card">
        {text}
      </div>
      <div className="opacity-60 transition-opacity group-hover:opacity-100 md:opacity-0 md:focus-within:opacity-100">
        <IconBtn
          label={copied ? "Copied" : "Copy message"}
          onClick={() => {
            void navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </IconBtn>
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
  onShowMemory,
  streaming,
  isLatest,
}: {
  message: RadahnUIMessage;
  isLatest: boolean;
  onShowMemory?: () => void;
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
  const ops = dataParts(message, "memory-op");
  const redaction = dataPart(message, "redaction");
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
        <p className="mb-2 text-[13px] text-red">Not saved: that looked like a credential ({redaction.kinds.join(", ").replaceAll("_", " ")}).</p>
      ) : null}

      <RecallLine recall={recall} onShow={onShowMemory} />

      {ops.length ? (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {ops.map((o, i) => (
            <li key={i} className="flex h-7 items-center gap-1.5 rounded-full bg-hover px-2.5 text-[13px] text-ink-2">
              {o.type ? <TypeSwatch type={o.type} size={11} /> : null}
              <span className="font-medium text-ink">{OP_LABEL[o.op] ?? o.op}</span>
              <span className="max-w-[40ch] truncate">
                {o.status === "blocked" ? "blocked: looked unsafe" : o.before && o.after ? `${o.before} → ${o.after}` : (o.statement ?? o.status)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="text-[16px] leading-[1.7] text-ink">
        {text ? <Markdown text={normalizeCitations(text)} cite={cite} /> : streaming ? <LoadingState label="Writing the answer…" /> : null}
      </div>

      <div className="mt-3 flex min-h-6 flex-wrap items-center gap-x-4 gap-y-2">
        <WriteChips events={writes} waiting={isLatest && !streaming && Boolean(text)} />
        {!streaming && text ? (
          <div className="ml-auto flex items-center gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
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
                aria-label="Answer again without memory"
                title="Answer again without memory"
                className="group/ghost flex h-8 items-center rounded-full px-2 text-[13px] text-ink-3 transition-colors hover:bg-hover hover:text-ink focus-visible:text-ink"
              >
                <Ghost className="size-4" strokeWidth={1.75} />
                <span className="max-w-0 overflow-hidden whitespace-nowrap transition-[max-width,margin] duration-200 group-hover/ghost:ml-1.5 group-hover/ghost:max-w-[9rem] group-focus-visible/ghost:ml-1.5 group-focus-visible/ghost:max-w-[9rem] motion-reduce:transition-none">
                  Without memory
                </span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function RecallLine({ recall, onShow }: { recall?: RadahnDataParts["recall"]; onShow?: () => void }) {
  if (!recall) return null;
  if (recall.status === "running")
    return (
      <p className="mb-2">
        <LoadingState label="Remembering…" />
      </p>
    );
  if (recall.status === "error") return <p className="mb-2 text-[13px] text-ink-3">Memory was unavailable for this reply.</p>;
  const n = recall.picks?.length ?? 0;
  const Tag = onShow && n > 0 ? "button" : "p";
  return (
    <Tag
      {...(Tag === "button"
        ? { type: "button" as const, onClick: (e: React.MouseEvent) => (e.stopPropagation(), onShow!()), title: "Show these memories", "aria-label": `Show the ${n} memories used` }
        : {})}
      className={cn("mb-2 flex items-center gap-2 rounded-control text-[13px] text-ink-3", Tag === "button" && "-mx-1.5 px-1.5 py-0.5 transition-colors hover:bg-hover hover:text-ink")}
    >
      <span className="flex gap-0.5" aria-hidden>
        {(recall.picks ?? []).slice(0, 8).map((p) => (
          <span key={p.ref} className="size-2 rounded-[1px]" style={{ background: `var(${MEMORY_TYPE_META[p.type].colorVar})` }} />
        ))}
      </span>
      {n === 0 ? "No memories needed" : `Used ${n} ${n === 1 ? "memory" : "memories"}`}
      {recall.strategies?.length ? <span>· {recall.strategies.length} learned rule{recall.strategies.length > 1 ? "s" : ""}</span> : null}
    </Tag>
  );
}

export function PixelLoader() {
  return <PixelGrid className="text-grove-ink" />;
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
          <span className="text-[12.5px] font-medium flex items-center justify-between text-tooltip-muted">
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

const OP_LABEL: Record<string, string> = { remember: "Remembered", recall: "Searched memory", correct: "Corrected", forget: "Forgot" };

function IconBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="rounded-control p-2 text-ink-3 hover:bg-hover hover:text-ink">
      {children}
    </button>
  );
}
