"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** Row-level forget (bin) for the Memory table: first click asks, second click deletes for good. */
export function ForgetButton({ id, statement }: { id: string; statement: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "confirm" | "busy">("idle");

  async function forget() {
    setState("busy");
    const r = await fetch(`/api/memories/${id}`, { method: "DELETE" }).catch(() => null);
    if (r?.ok) router.refresh();
    else setState("idle");
  }

  if (state === "idle")
    return (
      <button
        onClick={() => setState("confirm")}
        className="flex size-8 items-center justify-center rounded-control text-ink-3 opacity-60 transition-opacity hover:bg-hover hover:text-red group-hover:opacity-100 focus-visible:opacity-100"
        aria-label={`Forget: ${statement}`}
        title="Forget"
      >
        <Trash2 className="size-4" strokeWidth={1.75} />
      </button>
    );
  return (
    <span className="flex items-center gap-1">
      <button onClick={forget} disabled={state === "busy"} className="h-8 rounded-full bg-red px-3 text-[12.5px] font-medium text-white disabled:opacity-60">
        {state === "busy" ? "…" : "Forget"}
      </button>
      <button onClick={() => setState("idle")} className="h-8 rounded-full px-2.5 text-[12.5px] text-ink-2 hover:bg-hover">
        Keep
      </button>
    </span>
  );
}
