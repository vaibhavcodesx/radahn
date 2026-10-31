import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { getSettings, currentSpace } from "@/server/app/workspace";
import { handle, json, parseJson } from "@/server/http";
import { engine } from "@/server/memory";
import { MEMORY_STATUSES, MEMORY_TYPES } from "@/server/memory/types";
import { rateLimit } from "@/server/ratelimit";

export const runtime = "nodejs";

const list = (v: string | null) => (v ? v.split(",").filter(Boolean) : undefined);

export const GET = handle(async (req: Request) => {
  const user = await requireUser();
  const url = new URL(req.url);
  const types = z.array(z.enum(MEMORY_TYPES)).optional().parse(list(url.searchParams.get("type")));
  const statuses = z.array(z.enum(MEMORY_STATUSES)).optional().parse(list(url.searchParams.get("status")));
  const sort = z.enum(["updated", "importance", "recalled", "created"]).optional().parse(url.searchParams.get("sort") ?? undefined);
  const spaceKey = url.searchParams.get("spaceKey") ?? "all";
  // Time travel (C12): the list as it was valid at an absolute instant.
  const asOf = z.string().datetime({ offset: true }).optional().parse(url.searchParams.get("asOf") ?? undefined);
  const memories = await (await engine()).listMemories({
    ownerId: user.id,
    spaceKey,
    types,
    statuses,
    q: url.searchParams.get("q")?.slice(0, 100) || undefined,
    sort,
    asOf,
    limit: 300,
  });
  return json({ memories, ...(asOf ? { asOf } : {}) });
});

const Create = z.object({
  statement: z.string().trim().min(3).max(240),
  type: z.enum(MEMORY_TYPES),
  scope: z.enum(["global", "space"]).default("space"),
  importance: z.number().int().min(1).max(10).optional(),
  expiresAt: z.string().datetime().optional(),
});

export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  await rateLimit("write", user.id, user.isAnonymous);
  const body = await parseJson(req, Create);
  const { space } = await currentSpace(user.id, await getSettings(user));
  const r = await (await engine()).rememberExplicit({
    ownerId: user.id,
    spaceKey: space._id.toHexString(),
    ...body,
    source: { kind: "manual", actor: { kind: "user", name: "you" } },
  });
  return json(r, { status: r.op === "blocked" ? 422 : 200 });
});
