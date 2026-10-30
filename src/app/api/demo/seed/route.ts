import { requireUser } from "@/server/auth/session";
import { removeDemoWorld, seedDemoWorld } from "@/server/app/demo";
import { handle, json } from "@/server/http";
import { rateLimit } from "@/server/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = handle(async () => {
  const user = await requireUser();
  await rateLimit("write", user.id, user.isAnonymous);
  const result = await seedDemoWorld(user.id);
  return json(result);
});

export const DELETE = handle(async () => {
  const user = await requireUser();
  await removeDemoWorld(user.id);
  return json({ ok: true });
});
