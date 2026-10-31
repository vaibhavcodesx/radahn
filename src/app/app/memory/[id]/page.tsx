import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TypeSwatch } from "@/components/atoms";
import { MemoryActions } from "@/components/memory/MemoryActions";
import { MEMORY_TYPE_META, STATUS_LABEL, type MemoryTypeName } from "@/lib/memory-types";
import { cn, timeAgo } from "@/lib/utils";
import { requirePageUser } from "@/server/auth/session";
import { listSpaces } from "@/server/app/workspace";
import { engine } from "@/server/memory";

export const metadata = { title: "Memory" };

const fmt = (iso?: string) =>
  iso
    ? new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso))
    : "—";

export default async function MemoryDetailPage({ params }: PageProps<"/app/memory/[id]">) {
  const { id } = await params;
  const user = await requirePageUser();
  const detail = await (await engine()).getMemory(user.id, id).catch(() => null);
  if (!detail) notFound();
  const { memory: m, versions, evidence, related, recallHistory, events } = detail;
  const spaces = await listSpaces(user.id);
  const spaceName = m.spaceKey === "global" ? "Global (every space)" : (spaces.find((s) => s._id.toHexString() === m.spaceKey)?.name ?? "—");
  const type = m.type as MemoryTypeName;

  const meta: Array<[string, React.ReactNode]> = [
    ["Importance", `${m.importance} / 10`],
    ["Confidence", m.confidence.toFixed(2)],
    ["Sensitivity", m.sensitivity],
    ["Scope", spaceName],
    ["Created", fmt(m.createdAt)],
    ["Valid from", fmt(m.validFrom)],
    ["Expires", m.expiresAt ? `${fmt(m.expiresAt)} (${new Date(m.expiresAt) > new Date() ? "in " + timeAgo(new Date(), new Date(m.expiresAt)).replace(" ago", "") : "passed"})` : "never"],
    ["Recalled", `${m.stats.recallCount}×`],
    ["Confirmed", `${m.stats.confirmCount}×`],
    ["Source", `${m.source.kind} · ${m.source.actor.name}`],
  ];

  return (
    <main className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[880px] px-5 pb-20 pt-6 md:px-8">
        <Link href="/app/memory" className="mono-label inline-flex items-center gap-1.5 text-[10.5px] text-ink-3 hover:text-ink">
          <ArrowLeft className="size-3.5" /> Memory
        </Link>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <TypeSwatch type={type} status={m.status} size={18} label />
          <span className={cn("mono-label rounded-full px-2.5 py-1 text-[9.5px]", m.status === "active" ? "bg-hover-2 text-ink-2" : m.status === "pending_review" ? "bg-[color-mix(in_srgb,var(--orange)_18%,transparent)] text-orange" : "bg-hover text-ink-3")}>
            {STATUS_LABEL[m.status]}
          </span>
          {m.pinned ? <span className="mono-label text-[9.5px] text-t-preference">PINNED TO CORE</span> : null}
          {m.demo ? <span className="mono-label text-[9.5px] text-ink-3">DEMO</span> : null}
        </div>

        <h1 className={cn("mt-4 font-serif text-[30px] leading-[1.15] tracking-[-0.01em]", m.status === "superseded" && "text-ink-3 line-through")}>{m.statement}</h1>
        <p className="mt-2 text-[13px] text-ink-3">{MEMORY_TYPE_META[type].blurb}</p>

        <MemoryActions id={m.id} statement={m.statement} pinned={m.pinned} status={m.status} hasExpiry={Boolean(m.expiresAt)} />

        <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-card bg-line shadow-card sm:grid-cols-5">
          {meta.map(([k, v]) => (
            <div key={k} className="bg-surface px-4 py-3">
              <dt className="mono-label text-[9.5px] text-ink-3">{k}</dt>
              <dd className="mt-1 text-[12.5px] text-ink">{v}</dd>
            </div>
          ))}
        </dl>

        {m.source.quote ? (
          <Section title="Provenance">
            <blockquote className="border-l-2 border-line-strong pl-4 font-serif text-[17px] leading-snug text-ink-2">“{m.source.quote}”</blockquote>
            {m.source.conversationId ? (
              <Link href={`/app/chat/${m.source.conversationId}`} className="mono-label mt-3 inline-block text-[10.5px] text-ink-3 hover:text-ink">
                Open in chat →
              </Link>
            ) : null}
          </Section>
        ) : null}

        {versions.length > 1 ? (
          <Section title="History">
            <ol className="relative flex flex-col gap-4 border-l border-line pl-5">
              {versions.map((v, i) => (
                <li key={v.id} className="relative">
                  <span className="absolute -left-[25px] top-1.5 size-2 rounded-full" style={{ background: v.status === "active" ? `var(${MEMORY_TYPE_META[v.type as MemoryTypeName].colorVar})` : "var(--ink-3)" }} />
                  <p className="mono-label text-[9.5px] text-ink-3">
                    {fmt(v.createdAt)} · {v.status === "superseded" ? "OUTDATED" : STATUS_LABEL[v.status]}
                    {i > 0 && v.supersedeReason ? ` · ${v.supersedeReason}` : ""}
                  </p>
                  {v.id === m.id ? (
                    <p className={cn("mt-1 text-[14px]", v.status === "superseded" ? "text-ink-3 line-through" : "text-ink")}>{v.statement}</p>
                  ) : (
                    <Link href={`/app/memory/${v.id}`} className={cn("mt-1 block text-[14px] hover:underline", v.status === "superseded" ? "text-ink-3 line-through" : "text-ink")}>
                      {v.statement}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </Section>
        ) : null}

        <Section title={`Recall history · ${recallHistory.length}`}>
          {recallHistory.length === 0 ? (
            <p className="text-[13px] text-ink-3">Not recalled in a conversation yet.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {recallHistory.map((r) => (
                <li key={r.recallId} className="flex items-center gap-3 text-[12.5px]">
                  <span className="font-mono text-[11px] tabular text-ink-3">{fmt(r.at)}</span>
                  <span className="h-1.5 w-24 overflow-hidden rounded-full bg-hover-2">
                    <span className="block h-full bg-ink-2" style={{ width: `${Math.min(100, r.final * 100)}%` }} />
                  </span>
                  <span className="font-mono text-[11px] tabular text-ink-2">{r.final.toFixed(2)}</span>
                  {r.conversationId ? (
                    <Link href={`/app/chat/${r.conversationId}`} className="mono-label text-[9.5px] text-ink-3 hover:text-ink">
                      chat →
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Section>

        {evidence.length || related.length ? (
          <Section title="Evidence & related">
            <ul className="flex flex-col gap-2">
              {[...evidence.map((e) => ({ ...e, rel: "evidence" })), ...related.map((r) => ({ ...r, rel: "related" }))].map((e) => (
                <li key={e.id + e.rel}>
                  <Link href={`/app/memory/${e.id}`} className="flex items-start gap-2 text-[13px] text-ink-2 hover:text-ink">
                    <TypeSwatch type={e.type as MemoryTypeName} status={e.status} size={12} className="mt-[3px]" />
                    <span>
                      <span className="mono-label mr-2 text-[9.5px] text-ink-3">{e.rel}</span>
                      {e.statement}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {events.length ? (
          <Section title="Events">
            <ul className="flex flex-col gap-1.5 font-mono text-[11.5px]">
              {events.map((e) => (
                <li key={e.id} className="flex gap-3 text-ink-2">
                  <span className="shrink-0 tabular text-ink-3">{fmt(e.at)}</span>
                  <span className="shrink-0 capitalize text-ink-3">{e.kind}</span>
                  <span className="truncate">{e.summary}</span>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mono-label mb-3 text-[10.5px] text-ink-3">{title}</h2>
      {children}
    </section>
  );
}
