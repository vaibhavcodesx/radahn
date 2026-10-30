"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface SpaceItem {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
  demo?: boolean;
}

const COLORS = ["--t-preference", "--t-fact", "--t-constraint", "--t-outcome", "--t-strategy", "--t-goal"];

export function SpaceSwitcher({ spaces, currentSpaceId }: { spaces: SpaceItem[]; currentSpaceId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const current = spaces.find((s) => s.id === currentSpaceId) ?? spaces[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function select(id: string) {
    setOpen(false);
    await fetch("/api/spaces", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "select", spaceId: id }) });
    router.push("/app");
    router.refresh();
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const color = COLORS[spaces.length % COLORS.length];
    await fetch("/api/spaces", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "create", name: name.trim(), color }) });
    setName("");
    setCreating(false);
    setOpen(false);
    router.push("/app");
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-9 w-full items-center gap-2.5 rounded-control px-2.5 text-left text-[13px] text-ink hover:bg-hover"
      >
        <span className="size-3 shrink-0 rounded-[3px]" style={{ background: `var(${current?.color ?? "--t-profile"})` }} />
        <span className="flex-1 truncate">{current?.name}</span>
        <ChevronsUpDown className="size-3.5 text-ink-3" />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-10 z-40 animate-pop-in rounded-card bg-surface-2 p-1 shadow-overlay" role="listbox" aria-label="Spaces">
          <p className="mono-label px-2.5 pb-1 pt-1.5 text-ink-3">Spaces</p>
          {spaces.map((s) => (
            <button
              key={s.id}
              role="option"
              aria-selected={s.id === currentSpaceId}
              onClick={() => select(s.id)}
              className={cn("flex h-8 w-full items-center gap-2.5 rounded-control px-2.5 text-[12.5px] text-ink-2 hover:bg-hover hover:text-ink", s.id === currentSpaceId && "text-ink")}
            >
              <span className="size-2.5 rounded-[2px]" style={{ background: `var(${s.color})` }} />
              <span className="flex-1 truncate text-left">{s.name}</span>
              {s.demo ? <span className="mono-label text-[9.5px] text-ink-3">Demo</span> : null}
              {s.id === currentSpaceId ? <Check className="size-3.5" /> : null}
            </button>
          ))}
          <div className="my-1 h-px bg-line" />
          {creating ? (
            <form onSubmit={create} className="flex items-center gap-1.5 p-1">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                placeholder="Space name"
                aria-label="New space name"
                className="h-8 min-w-0 flex-1 rounded-control bg-hover px-2.5 text-[12.5px] text-ink outline-none placeholder:text-ink-3"
              />
              <button type="submit" className="mono-label h-8 rounded-control bg-accent px-2.5 text-accent-ink">Add</button>
            </form>
          ) : (
            <button onClick={() => setCreating(true)} className="flex h-8 w-full items-center gap-2.5 rounded-control px-2.5 text-[12.5px] text-ink-2 hover:bg-hover hover:text-ink">
              <Plus className="size-3.5" /> New space
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
