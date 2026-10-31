import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { listSpaces } from "@/server/app/workspace";
import { HttpError, handle, json, parseJson } from "@/server/http";
import { engine } from "@/server/memory";
import { rateLimit } from "@/server/ratelimit";

export const runtime = "nodejs";

/** Connected agents (PRD F-41): key metadata only — hashes and raw keys never leave the server. */
export const GET = handle(async () => {
  const user = await requireUser();
  const [keys, spaces] = await Promise.all([(await engine()).listAgentKeys(user.id), listSpaces(user.id)]);
  return json({ keys, spaces: spaces.map((s) => ({ id: s._id.toHexString(), name: s.name })) });
});

const Create = z.object({
  name: z.string().trim().min(1).max(60),
  spaceId: z.string().length(24).optional(),
  includeGlobal: z.boolean().default(true),
});

/** The raw key is returned exactly once, here. */
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  await rateLimit("write", user.id, user.isAnonymous);
  const { name, spaceId, includeGlobal } = await parseJson(req, Create);
  const scopes = [...(spaceId ? [spaceId] : []), ...(includeGlobal ? ["global"] : [])];
  if (!scopes.length) throw new HttpError(400, "no_scope", "Pick a space or include global memory.");
  try {
    return json(await (await engine()).createAgentKey(user.id, name, scopes));
  } catch {
    throw new HttpError(400, "invalid", "Couldn't create that key. Use a plain name and one of your spaces.");
  }
});
