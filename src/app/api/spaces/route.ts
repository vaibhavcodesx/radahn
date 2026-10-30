import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { createSpace, getSpace, listSpaces, toSpaceDTO, updateSettings } from "@/server/app/workspace";
import { handle, json, parseJson } from "@/server/http";

export const runtime = "nodejs";

export const GET = handle(async () => {
  const user = await requireUser();
  return json({ spaces: (await listSpaces(user.id)).map(toSpaceDTO) });
});

const Body = z.union([
  z.object({ action: z.literal("create"), name: z.string().trim().min(1).max(40), color: z.string().regex(/^--t-[a-z]+$/) }),
  z.object({ action: z.literal("select"), spaceId: z.string().length(24) }),
]);

export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const body = await parseJson(req, Body);
  if (body.action === "create") {
    const s = await createSpace(user.id, body.name, body.color);
    await updateSettings(user.id, { currentSpaceId: s._id.toHexString() });
    return json({ space: toSpaceDTO(s) });
  }
  const s = await getSpace(user.id, body.spaceId);
  await updateSettings(user.id, { currentSpaceId: s._id.toHexString() });
  return json({ space: toSpaceDTO(s) });
});
