import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/server/cron";
import { engineKind } from "@/server/memory";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Daily maintenance (vercel.json, 00:30 IST), engine C9: flip expired units to `expired` with
 * events and backfill missing embeddings, in bounded batches. The TTL index on `purgeAt` does the
 * physical deletion. Guest purge stays deferred (guestActivityGuardReady defaults to false) until
 * session activity is recorded before every auth mutation.
 */
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: { code: "unauthorized" } }, { status: 401 });
  if (engineKind() !== "real") return NextResponse.json({ ok: true, skipped: "mock engine" });
  const { runMaintenance } = await import("@/server/memory/maintenance");
  const stats = await runMaintenance({ now: new Date() });
  return NextResponse.json({ ok: true, stats });
}
