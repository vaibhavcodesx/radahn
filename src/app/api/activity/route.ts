import { ObjectId } from "mongodb";
import { requireUser } from "@/server/auth/session";
import { collections } from "@/server/db/collections";
import { handle, json } from "@/server/http";
import { engine } from "@/server/memory";

export const runtime = "nodejs";

/** Activity page data: recent events, insights, reflection runs (PRD F-40). */
export const GET = handle(async () => {
  const user = await requireUser();
  const eng = await engine();
  const [events, insights, reflections] = await Promise.all([
    eng.listEvents(user.id, { limit: 80 }),
    eng.insights(user.id, "all").catch(() => null),
    eng.listReflections(user.id, 8).catch(() => []),
  ]);
  // The real engine records output memory ids; show their statements (owner-scoped lookup).
  const ids = [...new Set(reflections.flatMap((r) => [...r.outputs.merged, ...r.outputs.observations, ...r.outputs.strategies]))].filter((id) => ObjectId.isValid(id));
  const rows = ids.length
    ? await collections().memories.find({ ownerId: user.id, _id: { $in: ids.map((id) => new ObjectId(id)) } }, { projection: { statement: 1 } }).toArray()
    : [];
  const statement = new Map(rows.map((m) => [m._id.toHexString(), m.statement]));
  const out = (list: string[]) => list.map((id) => ({ id, statement: statement.get(id) ?? id }));
  return json({
    events: events.reverse(),
    insights,
    reflections: reflections.map((r) => ({
      id: r._id.toHexString(),
      trigger: r.trigger,
      status: r.status,
      steps: r.steps.map((s) => ({ ...s, at: s.at ? new Date(s.at).toISOString() : undefined })),
      outputs: { merged: out(r.outputs.merged), observations: out(r.outputs.observations), strategies: out(r.outputs.strategies) },
      startedAt: new Date(r.startedAt).toISOString(),
      finishedAt: r.finishedAt ? new Date(r.finishedAt).toISOString() : undefined,
      error: r.error,
    })),
  });
});
