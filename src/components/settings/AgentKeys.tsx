"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/atoms";
import { timeAgo } from "@/lib/utils";

interface KeyMeta {
  id: string;
  name: string;
  prefix: string;
  spaceKeys: string[];
  createdAt: string;
  lastUsedAt?: string;
}

/**
 * Connected agents (PRD F-41): scoped keys for the MCP endpoint. A key sees only the spaces it
 * was granted; its writes show in Activity under its name. The raw key is shown once.
 */
export function AgentKeys() {
  const [data, setData] = useState<{ keys: KeyMeta[]; spaces: Array<{ id: string; name: string }> } | null>(null);
  const [failed, setFailed] = useState(false);
  const [name, setName] = useState("Claude Code");
  const [spaceId, setSpaceId] = useState("");
  const [includeGlobal, setIncludeGlobal] = useState(true);
  const [created, setCreated] = useState<{ key: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = () =>
    fetch("/api/agent-keys")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setData(d);
        setSpaceId((s) => s || d.spaces[0]?.id || "");
      })
      .catch(() => setFailed(true));

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/agent-keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, spaceId: spaceId || undefined, includeGlobal }),
    });
    setBusy(false);
    const d = await r.json().catch(() => null);
    if (!r.ok) return setError(d?.error?.message ?? "Couldn't create the key.");
    setCreated({ key: d.key, name });
    setCopied(false);
    void load();
  }

  async function revoke(id: string) {
    await fetch(`/api/agent-keys/${id}`, { method: "DELETE" });
    void load();
  }

  const spaceName = (k: string) => (k === "global" ? "Global" : (data?.spaces.find((s) => s.id === k)?.name ?? "space"));
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const command = created ? `claude mcp add --transport http radahn ${origin}/api/mcp --header "Authorization: Bearer ${created.key}"` : "";

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[12.5px] leading-relaxed text-ink-2">
        Let another agent (Claude Code, Cursor, Codex) use this memory over MCP. Each key sees only the spaces you pick, and everything it saves shows in
        Activity under its name.
      </p>

      {created ? (
        <div className="rounded-card bg-surface-2 p-4 shadow-overlay">
          <p className="text-[12.5px] font-medium text-orange">Copy now · shown once</p>
          <p className="mt-2 text-[12.5px] text-ink-2">Add “{created.name}” to Claude Code:</p>
          <div className="mt-2 flex items-start gap-2">
            <code className="block min-w-0 flex-1 break-all rounded-control bg-surface px-3 py-2 font-mono text-[11px] text-ink">{command}</code>
            <Button
              size="sm"
              variant="secondary"
              aria-label="Copy command"
              onClick={() => {
                void navigator.clipboard.writeText(command);
                setCopied(true);
              }}
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </Button>
          </div>
          <p className="mt-2 text-[11.5px] text-ink-3">Tools: memory_search · memory_list · memory_save · memory_forget. Endpoint: {origin}/api/mcp</p>
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => setCreated(null)}>Done</Button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-[160px] flex-1 flex-col gap-1.5">
          <span className="text-[12.5px] text-ink-2">Agent name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className="h-9 rounded-control bg-surface px-3 text-[13px] text-ink shadow-card outline-none" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] text-ink-2">Space</span>
          <select value={spaceId} onChange={(e) => setSpaceId(e.target.value)} className="h-9 rounded-control bg-surface px-2 text-[12.5px] text-ink shadow-card outline-none [&>option]:bg-surface-2">
            <option value="">None</option>
            {data?.spaces.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <label className="flex h-9 items-center gap-2 text-[12.5px] text-ink-2">
          <input type="checkbox" checked={includeGlobal} onChange={(e) => setIncludeGlobal(e.target.checked)} className="accent-[var(--accent)]" />
          + Global
        </label>
        <Button size="sm" variant="accent" onClick={create} disabled={busy || !name.trim()}>{busy ? "Creating…" : "Create key"}</Button>
      </div>
      {error ? <p className="text-[12.5px] text-red">{error}</p> : null}

      {failed ? (
        <p className="text-[12.5px] text-ink-3">Couldn&apos;t load connected agents.</p>
      ) : data && data.keys.length ? (
        <ul className="flex flex-col divide-y divide-line rounded-card bg-surface shadow-card">
          {data.keys.map((k) => (
            <li key={k.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-[12.5px]">
              <span className="text-ink">{k.name}</span>
              <span className="font-mono text-[11px] text-ink-3">{k.prefix}…</span>
              <span className="text-ink-2">{k.spaceKeys.map(spaceName).join(" + ")}</span>
              <span className="font-mono text-[11px] text-ink-3">{k.lastUsedAt ? `used ${timeAgo(k.lastUsedAt)}` : "never used"}</span>
              <Button size="sm" variant="ghost" className="ml-auto" onClick={() => revoke(k.id)}>Revoke</Button>
            </li>
          ))}
        </ul>
      ) : data ? (
        <p className="text-[12.5px] text-ink-3">No agents connected yet.</p>
      ) : null}
    </div>
  );
}
