"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AgentKeys } from "./AgentKeys";
import { Button } from "@/components/atoms";
import { cn } from "@/lib/utils";

const POLICIES = [
  {
    v: "review_sensitive",
    label: "Review sensitive memories",
    note: "Default. Health, finances, locations, and other people's details wait in Review for your approval.",
  },
  {
    v: "auto",
    label: "Automatic save",
    note: "Saves everything that passes privacy checks; only ambiguous items wait for your approval.",
  },
  {
    v: "review_all",
    label: "Review everything",
    note: "Nothing is saved to long-term memory until you explicitly approve it in Review.",
  },
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

  // Danger zone state
  const [deleteModal, setDeleteModal] = useState(false);
  const [typedConfirm, setTypedConfirm] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [demoConfirm, setDemoConfirm] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);

  async function save(patch: Partial<typeof v>) {
    const next = { ...v, ...patch };
    setV(next);
    const r = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    setSaved(r.ok ? "Settings saved." : "Couldn't save changes.");
    setTimeout(() => setSaved(null), 1800);
    router.refresh();
  }

  async function handleDemo(action: "POST" | "DELETE") {
    setDemoBusy(true);
    await fetch("/api/demo/seed", { method: action });
    setDemoBusy(false);
    setDemoConfirm(false);
    router.refresh();
    setSaved(action === "POST" ? "Demo world loaded." : "Demo data removed.");
    setTimeout(() => setSaved(null), 1800);
  }

  async function handleDeleteAll() {
    if (typedConfirm !== "DELETE") return;
    setDeleteBusy(true);
    await fetch("/api/account/data", { method: "DELETE" });
    setDeleteBusy(false);
    setDeleteModal(false);
    router.push("/app");
    router.refresh();
  }

  return (
    <div className="mt-8 flex flex-col gap-8">
      {/* CARD 1: Profile & time zone */}
      <section className="rounded-card border border-line bg-surface p-6 shadow-card sm:p-7">
        <h2 className="font-serif text-[22px] text-ink">Profile & time zone</h2>
        <p className="mt-1 text-[14px] text-ink-3">
          How Radahn addresses you in conversation and tracks relative dates.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-[13.5px] font-medium text-ink">Your name</span>
            <input
              defaultValue={v.displayName}
              onBlur={(e) => e.target.value !== v.displayName && save({ displayName: e.target.value })}
              maxLength={40}
              placeholder={isGuest ? "Guest" : "Your name"}
              className="h-11 w-full rounded-control border border-line bg-surface-2 px-3.5 text-[14px] text-ink outline-none transition-colors focus:border-line-strong focus:ring-1 focus:ring-focus"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-[13.5px] font-medium text-ink">Time zone</span>
            <input
              defaultValue={v.timeZone}
              onBlur={(e) => e.target.value !== v.timeZone && save({ timeZone: e.target.value })}
              className="h-11 w-full rounded-control border border-line bg-surface-2 px-3.5 font-mono text-[13px] text-ink outline-none transition-colors focus:border-line-strong focus:ring-1 focus:ring-focus"
            />
          </label>
        </div>
      </section>

      {/* CARD 2: Memory behaviour */}
      <section className="rounded-card border border-line bg-surface p-6 shadow-card sm:p-7">
        <h2 className="font-serif text-[22px] text-ink">Memory behaviour</h2>
        <p className="mt-1 text-[14px] text-ink-3">
          Control how aggressively Radahn retains facts, constraints, and preferences.
        </p>

        <div role="radiogroup" className="mt-5 grid gap-3">
          {POLICIES.map((o) => (
            <button
              key={o.v}
              role="radio"
              aria-checked={v.writePolicy === o.v}
              onClick={() => save({ writePolicy: o.v })}
              className={cn(
                "flex items-start gap-3.5 rounded-control border border-line bg-surface-2 p-4 text-left transition-colors hover:border-line-strong",
                v.writePolicy === o.v && "border-accent/40 bg-surface-2 ring-1 ring-accent/30",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 size-4 shrink-0 rounded-full border border-line-strong",
                  v.writePolicy === o.v && "border-accent bg-accent",
                )}
              />
              <div className="flex flex-col">
                <span className="text-[14.5px] font-medium text-ink">{o.label}</span>
                <span className="mt-1 text-[13px] leading-relaxed text-ink-3">{o.note}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* CARD 3: Agent access keys */}
      <section className="rounded-card border border-line bg-surface p-6 shadow-card sm:p-7">
        <h2 className="font-serif text-[22px] text-ink">Agent access keys</h2>
        <div className="mt-3">
          <AgentKeys />
        </div>
      </section>

      {/* CARD 4: Danger zone */}
      <section className="rounded-card border border-red/25 bg-surface p-6 shadow-card sm:p-7">
        <h2 className="font-serif text-[22px] text-red">Danger zone</h2>
        <p className="mt-1 text-[14px] text-ink-3">
          Irreversible actions for your memory data and demo state.
        </p>

        <div className="mt-6 flex flex-col divide-y divide-line">
          {/* Demo Data Management */}
          <div className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0">
            <div>
              <p className="text-[14.5px] font-medium text-ink">Demo dataset</p>
              <p className="mt-0.5 text-[13px] text-ink-3">
                {demoLoaded
                  ? "Aarav's synthetic demo memories are currently loaded."
                  : "Load synthetic demo data to test recall, diffing, and contradictions."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                size="md"
                variant="secondary"
                onClick={() => handleDemo("POST")}
                disabled={demoBusy}
                className="min-h-[44px] px-4 text-[13.5px]"
              >
                {demoBusy ? "Working…" : demoLoaded ? "Reload demo" : "Load demo data"}
              </Button>
              {demoLoaded ? (
                demoConfirm ? (
                  <div className="flex items-center gap-2 rounded-control border border-red/30 bg-red/5 p-1">
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDemo("DELETE")}
                      disabled={demoBusy}
                      className="min-h-[36px]"
                    >
                      Confirm remove
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDemoConfirm(false)}
                      className="min-h-[36px]"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="md"
                    variant="ghost"
                    onClick={() => setDemoConfirm(true)}
                    className="min-h-[44px] text-ink-3 hover:text-red"
                  >
                    Remove demo
                  </Button>
                )
              ) : null}
            </div>
          </div>

          {/* Export JSON */}
          <div className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div>
              <p className="text-[14.5px] font-medium text-ink">Export memory archive</p>
              <p className="mt-0.5 text-[13px] text-ink-3">
                Download all your memories, spaces, and activity events as a JSON file.
              </p>
            </div>
            <a
              href="/api/export"
              className="inline-flex min-h-[44px] items-center justify-center rounded-control border border-line px-4 text-[13.5px] font-medium text-ink transition-colors hover:bg-hover"
            >
              Export JSON
            </a>
          </div>

          {/* Delete All Memory */}
          <div className="flex flex-wrap items-center justify-between gap-4 py-4 last:pb-0">
            <div>
              <p className="text-[14.5px] font-medium text-red">Delete all memory</p>
              <p className="mt-0.5 text-[13px] text-ink-3">
                Hard delete every memory, conversation, and activity event. This cannot be undone.
              </p>
            </div>
            {!deleteModal ? (
              <Button
                size="md"
                variant="danger"
                onClick={() => setDeleteModal(true)}
                className="min-h-[44px] px-4 text-[13.5px]"
              >
                Delete all memory…
              </Button>
            ) : (
              <div className="w-full rounded-control border border-red/30 bg-red/5 p-4 sm:p-5">
                <p className="text-[14px] font-medium text-ink">
                  Are you absolutely sure?
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-3">
                  This will permanently wipe all your stored memories and conversation history. Type{" "}
                  <strong className="font-mono text-red">DELETE</strong> below to confirm.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    value={typedConfirm}
                    onChange={(e) => setTypedConfirm(e.target.value)}
                    placeholder="Type DELETE"
                    className="h-10 w-44 rounded-control border border-red/40 bg-surface px-3 font-mono text-[13px] text-ink outline-none focus:border-red"
                  />
                  <Button
                    size="md"
                    variant="danger"
                    disabled={typedConfirm !== "DELETE" || deleteBusy}
                    onClick={handleDeleteAll}
                    className="min-h-[40px] px-4 text-[13.5px]"
                  >
                    {deleteBusy ? "Deleting…" : "Confirm deletion"}
                  </Button>
                  <Button
                    size="md"
                    variant="ghost"
                    onClick={() => {
                      setDeleteModal(false);
                      setTypedConfirm("");
                    }}
                    className="min-h-[40px]"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Toast notification */}
      <p
        role="status"
        aria-live="polite"
        className="fixed bottom-6 right-6 z-50 rounded-full border border-line bg-surface-2 px-4 py-2 font-mono text-[12.5px] text-ink shadow-overlay"
      >
        {saved}
      </p>
    </div>
  );
}
