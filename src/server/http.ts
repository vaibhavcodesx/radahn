import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type z } from "zod";
import { HttpError } from "@/server/auth/session";

export { HttpError };

/** JSON error shape for every API route: `{ error: { code, message } }` (TRD §6). */
export function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { "cache-control": "no-store" } });
}

/** Wrap a route handler: maps HttpError/ZodError to JSON, hides internals for everything else. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) return errorResponse(e.status, e.code, e.message);
      if (e instanceof ZodError) return errorResponse(400, "bad_request", e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
      // Log ids/codes only — never request bodies (they may contain user text).
      console.error("[api] unhandled", (e as Error)?.name, (e as Error)?.message?.slice(0, 200));
      return errorResponse(500, "internal", "Something went wrong on our side. Try again.");
    }
  };
}

export async function parseJson<S extends z.ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError(400, "bad_request", "Body must be JSON.");
  }
  return schema.parse(body);
}

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { "cache-control": "no-store", ...(init?.headers ?? {}) } });
}
