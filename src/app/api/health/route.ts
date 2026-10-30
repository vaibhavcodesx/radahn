import { NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { engineKind } from "@/server/memory";

export const runtime = "nodejs";

// Liveness for judges' smoke tests and our canary: no secrets, no user data.
export async function GET() {
  const started = Date.now();
  let dbStatus: "ok" | "error" = "ok";
  let dbError: string | undefined;
  try {
    await db().command({ ping: 1 });
  } catch (e) {
    dbStatus = "error";
    dbError = (e as { code?: string; name?: string }).code ?? (e as Error).name;
  }
  return NextResponse.json(
    { ok: dbStatus === "ok", db: dbStatus, dbError, engine: engineKind(), region: process.env.VERCEL_REGION ?? "local", ms: Date.now() - started },
    { headers: { "cache-control": "no-store" } },
  );
}
