import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/server/cron";
import { engineKind } from "@/server/memory";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Daily maintenance (vercel.json, 00:30 IST): flip expired units to `expired` with events, so the
 * Atlas and Activity reflect what recall already excludes (memory-engine.md §3). The TTL index
 * on `purgeAt` does the physical deletion on its own. C9 extends this with guest purge.
 */
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: { code: "unauthorized" } }, { status: 401 });
  if (engineKind() !== "real") return NextResponse.json({ ok: true, skipped: "mock engine" });
  const lifecycle = await import("@/server/memory/lifecycle");
  const flipped = await lifecycle.flipExpired();
  const extra = "runMaintenance" in lifecycle ? await (lifecycle as unknown as { runMaintenance: (o: { now: Date }) => Promise<unknown> }).runMaintenance({ now: new Date() }) : null;
  return NextResponse.json({ ok: true, flipped, extra });
}
