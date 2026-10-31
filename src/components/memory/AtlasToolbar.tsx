"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";

const STATUS_OPTS = [
  { v: "", label: "Current" },
  { v: "pending_review", label: "Needs review" },
  { v: "superseded", label: "Outdated" },
  { v: "expired", label: "Expired" },
];
const ASOF_OPTS = [
  { v: "", label: "Now" },
  { v: "1h", label: "1 hour ago" },
  { v: "1d", label: "Yesterday" },
  { v: "3d", label: "3 days ago" },
  { v: "7d", label: "A week ago" },
];
const SORT_OPTS = [
  { v: "updated", label: "Recently updated" },
  { v: "importance", label: "Importance" },
  { v: "recalled", label: "Most recalled" },
  { v: "created", label: "Newest" },
];

export function AtlasToolbar({
  q,
  status,
  sort,
  space,
  spaces,
  asof,
}: {
  asof?: string;
  q: string;
  type?: string;
  status?: string;
  sort: string;
  space: string;
  spaces: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [text, setText] = useState(q);
  const [pending, start] = useTransition();

  const set = (k: string, v: string | undefined) => {
    const p = new URLSearchParams(params.toString());
    if (v) p.set(k, v);
    else p.delete(k);
    start(() => router.replace(`${pathname}${p.size ? `?${p}` : ""}`));
  };

  return (
    <div className={cn("mt-5 flex flex-wrap items-center gap-2", pending && "opacity-70")}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          set("q", text.trim() || undefined);
        }}
        className="flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-control bg-surface px-3 shadow-card"
        role="search"
      >
        <Search className="size-3.5 text-ink-3" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search statements and entities"
          aria-label="Search memories"
          className="h-full min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-3"
        />
      </form>
      <Select label="As of" value={asof ?? ""} options={ASOF_OPTS} onChange={(v) => set("asof", v || undefined)} />
      <Select label="Status" value={status ?? ""} options={STATUS_OPTS} onChange={(v) => set("status", v || undefined)} />
      <Select label="Space" value={space} options={spaces.map((s) => ({ v: s.id, label: s.name }))} onChange={(v) => set("space", v === "all" ? undefined : v)} />
      <Select label="Sort" value={sort} options={SORT_OPTS} onChange={(v) => set("sort", v === "updated" ? undefined : v)} />
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: Array<{ v: string; label: string }>; onChange: (v: string) => void }) {
  return (
    <label className="flex h-9 items-center gap-2 rounded-control bg-surface pl-3 pr-1 shadow-card">
      <span className="text-[12.5px] font-medium text-ink-3">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-full cursor-pointer bg-transparent pr-1 text-[12.5px] text-ink outline-none [&>option]:bg-surface-2"
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
