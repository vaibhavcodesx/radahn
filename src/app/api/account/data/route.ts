import { requireUser } from "@/server/auth/session";
import { collections } from "@/server/db/collections";
import { handle, json } from "@/server/http";
import { engine } from "@/server/memory";

export const runtime = "nodejs";

/** Delete all memory + chats for this owner (Settings → Data). Account itself stays. */
export const DELETE = handle(async () => {
  const user = await requireUser();
  const { spaces, conversations, messages, settings } = collections();
  await (await engine()).deleteAll(user.id);
  await Promise.all([
    messages.deleteMany({ ownerId: user.id }),
    conversations.deleteMany({ ownerId: user.id }),
    spaces.deleteMany({ ownerId: user.id }),
    settings.updateOne({ _id: user.id }, { $unset: { demoLoadedAt: "", currentSpaceId: "" } }),
  ]);
  return json({ ok: true });
});
