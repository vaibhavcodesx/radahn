import { createUIMessageStreamResponse } from "ai";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { runTurn } from "@/server/chat/turn";
import { handle, parseJson } from "@/server/http";
import { rateLimit } from "@/server/ratelimit";
import type { RadahnUIMessage } from "@/lib/chat-types";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  id: z.string().optional(), // useChat chat id (unused; conversationId is ours)
  conversationId: z.string().length(24).optional(),
  spaceId: z.string().length(24),
  model: z.string().optional(),
  message: z.object({
    id: z.string().min(1).max(64),
    role: z.literal("user"),
    parts: z.array(z.object({ type: z.string() }).passthrough()).min(1),
  }),
});

export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const body = await parseJson(req, Body);
  await rateLimit("chat", user.id, user.isAnonymous);
  const stream = await runTurn({
    user,
    message: body.message as unknown as RadahnUIMessage,
    conversationId: body.conversationId,
    spaceId: body.spaceId,
    model: body.model,
  });
  return createUIMessageStreamResponse({ stream });
});
