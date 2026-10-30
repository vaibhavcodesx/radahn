import { requireUser } from "@/server/auth/session";
import { handle, json } from "@/server/http";
import { engine } from "@/server/memory";

export const runtime = "nodejs";

/** Lightweight nodes/links for the Atlas Field (no embeddings in the payload). */
export const GET = handle(async () => {
  const user = await requireUser();
  return json(await (await engine()).graph(user.id, "all"));
});
