"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AgentKeys } from "./AgentKeys";
import { Button } from "@/components/atoms";
import { cn } from "@/lib/utils";

const POLICIES = [
  { v: "review_sensitive", label: "Review sensitive", note: "Default. Health, money, location, and other people's details wait for your approval." },
  { v: "auto", label: "Automatic", note: "Saves everything that passes the privacy gate; only low-confidence items wait." },
  { v: "review_all", label: "Review everything", note: "Nothing is remembered until you approve it." },
];

export function SettingsForm({
  initial,
  isGuest,
  demoLoaded,
}: {
  initial: { displayName: string; timeZone: string; writePolicy: string; chatModel: string };
  isGuest: boolean;
  demoLoaded: boolean;
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [saved, setSaved] = useState<string | null>(null);
  const [danger, setDanger] = useState<"idle" | "confirm" | "busy">("idle");

  async function save(patch: Partial<typeof v>) {
    const next = { ...v, ...patch };
    setV(next);
    const r = await fetch("/api/settings", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
    setSaved(r.ok ? "Saved." : "Couldn't save that.");
    setTimeout(() => setSaved(null), 1500);
    router.refresh();
  }

  async function demo(action: "POST" | "DELETE") {
    await fetch("/api/demo/seed", { method: action });
    router.refresh();
    setSaved(action === "POST" ? "Demo world loaded." : "Demo data removed.");
  }

  async function deleteAll() {
    setDanger("busy");
    await fetch("/api/account/data", { method: "DELETE" });
    setDanger("idle");
    router.push("/app");
    router.refresh();
  }

  return (
    <div className="mt-8 flex flex-col gap-10">
      <Group title="Profile">
        <Field label="What should Radahn call you?">
          <input
            defaultValue={v.displayName}
            onBlur={(e) => e.target.value !== v.displayName && save({ displayName: e.target.value })}
            maxLength={40}
            placeholder={isGuest ? "Guest" : "Your first name"}
            className="h-9 w-full rounded-control bg-surface px-3 text-[13px] text-ink shadow-card outline-none"
          />
        </Field>
        <Field label="Time zone">
          <input
            defaultValue={v.timeZone}
            onBlur={(e) => e.target.value !== v.timeZone && save({ timeZone: e.target.value })}
            className="h-9 w-full rounded-control bg-surface px-3 font-mono text-[12.5px] text-ink shadow-card outline-none"
          />
        </Field>
      </Group>

      <Group title="Memory policy">
        <Choice options={POLICIES} value={v.writePolicy} onChange={(writePolicy) => save({ writePolicy })} />
      </Group>

      <Group title="Connected agents">
        <AgentKeys />
      </Group>

      <Group title="Data">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => demo("POST")}>{demoLoaded ? "Reload demo world" : "Load demo world"}</Button>
          {demoLoaded ? <Button size="sm" variant="ghost" onClick={() => demo("DELETE")}>Remove demo data</Button> : null}
          <a href="/api/export" className="inline-flex h-8 items-center rounded-control px-3 text-[12.5px] text-ink shadow-[inset_0_0_0_1px_var(--line-strong)] hover:bg-hover">
            Export all (JSON)
          </a>
        </div>
        <div className="mt-4">
          {danger === "idle" ? (
            <Button size="sm" variant="danger" onClick={() => setDanger("confirm")}>Delete all memory</Button>
          ) : (
            <div className="rounded-card bg-surface p-4 shadow-card">
              <p className="text-[13px] text-ink">Delete every memory, chat, and event for this account? This can&apos;t be undone.</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="danger" onClick={deleteAll} disabled={danger === "busy"}>{danger === "busy" ? "Deleting…" : "Delete everything"}</Button>
                <Button size="sm" variant="ghost" onClick={() => setDanger("idle")}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      </Group>
      <p role="status" aria-live="polite" className="fixed bottom-6 right-6 text-[12.5px] text-ink-2">{saved}</p>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[12.5px] font-medium mb-3 text-ink-3">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12.5px] text-ink-2">{label}</span>
      {children}
    </label>
  );
}

function Choice({ options, value, onChange }: { options: Array<{ v: string; label: string; note: string }>; value: string; onChange: (v: string) => void }) {
  return (
    <div role="radiogroup" className="grid gap-px overflow-hidden rounded-card bg-line shadow-card">
      {options.map((o) => (
        <button
          key={o.v}
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={cn("flex items-start gap-3 bg-surface px-4 py-3 text-left hover:bg-surface-2", value === o.v && "bg-surface-2")}
        >
          <span className={cn("mt-1 size-3 shrink-0 rounded-full shadow-[inset_0_0_0_1px_var(--line-strong)]", value === o.v && "bg-accent shadow-none")} />
          <span>
            <span className="block text-[13px] text-ink">{o.label}</span>
            <span className="mt-0.5 block text-[12px] text-ink-3">{o.note}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
