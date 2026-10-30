import "server-only";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/server/env";

/** Vercel cron + operator routes: `Authorization: Bearer $CRON_SECRET`, constant-time compare. */
export function isCronAuthorized(req: Request): boolean {
  const got = req.headers.get("authorization") ?? "";
  const want = `Bearer ${env().CRON_SECRET}`;
  return got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want));
}
