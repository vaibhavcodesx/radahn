import Link from "next/link";
import { TypeSwatch, ValuePill } from "@/components/atoms";
import { AtlasField } from "@/components/memory/AtlasField";
import { AtlasToolbar } from "@/components/memory/AtlasToolbar";
import { ForgetButton } from "@/components/memory/ForgetButton";
import { MEMORY_TYPE_LIST, MEMORY_TYPE_META, STATUS_LABEL, type MemoryTypeName } from "@/lib/memory-types";
import { cn, timeAgo } from "@/lib/utils";
import { requirePageUser } from "@/server/auth/session";
import { listSpaces } from "@/server/app/workspace";
import { engine } from "@/server/memory";
import type { MemoryStatus } from "@/server/memory/types";

export const metadata = { title: "Memory" };

const STATUSES: MemoryStatus[] = ["active", "pending_review", "superseded", "expired"];
const ASOF_MS: Record<string, number> = { "1h": 3_600_000, "1d": 86_400_000, "3d": 3 * 86_400_000, "7d": 7 * 86_400_000 };
/** Request-time clock read lives outside the component (react-hooks/purity). */
const isoAgo = (ms: number) => new Date(Date.now() - ms).toISOString();
const ASOF_LABEL: Record<string, string> = { "1h": "1 hour ago", "1d": "yesterday", "3d": "3 days ago", "7d": "a week ago" };

export default async function MemoryAtlas({ searchParams }: PageProps<"/app/memory">) {
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const user = await requirePageUser();
  const type = MEMORY_TYPE_LIST.find((t) => t === one("type"));
  const status = STATUSES.find((s) => s === one("status"));
  const q = one("q")?.slice(0, 100);
  const sort = (["updated", "importance", "recalled", "created"] as const).find((s) => s === one("sort")) ?? "updated";
  const space = one("space") ?? "all";
  const view = one("view") === "field" ? "field" : "table";
  // Time travel (C12): rebuild the table from what was valid at that instant.
  const asof = Object.keys(ASOF_MS).find((k) => k === one("asof"));
  const asOfIso = asof ? isoAgo(ASOF_MS[asof]) : undefined;

  const eng = await engine();
  const [all, spaces] = await Promise.all([
    asOfIso
      ? eng.listMemories({ ownerId: user.id, spaceKey: "all", asOf: asOfIso, limit: 400 })
      : eng.listMemories({ ownerId: user.id, spaceKey: "all", statuses: STATUSES, limit: 400 }),
    listSpaces(user.id),
  ]);
  const spaceName = new Map<string, string>([["global", "Global"], ...spaces.map((s) => [s._id.toHexString(), s.name] as [string, string])]);

  const rows = all
    .filter((m) => (!type || m.type === type) && (asOfIso || (status ? m.status === status : m.status !== "expired" || one("status") === "expired")))
    .filter((m) => space === "all" || m.spaceKey === space || (space !== "global" && m.spaceKey === "global"))
    .filter((m) => !q || m.statement.toLowerCase().includes(q.toLowerCase()) || m.entities.some((e) => e.includes(q.toLowerCase())))
    .sort((a, b) =>
      sort === "importance" ? b.importance - a.importance : sort === "recalled" ? b.stats.recallCount - a.stats.recallCount : Date.parse(sort === "created" ? b.createdAt : b.updatedAt) - Date.parse(sort === "created" ? a.createdAt : a.updatedAt),
    );

  const active = all.filter((m) => m.status === "active");
  const counts = MEMORY_TYPE_LIST.map((t) => ({ t, n: active.filter((m) => m.type === t).length })).filter((c) => c.n > 0);
  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { view: view === "field" ? "field" : undefined, asof, type, status, q, sort: sort === "updated" ? undefined : sort, space: space === "all" ? undefined : space, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return `/app/memory${s ? `?${s}` : ""}`;
  };

  return (
    <main className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[1180px] px-5 pb-16 pt-8 md:px-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-[34px] leading-none tracking-[-0.01em]">Memory</h1>
            <p className="mt-3 text-[14px] text-ink-3">
              {active.length} active · {all.filter((m) => m.status === "pending_review").length} need review · {all.filter((m) => m.status === "superseded").length} outdated · {all.filter((m) => m.status === "expired").length} expired
            </p>
          </div>
          <nav aria-label="View" className="flex gap-1 rounded-full bg-surface p-1 shadow-card">
            {(["table", "field"] as const).map((v) => (
              <Link
                key={v}
                href={href({ view: v === "field" ? "field" : undefined })}
                aria-current={view === v ? "page" : undefined}
                className={cn("flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] capitalize", view === v ? "bg-accent text-accent-ink" : "text-ink-2 hover:text-ink")}
              >
                {v === "table" ? "List" : "Map"}
              </Link>
            ))}
          </nav>
        </header>

        {/* Whitney strip: one painted row, block width proportional to count (design.md §6.5) */}
        {counts.length ? (
          <nav aria-label="Filter by type" className="mt-6 flex h-11 w-full overflow-hidden rounded-control">
            {counts.map(({ t, n }) => (
              <Link
                key={t}
                href={href({ type: type === t ? undefined : t })}
                title={`${MEMORY_TYPE_META[t].label}: ${n}`}
                className={cn("group relative flex min-w-[28px] items-end px-2 pb-1.5 transition-[filter,opacity]", type && type !== t && "opacity-35")}
                style={{ flexGrow: n, background: `var(${MEMORY_TYPE_META[t].colorVar})`, color: MEMORY_TYPE_META[t].onSwatch === "dark" ? "var(--t-ink-dark)" : "var(--t-ink-light)" }}
              >
                <span className="font-mono text-[11px] leading-none">{MEMORY_TYPE_META[t].glyph}</span>
                <span className="text-[12.5px] font-medium ml-1.5 hidden truncate leading-none group-hover:inline">{MEMORY_TYPE_META[t].label} {n}</span>
              </Link>
            ))}
          </nav>
        ) : null}

        <AtlasToolbar
          q={q ?? ""}
          type={type}
          status={status}
          sort={sort}
          space={space}
          asof={asof}
          spaces={[{ id: "all", name: "All spaces" }, { id: "global", name: "Global" }, ...spaces.map((s) => ({ id: s._id.toHexString(), name: s.name }))]}
        />

        {asOfIso ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-card bg-surface px-4 py-3 shadow-card">
            <p className="text-[14px] text-ink-2">
              <span className="mr-2 font-medium text-orange">Time travel</span>
              What Radahn believed {ASOF_LABEL[asof!]} · {new Date(asOfIso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}. Later corrections are hidden.
            </p>
            <Link href={href({ asof: undefined })} className="text-[14px] font-medium text-ink underline underline-offset-4">Back to now</Link>
          </div>
        ) : null}

        {view === "field" ? (
          <AtlasField spaceNames={Object.fromEntries(spaceName)} />
        ) : rows.length === 0 ? (
          <div className="mt-10 rounded-card bg-surface p-8 text-center shadow-card">
            <p className="font-serif text-[22px]">{all.length ? "Nothing matches these filters." : "No memories yet."}</p>
            <p className="mt-2 text-[13px] text-ink-2">
              {all.length ? (
                <Link href="/app/memory" className="underline underline-offset-4">Clear filters</Link>
              ) : (
                <>Talk to Radahn, or <Link href="/app" className="underline underline-offset-4">load the demo world</Link> from a new chat.</>
              )}
            </p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-card shadow-card">
            <table className="w-full min-w-[900px] border-collapse bg-surface text-left text-[14px]">
              <thead className="text-[12.5px] text-ink-3">
                <tr className="border-b border-line">
                  <th className="px-4 py-2.5 font-normal">Statement</th>
                  <th className="px-3 py-2.5 font-normal">Type</th>
                  <th className="px-3 py-2.5 font-normal">Space</th>
                  <th className="px-3 py-2.5 text-right font-normal">Imp.</th>
                  <th className="px-3 py-2.5 text-right font-normal">Conf.</th>
                  <th className="px-3 py-2.5 text-right font-normal">Recalled</th>
                  <th className="px-3 py-2.5 font-normal">Updated</th>
                  <th className="px-3 py-2.5 font-normal">Status</th>
                  <th className="w-24 px-2 py-2.5 font-normal"><span className="sr-only">Forget</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id} className="group border-b border-line last:border-0 hover:bg-hover">
                    <td className="max-w-[460px] px-4 py-2.5">
                      <Link href={`/app/memory/${m.id}`} className="flex items-start gap-2.5 focus-visible:outline-2">
                        <TypeSwatch type={m.type as MemoryTypeName} status={m.status} size={14} className="mt-[2px]" />
                        <span className={cn("text-ink", m.status === "superseded" && !asOfIso && "text-ink-3 line-through")}>{m.statement}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-ink-2">{MEMORY_TYPE_META[m.type as MemoryTypeName].label}</td>
                    <td className="px-3 py-2.5 text-ink-2">{spaceName.get(m.spaceKey) ?? "—"}</td>
                    <td className="px-3 py-2.5 text-right"><ValuePill value={m.importance} /></td>
                    <td className="px-3 py-2.5 text-right font-mono text-[11.5px] tabular text-ink-2">{m.confidence.toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-[11.5px] tabular text-ink-2">{m.stats.recallCount}×</td>
                    <td className="px-3 py-2.5 text-[13px] text-ink-3">{timeAgo(m.updatedAt)}</td>
                    <td className="px-3 py-2.5">
                      <span className={cn("text-[12.5px]", m.status === "active" ? "text-ink-3" : m.status === "pending_review" ? "text-orange" : "text-ink-3")}>
                        {asOfIso ? "Valid then" : m.expiresAt && m.status === "active" ? `Expires in ${timeAgo(m.expiresAt).replace(" ago", "")}`.replace("Expires in just now", "Expiring") : STATUS_LABEL[m.status]}
                      </span>
                      {m.demo ? <span className="ml-2 text-[12px] text-ink-3">Demo</span> : null}
                    </td>
                    <td className="px-2 py-2">{asOfIso ? null : <ForgetButton id={m.id} statement={m.statement} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
