import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { updateSettings } from "@/server/app/workspace";
import { handle, json, parseJson } from "@/server/http";
import { MODEL_CHAINS } from "@/server/llm/registry";

export const runtime = "nodejs";

const Body = z.object({
  displayName: z.string().trim().max(40).optional(),
  timeZone: z.string().max(64).refine((tz) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, "Unknown time zone").optional(),
  writePolicy: z.enum(["auto", "review_sensitive", "review_all"]).optional(),
  chatModel: z.string().refine((m) => MODEL_CHAINS.chat.includes(m), "Unknown model").optional(),
});

export const PATCH = handle(async (req: Request) => {
  const user = await requireUser();
  const body = await parseJson(req, Body);
  await updateSettings(user.id, { ...body, displayName: body.displayName || undefined });
  return json({ ok: true });
});
