import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { HttpError, handle, json, parseJson } from "@/server/http";
import { engine } from "@/server/memory";
import { rateLimit } from "@/server/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Live contradictions (C11). Bounded server-side: recent 60 units, at most 12 model judgments. */
export const GET = handle(async () => {
  const user = await requireUser();
  const conflicts = await (await engine()).listConflicts(user.id);
  return json({ conflicts });
});

const Body = z.object({ keepId: z.string().length(24), dropIds: z.array(z.string().length(24)).min(1).max(5) });

/** Keep one side; the others become superseded with history (nothing is deleted). */
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  await rateLimit("write", user.id, user.isAnonymous);
  const body = await parseJson(req, Body);
  const r = await (await engine()).resolveConflict({ ownerId: user.id, ...body, actor: { kind: "user", name: "you" } });
  if (r.status !== "resolved") throw new HttpError(409, r.status, "That pair changed — refresh to see the latest.");
  return json(r);
});
