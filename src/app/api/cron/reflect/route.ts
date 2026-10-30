import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/server/cron";
import { collections } from "@/server/db/collections";
import { engine } from "@/server/memory";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Daily "sleep-time" reflection (03:00 IST) for spaces with unreflected units, capped. */
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: { code: "unauthorized" } }, { status: 401 });
  const since = new Date(Date.now() - 24 * 3_600_000);
  const spaces = await collections()
    .spaces.find({ unitsSinceReflection: { $gte: 2 }, $or: [{ lastReflectionAt: { $exists: false } }, { lastReflectionAt: { $lt: since } }] })
    .limit(20)
    .toArray();
  const eng = await engine();
  let ran = 0;
  for (const s of spaces) {
    try {
      await eng.runReflection({ ownerId: s.ownerId, spaceKey: s._id.toHexString(), trigger: "cron" });
      ran++;
    } catch {
      /* one bad space must not stop the rest */
    }
  }
  return NextResponse.json({ ok: true, candidates: spaces.length, ran });
}
