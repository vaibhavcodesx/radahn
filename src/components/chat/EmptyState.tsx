"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, TypeSwatch } from "@/components/atoms";
import { MEMORY_TYPE_LIST } from "@/lib/memory-types";

/**
 * Chat empty state (design.md §6.4): serif prompt, suggestion chips, and — when the user has
 * no memories yet — the one-click demo world (judge path, PRD §7.1).
 */
export function EmptyState({
  suggestions,
  showDemo,
  onPick,
}: {
  suggestions: string[];
  showDemo: boolean;
  onPick: (s: string) => void;
}) {
  const router = useRouter();
  const [seeding, setSeeding] = useState<"idle" | "busy" | "error">("idle");

  async function loadDemo() {
    setSeeding("busy");
    const r = await fetch("/api/demo/seed", { method: "POST" });
    if (!r.ok) {
      setSeeding("error");
      return;
    }
    router.push("/app?demo=1");
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col items-center px-4 pt-[12vh] text-center">
      <Orb />
      <h1 className="mt-8 font-serif text-[32px] leading-tight tracking-[-0.01em]">Ask anything. I&apos;ll remember what matters.</h1>
      <p className="mt-3 max-w-[46ch] text-[14px] leading-relaxed text-ink-2">
        Every answer shows which memories shaped it. You can correct, expire, or forget any of them.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-2">
        {suggestions.map((s) => (
          <button key={s} onClick={() => onPick(s)} className="h-9 rounded-full px-4 text-[13px] text-ink-2 shadow-[inset_0_0_0_1px_var(--line-strong)] transition-colors hover:bg-hover hover:text-ink">
            {s}
          </button>
        ))}
      </div>

      {showDemo ? (
        <div className="mt-10 w-full rounded-card bg-surface p-5 text-left shadow-card">
          <div className="flex items-start gap-4">
            <div className="grid shrink-0 grid-cols-5 gap-1" aria-hidden>
              {MEMORY_TYPE_LIST.map((t) => (
                <TypeSwatch key={t} type={t} size={14} />
              ))}
            </div>
            <div className="flex-1">
              <p className="mono-label text-[10.5px] text-ink-3">Demo</p>
              <p className="mt-1 text-[14px] text-ink">Load a demo memory world</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
                Aarav, a student at SVNIT racing the UNCHARTED deadline: 3 spaces, ~38 memories of every type, a corrected decision, one item waiting for review, one about to expire. Labelled DEMO.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button variant="accent" size="sm" onClick={loadDemo} disabled={seeding === "busy"}>
              {seeding === "busy" ? "Loading…" : "Load demo memories"}
            </Button>
            <span className="text-[12px] text-ink-3">{seeding === "error" ? "Couldn't load the demo. Try again." : "Or just start talking."}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Agent presence: a breathing grid of type colours (stand-in for the AI orb, P1). */
function Orb() {
  return (
    <div className="grid grid-cols-5 gap-1.5" aria-hidden>
      {MEMORY_TYPE_LIST.map((t, i) => (
        <span
          key={t}
          className="size-3 animate-pixel-on rounded-[2px]"
          style={{ background: `var(--t-${t})`, animationDelay: `${i * 180}ms`, animationDuration: "2.4s" }}
        />
      ))}
    </div>
  );
}
