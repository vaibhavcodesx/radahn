import { requireUser } from "@/server/auth/session";
import { handle } from "@/server/http";
import { sseStream } from "@/server/realtime/stream";

export const runtime = "nodejs";
export const maxDuration = 300;

export const GET = handle(async (req: Request) => {
  const user = await requireUser();
  const last = req.headers.get("last-event-id") ?? new URL(req.url).searchParams.get("last");
  return new Response(sseStream(user.id, last, req.signal), {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
});
