"use client";

import { ArrowUp, Check, ChevronDown, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CHAT_MODELS, type ChatModelId } from "@/lib/models";
import { cn } from "@/lib/utils";

/**
 * Composer (design.md §6.4 Prompt Bar). Enter sends, Shift+Enter breaks the line. The model
 * picker sits in the bar; the choice is sent with each message. On send, a sweep in the ten
 * memory-type colours crosses the bar (the "glimm"). Remount with a new `key` to prefill.
 */
export function Composer({
  onSend,
  onStop,
  busy,
  disabled,
  placeholder = "Ask anything. I'll remember what matters.",
  initial,
  model,
  onModel,
}: {
  onSend: (text: string) => void;
  onStop?: () => void;
  busy: boolean;
  disabled?: boolean;
  placeholder?: string;
  initial?: string;
  model: ChatModelId;
  onModel: (m: ChatModelId) => void;
}) {
  const [text, setText] = useState(initial ?? "");
  const [sweep, setSweep] = useState(0);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(220, el.scrollHeight)}px`;
  }, [text]);

  const send = () => {
    const t = text.trim();
    if (!t || busy || disabled) return;
    onSend(t);
    setText("");
    setSweep((s) => s + 1);
  };

  return (
    <div className="relative rounded-[18px] bg-surface-2 shadow-overlay">
      {sweep ? <span key={sweep} aria-hidden className="glimm pointer-events-none absolute inset-x-4 top-0 h-[2px]" /> : null}
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
        className="block max-h-[220px] w-full resize-none bg-transparent px-4 pb-1 pt-4 text-[16px] leading-relaxed text-ink outline-none placeholder:text-ink-3"
      />
      <div className="flex items-center gap-2 px-2.5 pb-2.5 pt-1">
        <ModelPicker value={model} onChange={onModel} />
        <span className="flex-1" />
        {busy && onStop ? (
          <button onClick={onStop} className="inline-flex size-9 items-center justify-center rounded-full bg-hover-2 text-ink" aria-label="Stop">
            <Square className="size-3.5" fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={send}
            disabled={!text.trim() || busy || disabled}
            className={cn("inline-flex size-9 items-center justify-center rounded-full bg-accent text-accent-ink transition-opacity disabled:opacity-30")}
            aria-label="Send"
          >
            <ArrowUp className="size-4" strokeWidth={2.25} />
          </button>
        )}
      </div>
    </div>
  );
}

function ModelPicker({ value, onChange }: { value: ChatModelId; onChange: (m: ChatModelId) => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const current = CHAT_MODELS.find((m) => m.id === value) ?? CHAT_MODELS[0];

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-8 items-center gap-1 rounded-full px-2.5 text-[13px] text-ink-2 hover:bg-hover hover:text-ink"
      >
        {current.label}
        <ChevronDown className="size-3.5" />
      </button>
      {open ? (
        <ul role="listbox" aria-label="Model" className="absolute bottom-10 left-0 z-30 w-56 animate-pop-in rounded-card bg-surface-2 p-1 shadow-overlay">
          {CHAT_MODELS.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                role="option"
                aria-selected={m.id === value}
                onClick={() => {
                  onChange(m.id);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-control px-3 py-2 text-left hover:bg-hover"
              >
                <span className="flex-1">
                  <span className="block text-[14px] text-ink">{m.label}</span>
                  <span className="block text-[12px] text-ink-3">{m.hint}</span>
                </span>
                {m.id === value ? <Check className="size-4 text-ink" /> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
