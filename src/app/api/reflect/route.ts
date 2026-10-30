import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { currentSpace, getSettings } from "@/server/app/workspace";
import { HttpError, handle, json, parseJson } from "@/server/http";
import { engine } from "@/server/memory";
import { rateLimit } from "@/server/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 120;

const Body = z.object({ spaceId: z.string().length(24).optional() });

/** Manual "Reflect now" (PRD F-30). Steps stream to the UI via the reflections doc + SSE events. */
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  await rateLimit("reflect", user.id, user.isAnonymous);
  const { spaceId } = await parseJson(req, Body);
  const spaceKey = spaceId ?? (await currentSpace(user.id, await getSettings(user))).space._id.toHexString();
  try {
    const run = await (await engine()).runReflection({ ownerId: user.id, spaceKey, trigger: "manual" });
    return json({ id: run._id.toHexString(), status: run.status, outputs: run.outputs });
  } catch (e) {
    if (/not implemented/i.test(String((e as Error).message))) throw new HttpError(503, "unavailable", "Reflection is still coming online. Try again shortly.");
    throw e;
  }
});
