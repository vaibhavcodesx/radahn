import { requireUser } from "@/server/auth/session";
import { collections } from "@/server/db/collections";
import { handle, json } from "@/server/http";
import { DEMO_DISPLAY_NAME } from "@/server/app/demo";
import { engine } from "@/server/memory";

export const runtime = "nodejs";

async function isDemoName(ownerId: string): Promise<Record<string, ""> | object> {
  const s = await collections().settings.findOne({ _id: ownerId });
  return s?.displayName === DEMO_DISPLAY_NAME ? { displayName: "" } : {};
}

/** Delete all memory + chats for this owner (Settings → Data). Account itself stays. */
export const DELETE = handle(async () => {
  const user = await requireUser();
  const { spaces, conversations, messages, settings } = collections();
  await (await engine()).deleteAll(user.id);
  await Promise.all([
    messages.deleteMany({ ownerId: user.id }),
    conversations.deleteMany({ ownerId: user.id }),
    spaces.deleteMany({ ownerId: user.id }),
    // The demo persona's name must not outlive the demo (new memories would say "Aarav …").
    settings.updateOne({ _id: user.id }, { $unset: { demoLoadedAt: "", currentSpaceId: "", ...(await isDemoName(user.id)) } }),
  ]);
  return json({ ok: true });
});
