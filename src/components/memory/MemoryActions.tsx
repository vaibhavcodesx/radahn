"use client";

import { Clock, Pencil, Pin, PinOff, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/atoms";

/** ISO timestamp `ms` from now (called from event handlers only). */
const fromNow = (ms: number) => new Date(Date.now() + ms).toISOString();

/**
 * Memory detail actions (design.md §6.6): Edit = correction (supersedes, keeps history),
 * Pin/Unpin core, Expire (incl. "in 2 minutes" for the live demo), Forget (hard delete).
 */
export function MemoryActions({
  id,
  statement,
  pinned,
  status,
  hasExpiry,
}: {
  id: string;
  statement: string;
  pinned: boolean;
  status: string;
  hasExpiry: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "edit" | "expire" | "forget">("idle");
  const [text, setText] = useState(statement);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const editable = status === "active" || status === "pending_review";

  async function call(method: string, body?: unknown) {
    setBusy(true);
    setMsg(null);
    const r = await fetch(`/api/memories/${id}`, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      setMsg(j.error?.message ?? "That didn't work. Try again.");
      return null;
    }
    return j;
  }

  async function saveEdit() {
    if (text.trim() === statement) return setMode("idle");
    const j = await call("PATCH", { statement: text.trim() });
    if (j?.memory?.id) router.push(`/app/memory/${j.memory.id}`);
    router.refresh();
    setMode("idle");
  }

  async function expireIn(ms: number | null) {
    const j = await call("PATCH", { expiresAt: ms === null ? null : fromNow(ms) });
    if (j) {
      setMsg(ms === null ? "Expiry cleared." : ms <= 3 * 60_000 ? "Set to expire in 2 minutes. Radahn stops using it then, and it is deleted for good shortly after." : "Expiry set.");
      router.refresh();
      setMode("idle");
    }
  }

  async function forget() {
    const j = await call("DELETE");
    if (j) {
      router.push("/app/memory");
      router.refresh();
    }
  }

  if (!editable) return msg ? <p className="mt-4 text-[12.5px] text-red">{msg}</p> : null;

  return (
    <div className="mt-6">
      {mode === "edit" ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="mem-edit" className="text-[12.5px] font-medium text-ink-3">
            Correct this memory — the old version stays in history
          </label>
          <textarea
            id="mem-edit"
            value={text}
            maxLength={240}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            autoFocus
            className="w-full resize-none rounded-control bg-surface p-3 font-serif text-[18px] leading-snug text-ink shadow-card outline-none"
          />
          <div className="flex gap-2">
            <Button variant="accent" size="sm" onClick={saveEdit} disabled={busy || text.trim().length < 3}>
              {busy ? "Saving…" : "Save correction"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setMode("idle")}>
              Cancel
            </Button>
          </div>
        </div>
      ) : mode === "forget" ? (
        <div role="alertdialog" aria-labelledby="forget-title" className="rounded-card bg-surface p-4 shadow-card">
          <p id="forget-title" className="text-[14px] text-ink">Forget this memory?</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
            It&apos;s deleted for good. Radahn keeps only a note that something was forgotten, never what it was.
          </p>
          <div className="mt-3 flex gap-2">
            <Button variant="danger" size="sm" onClick={forget} disabled={busy}>
              {busy ? "Forgetting…" : "Forget permanently"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setMode("idle")}>
              Keep it
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" icon={<Pencil className="size-3.5" />} onClick={() => setMode("edit")}>
            Correct
          </Button>
          <Button
            size="sm"
            icon={pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
            onClick={async () => (await call("PATCH", { pinned: !pinned })) && router.refresh()}
            disabled={busy}
          >
            {pinned ? "Unpin from core" : "Pin to core"}
          </Button>
          <div className="relative">
            <Button size="sm" icon={<Clock className="size-3.5" />} onClick={() => setMode(mode === "expire" ? "idle" : "expire")} aria-expanded={mode === "expire"}>
              Expire
            </Button>
            {mode === "expire" ? (
              <div className="absolute left-0 top-9 z-20 flex w-44 animate-pop-in flex-col rounded-card bg-surface-2 p-1 shadow-overlay" role="menu">
                {[
                  ["In 2 minutes", 2 * 60_000],
                  ["In 1 hour", 3_600_000],
                  ["Tomorrow", 24 * 3_600_000],
                  ["In a week", 7 * 24 * 3_600_000],
                ].map(([label, ms]) => (
                  <button key={label as string} role="menuitem" onClick={() => expireIn(ms as number)} className="h-8 rounded-control px-2.5 text-left text-[12.5px] text-ink-2 hover:bg-hover hover:text-ink">
                    {label}
                  </button>
                ))}
                {hasExpiry ? (
                  <button role="menuitem" onClick={() => expireIn(null)} className="h-8 rounded-control px-2.5 text-left text-[12.5px] text-ink-3 hover:bg-hover hover:text-ink">
                    Never expire
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          <Button size="sm" variant="danger" icon={<Trash2 className="size-3.5" />} onClick={() => setMode("forget")}>
            Forget
          </Button>
        </div>
      )}
      <p role="status" aria-live="polite" className="mt-2 min-h-5 text-[12.5px] text-ink-2">
        {msg}
      </p>
    </div>
  );
}
