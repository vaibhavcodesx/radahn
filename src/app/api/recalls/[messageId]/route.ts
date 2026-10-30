import { requireUser } from "@/server/auth/session";
import { HttpError, handle, json } from "@/server/http";
import { engine } from "@/server/memory";

export const runtime = "nodejs";

/** Recall trace for the Memory lens (memory-engine.md §5.6). messageId = assistant message uiId. */
export const GET = handle(async (_req: Request, ctx: RouteContext<"/api/recalls/[messageId]">) => {
  const user = await requireUser();
  const { messageId } = await ctx.params;
  const trace = await (await engine()).getRecallTrace(user.id, messageId.slice(0, 64));
  if (!trace) throw new HttpError(404, "not_found", "No recall trace for this message (traces expire after 14 days).");
  const { _id, ownerId, ...rest } = trace;
  void ownerId;
  return json({ trace: { id: _id.toHexString(), ...rest, createdAt: rest.createdAt.toISOString() } });
});
