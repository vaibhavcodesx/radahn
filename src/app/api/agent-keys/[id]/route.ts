import { requireUser } from "@/server/auth/session";
import { HttpError, handle, json } from "@/server/http";
import { engine } from "@/server/memory";

export const runtime = "nodejs";

export const DELETE = handle(async (_req: Request, ctx: RouteContext<"/api/agent-keys/[id]">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  if (!(await (await engine()).revokeAgentKey(user.id, id))) throw new HttpError(404, "not_found", "That key is already gone.");
  return json({ revoked: true });
});
