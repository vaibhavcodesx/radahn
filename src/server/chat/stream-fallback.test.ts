import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/llm/registry", () => ({
  classifyError: () => "rate_limited",
  markSlow: vi.fn(),
  report: vi.fn(async () => {}),
}));

const { startWithFallback } = await import("./stream-fallback");
type Part = { type: string; text?: string; error?: unknown };

const cand = (modelId: string) => ({ model: {} as never, modelId, keyFp: "k", label: modelId, fallback: false });

async function* parts(list: Part[], hangAfter = false) {
  for (const p of list) yield p;
  if (hangAfter) await new Promise(() => {}); // never resolves
}

async function drain(stream: ReadableStream<Part>) {
  const out: string[] = [];
  const r = stream.getReader();
  for (;;) {
    const { value, done } = await r.read();
    if (done) return out;
    out.push(value.type);
  }
}

describe("startWithFallback", () => {
  it("hedges: a silent model loses to the next one that streams", async () => {
    const started = await startWithFallback(
      [cand("hung"), cand("ok")] as never,
      ((c: { modelId: string }) => ({
        stream: c.modelId === "hung" ? parts([{ type: "start" }], true) : parts([{ type: "start" }, { type: "text-delta", text: "hi" }, { type: "finish" }]),
      })) as never,
      { hedgeMs: 50 },
    );
    expect(started.candidate.modelId).toBe("ok");
    expect(await drain(started.stream as never)).toEqual(["start", "text-delta", "finish"]);
  });

  it("falls through on an error part (quota) and replays buffered parts", async () => {
    const started = await startWithFallback(
      [cand("limited"), cand("ok")] as never,
      ((c: { modelId: string }) => ({
        stream: c.modelId === "limited" ? parts([{ type: "start" }, { type: "error", error: new Error("429") }]) : parts([{ type: "start" }, { type: "text-delta" }]),
      })) as never,
      { hedgeMs: 1000 },
    );
    expect(started.candidate.modelId).toBe("ok");
    expect(await drain(started.stream as never)).toEqual(["start", "text-delta"]);
  });

  it("throws when every candidate fails", async () => {
    await expect(
      startWithFallback([cand("a")] as never, (() => ({ stream: parts([{ type: "error", error: new Error("x") }]) })) as never),
    ).rejects.toThrow("x");
  });
});

describe("hedging order", () => {
  it("tries a different model second, keeping the preferred model first", async () => {
    const seen: string[] = [];
    const c = (m: string, k: string) => ({ model: {} as never, modelId: m, keyFp: k, label: m, fallback: false });
    await startWithFallback(
      [c("a", "1"), c("a", "2"), c("b", "1")] as never,
      ((x: { modelId: string; keyFp: string }) => {
        seen.push(`${x.modelId}${x.keyFp}`);
        return { stream: parts([{ type: "error", error: new Error("429") }]) };
      }) as never,
      { hedgeMs: 1000 },
    ).catch(() => {});
    expect(seen).toEqual(["a1", "b1", "a2"]);
  });
});
