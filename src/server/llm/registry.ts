import "server-only";
import { createGoogleGenerativeAI, type GoogleLanguageModelOptions } from "@ai-sdk/google";
import { embedMany, generateText, Output, type LanguageModel } from "ai";
import type { z } from "zod";
import { env } from "@/server/env";

/**
 * LLM registry — CONTRACT (TRD §9). Owned by Codex from task C1 on.
 *
 * Claude wrote this minimal working version in Phase 0 so the chat route runs before C1.
 * Codex replaces the internals with: key pool across Google projects, per-(key, model)
 * quota state persisted in `llm_usage` (exhausted-until on daily 429s, 60 s cooldown on
 * RPM 429s), jittered retries, timeouts. The EXPORTED NAMES AND SIGNATURES BELOW ARE THE
 * CONTRACT: keep them stable.
 */

export type ModelRole = "chat" | "fast" | "reflect";

/** Ordered fallback chains (TRD §1; research/quotas.md: 3.8 Flash has a small daily cap). */
export const MODEL_CHAINS: Record<ModelRole, string[]> = {
  chat: ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"],
  fast: ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"],
  reflect: ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"],
};

/** Human label shown in the UI ("3.8 Flash"). */
export function modelLabel(model: string): string {
  return model
    .replace(/^gemini-/, "")
    .replace(/-flash-lite$/, " Flash-Lite")
    .replace(/-flash$/, " Flash");
}

/** One concrete (model, key) option the caller may try, in preference order. */
export interface ModelCandidate {
  model: LanguageModel;
  modelId: string;
  /** Short non-secret key fingerprint (first 6 chars of a sha256), for logs and llm_usage. */
  keyFp: string;
  label: string;
  /** True when this is not the first choice for the role (UI shows "fell back to …"). */
  fallback: boolean;
}

export interface ServedBy {
  modelId: string;
  label: string;
  fallback: boolean;
}

/**
 * Candidates for a role, best first, already skipping (key, model) pairs that are cooling
 * down or exhausted. `preferred` (a model id from user settings) moves to the front if allowed.
 */
export async function candidates(role: ModelRole, preferred?: string): Promise<ModelCandidate[]> {
  const keys = env().GEMINI_API_KEYS;
  let chain = MODEL_CHAINS[role];
  if (preferred && chain.includes(preferred)) chain = [preferred, ...chain.filter((m) => m !== preferred)];
  const out: ModelCandidate[] = [];
  chain.forEach((modelId, mi) => {
    keys.forEach((apiKey, ki) => {
      const google = createGoogleGenerativeAI({ apiKey });
      out.push({
        model: google(modelId),
        modelId,
        keyFp: `k${ki}`,
        label: modelLabel(modelId),
        fallback: mi > 0,
      });
    });
  });
  return out;
}

/** Record how a candidate did, so routing can skip it next time. */
export async function report(
  candidate: Pick<ModelCandidate, "modelId" | "keyFp">,
  outcome: "ok" | "rate_limited" | "quota_exhausted" | "error",
): Promise<void> {
  void candidate;
  void outcome;
}

/** Classify an AI SDK / Gemini error for `report`. */
export function classifyError(err: unknown): "rate_limited" | "quota_exhausted" | "error" {
  const msg = String((err as { message?: string })?.message ?? err).toLowerCase();
  const status = (err as { statusCode?: number })?.statusCode;
  if (msg.includes("per day") || msg.includes("perday") || msg.includes("daily")) return "quota_exhausted";
  if (status === 429 || msg.includes("429") || msg.includes("resource_exhausted") || msg.includes("quota"))
    return "rate_limited";
  return "error";
}

/** Gemini 3 thinking levels: 3.8 Flash has no 'minimal' (research/quotas.md). */
export function thinkingOptions(modelId: string, level: "low" | "medium" | "high" = "low") {
  void modelId; // reserved: per-model level clamping
  return {
    google: { thinkingConfig: { thinkingLevel: level } } satisfies GoogleLanguageModelOptions,
  };
}

/** Try candidates in order until one succeeds. Use for non-streamed background calls. */
export async function withFallback<T>(
  role: ModelRole,
  fn: (c: ModelCandidate) => Promise<T>,
  opts: { preferred?: string } = {},
): Promise<{ result: T; servedBy: ServedBy }> {
  const list = await candidates(role, opts.preferred);
  let lastErr: unknown;
  for (const c of list) {
    try {
      const result = await fn(c);
      await report(c, "ok");
      return { result, servedBy: { modelId: c.modelId, label: c.label, fallback: c.fallback } };
    } catch (err) {
      lastErr = err;
      const kind = classifyError(err);
      await report(c, kind);
      if (kind === "error") break; // not a quota problem: don't burn the chain
    }
  }
  throw lastErr ?? new Error("No model candidates available");
}

/** Structured output with fallback (AI SDK v7: generateText + Output.object). */
export async function generateStructured<S extends z.ZodType>(
  role: ModelRole,
  args: { system?: string; prompt: string; schema: S; thinking?: "low" | "medium" | "high"; timeoutMs?: number },
): Promise<{ object: z.infer<S>; servedBy: ServedBy }> {
  const { result, servedBy } = await withFallback(role, async (c) => {
    const { output } = await generateText({
      model: c.model,
      system: args.system,
      prompt: args.prompt,
      output: Output.object({ schema: args.schema }),
      providerOptions: thinkingOptions(c.modelId, args.thinking ?? "low"),
      abortSignal: AbortSignal.timeout(args.timeoutMs ?? 20_000),
    });
    return output as z.infer<S>;
  });
  return { object: result, servedBy };
}

/** Plain text generation with fallback (titles, ghost answers). */
export async function generatePlain(
  role: ModelRole,
  args: { system?: string; prompt: string; thinking?: "low" | "medium" | "high"; timeoutMs?: number; preferred?: string },
): Promise<{ text: string; servedBy: ServedBy }> {
  const { result, servedBy } = await withFallback(
    role,
    async (c) => {
      const { text } = await generateText({
        model: c.model,
        system: args.system,
        prompt: args.prompt,
        providerOptions: thinkingOptions(c.modelId, args.thinking ?? "low"),
        abortSignal: AbortSignal.timeout(args.timeoutMs ?? 30_000),
      });
      return text;
    },
    { preferred: args.preferred },
  );
  return { text: result, servedBy };
}

export type EmbedKind = "document" | "query";

/**
 * gemini-embedding-2 @ 768 dims. No taskType for this model: use the documented asymmetric
 * prefixes (memory-engine.md §6.1). Callers pass raw text; this adds the prefix.
 * `title` is used for documents only (we pass the memory type).
 */
export async function embed(
  items: Array<{ text: string; title?: string }>,
  kind: EmbedKind,
): Promise<number[][]> {
  if (items.length === 0) return [];
  const e = env();
  const values = items.map((i) =>
    kind === "query" ? `task: search result | query: ${i.text}` : `title: ${i.title ?? "none"} | text: ${i.text}`,
  );
  let lastErr: unknown;
  for (const apiKey of e.GEMINI_API_KEYS) {
    try {
      const google = createGoogleGenerativeAI({ apiKey });
      const { embeddings } = await embedMany({
        model: google.embedding(e.GEMINI_EMBED_MODEL),
        values,
        providerOptions: { google: { outputDimensionality: e.EMBED_DIM } },
        abortSignal: AbortSignal.timeout(8_000),
      });
      return embeddings;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error("embed failed");
}
