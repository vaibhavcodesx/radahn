"use client";

import { Check, Copy, KeyRound, ShieldAlert } from "lucide-react";
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
 * Connected agents (PRD F-41, task B4): scoped keys for the MCP endpoint.
 * A key sees only the spaces granted; writes show in Activity.
 * Raw key is shown once with copy buttons.
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
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);

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
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    const r = await fetch("/api/agent-keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim(), spaceId: spaceId || undefined, includeGlobal }),
    });
    setBusy(false);
    const d = await r.json().catch(() => null);
    if (!r.ok) return setError(d?.error?.message ?? "Couldn't create the key.");
    setCreated({ key: d.key, name: name.trim() });
    setCopiedKey(false);
    setCopiedCommand(false);
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
    <div className="flex flex-col gap-5">
      <p className="text-[14px] leading-relaxed text-ink-2">
        Connect other agents (such as Claude Code, Cursor, or Codex) to read and write memories over the Model Context Protocol (MCP).
      </p>

      {/* One-time key display card */}
      {created ? (
        <div className="rounded-control border border-orange/40 bg-surface-2 p-5 shadow-overlay">
          <div className="flex items-center gap-2 text-orange">
            <ShieldAlert className="size-4 shrink-0" />
            <p className="text-[13px] font-semibold">Copy now — this key is shown once</p>
          </div>
          <p className="mt-1 text-[13px] text-ink-3">
            Radahn does not store raw keys. If you lose this key, you must create a new one.
          </p>

          {/* Raw key copy box */}
          <div className="mt-4">
            <span className="text-[12px] font-medium text-ink-3">Secret API key</span>
            <div className="mt-1 flex items-center justify-between gap-2 rounded-control border border-line bg-canvas p-2.5">
              <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-ink">{created.key}</code>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard.writeText(created.key);
                  setCopiedKey(true);
                  setTimeout(() => setCopiedKey(false), 2000);
                }}
                className="shrink-0"
              >
                {copiedKey ? <Check className="mr-1 size-3.5" /> : <Copy className="mr-1 size-3.5" />}
                {copiedKey ? "Copied" : "Copy key"}
              </Button>
            </div>
          </div>

          {/* MCP command box */}
          <div className="mt-3">
            <span className="text-[12px] font-medium text-ink-3">Claude Code CLI setup command</span>
            <div className="mt-1 flex items-start gap-2 rounded-control border border-line bg-canvas p-2.5">
              <code className="block min-w-0 flex-1 break-all font-mono text-[11.5px] leading-relaxed text-ink-2">
                {command}
              </code>
              <Button
                size="sm"
                variant="secondary"
                aria-label="Copy MCP command"
                onClick={() => {
                  void navigator.clipboard.writeText(command);
                  setCopiedCommand(true);
                  setTimeout(() => setCopiedCommand(false), 2000);
                }}
                className="shrink-0"
              >
                {copiedCommand ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              </Button>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button size="sm" variant="accent" onClick={() => setCreated(null)}>
              I have saved this key
            </Button>
          </div>
        </div>
      ) : null}

      {/* Create key form */}
      <div className="flex flex-wrap items-end gap-3 rounded-control border border-line bg-surface-2 p-4">
        <label className="flex min-w-[200px] flex-1 flex-col gap-1.5">
          <span className="text-[13px] font-medium text-ink">Agent name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="e.g. Claude Code"
            className="h-11 rounded-control border border-line bg-surface px-3 text-[13.5px] text-ink outline-none transition-colors focus:border-line-strong"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-ink">Allowed space</span>
          <select
            value={spaceId}
            onChange={(e) => setSpaceId(e.target.value)}
            className="h-11 rounded-control border border-line bg-surface px-3 text-[13.5px] text-ink outline-none transition-colors focus:border-line-strong [&>option]:bg-surface"
          >
            <option value="">None (global only)</option>
            {data?.spaces.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex h-11 items-center gap-2 text-[13px] text-ink-2">
          <input
            type="checkbox"
            checked={includeGlobal}
            onChange={(e) => setIncludeGlobal(e.target.checked)}
            className="size-4 accent-[var(--accent)]"
          />
          + Global memories
        </label>

        <Button
          size="md"
          variant="accent"
          onClick={create}
          disabled={busy || !name.trim()}
          className="min-h-[44px] px-5"
        >
          {busy ? "Creating…" : "Create key"}
        </Button>
      </div>

      {error ? <p className="text-[13px] text-red">{error}</p> : null}

      {/* Connected keys list */}
      <div className="mt-2">
        <h3 className="text-[13.5px] font-semibold text-ink">Active agent keys</h3>
        {failed ? (
          <p className="mt-2 text-[13px] text-red">Couldn&apos;t load connected agents.</p>
        ) : data && data.keys.length > 0 ? (
          <ul className="mt-3 flex flex-col divide-y divide-line rounded-card border border-line bg-surface-2 shadow-card">
            {data.keys.map((k) => (
              <li key={k.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-[13px]">
                <div className="flex items-center gap-3">
                  <KeyRound className="size-4 text-ink-3" />
                  <div>
                    <span className="font-medium text-ink">{k.name}</span>
                    <span className="ml-2 font-mono text-[11.5px] text-ink-3">({k.prefix}…)</span>
                    <p className="mt-0.5 text-[12px] text-ink-3">
                      Scope: {k.spaceKeys.map(spaceName).join(" + ")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[11px] text-ink-3">
                    {k.lastUsedAt ? `Used ${timeAgo(k.lastUsedAt)}` : "Never used"}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => revoke(k.id)}
                    className="min-h-[36px] text-red hover:bg-red/10 hover:text-red"
                  >
                    Revoke
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : data ? (
          <p className="mt-2 text-[13px] text-ink-3">No agent keys created yet.</p>
        ) : null}
      </div>
    </div>
  );
}
