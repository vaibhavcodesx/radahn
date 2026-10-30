import { requireUser } from "@/server/auth/session";
import { listConversations, searchConversations, toConversationDTO } from "@/server/app/workspace";
import { handle, json } from "@/server/http";

export const runtime = "nodejs";

export const GET = handle(async (req: Request) => {
  const user = await requireUser();
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  if (q) return json({ conversations: await searchConversations(user.id, q.slice(0, 100)) });
  const spaceId = url.searchParams.get("spaceId") ?? undefined;
  return json({ conversations: (await listConversations(user.id, spaceId)).map(toConversationDTO) });
});
