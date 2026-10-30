import { NextResponse } from "next/server";
import { z } from "zod";
import { isCronAuthorized } from "@/server/cron";
import { engine } from "@/server/memory";

export const runtime = "nodejs";
export const maxDuration = 120;

const Body = z.object({ ownerId: z.string().min(1), spaceKey: z.string().min(1) });

/**
 * Automatic reflection after every 8 new units in a space (memory-engine.md §7). Called by the
 * chat turn's after() as its own request so it gets its own time budget (TRD §10).
 */
export async function POST(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: { code: "unauthorized" } }, { status: 401 });
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: { code: "bad_request" } }, { status: 400 });
  try {
    const run = await (await engine()).runReflection({ ...body.data, trigger: "auto" });
    return NextResponse.json({ ok: true, id: run._id.toHexString() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error).message).slice(0, 160) }, { status: 500 });
  }
}
