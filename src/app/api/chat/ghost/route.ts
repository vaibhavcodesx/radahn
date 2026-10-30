import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { collections } from "@/server/db/collections";
import { getSettings } from "@/server/app/workspace";
import { HttpError, handle, json, parseJson } from "@/server/http";
import { generatePlain, modelLabel } from "@/server/llm/registry";
import { engine } from "@/server/memory";
import { rateLimit } from "@/server/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({ messageId: z.string().min(1).max(64) });

/**
 * Ghost answer (PRD F-14, memory-engine.md §6.2): the same user message answered with memory
 * OFF — no recall, no core, no strategies, no history, no tools — at the same model, so the
 * only variable is memory. Cached on the assistant message; judges re-click for free.
 */
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const { messageId } = await parseJson(req, Body);
  const { messages } = collections();
  const assistant = await messages.findOne({ ownerId: user.id, uiId: messageId, role: "assistant" });
  if (!assistant) throw new HttpError(404, "not_found", "Reply not found.");
  if (assistant.ghost) return json({ text: assistant.ghost.text, model: modelLabel(assistant.ghost.model), cached: true });

  await rateLimit("ghost", user.id, user.isAnonymous);
  const userMsg = await messages.findOne(
    { ownerId: user.id, conversationId: assistant.conversationId, role: "user", createdAt: { $lte: assistant.createdAt } },
    { sort: { createdAt: -1 } },
  );
  if (!userMsg) throw new HttpError(404, "not_found", "The question for this reply is missing.");

  const settings = await getSettings(user);
  const system = (await engine()).ghostContext({ timeZone: settings.timeZone, now: new Date() });
  const { text, servedBy } = await generatePlain("chat", { system, prompt: userMsg.text, preferred: assistant.model, timeoutMs: 15_000 });
  await messages.updateOne({ _id: assistant._id, ownerId: user.id }, { $set: { ghost: { text, model: servedBy.modelId, at: new Date() } } });
  return json({ text, model: servedBy.label, cached: false, sameModel: servedBy.modelId === assistant.model });
});
