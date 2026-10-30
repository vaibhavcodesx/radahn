"use client";

import { ArrowUp, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Remount with a new `key` to prefill (suggestion chips) — no state syncing effects.
 *
 * Composer (design.md §6.4 Prompt Bar, simplified for Phase 1). Enter sends, Shift+Enter breaks
 * the line. On send, a sweep in the ten memory-type colours crosses the bar (the "glimm").
 */
export function Composer({
  onSend,
  onStop,
  busy,
  disabled,
  placeholder = "Ask anything. I'll remember what matters.",
  initial,
}: {
  onSend: (text: string) => void;
  onStop?: () => void;
  busy: boolean;
  disabled?: boolean;
  placeholder?: string;
  initial?: string;
}) {
  const [text, setText] = useState(initial ?? "");
  const [sweep, setSweep] = useState(0);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(200, el.scrollHeight)}px`;
  }, [text]);

  const send = () => {
    const t = text.trim();
    if (!t || busy || disabled) return;
    onSend(t);
    setText("");
    setSweep((s) => s + 1);
  };

  return (
    <div className="relative overflow-hidden rounded-[16px] bg-surface-2 shadow-overlay">
      {sweep ? <span key={sweep} aria-hidden className="glimm pointer-events-none absolute inset-x-0 top-0 h-[2px]" /> : null}
      <label htmlFor="composer" className="sr-only">
        Message Radahn
      </label>
      <textarea
        id="composer"
        ref={ref}
        autoFocus={Boolean(initial)}
        rows={1}
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            send();
          }
        }}
        placeholder={placeholder}
        className="block max-h-[200px] w-full resize-none bg-transparent px-4 pb-12 pt-3.5 text-[14.5px] leading-relaxed text-ink outline-none placeholder:text-ink-3"
      />
      <div className="absolute inset-x-3 bottom-2.5 flex items-center gap-2">
        <span className="mono-label text-[10px] text-ink-3">Enter to send · Shift+Enter for a new line</span>
        <span className="flex-1" />
        {busy && onStop ? (
          <button onClick={onStop} className="inline-flex size-8 items-center justify-center rounded-full bg-hover-2 text-ink" aria-label="Stop">
            <Square className="size-3.5" fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={send}
            disabled={!text.trim() || busy || disabled}
            className={cn("inline-flex size-8 items-center justify-center rounded-full bg-accent text-accent-ink transition-opacity disabled:opacity-30")}
            aria-label="Send"
          >
            <ArrowUp className="size-4" strokeWidth={2.25} />
          </button>
        )}
      </div>
    </div>
  );
}
