import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { HttpError, handle, json, parseJson } from "@/server/http";
import { engine } from "@/server/memory";
import { MEMORY_TYPES } from "@/server/memory/types";
import { rateLimit } from "@/server/ratelimit";

export const runtime = "nodejs";

type Ctx = RouteContext<"/api/memories/[id]">;
const actor = { kind: "user" as const, name: "you" };

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const detail = await (await engine()).getMemory(user.id, id);
  if (!detail) throw new HttpError(404, "not_found", "Memory not found. It may have been forgotten or expired.");
  return json(detail);
});

const Patch = z.object({
  statement: z.string().trim().min(3).max(240).optional(), // edit = correction (supersede, keeps history)
  pinned: z.boolean().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  spaceKey: z.string().min(1).max(24).optional(),
  importance: z.number().int().min(1).max(10).optional(),
  type: z.enum(MEMORY_TYPES).optional(),
});

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const user = await requireUser();
  await rateLimit("write", user.id, user.isAnonymous);
  const { id } = await ctx.params;
  const body = await parseJson(req, Patch);
  const eng = await engine();
  if (body.statement) {
    const current = await eng.getMemory(user.id, id);
    if (!current) throw new HttpError(404, "not_found", "Memory not found.");
    const r = await eng.correctMemory({ ownerId: user.id, spaceKey: current.memory.spaceKey, memoryId: id, newStatement: body.statement, actor });
    if (r.status === "blocked") throw new HttpError(422, "blocked", "That looked like a secret or unsafe text, so it was not saved.");
    if (r.status !== "updated") throw new HttpError(409, r.status, "Couldn't update this memory.");
    return json({ memory: r.after, previous: r.before });
  }
  const { statement: _s, ...patch } = body;
  void _s;
  try {
    const m = await eng.updateMemory({ ownerId: user.id, memoryId: id, patch, actor });
    if (!m) throw new HttpError(404, "not_found", "Memory not found.");
    return json({ memory: m });
  } catch (e) {
    if (e instanceof HttpError) throw e;
    // Engine signals pin-budget overflow with a typed message (memory-engine.md §3).
    if (/budget|consolidate/i.test(String((e as Error).message))) throw new HttpError(409, "core_budget", "Core memory is full (1,500 characters). Unpin or shorten something first.");
    throw e;
  }
});

export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const r = await (await engine()).forgetMemory({ ownerId: user.id, memoryId: id, actor });
  if (r.status !== "forgotten") throw new HttpError(404, "not_found", "Memory not found.");
  return json(r);
});
