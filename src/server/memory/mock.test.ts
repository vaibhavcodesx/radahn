import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { mockEngine, detectIntent } = await import("./mock");
const { mockPreScan } = await import("./mock-gate");

const spaceIds = { hackathon: "aaaaaaaaaaaaaaaaaaaaaaaa", personal: "bbbbbbbbbbbbbbbbbbbbbbbb", internships: "cccccccccccccccccccccccc" };

describe("mock engine", () => {
  it("recall returns picks sorted by final score, each with a reason", async () => {
    await mockEngine.seedDemo({ ownerId: "u1", spaceIds, conversations: [] });
    const r = await mockEngine.recall({ ownerId: "u1", spaceKey: spaceIds.hackathon, query: "Plan my next 4 hours." });
    expect(r.intent).toBe("plan");
    expect(r.picks.length).toBeGreaterThan(0);
    const finals = r.picks.map((p) => p.final);
    expect([...finals].sort((a, b) => b - a)).toEqual(finals);
    for (const p of r.picks) expect(p.reasons.length).toBeGreaterThanOrEqual(1);
    // the 9 PM build deadline is the constraint a plan must respect
    expect(r.picks.some((p) => p.statement.includes("9:00 PM"))).toBe(true);
    // pinned units go to core, strategies to learned behaviours — never into picks
    expect(r.core.length).toBeGreaterThan(0);
    expect(r.strategies[0]?.type).toBe("strategy");
    expect(r.picks.some((p) => p.type === "strategy")).toBe(false);
  });

  it("never recalls superseded, pending, or expired units", async () => {
    const r = await mockEngine.recall({ ownerId: "u1", spaceKey: spaceIds.hackathon, query: "frontend framework vite atlas provisioning adhd" });
    const ids = new Set(r.picks.map((p) => p.statement));
    expect([...ids].some((s) => s.includes("Vite with React"))).toBe(false);
    expect([...ids].some((s) => s.includes("ADHD"))).toBe(false);
    expect([...ids].some((s) => s.includes("provisioning"))).toBe(false);
  });

  it("guest with no memories gets an empty, valid recall", async () => {
    const r = await mockEngine.recall({ ownerId: "fresh", spaceKey: "x", query: "hello" });
    expect(r.picks).toEqual([]);
    expect(r.core).toEqual([]);
  });

  it("buildContext exposes only refs it rendered", async () => {
    const r = await mockEngine.recall({ ownerId: "u1", spaceKey: spaceIds.hackathon, query: "deadline" });
    const ctx = mockEngine.buildContext({ userName: "Aarav", timeZone: "Asia/Kolkata", now: new Date(), spaceName: "UNCHARTED", recall: r });
    expect(Object.keys(ctx.refs)).toEqual(r.picks.map((p) => p.ref));
    expect(ctx.system).toContain("[[m2]]");
  });
});

describe("detectIntent", () => {
  it("classifies plan / recall / general", () => {
    expect(detectIntent("What should I do tonight?")).toBe("plan");
    expect(detectIntent("what did I decide about auth")).toBe("recall");
    expect(detectIntent("tell me a joke")).toBe("general");
  });
});

describe("mock pre-scan", () => {
  it("redacts a Google API key and reports only the kind", () => {
    const key = "AIza" + "x".repeat(35);
    const r = mockPreScan(`my key is ${key} ok`);
    expect(r.redacted).toBe("my key is [redacted:google_api_key] ok");
    expect(r.kinds).toEqual(["google_api_key"]);
    expect(r.redacted).not.toContain(key);
  });

  it("redacts mongodb URIs with credentials", () => {
    const r = mockPreScan("mongodb+srv://user:pa55@cluster0.x.mongodb.net/db");
    expect(r.kinds).toContain("mongodb_uri");
  });
});
