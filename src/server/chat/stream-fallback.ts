import "server-only";
import type { TextStreamPart, ToolSet } from "ai";
import { classifyError, markSlow, report, type ModelCandidate } from "@/server/llm/registry";

/**
 * Hedged streaming start (TRD §9). Free-tier Gemini models sometimes accept a request and then
 * send nothing for 20+ s (observed 05:10 and 05:30 IST on 3.8 and 3.6 Flash), and quota errors
 * arrive as an `error` part before any token. So:
 *  - start the best candidate; if it has produced no meaningful part after `hedgeMs`, also start
 *    the next candidate (preferring a different model) — whichever streams first wins;
 *  - an attempt that errors starts the next candidate immediately;
 *  - losers are aborted; a model that loses by silence is marked slow for a while.
 * The winner's stream is re-exposed with its buffered parts replayed (AI SDK v7 allows one
 * consumer per result, so we consume `result.stream` here and never read it twice).
 */
const FIRST_MEANINGFUL = new Set(["text-delta", "tool-call", "reasoning-delta", "finish-step", "finish"]);

export interface StartedStream<TOOLS extends ToolSet> {
  stream: ReadableStream<TextStreamPart<TOOLS>>;
  candidate: ModelCandidate;
}

interface Attempt<TOOLS extends ToolSet> {
  candidate: ModelCandidate;
  abort: AbortController;
  it: AsyncIterator<TextStreamPart<TOOLS>>;
  buffered: TextStreamPart<TOOLS>[];
  done: boolean;
  settled: boolean;
}

export async function startWithFallback<TOOLS extends ToolSet>(
  candidates: ModelCandidate[],
  start: (c: ModelCandidate, signal: AbortSignal) => { stream: AsyncIterable<TextStreamPart<TOOLS>> },
  opts: { hedgeMs?: number; totalMs?: number; firstTokenMs?: number } = {},
): Promise<StartedStream<TOOLS>> {
  const hedgeMs = opts.hedgeMs ?? opts.firstTokenMs ?? 3500;
  const totalMs = opts.totalMs ?? Math.max(hedgeMs * 3, 20_000);
  // Prefer trying a *different model* next: a hung model usually hangs on every key.
  const queue = orderForHedging(candidates);
  const attempts: Attempt<TOOLS>[] = [];
  let lastError: unknown = new Error("No chat model is available right now.");

  return new Promise<StartedStream<TOOLS>>((resolve, reject) => {
    let finished = false;
    let hedgeTimer: ReturnType<typeof setTimeout> | undefined;
    const totalTimer = setTimeout(() => fail(new Error("timeout: no model produced tokens")), totalMs);

    const fail = (e: unknown) => {
      if (finished) return;
      finished = true;
      clearTimeout(hedgeTimer);
      clearTimeout(totalTimer);
      for (const a of attempts) {
        if (!a.settled) {
          markSlow(a.candidate.modelId);
          a.abort.abort();
        }
      }
      reject(e);
    };

    const win = (a: Attempt<TOOLS>) => {
      finished = true;
      clearTimeout(hedgeTimer);
      clearTimeout(totalTimer);
      for (const other of attempts) {
        if (other !== a && !other.settled) {
          // Lost by silence: skip this model for a while on this instance.
          markSlow(other.candidate.modelId);
          other.abort.abort();
          void other.it.return?.();
        }
      }
      void report(a.candidate, "ok");
      resolve({ stream: replay(a), candidate: a.candidate });
    };

    const launchNext = () => {
      if (finished) return;
      const candidate = queue.shift();
      if (!candidate) {
        if (attempts.every((a) => a.settled)) fail(lastError);
        return;
      }
      const abort = new AbortController();
      const result = start(candidate, abort.signal);
      const a: Attempt<TOOLS> = { candidate, abort, it: result.stream[Symbol.asyncIterator](), buffered: [], done: false, settled: false };
      attempts.push(a);
      void pump(a);
      clearTimeout(hedgeTimer);
      hedgeTimer = setTimeout(launchNext, hedgeMs);
    };

    const pump = async (a: Attempt<TOOLS>) => {
      try {
        for (;;) {
          const next = await a.it.next();
          if (finished) return;
          if (next.done) {
            a.done = true;
            a.settled = true;
            return win(a);
          }
          const part = next.value;
          if (part.type === "error") throw part.error;
          a.buffered.push(part);
          if (FIRST_MEANINGFUL.has(part.type)) {
            a.settled = true;
            return win(a);
          }
        }
      } catch (e) {
        a.settled = true;
        if (finished) return;
        lastError = e;
        void report(a.candidate, classifyError(e));
        void a.it.return?.();
        launchNext(); // a fast failure moves on immediately
        if (queue.length === 0 && attempts.every((x) => x.settled)) fail(lastError);
      }
    };

    launchNext();
  });
}

function orderForHedging(list: ModelCandidate[]): ModelCandidate[] {
  // Interleave by model: [m1k1, m2k1, m3k1, m1k2, m2k2, ...] keeps the preferred model first
  // while making the hedge (second launch) a different model.
  const byModel = new Map<string, ModelCandidate[]>();
  for (const c of list) byModel.set(c.modelId, [...(byModel.get(c.modelId) ?? []), c]);
  const groups = [...byModel.values()];
  const out: ModelCandidate[] = [];
  for (let i = 0; groups.some((g) => g[i]); i++) for (const g of groups) if (g[i]) out.push(g[i]);
  return out;
}

function replay<TOOLS extends ToolSet>(a: Attempt<TOOLS>): ReadableStream<TextStreamPart<TOOLS>> {
  return new ReadableStream<TextStreamPart<TOOLS>>({
    start(controller) {
      for (const p of a.buffered) controller.enqueue(p);
      if (a.done) controller.close();
    },
    async pull(controller) {
      if (a.done) return;
      try {
        const next = await a.it.next();
        if (next.done) {
          a.done = true;
          controller.close();
        } else controller.enqueue(next.value);
      } catch (e) {
        controller.error(e);
      }
    },
    cancel() {
      a.abort.abort();
      void a.it.return?.();
    },
  });
}
