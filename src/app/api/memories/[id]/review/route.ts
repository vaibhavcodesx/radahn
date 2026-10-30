import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { HttpError, handle, json, parseJson } from "@/server/http";
import { engine } from "@/server/memory";
import { MEMORY_TYPES } from "@/server/memory/types";

export const runtime = "nodejs";

const Body = z.object({
  decision: z.enum(["approve", "reject"]),
  edits: z
    .object({
      statement: z.string().trim().min(3).max(240).optional(),
      type: z.enum(MEMORY_TYPES).optional(),
      importance: z.number().int().min(1).max(10).optional(),
    })
    .optional(),
});

export const POST = handle(async (req: Request, ctx: RouteContext<"/api/memories/[id]/review">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const body = await parseJson(req, Body);
  const m = await (await engine()).reviewMemory({ ownerId: user.id, memoryId: id, decision: body.decision, edits: body.edits, actor: { kind: "user", name: "you" } });
  if (!m) throw new HttpError(404, "not_found", "Nothing to review here — it may already be decided.");
  return json({ memory: m });
});
