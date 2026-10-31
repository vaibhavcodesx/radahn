import "server-only";
import { collections } from "@/server/db/collections";
import { HttpError } from "@/server/auth/session";

/**
 * Fixed-window per-user limits in Mongo (TRD §9). Guests get the base budget, signed-in ×2.
 * The window doc has a 1 h TTL. Fails open on DB errors: a judge should never be blocked by
 * our own accounting.
 */
const LIMITS = {
  chat: { max: 20, windowSec: 600 },
  ghost: { max: 5, windowSec: 600 },
  reflect: { max: 3, windowSec: 600 },
  write: { max: 60, windowSec: 600 },
  agent: { max: 120, windowSec: 600 }, // MCP calls per owner, across all of its keys
} as const;

export type LimitKind = keyof typeof LIMITS;

export async function rateLimit(kind: LimitKind, userId: string, isAnonymous: boolean): Promise<void> {
  const { max, windowSec } = LIMITS[kind];
  const limit = isAnonymous ? max : max * 2;
  const windowStart = new Date(Math.floor(Date.now() / (windowSec * 1000)) * windowSec * 1000);
  try {
    const doc = await collections().rateLimits.findOneAndUpdate(
      { key: `${kind}:${userId}`, windowStart },
      { $inc: { count: 1 } },
      { upsert: true, returnDocument: "after" },
    );
    if (doc && doc.count > limit) {
      const retry = Math.ceil((windowStart.getTime() + windowSec * 1000 - Date.now()) / 1000);
      throw new HttpError(429, "rate_limited", `You're going fast. Try again in ${Math.max(1, Math.ceil(retry / 60))} min.`);
    }
  } catch (e) {
    if (e instanceof HttpError) throw e;
  }
}
