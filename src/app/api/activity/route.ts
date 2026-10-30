import { requireUser } from "@/server/auth/session";
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
  return json({
    events: events.reverse(),
    insights,
    reflections: reflections.map((r) => ({
      id: r._id.toHexString(),
      trigger: r.trigger,
      status: r.status,
      steps: r.steps.map((s) => ({ ...s, at: s.at ? new Date(s.at).toISOString() : undefined })),
      outputs: r.outputs,
      startedAt: new Date(r.startedAt).toISOString(),
      finishedAt: r.finishedAt ? new Date(r.finishedAt).toISOString() : undefined,
      error: r.error,
    })),
  });
});
