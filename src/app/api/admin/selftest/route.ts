import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/server/cron";
import { runSelfTest } from "@/server/memory/selftest";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Operator-only engine self-test against real Atlas + Gemini. `Authorization: Bearer $CRON_SECRET`. */
export async function POST(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: { code: "unauthorized" } }, { status: 401 });
  try {
    const result = await runSelfTest();
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error).message).slice(0, 300) }, { status: 500 });
  }
}
