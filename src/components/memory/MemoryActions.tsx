"use client";

import { Clock, Pencil, Pin, PinOff, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/atoms";

/** ISO timestamp `ms` from now (called from event handlers only). */
const fromNow = (ms: number) => new Date(Date.now() + ms).toISOString();

/**
 * Memory detail actions (design.md §6.6, task D1).
 * Edit = correction (supersedes, keeps history),
 * Pin/Unpin core, Expire (incl. "in 2 minutes" for the live demo), Forget (hard delete with confirm).
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
      setMsg(
        ms === null
          ? "Expiry cleared."
          : ms <= 3 * 60_000
          ? "Set to expire in 2 minutes. Radahn stops using it then, and it is deleted for good shortly after."
          : "Expiry set.",
      );
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

  if (!editable) return msg ? <p className="mt-4 text-[13px] text-red">{msg}</p> : null;

  return (
    <div className="mt-6">
      {mode === "edit" ? (
        <div className="rounded-card border border-line bg-surface p-5 shadow-card">
          <label htmlFor="mem-edit" className="text-[13.5px] font-medium text-ink">
            Correct this memory
          </label>
          <p className="mt-0.5 text-[12.5px] text-ink-3">
            The previous statement is saved to history as superseded.
          </p>
          <textarea
            id="mem-edit"
            value={text}
            maxLength={240}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            autoFocus
            className="mt-3 w-full resize-none rounded-control border border-line bg-surface-2 p-3 font-serif text-[18px] leading-snug text-ink outline-none transition-colors focus:border-line-strong"
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              variant="accent"
              size="md"
              onClick={saveEdit}
              disabled={busy || text.trim().length < 3}
              className="min-h-[44px] px-5"
            >
              {busy ? "Saving…" : "Save correction"}
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={() => setMode("idle")}
              className="min-h-[44px] px-4"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : mode === "forget" ? (
        <div
          role="alertdialog"
          aria-labelledby="forget-title"
          className="rounded-card border border-red/30 bg-red/5 p-5 shadow-card"
        >
          <p id="forget-title" className="font-serif text-[18px] text-red">
            Forget this memory permanently?
          </p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">
            This memory is deleted immediately from the database. Radahn keeps only a content-free event record that an item was forgotten.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              variant="danger"
              size="md"
              onClick={forget}
              disabled={busy}
              className="min-h-[44px] px-5"
            >
              {busy ? "Forgetting…" : "Forget permanently"}
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={() => setMode("idle")}
              className="min-h-[44px] px-4"
            >
              Keep it
            </Button>
          </div>
        </div>
      ) : (
        /* Tidy action bar */
        <div className="flex flex-wrap items-center gap-2.5 rounded-control border border-line bg-surface p-2 shadow-card">
          <Button
            size="sm"
            variant="ghost"
            icon={<Pencil className="size-3.5" />}
            onClick={() => setMode("edit")}
            className="min-h-[38px] px-3.5 text-[13px] text-ink hover:bg-hover"
          >
            Edit
          </Button>

          <Button
            size="sm"
            variant="ghost"
            icon={pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
            onClick={async () => (await call("PATCH", { pinned: !pinned })) && router.refresh()}
            disabled={busy}
            className="min-h-[38px] px-3.5 text-[13px] text-ink hover:bg-hover"
          >
            {pinned ? "Unpin from core" : "Pin to core"}
          </Button>

          {/* Expire menu */}
          <div className="relative">
            <Button
              size="sm"
              variant="ghost"
              icon={<Clock className="size-3.5" />}
              onClick={() => setMode(mode === "expire" ? "idle" : "expire")}
              aria-expanded={mode === "expire"}
              className="min-h-[38px] px-3.5 text-[13px] text-ink hover:bg-hover"
            >
              Expire
            </Button>
            {mode === "expire" ? (
              <div
                className="absolute left-0 top-11 z-20 flex w-48 animate-pop-in flex-col rounded-card border border-line bg-surface-2 p-1.5 shadow-overlay"
                role="menu"
              >
                {[
                  ["In 2 minutes (demo)", 2 * 60_000],
                  ["In 1 hour", 3_600_000],
                  ["Tomorrow", 24 * 3_600_000],
                  ["In a week", 7 * 24 * 3_600_000],
                ].map(([label, ms]) => (
                  <button
                    key={label as string}
                    role="menuitem"
                    onClick={() => expireIn(ms as number)}
                    className="flex min-h-[36px] items-center rounded-control px-3 text-left text-[13px] text-ink-2 hover:bg-hover hover:text-ink"
                  >
                    {label}
                  </button>
                ))}
                {hasExpiry ? (
                  <button
                    role="menuitem"
                    onClick={() => expireIn(null)}
                    className="flex min-h-[36px] items-center border-t border-line px-3 text-left text-[13px] text-ink-3 hover:bg-hover hover:text-ink"
                  >
                    Never expire
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="ml-auto">
            <Button
              size="sm"
              variant="ghost"
              icon={<Trash2 className="size-3.5 text-red" />}
              onClick={() => setMode("forget")}
              className="min-h-[38px] px-3.5 text-[13px] text-red hover:bg-red/10"
            >
              Forget
            </Button>
          </div>
        </div>
      )}

      {msg ? (
        <p role="status" aria-live="polite" className="mt-3 text-[13px] text-ink-2">
          {msg}
        </p>
      ) : null}
    </div>
  );
}
