import "server-only";
import { fingerprint, refreshUsage, live, record } from "./quota";
import { createGoogleGenerativeAI, type GoogleLanguageModelOptions } from "@ai-sdk/google";
import { createGroq, type GroqLanguageModelChatOptions } from "@ai-sdk/groq";
import { embedMany, generateText, Output, NoObjectGeneratedError, NoOutputGeneratedError, type LanguageModel } from "ai";
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
  // 3.8 Flash is opt-in from the picker: it returned "high demand" 503s most of 31 Oct.
  // Groq's GPT-OSS sits second so the 3.5 s hedge reaches a different provider when Gemini stalls.
  chat: ["gemini-3.6-flash", "openai/gpt-oss-120b", "gemini-3.5-flash-lite", "qwen/qwen3.8-27b", "gemini-3.8-flash"],
  fast: ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"],
  reflect: ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"],
};

/** Model selector metadata (CODEX_TASKS K6); availability means configured, not quota guaranteed. */
export interface ChatModelOption {
  id: string;
  label: string;
  provider: "gemini" | "groq";
  available: boolean;
}

/** Groq-hosted ids carry a vendor prefix ("openai/gpt-oss-120b"); Gemini ids never do. */
export function providerOf(modelId: string): "gemini" | "groq" {
  return modelId.includes("/") ? "groq" : "gemini";
}

/** API keys that can serve a model; empty means the provider is not configured. */
function keysFor(modelId: string): string[] {
  const e = env();
  if (providerOf(modelId) === "groq") return e.GROQ_API_KEY ? [e.GROQ_API_KEY] : [];
  return [...new Set(e.GEMINI_API_KEYS)];
}

function buildModel(modelId: string, apiKey: string): LanguageModel {
  return providerOf(modelId) === "groq" ? createGroq({ apiKey })(modelId) : createGoogleGenerativeAI({ apiKey })(modelId);
}

export function chatModelOptions(): ChatModelOption[] {
  return MODEL_CHAINS.chat.map(id => ({ id, label: modelLabel(id), provider: providerOf(id), available: keysFor(id).length > 0 }));
}

const LABELS: Record<string, string> = { "openai/gpt-oss-120b": "GPT-OSS 120B", "qwen/qwen3.8-27b": "Qwen 3.8" };

/** Human label shown in the UI ("3.8 Flash"). */
export function modelLabel(model: string): string {
  if (LABELS[model]) return LABELS[model];
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
  /** Internal diagnostic: true when this model differs from the requested first choice. */
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
let rotation = 0;

/**
 * Models that hung (no error, no tokens) are skipped in-process for a while. Observed 05:10 IST:
 * gemini-3.8-flash accepted requests but returned nothing for > 25 s on both keys, which never
 * raises a 429, so quota routing alone can't route around it. (Claude, integration fix.)
 */
const slowUntil = new Map<string, number>();
export function markSlow(modelId: string, ms = 5 * 60_000) {
  slowUntil.set(modelId, Date.now() + ms);
}
export function isSlow(modelId: string) {
  return (slowUntil.get(modelId) ?? 0) > Date.now();
}
export function isTimeout(err: unknown): boolean {
  const e = err as { name?: string; message?: string };
  return /timeout|aborted/i.test(`${e?.name} ${e?.message}`);
}

export async function candidates(role: ModelRole, preferred?: string): Promise<ModelCandidate[]> {
  const keys = [...new Set(env().GEMINI_API_KEYS)];
  // Models whose provider has no key are dropped up front (Groq is optional).
  let chain = MODEL_CHAINS[role].filter(model => keysFor(model).length > 0);
  const selected = preferred && chain.includes(preferred) ? preferred : undefined;
  await refreshUsage(chain.flatMap(model => keysFor(model).map(key => `${fingerprint(key)}:${model}`)));
  const offset = rotation++ % Math.max(1, keys.length);
  const ordered = [...keys.slice(offset), ...keys.slice(0, offset)];
  // Slow models go last rather than vanishing, so a fully slow chain still gets tried.
  chain = [...chain.filter((m) => !isSlow(m)), ...chain.filter((m) => isSlow(m))];
  // A user selection takes precedence over the automatic latency heuristic; quota still applies.
  if (selected) chain = [selected, ...chain.filter(m => m !== selected)];
  const firstChoice = selected ?? chain[0];
  return chain.flatMap(modelId => (providerOf(modelId) === "groq" ? keysFor(modelId) : ordered).flatMap(apiKey => {
    const keyFp = fingerprint(apiKey);
    if (!live(`${keyFp}:${modelId}`)) return [];
    return [{ model: buildModel(modelId, apiKey), modelId, keyFp, label: modelLabel(modelId), fallback: modelId !== firstChoice }];
  }));
}

/** Quota state is infrastructure-wide; unlike user memory it is keyed only by key fingerprint. */
export async function report(
  candidate: Pick<ModelCandidate, "modelId" | "keyFp">,
  outcome: "ok" | "rate_limited" | "quota_exhausted" | "error",
): Promise<void> { await record(candidate, outcome); }

/** Classify an AI SDK / Gemini error for `report`. */
export function classifyError(err: unknown): "rate_limited" | "quota_exhausted" | "error" {
  const msg = String((err as { message?: string })?.message ?? err).toLowerCase();
  const status = (err as { statusCode?: number })?.statusCode;
  const limited = status === 429 || /429|resource_exhausted|quota.*exceed/.test(msg);
  if (limited && /per[ _-]?day|daily/.test(msg)) return "quota_exhausted";
  if (limited) return "rate_limited";
  return "error";
}

/** Gemini 3 thinking levels: 3.8 Flash has no 'minimal' (research/quotas.md). */
export function thinkingOptions(modelId: string, level: "low" | "medium" | "high" = "low") {
  // Each provider reads only its own key. Qwen on Groq accepts only "none" | "default".
  return {
    google: { thinkingConfig: { thinkingLevel: level } } satisfies GoogleLanguageModelOptions,
    groq: { reasoningEffort: modelId.startsWith("qwen/") ? "none" : level } satisfies GroqLanguageModelChatOptions,
  };
}

/** Try candidates in order until one succeeds. Use for non-streamed background calls. */
export async function withFallback<T>(
  role: ModelRole,
  fn: (c: ModelCandidate) => Promise<T>,
  opts: { preferred?: string; deadlineAt?: number } = {},
): Promise<{ result: T; servedBy: ServedBy }> {
  if (opts.deadlineAt === undefined) return runFallback(role, fn, opts);
  const remaining = opts.deadlineAt - Date.now();
  if (remaining <= 0) throw new Error("LLM request failed (inference deadline exceeded)");
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // Quota reads/reports can also stall; bound the caller's entire inference wait.
    return await Promise.race([
      runFallback(role, fn, opts),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("LLM request failed (inference deadline exceeded)")), remaining);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

async function runFallback<T>(
  role: ModelRole,
  fn: (c: ModelCandidate) => Promise<T>,
  opts: { preferred?: string; deadlineAt?: number },
): Promise<{ result: T; servedBy: ServedBy }> {
  const list = await candidates(role, opts.preferred);
  const hung = new Set<string>();
  const deadlineReached = () => opts.deadlineAt !== undefined && Date.now() >= opts.deadlineAt;
  for (const c of list) {
    if (hung.has(c.modelId)) continue;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (deadlineReached()) throw new Error("LLM request failed (inference deadline exceeded)");
      try {
        const result = await fn(c);
        if (deadlineReached()) throw new Error("LLM request failed (inference deadline exceeded)");
        await report(c, "ok");
        return { result, servedBy: { modelId: c.modelId, label: c.label, fallback: c.fallback } };
      } catch (err) {
        const kind = classifyError(err);
        await report(c, kind);
        if (kind !== "error") break;
        // Invalid structured content is model-specific; try another model without exposing its text.
        if (NoObjectGeneratedError.isInstance(err) || NoOutputGeneratedError.isInstance(err)) {
          hung.add(c.modelId);break;
        }
        // A hung model: don't retry it on this or any other key — move to the next model.
        if (isTimeout(err)) {
          markSlow(c.modelId);
          hung.add(c.modelId);
          break;
        }
        if (!transient(err)) throw new Error("LLM request failed (non-retryable provider error)");
        if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
      }
    }
  }
  throw new Error("LLM request failed (no live candidates succeeded)");
}

function transient(err: unknown): boolean {
  const e = err as { statusCode?: number; name?: string; message?: string };
  return (e?.statusCode ?? 0) >= 500 || /timeout|abort|ETIMEDOUT|ECONNRESET|fetch failed/i.test(`${e?.name} ${e?.message}`);
}

/** Structured output with fallback (AI SDK v7: generateText + Output.object). */
export async function generateStructured<S extends z.ZodType>(
  role: ModelRole,
  args: { system?: string; prompt: string; schema: S; thinking?: "low" | "medium" | "high"; timeoutMs?: number; totalTimeoutMs?: number },
): Promise<{ object: z.infer<S>; servedBy: ServedBy }> {
  // Extraction gets one inference budget across keys/models, rather than restarting it on fallback.
  const deadlineAt = args.totalTimeoutMs === undefined ? undefined : Date.now() + args.totalTimeoutMs;
  const sharedSignal = args.totalTimeoutMs === undefined ? undefined : AbortSignal.timeout(args.totalTimeoutMs);
  const { result, servedBy } = await withFallback(role, async (c) => {
    const { output } = await generateText({
      model: c.model,
      maxRetries: 0,
      system: args.system,
      prompt: args.prompt,
      output: Output.object({ schema: args.schema }),
      providerOptions: thinkingOptions(c.modelId, args.thinking ?? (role === "reflect" ? "medium" : "low")),
      abortSignal: sharedSignal ?? AbortSignal.timeout(args.timeoutMs ?? 20_000),
    });
    return output as z.infer<S>;
  }, { deadlineAt });
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
      maxRetries: 0,
        system: args.system,
        prompt: args.prompt,
        providerOptions: thinkingOptions(c.modelId, args.thinking ?? (role === "reflect" ? "medium" : "low")),
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
  const result: number[][] = new Array(items.length);
  const missing: number[] = [];
  items.forEach((item, index) => {
    const key = normalise(item.text);
    const hit = kind === "query" ? queryCache.get(key) : undefined;
    if (hit && hit.until > Date.now()) {
      queryCache.delete(key); queryCache.set(key, hit);
      result[index] = [...hit.vector];
    } else { queryCache.delete(key); missing.push(index); }
  });
  const keys = [...new Set(e.GEMINI_API_KEYS)];
  await refreshUsage(keys.map(key => `${fingerprint(key)}:${e.GEMINI_EMBED_MODEL}`));
  for (let start = 0; start < missing.length; start += 100) {
    const batch = missing.slice(start, start + 100);
    const values = batch.map(index => {
      const i = items[index];
      return kind === "query" ? `task: search result | query: ${i.text}` : `title: ${i.title ?? "none"} | text: ${i.text}`;
    });
    let vectors: number[][] | undefined;
    for (const apiKey of keys) {
      const pair = {keyFp: fingerprint(apiKey), modelId: e.GEMINI_EMBED_MODEL};
      if (!live(`${pair.keyFp}:${pair.modelId}`)) continue;
      for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { embeddings } = await embedMany({
          model: createGoogleGenerativeAI({apiKey}).embedding(e.GEMINI_EMBED_MODEL), values,
          providerOptions: { google: { outputDimensionality: e.EMBED_DIM } },
          maxRetries: 0, abortSignal: AbortSignal.timeout(8_000),
        });
        if (embeddings.length !== batch.length || embeddings.some(v => v.length !== 768 || v.some(n => !Number.isFinite(n)))) throw new Error("Invalid embedding dimensions");
        vectors = embeddings; await record(pair, "ok"); break;
      } catch (err) {
        await record(pair, classifyError(err));
        if (attempt === 0 && transient(err)) await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
        else break;
      }
      }
      if (vectors) break;
    }
    if (!vectors) throw new Error("Embedding request failed (no live candidates succeeded)");
    batch.forEach((index, j) => {
      result[index] = [...vectors[j]];
      if (kind === "query") {
        const key = normalise(items[index].text);
        queryCache.delete(key);
        queryCache.set(key, {vector: [...vectors[j]], until: Date.now() + 600_000});
        // Bound memory as well as age; query text is never persisted by this cache.
        if (queryCache.size > 256) queryCache.delete(queryCache.keys().next().value!);
      }
    });
  }
  return result;
}
const queryCache = new Map<string, {vector: number[]; until: number}>();
const normalise = (text: string) => text.trim().replace(/\s+/g, " ").toLowerCase();
