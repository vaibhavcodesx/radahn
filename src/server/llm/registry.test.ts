import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  find: vi.fn(), updateOne: vi.fn(), embedMany: vi.fn(), generateText: vi.fn(), keys: ["test-key-one", "test-key-two"],
}));
vi.mock("@/server/env", () => ({ env: () => ({ GEMINI_API_KEYS: mocks.keys, GEMINI_EMBED_MODEL: "gemini-embedding-2", EMBED_DIM: 768 }) }));
vi.mock("@/server/db/collections", () => ({ collections: () => ({ llmUsage: mocks }) }));
vi.mock("@ai-sdk/google", () => ({ createGoogleGenerativeAI: ({ apiKey }: {apiKey: string}) => Object.assign((modelId: string) => ({ modelId, apiKey }), { embedding: (modelId: string) => ({ modelId, apiKey }) }) }));
vi.mock("ai", () => ({ embedMany: mocks.embedMany, generateText: mocks.generateText, Output: { object: (s: unknown) => s } }));
const fp = (key: string) => createHash("sha256").update(key).digest("hex").slice(0, 6);
let registry: typeof import("./registry");
beforeEach(async () => {
  vi.resetModules(); vi.clearAllMocks(); vi.useFakeTimers();
  mocks.keys = ["test-key-one", "test-key-two"];
  vi.setSystemTime(new Date("2026-10-31T12:00:00Z"));
  mocks.find.mockReturnValue({ toArray: async () => [] });
  mocks.updateOne.mockResolvedValue({});
  mocks.embedMany.mockImplementation(async ({ values }: {values: string[]}) => ({ embeddings: values.map(() => Array(768).fill(0.1)) }));
  registry = await import("./registry");
});
afterEach(() => vi.useRealTimers());
describe("quota-aware routing", () => {
  it("uses fingerprints and rotates keys without changing model preference", async () => {
    const a = await registry.candidates("chat"); const b = await registry.candidates("chat");
    expect(a[0].keyFp).toBe(fp("test-key-one"));
    expect(b[0].keyFp).toBe(fp("test-key-two"));
    expect(b[0].modelId).toBe("gemini-3.8-flash");
  });
  it("skips persisted exhausted pairs and caches the database read", async () => {
    mocks.find.mockReturnValue({ toArray: async () => [{ _id: `${fp("test-key-one")}:gemini-3.8-flash`, exhaustedUntil: new Date("2026-11-01T07:00:00Z") }] });
    expect((await registry.candidates("chat"))[0].keyFp).toBe(fp("test-key-two"));
    await registry.candidates("chat"); expect(mocks.find).toHaveBeenCalledTimes(1);
  });
  it("loads quota for a newly used role even inside the cache window", async () => {
    await registry.candidates("chat");
    mocks.find.mockReturnValue({ toArray: async () => [{_id: `${fp("test-key-one")}:gemini-3.1-flash-lite`, exhaustedUntil: new Date("2026-11-01T07:00:00Z")}] });
    const result = await registry.candidates("fast");
    expect(result.some(c => c.keyFp === fp("test-key-one") && c.modelId === "gemini-3.1-flash-lite")).toBe(false);
  });
  it("loads all disjoint model pairs under three concurrent callers", async () => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => {release = resolve;});
    mocks.find.mockImplementation(({_id}: {_id: {$in: string[]}}) => ({toArray: async () => {
      await gate;
      return _id.$in.map(id => ({_id:id, exhaustedUntil:new Date("2026-11-01T07:00:00Z")}));
    }}));
    const chat = registry.candidates("chat");
    const fast = registry.candidates("fast");
    const embedding = registry.embed([{text:"plan"}], "query");
    const rejected = expect(embedding).rejects.toThrow(/^Embedding request failed/);
    release();
    expect(await chat).toEqual([]); expect(await fast).toEqual([]); await rejected;
    expect(mocks.embedMany).not.toHaveBeenCalled();
  });
  it("respects cooldown and restores the pair after 60 seconds", async () => {
    const [c] = await registry.candidates("fast"); await registry.report(c, "rate_limited");
    expect((await registry.candidates("fast")).some(x => x.keyFp === c.keyFp && x.modelId === c.modelId)).toBe(false);
    await vi.advanceTimersByTimeAsync(60_001);
    expect((await registry.candidates("fast")).some(x => x.keyFp === c.keyFp && x.modelId === c.modelId)).toBe(true);
  });
  it("persists daily exhaustion until Pacific midnight across DST", async () => {
    vi.setSystemTime(new Date("2026-11-01T08:30:00Z"));
    const [c] = await registry.candidates("fast"); await registry.report(c, "quota_exhausted");
    expect(mocks.updateOne.mock.calls[0][1].$set.exhaustedUntil).toEqual(new Date("2026-11-02T08:00:00Z"));
  });
  it("retries a transient failure once then falls through", async () => {
    const fn = vi.fn().mockRejectedValueOnce({ statusCode: 503 }).mockRejectedValueOnce({ statusCode: 503 }).mockResolvedValue("ok");
    const pending = registry.withFallback("fast", fn); await vi.runAllTimersAsync();
    expect((await pending).result).toBe("ok"); expect(fn).toHaveBeenCalledTimes(3);
  });
  it("does not leak provider errors or keys", async () => {
    const pending = registry.withFallback("fast", async () => { throw new Error("invalid test-key-one test-key-two"); });
    await expect(pending).rejects.toThrow(/^LLM request failed/);
  });
  it("classifies daily quota only on resource exhaustion", () => {
    expect(registry.classifyError({statusCode: 400, message: "daily is invalid"})).toBe("error");
    expect(registry.classifyError({statusCode: 429, message: "Quota exceeded: GenerateRequestsPerDay"})).toBe("quota_exhausted");
  });
});
describe("embedding batches", () => {
  it("adds asymmetric prefixes and caches normalized queries", async () => {
    await registry.embed([{text: "  Plan   today "}], "query");
    await registry.embed([{text: "plan today"}], "query");
    expect(mocks.embedMany).toHaveBeenCalledTimes(1);
    expect(mocks.embedMany.mock.calls[0][0].values).toEqual(["task: search result | query:   Plan   today "]);
    await registry.embed([{text: "likes tea", title: "preference"}], "document");
    expect(mocks.embedMany.mock.calls[1][0].values).toEqual(["title: preference | text: likes tea"]);
  });
  it("expires query cache after ten minutes", async () => {
    await registry.embed([{text:"plan"}], "query"); await vi.advanceTimersByTimeAsync(600_001);
    await registry.embed([{text:"plan"}], "query"); expect(mocks.embedMany).toHaveBeenCalledTimes(2);
  });
  it("splits 201 documents into batches no larger than 100", async () => {
    const result = await registry.embed(Array.from({length:201}, (_, i) => ({text:`document ${i}`})), "document");
    expect(result).toHaveLength(201); expect(mocks.embedMany.mock.calls.map(c => c[0].values.length)).toEqual([100,100,1]);
  });
  it("retries a transient embedding failure before abandoning its key", async () => {
    mocks.embedMany.mockRejectedValueOnce({statusCode: 503});
    const pending = registry.embed([{text:"plan"}], "query");
    await vi.runAllTimersAsync(); await pending;
    expect(mocks.embedMany.mock.calls[1][0].model.apiKey).toBe("test-key-one");
  });
  it("falls through keys on embedding errors and hides provider errors", async () => {
    mocks.embedMany.mockRejectedValue(new Error("test-key-one"));
    await expect(registry.embed([{text:"plan"}], "query")).rejects.toThrow(/^Embedding request failed/);
  });
  it("rejects invalid dimensions rather than poisoning the vector index", async () => {
    mocks.embedMany.mockResolvedValue({embeddings:[[1,2]]});
    await expect(registry.embed([{text:"plan"}], "query")).rejects.toThrow(/^Embedding request failed/);
  });
});

 describe("structured inference deadline", () => {
  it("shares one extraction budget across fallback candidates", async () => {
    const signals: AbortSignal[] = [];
    mocks.generateText.mockImplementation(async ({abortSignal}) => {
      signals.push(abortSignal);
      vi.setSystemTime(Date.now() + 4_000);
      throw {statusCode:429};
    });
    const {z}=await import("zod");
    await expect(registry.generateStructured("fast", {prompt:"extract",schema:z.object({}),totalTimeoutMs:8_000})).rejects.toThrow(/^LLM request failed/);
    expect(signals).toHaveLength(2);
    expect(signals[0]).toBe(signals[1]);
  });
 });

it("bounds quota candidate discovery by the inference deadline",async()=>{
 mocks.find.mockReturnValue({toArray:()=>new Promise(()=>{})});
 const {z}=await import("zod");
 const pending=registry.generateStructured("fast",{prompt:"extract",schema:z.object({}),totalTimeoutMs:8_000});
 const rejected=expect(pending).rejects.toThrow(/deadline/);
 await vi.advanceTimersByTimeAsync(8_000);await rejected;
 expect(mocks.generateText).not.toHaveBeenCalled();
});
it("bounds quota outcome persistence by the inference deadline",async()=>{
 mocks.generateText.mockResolvedValue({output:{}});
 mocks.updateOne.mockImplementation(()=>new Promise(()=>{}));
 const {z}=await import("zod");
 const pending=registry.generateStructured("fast",{prompt:"extract",schema:z.object({}),totalTimeoutMs:8_000});
 const rejected=expect(pending).rejects.toThrow(/deadline/);
 await vi.advanceTimersByTimeAsync(8_000);await rejected;
});

describe("chat model catalog and preference", () => {
  it("marks catalog entries unavailable without configured Gemini keys", () => {
    mocks.keys = [];
    expect(registry.chatModelOptions().every(option => !option.available)).toBe(true);
  });
  it("lists Gemini chat models and a typed unavailable Groq provider", () => {
    expect(registry.chatModelOptions()).toEqual(registry.MODEL_CHAINS.chat.map(id => ({
      id, label: registry.modelLabel(id), provider: "gemini", available: true,
    })));
    expect(registry.GROQ_PROVIDER).toEqual({ provider: "groq", available: false });
  });
  it("honors an explicit live preference even when the model was slow", async () => {
    registry.markSlow("gemini-3.8-flash");
    const selected = await registry.candidates("chat", "gemini-3.8-flash");
    expect(selected[0].modelId).toBe("gemini-3.8-flash");
    expect(selected[0].fallback).toBe(false);
    expect((await registry.candidates("chat"))[0].modelId).toBe("gemini-3.6-flash");
  });
  it("silently uses another model when every selected-model key is exhausted", async () => {
    mocks.find.mockReturnValue({ toArray: async () => ["test-key-one", "test-key-two"].map(key => ({
      _id: `${fp(key)}:gemini-3.8-flash`, exhaustedUntil: new Date("2026-11-01T07:00:00Z"),
    })) });
    const result = await registry.withFallback("chat", async () => "answer", { preferred: "gemini-3.8-flash" });
    expect(result.result).toBe("answer");
    expect(result.servedBy).toMatchObject({ modelId: "gemini-3.6-flash", fallback: true });
  });
});
