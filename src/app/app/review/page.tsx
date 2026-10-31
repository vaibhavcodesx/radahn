import { ConflictList } from "@/components/memory/ConflictList";
import { ReviewStack } from "@/components/memory/ReviewStack";
import { requirePageUser } from "@/server/auth/session";
import { listSpaces } from "@/server/app/workspace";
import { engine } from "@/server/memory";

export const metadata = { title: "Review" };

/**
 * Review page (design.md §6.7, task B2).
 * Approval queue, conflicting memory reconciliation, and blocked redaction log.
 */
export default async function ReviewPage() {
  const user = await requirePageUser();
  const eng = await engine();
  const [pending, events, spaces] = await Promise.all([
    eng.listMemories({ ownerId: user.id, spaceKey: "all", statuses: ["pending_review"], sort: "created", limit: 50 }),
    eng.listEvents(user.id, { limit: 200 }),
    listSpaces(user.id),
  ]);
  const blocked = events.filter((e) => e.kind === "blocked").reverse().slice(0, 12);
  const spaceName = Object.fromEntries([["global", "Global"], ...spaces.map((s) => [s._id.toHexString(), s.name])]);

  return (
    <main className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[720px] px-4 pb-24 pt-8 sm:px-6 md:px-8">
        <h1 className="font-serif text-[32px] leading-none tracking-[-0.01em] sm:text-[36px]">Review</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          Radahn wasn&apos;t sure about these. Keep or drop each. Nothing in this list is used in answers until you approve.
        </p>

        {/* Pending approvals stack */}
        <ReviewStack items={pending.map((m) => ({ ...m, spaceName: spaceName[m.spaceKey] ?? "—" }))} />

        {/* Conflict reconciliation */}
        <ConflictList />

        {/* Blocked private information log */}
        <section className="mt-16 border-t border-line pt-8">
          <h2 className="font-serif text-[20px] text-ink">Blocked secrets</h2>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ink-3">
            Sensitive credentials like API keys, passwords, and card numbers are redacted immediately and never saved.
          </p>
          {blocked.length === 0 ? (
            <div className="mt-4 rounded-control border border-line bg-surface p-4 text-[13.5px] text-ink-3">
              Nothing blocked yet. When sensitive credentials appear, they are caught before they touch the database.
            </div>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {blocked.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between rounded-control border border-line bg-surface px-4 py-2.5 text-[13px] text-ink-2"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="size-2 rounded-full bg-red" aria-hidden />
                    <span className="font-medium text-ink">{e.summary}</span>
                  </div>
                  <span className="font-mono text-[11px] tabular text-ink-3">
                    {new Intl.DateTimeFormat("en-GB", {
                      timeZone: "Asia/Kolkata",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    }).format(new Date(e.at))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
