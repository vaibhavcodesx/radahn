import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const eng = vi.hoisted(() => ({
  preScan: vi.fn((t: string) => ({ redacted: t })),
  recall: vi.fn(async () => ({ picks: [{ type: "decision", statement: "Uses Better Auth", ageDays: 1.2, scores: { final: 0.912 } }] })),
  listMemories: vi.fn(async () => []),
  rememberExplicit: vi.fn(async () => ({ op: "add", statement: "Saved" })),
  forgetMemory: vi.fn(async () => ({ status: "forgotten" })),
}));
vi.mock("@/server/memory", () => ({ engine: async () => eng }));

const { handleRpc } = await import("./server");
const key = { ownerId: "owner-1", spaceKeys: ["aaaaaaaaaaaaaaaaaaaaaaaa", "global"], name: "Claude Code" };
const call = (name: string, args: unknown) => handleRpc(key, { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args as Record<string, unknown> } });

describe("MCP handleRpc", () => {
  beforeEach(() => vi.clearAllMocks());

  it("initializes and lists the four memory tools", async () => {
    const init = await handleRpc(key, { jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-03-26" } });
    expect((init!.result as { protocolVersion: string }).protocolVersion).toBe("2025-03-26");
    const list = await handleRpc(key, { jsonrpc: "2.0", id: 1, method: "tools/list" });
    expect((list!.result as { tools: Array<{ name: string }> }).tools.map((t) => t.name)).toEqual(["memory_search", "memory_list", "memory_save", "memory_forget"]);
  });

  it("returns null for notifications", async () => {
    expect(await handleRpc(key, { jsonrpc: "2.0", method: "notifications/initialized" })).toBeNull();
  });

  it("takes owner, scopes and actor from the verified key, never from arguments", async () => {
    await call("memory_save", { statement: "Decided to use Better Auth", type: "decision", ownerId: "attacker", allowedSpaceKeys: ["global"] });
    expect(eng.rememberExplicit).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: "owner-1",
        allowedSpaceKeys: key.spaceKeys,
        spaceKey: "aaaaaaaaaaaaaaaaaaaaaaaa",
        source: { kind: "agent_api", actor: { kind: "external_agent", name: "Claude Code" } },
      }),
    );
    await call("memory_search", { query: "auth" });
    expect(eng.recall).toHaveBeenCalledWith(expect.objectContaining({ ownerId: "owner-1", allowedSpaceKeys: key.spaceKeys, persistTrace: false }));
  });

  it("reports bad arguments as a tool error, not a crash", async () => {
    const r = await call("memory_save", { statement: "x", type: "nope" });
    expect((r!.result as { isError?: boolean }).isError).toBe(true);
  });

  it("maps a space denial to a readable error", async () => {
    eng.forgetMemory.mockRejectedValueOnce(Object.assign(new Error("denied"), { code: "SPACE_ACCESS_DENIED" }));
    const r = await call("memory_forget", { query: "auth" });
    expect(JSON.stringify(r)).toContain("can't access that space");
  });
});
