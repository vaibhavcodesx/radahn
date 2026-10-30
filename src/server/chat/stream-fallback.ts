import "server-only";
import type { TextStreamPart, ToolSet } from "ai";
import { classifyError, markSlow, report, type ModelCandidate } from "@/server/llm/registry";

/**
 * Streaming model fallback (TRD §9). Gemini quota errors surface as an `error` part before any
 * token, so we read each candidate's stream until its first meaningful part. On error we try the
 * next (key, model); on success we hand back a stream that replays the buffered parts and then
 * continues — the user never sees a failed attempt.
 *
 * AI SDK v7 allows ONE consumer per result by default, so we consume `result.stream` here and
 * re-expose it rather than reading it twice.
 */
const FIRST_MEANINGFUL = new Set(["text-delta", "tool-call", "reasoning-delta", "finish-step", "finish"]);

export interface StartedStream<TOOLS extends ToolSet> {
  stream: ReadableStream<TextStreamPart<TOOLS>>;
  candidate: ModelCandidate;
}

const TIMEOUT = Symbol("first-token-timeout");

export async function startWithFallback<TOOLS extends ToolSet>(
  candidates: ModelCandidate[],
  start: (c: ModelCandidate, signal: AbortSignal) => { stream: AsyncIterable<TextStreamPart<TOOLS>> },
  opts: { firstTokenMs?: number } = {},
): Promise<StartedStream<TOOLS>> {
  let lastError: unknown = new Error("No chat model is available right now.");
  const hung = new Set<string>();
  for (const candidate of candidates) {
    if (hung.has(candidate.modelId)) continue;
    // A model can accept the request and then send nothing (no 429, no tokens). Give each
    // candidate a first-token deadline, then abort it and move on.
    const abort = new AbortController();
    const result = start(candidate, abort.signal);
    const it = result.stream[Symbol.asyncIterator]();
    const buffered: TextStreamPart<TOOLS>[] = [];
    let failed: unknown;
    let done = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<typeof TIMEOUT>((r) => (timer = setTimeout(() => r(TIMEOUT), opts.firstTokenMs ?? 9_000)));
    try {
      for (;;) {
        const next = await Promise.race([it.next(), deadline]);
        if (next === TIMEOUT) {
          failed = new Error(`timeout: ${candidate.modelId} sent no tokens`);
          markSlow(candidate.modelId);
          hung.add(candidate.modelId);
          abort.abort();
          break;
        }
        if (next.done) {
          done = true;
          break;
        }
        const part = next.value;
        if (part.type === "error") {
          failed = part.error;
          break;
        }
        buffered.push(part);
        if (FIRST_MEANINGFUL.has(part.type)) break;
      }
    } catch (e) {
      failed = e;
    } finally {
      clearTimeout(timer);
    }
    if (failed) {
      lastError = failed;
      if (!hung.has(candidate.modelId)) await report(candidate, classifyError(failed));
      void it.return?.();
      continue;
    }
    void report(candidate, "ok");
    const stream = new ReadableStream<TextStreamPart<TOOLS>>({
      start(controller) {
        for (const p of buffered) controller.enqueue(p);
        if (done) controller.close();
      },
      async pull(controller) {
        if (done) return;
        try {
          const next = await it.next();
          if (next.done) {
            done = true;
            controller.close();
          } else controller.enqueue(next.value);
        } catch (e) {
          controller.error(e);
        }
      },
      cancel() {
        void it.return?.();
      },
    });
    return { stream, candidate };
  }
  throw lastError;
}
