/** Quota routing: TRD §9 and CODEX_TASKS C1. No request content or credentials persisted. */
import { createHash } from "node:crypto";
import { collections, type LlmUsageDoc } from "@/server/db/collections";
export type Outcome = "ok" | "rate_limited" | "quota_exhausted" | "error";
const states = new Map<string, Partial<LlmUsageDoc>>();
const refreshedAt = new Map<string, number>();
let refreshing: Promise<void> | undefined;
export const fingerprint = (key: string) => createHash("sha256").update(key).digest("hex").slice(0, 6);
export async function refreshUsage(ids: string[]) {
  while (refreshing) await refreshing;
  const stale = ids.filter(id => Date.now() - (refreshedAt.get(id) ?? -Infinity) >= 10_000);
  if (!stale.length) return;
  if (!refreshing) refreshing = (async () => {
    try {
      const rows = await collections().llmUsage.find({ _id: { $in: stale } }, { timeoutMS: 1_000 }).toArray();
      for (const row of rows) {
        const local = states.get(row._id);
        // A fresh in-process report wins over a slower database snapshot.
        if (!local?.updatedAt || local.updatedAt <= row.updatedAt) states.set(row._id, row);
      }
    } catch { /* Routing remains available during a DB outage; retain local cooldowns. */ }
    for (const id of stale) refreshedAt.set(id, Date.now());
  })().finally(() => { refreshing = undefined; });
  await refreshing;
}
export function live(id: string) {
  const s = states.get(id);
  return !(s?.cooldownUntil && +s.cooldownUntil > Date.now()) && !(s?.exhaustedUntil && +s.exhaustedUntil > Date.now());
}
/** Resolve the next civil midnight with Intl offsets, including Pacific DST transitions. */
function pacificMidnight(now: Date): Date {
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric", hourCycle: "h23" });
  const parts = (date: Date) => Object.fromEntries(formatter.formatToParts(date).map(p => [p.type, Number(p.value)]));
  const p = parts(now);
  const target = Date.UTC(p.year, p.month - 1, p.day + 1);
  let utc = target;
  for (let i = 0; i < 3; i++) {
    const q = parts(new Date(utc));
    utc += target - Date.UTC(q.year, q.month - 1, q.day, q.hour, q.minute, q.second);
  }
  return new Date(utc);
}
export async function record(candidate: {keyFp: string; modelId: string}, outcome: Outcome) {
  const _id = `${candidate.keyFp}:${candidate.modelId}`;
  const now = new Date();
  const patch: Partial<LlmUsageDoc> = { updatedAt: now };
  if (outcome === "rate_limited") patch.cooldownUntil = new Date(+now + 60_000);
  if (outcome === "quota_exhausted") patch.exhaustedUntil = pacificMidnight(now);
  states.set(_id, { ...states.get(_id), ...patch });
  try {
    await collections().llmUsage.updateOne({ _id }, { $set: patch, $inc: { calls: 1, failures: outcome === "ok" ? 0 : 1 } }, { upsert: true, timeoutMS: 1_000 });
  } catch { /* Best-effort accounting must never turn a served response into an error. */ }
}
