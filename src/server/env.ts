import "server-only";
import { z } from "zod";

/**
 * Server env, validated once (TRD §3). Lazy so `next build` and CI can import modules
 * without secrets; set SKIP_ENV_VALIDATION=1 to return best-effort values instead of throwing.
 */
export const envSchema = z.object({
  MONGODB_URI: z.string().startsWith("mongodb"),
  MONGODB_DB: z.string().default("radahn"),
  GEMINI_API_KEYS: z
    .string()
    .min(10)
    // Trim around commas: the shared .env.local has a space after the comma (TRD §9).
    .transform((s) => s.split(",").map((k) => k.trim()).filter(Boolean)),
  GEMINI_CHAT_MODEL: z.string().default("gemini-3.8-flash"),
  GEMINI_FAST_MODEL: z.string().default("gemini-3.5-flash-lite"),
  GEMINI_EMBED_MODEL: z.string().default("gemini-embedding-2"),
  EMBED_DIM: z.coerce.number().int().default(768),
  BETTER_AUTH_SECRET: z.string().min(16),
  BETTER_AUTH_URL: z.string().url().optional(),
  // The deployed value was pasted as "http://<id>.apps.googleusercontent.com/"; Google answers
  // "invalid_client: OAuth client was not found" unless it is the bare id.
  GOOGLE_CLIENT_ID: z.string().trim().transform((v) => v.replace(/^https?:\/\//i, "").replace(/\/+$/, "")).optional(),
  GOOGLE_CLIENT_SECRET: z.string().trim().optional(),
  CRON_SECRET: z.string().min(16),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  MEMORY_ENGINE: z.enum(["mock", "real"]).default("mock"),
  VOYAGE_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const parsed = envSchema.safeParse(source);
  if (parsed.success) return parsed.data;
  if (source.SKIP_ENV_VALIDATION === "1") {
    return envSchema.parse({
      MONGODB_URI: "mongodb://localhost:27017",
      GEMINI_API_KEYS: "skip-validation-key",
      BETTER_AUTH_SECRET: "skip-validation-secret-0000",
      CRON_SECRET: "skip-validation-secret-0000",
      ...Object.fromEntries(Object.entries(source).filter(([, v]) => v !== undefined && v !== "")),
    });
  }
  // Names only — never echo values.
  const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
  throw new Error(`Invalid or missing env: ${missing}`);
}

export function env(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}

/** Public origin for absolute URLs (internal fetches, auth callbacks). */
export function appUrl(): string {
  const e = env();
  if (e.NEXT_PUBLIC_APP_URL) return e.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
