import { ArrowLeft, MessageSquare } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TypeSwatch } from "@/components/atoms";
import { MemoryActions } from "@/components/memory/MemoryActions";
import { MEMORY_TYPE_META, STATUS_LABEL, type MemoryTypeName } from "@/lib/memory-types";
import { cn, timeAgo } from "@/lib/utils";
import { requirePageUser } from "@/server/auth/session";
import { listSpaces } from "@/server/app/workspace";
import { engine } from "@/server/memory";

export const metadata = { title: "Memory record" };

const fmt = (iso?: string) =>
  iso
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(iso))
    : "—";

/**
 * Memory detail record (design.md §6.6, task D1).
 * Formatted like an archival record:
 * - Prominent statement
 * - Compact facts row (kind, space, status, confidence, saved/updated, expires)
 * - Where it came from (source quote + link to the chat)
 * - History as a vertical timeline
 * - Related memories as chips
 * - Tidy action bar
 */
export default async function MemoryDetailPage({ params }: PageProps<"/app/memory/[id]">) {
  const { id } = await params;
  const user = await requirePageUser();
  const detail = await (await engine()).getMemory(user.id, id).catch(() => null);
  if (!detail) notFound();

  const { memory: m, versions, evidence, related, recallHistory, events } = detail;
  const spaces = await listSpaces(user.id);
  const spaceName =
    m.spaceKey === "global"
      ? "Global"
      : (spaces.find((s) => s._id.toHexString() === m.spaceKey)?.name ?? "—");
  const type = m.type as MemoryTypeName;

  return (
    <main className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[800px] px-4 pb-24 pt-6 sm:px-6 md:px-8">
        {/* Back navigation */}
        <Link
          href="/app/memory"
          className="inline-flex min-h-[44px] items-center gap-2 text-[13.5px] font-medium text-ink-3 transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" />
          <span>All memories</span>
        </Link>

        {/* Header badges */}
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <TypeSwatch type={type} status={m.status} size={15} label />
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[12px] font-medium",
              m.status === "active"
                ? "bg-hover-2 text-ink-2"
                : m.status === "pending_review"
                ? "bg-orange/15 text-orange"
                : "bg-hover text-ink-3",
            )}
          >
            {STATUS_LABEL[m.status]}
          </span>
          {m.pinned ? (
            <span className="rounded-full bg-t-preference/15 px-2.5 py-0.5 text-[12px] font-medium text-t-preference">
              Pinned to core
            </span>
          ) : null}
          {m.demo ? (
            <span className="rounded-full bg-hover px-2.5 py-0.5 text-[11px] font-medium text-ink-3">
              DEMO
            </span>
          ) : null}
        </div>

        {/* Big statement */}
        <h1
          className={cn(
            "mt-4 font-serif text-[28px] leading-[1.2] tracking-[-0.015em] sm:text-[34px]",
            m.status === "superseded" && "text-ink-3 line-through",
          )}
        >
          {m.statement}
        </h1>
        <p className="mt-2 text-[14px] text-ink-3">{MEMORY_TYPE_META[type].blurb}</p>

        {/* Tidy Action Bar */}
        <MemoryActions
          id={m.id}
          statement={m.statement}
          pinned={m.pinned}
          status={m.status}
          hasExpiry={Boolean(m.expiresAt)}
        />

        {/* Compact facts row (D1: kind, space, status, confidence, saved/updated, expires) */}
        <div className="mt-8 overflow-hidden rounded-card border border-line bg-surface shadow-card">
          <div className="grid grid-cols-2 divide-x divide-y divide-line sm:grid-cols-3">
            <FactItem label="Kind" value={MEMORY_TYPE_META[type].label} />
            <FactItem label="Space" value={spaceName} />
            <FactItem label="Status" value={STATUS_LABEL[m.status]} />
            <FactItem label="Confidence" value={`${Math.round(m.confidence * 100)}%`} />
            <FactItem
              label="Saved / Updated"
              value={fmt(m.updatedAt || m.createdAt)}
              note={timeAgo(m.updatedAt || m.createdAt)}
            />
            <FactItem
              label="Expires"
              value={
                m.expiresAt
                  ? fmt(m.expiresAt)
                  : "Never"
              }
              note={
                m.expiresAt
                  ? new Date(m.expiresAt) > new Date()
                    ? `in ${timeAgo(new Date(), new Date(m.expiresAt)).replace(" ago", "")}`
                    : "expired"
                  : undefined
              }
            />
          </div>
        </div>

        {/* Where it came from (source quote + link to chat) */}
        {m.source.quote ? (
          <section className="mt-10 rounded-card border border-line bg-surface p-5 shadow-card sm:p-6">
            <h2 className="font-serif text-[18px] text-ink">Where it came from</h2>
            <blockquote className="mt-3 border-l-2 border-line-strong pl-4 font-serif text-[16px] leading-snug text-ink-2 sm:text-[17px]">
              &ldquo;{m.source.quote}&rdquo;
            </blockquote>
            {m.source.conversationId ? (
              <div className="mt-4">
                <Link
                  href={`/app/chat/${m.source.conversationId}`}
                  className="inline-flex min-h-[36px] items-center gap-1.5 text-[13px] font-medium text-ink-3 transition-colors hover:text-ink"
                >
                  <MessageSquare className="size-3.5" />
                  <span>View in original conversation &rarr;</span>
                </Link>
              </div>
            ) : null}
          </section>
        ) : null}

        {/* History: small vertical timeline */}
        {versions.length > 1 ? (
          <section className="mt-10 rounded-card border border-line bg-surface p-5 shadow-card sm:p-6">
            <h2 className="font-serif text-[18px] text-ink">History</h2>
            <p className="mt-1 text-[13px] text-ink-3">
              Previous versions of this belief kept for audit and reversible correction.
            </p>
            <ol className="relative mt-5 flex flex-col gap-5 border-l border-line pl-5">
              {versions.map((v, i) => (
                <li key={v.id} className="relative">
                  <span
                    className="absolute -left-[25px] top-1.5 size-2 rounded-full"
                    style={{
                      background:
                        v.status === "active"
                          ? `var(${MEMORY_TYPE_META[v.type as MemoryTypeName].colorVar})`
                          : "var(--ink-3)",
                    }}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[12px] font-medium text-ink-3">{fmt(v.createdAt)}</span>
                    <span className="rounded-full bg-hover px-2 py-0.5 text-[11px] text-ink-3">
                      {STATUS_LABEL[v.status]}
                    </span>
                    {i > 0 && v.supersedeReason ? (
                      <span className="text-[11.5px] text-ink-3">· {v.supersedeReason}</span>
                    ) : null}
                  </div>
                  {v.id === m.id ? (
                    <p
                      className={cn(
                        "mt-1.5 text-[14.5px] leading-relaxed",
                        v.status === "superseded" ? "text-ink-3 line-through" : "text-ink font-medium",
                      )}
                    >
                      {v.statement}
                    </p>
                  ) : (
                    <Link
                      href={`/app/memory/${v.id}`}
                      className={cn(
                        "mt-1.5 block text-[14.5px] leading-relaxed transition-colors hover:text-ink",
                        v.status === "superseded" ? "text-ink-3 line-through" : "text-ink-2",
                      )}
                    >
                      {v.statement}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {/* Related memories as chips (D1) */}
        {evidence.length || related.length ? (
          <section className="mt-10 rounded-card border border-line bg-surface p-5 shadow-card sm:p-6">
            <h2 className="font-serif text-[18px] text-ink">Related memories</h2>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {[
                ...evidence.map((e) => ({ ...e, rel: "evidence" })),
                ...related.map((r) => ({ ...r, rel: "related" })),
              ].map((item) => (
                <Link
                  key={item.id + item.rel}
                  href={`/app/memory/${item.id}`}
                  className="inline-flex min-h-[38px] max-w-full items-center gap-2 rounded-control border border-line bg-surface-2 px-3 py-1.5 text-[13px] text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
                >
                  <TypeSwatch type={item.type as MemoryTypeName} status={item.status} size={11} />
                  <span className="truncate">{item.statement}</span>
                  <span className="shrink-0 text-[11px] text-ink-3">({item.rel})</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* Recall history */}
        <section className="mt-10 rounded-card border border-line bg-surface p-5 shadow-card sm:p-6">
          <h2 className="font-serif text-[18px] text-ink">Recall history</h2>
          <p className="mt-0.5 text-[13px] text-ink-3">
            Times this memory was cited in conversation answers ({recallHistory.length}).
          </p>

          {recallHistory.length === 0 ? (
            <p className="mt-4 text-[13.5px] text-ink-3">Not cited in a conversation yet.</p>
          ) : (
            <ul className="mt-4 flex flex-col divide-y divide-line">
              {recallHistory.map((r) => (
                <li
                  key={r.recallId}
                  className="flex items-center justify-between py-2.5 text-[13px]"
                >
                  <span className="font-mono text-[11.5px] tabular text-ink-3">{fmt(r.at)}</span>
                  <div className="flex items-center gap-3">
                    <span className="h-1.5 w-24 overflow-hidden rounded-full bg-hover-2">
                      <span
                        className="block h-full bg-ink-2"
                        style={{ width: `${Math.min(100, r.final * 100)}%` }}
                      />
                    </span>
                    <span className="font-mono text-[11.5px] tabular text-ink-2">
                      {r.final.toFixed(2)}
                    </span>
                    {r.conversationId ? (
                      <Link
                        href={`/app/chat/${r.conversationId}`}
                        className="text-[12px] font-medium text-ink-3 hover:text-ink"
                      >
                        chat &rarr;
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Event audit log */}
        {events.length > 0 ? (
          <section className="mt-10 rounded-card border border-line bg-surface p-5 shadow-card sm:p-6">
            <h2 className="font-serif text-[18px] text-ink">Audit log</h2>
            <ul className="mt-3 flex flex-col gap-2 font-mono text-[11.5px]">
              {events.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 text-ink-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="capitalize text-ink-3">[{e.kind}]</span>
                    <span className="truncate">{e.summary}</span>
                  </div>
                  <span className="shrink-0 tabular text-ink-3">{fmt(e.at)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function FactItem({
  label,
  value,
  note,
}: {
  label: string;
  value: React.ReactNode;
  note?: string;
}) {
  return (
    <div className="bg-surface p-4">
      <dt className="text-[12px] font-medium text-ink-3">{label}</dt>
      <dd className="mt-1 text-[13.5px] font-medium text-ink">{value}</dd>
      {note ? <p className="mt-0.5 text-[11.5px] text-ink-3">{note}</p> : null}
    </div>
  );
}
