import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { deleteConversation, getConversation, renameConversation } from "@/server/app/workspace";
import { handle, json, parseJson } from "@/server/http";

export const runtime = "nodejs";

const Patch = z.object({ title: z.string().trim().min(1).max(80) });

export const PATCH = handle(async (req: Request, ctx: RouteContext<"/api/conversations/[id]">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await getConversation(user.id, id);
  const { title } = await parseJson(req, Patch);
  await renameConversation(user.id, id, title);
  return json({ ok: true });
});

export const DELETE = handle(async (_req: Request, ctx: RouteContext<"/api/conversations/[id]">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await getConversation(user.id, id);
  await deleteConversation(user.id, id);
  return json({ ok: true });
});
