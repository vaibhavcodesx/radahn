import { ConflictList } from "@/components/memory/ConflictList";
import { ReviewStack } from "@/components/memory/ReviewStack";
import { requirePageUser } from "@/server/auth/session";
import { listSpaces } from "@/server/app/workspace";
import { engine } from "@/server/memory";

export const metadata = { title: "Review" };

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
      <div className="mx-auto w-full max-w-[640px] px-5 pb-20 pt-8">
        <h1 className="font-serif text-[34px] leading-none tracking-[-0.01em]">Review</h1>
        <p className="mt-3 text-[13.5px] leading-relaxed text-ink-2">
          Radahn holds anything sensitive or uncertain here until you decide. Nothing in this list is used in answers yet.
        </p>
        <ReviewStack items={pending.map((m) => ({ ...m, spaceName: spaceName[m.spaceKey] ?? "—" }))} />

        <ConflictList />

        <section className="mt-14">
          <h2 className="text-[12.5px] font-medium mb-3 text-ink-3">Blocked · never stored</h2>
          {blocked.length === 0 ? (
            <p className="text-[13px] text-ink-3">Nothing blocked. If you paste a password, key, or card number, it shows up here — as a kind, never the value.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 font-mono text-[11.5px]">
              {blocked.map((e) => (
                <li key={e.id} className="flex gap-3 text-ink-2">
                  <span className="shrink-0 tabular text-ink-3">
                    {new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(e.at))}
                  </span>
                  <span className="text-red">BLOCKED</span>
                  <span>{e.summary}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
