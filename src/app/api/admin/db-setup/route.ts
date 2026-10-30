import { NextResponse } from "next/server";
import { mongo } from "@/server/db/client";
import { runDbSetup } from "@/server/db/setup";
import { isCronAuthorized } from "@/server/cron";
import { env } from "@/server/env";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Operator-only: run the idempotent DB setup from Vercel. `Authorization: Bearer $CRON_SECRET`. */
export async function POST(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: { code: "unauthorized" } }, { status: 401 });
  const url = new URL(req.url);
  const dbName = url.searchParams.get("db") === "radahn_eval" ? "radahn_eval" : env().MONGODB_DB;
  const wait = url.searchParams.get("wait") !== "0";
  try {
    const lines = await runDbSetup(mongo(), dbName, { waitForSearch: wait });
    return NextResponse.json({ ok: true, lines });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error).message).slice(0, 300) }, { status: 500 });
  }
}
