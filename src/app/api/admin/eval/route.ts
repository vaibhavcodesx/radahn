import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/server/cron";
import { runEvals } from "@/server/memory/evals";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Operator-only hosted eval (memory-engine.md §9). Runs in `radahn` under a disposable `eval:`
 * owner that is deleted in `finally` — M0 allows 3 search indexes per cluster, so a separate
 * eval database can't have the vector/text indexes (decisions.md). `Authorization: Bearer $CRON_SECRET`.
 */
export async function POST(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: { code: "unauthorized" } }, { status: 401 });
  try {
    return NextResponse.json(await runEvals());
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error).message).slice(0, 300) }, { status: 500 });
  }
}
