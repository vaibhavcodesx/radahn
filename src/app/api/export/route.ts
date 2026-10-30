import { requireUser } from "@/server/auth/session";
import { collections } from "@/server/db/collections";
import { handle } from "@/server/http";
import { engine } from "@/server/memory";

export const runtime = "nodejs";

/** Export everything this owner has (PRD F-50). Embeddings omitted (not useful, very large). */
export const GET = handle(async () => {
  const user = await requireUser();
  const { spaces, conversations, messages } = collections();
  const eng = await engine();
  const [s, c, m, mem, ev] = await Promise.all([
    spaces.find({ ownerId: user.id }).toArray(),
    conversations.find({ ownerId: user.id }).toArray(),
    messages.find({ ownerId: user.id }, { projection: { parts: 0 } }).toArray(),
    eng.listMemories({ ownerId: user.id, spaceKey: "all", statuses: ["active", "pending_review", "superseded", "expired"], limit: 5000 }),
    eng.listEvents(user.id, { limit: 5000 }),
  ]);
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), spaces: s, conversations: c, messages: m, memories: mem, events: ev }, null, 2);
  return new Response(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="radahn-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "cache-control": "no-store",
    },
  });
});
