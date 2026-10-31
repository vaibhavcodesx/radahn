import "server-only";
import { z } from "zod";
import { engine } from "@/server/memory";
import type { VerifiedAgentKey } from "@/server/memory/agentKeys";
import { MEMORY_TYPES, type SpaceKey } from "@/server/memory/types";

/**
 * Radahn as an MCP server (PRD F-41, memory-engine.md §8): stateless Streamable HTTP, JSON-RPC
 * responses only (no SSE, no sessions). Every call runs as the VERIFIED key — owner, allowed
 * spaces and agent name come from the key, never from tool arguments — and passes the allowlist
 * to the engine as `allowedSpaceKeys`. Only search/list/save/forget are exposed; owner-only views
 * (raw docs, traces, history, admin) are not reachable through a scoped key.
 */
export const MCP_PROTOCOL = "2025-06-18";

type Json = Record<string, unknown>;
export interface Rpc {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Json;
}

const TOOLS = [
  {
    name: "memory_search",
    description:
      "Search the user's Radahn memory. Returns the most relevant memories with type and age. Use before answering questions about the user's preferences, decisions, projects or past events.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What to look for, in plain words" },
        limit: { type: "integer", minimum: 1, maximum: 12 },
      },
      required: ["query"],
    },
  },
  {
    name: "memory_list",
    description: "List the most recently updated memories this key can see.",
    inputSchema: { type: "object", properties: { limit: { type: "integer", minimum: 1, maximum: 50 } } },
  },
  {
    name: "memory_save",
    description:
      "Save one durable fact, decision, preference, goal or outcome to the user's memory. Write one self-contained third-person statement with absolute dates. The user sees it live, attributed to this agent; sensitive items wait for their approval.",
    inputSchema: {
      type: "object",
      properties: {
        statement: { type: "string", minLength: 3, maxLength: 240 },
        type: { type: "string", enum: [...MEMORY_TYPES] },
        importance: { type: "integer", minimum: 1, maximum: 10 },
      },
      required: ["statement", "type"],
    },
  },
  {
    name: "memory_forget",
    description: "Forget a memory the user explicitly asked to forget, found by a short description.",
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  },
];

const Search = z.object({ query: z.string().trim().min(2).max(500), limit: z.number().int().min(1).max(12).optional() });
const List = z.object({ limit: z.number().int().min(1).max(50).optional() });
const Save = z.object({
  statement: z.string().trim().min(3).max(240),
  type: z.enum(MEMORY_TYPES),
  importance: z.number().int().min(1).max(10).optional(),
});
const Forget = z.object({ query: z.string().trim().min(2).max(200) });

/** The key's working space: its first project space, else global. */
function homeSpace(key: VerifiedAgentKey): SpaceKey {
  return key.spaceKeys.find((s) => s !== "global") ?? "global";
}

const text = (value: unknown, isError = false) => ({
  content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 1) }],
  ...(isError ? { isError: true } : {}),
});

async function callTool(key: VerifiedAgentKey, name: string, args: unknown) {
  const eng = await engine();
  const base = { ownerId: key.ownerId, allowedSpaceKeys: key.spaceKeys };
  const actor = { kind: "external_agent" as const, name: key.name };
  switch (name) {
    case "memory_search": {
      const { query, limit } = Search.parse(args ?? {});
      const r = await eng.recall({ ...base, spaceKey: homeSpace(key), query: eng.preScan(query).redacted, limit: limit ?? 8, persistTrace: false });
      return text(r.picks.map((p) => ({ type: p.type, statement: p.statement, ageDays: Math.round(p.ageDays), score: Number(p.scores.final.toFixed(2)) })));
    }
    case "memory_list": {
      const { limit } = List.parse(args ?? {});
      const list = await eng.listMemories({ ...base, spaceKey: "all", limit: limit ?? 20 });
      return text(list.map((m) => ({ type: m.type, statement: m.statement, updatedAt: m.updatedAt })));
    }
    case "memory_save": {
      const body = Save.parse(args ?? {});
      const space = homeSpace(key);
      const r = await eng.rememberExplicit({ ...base, spaceKey: space, scope: space === "global" ? "global" : "space", ...body, source: { kind: "agent_api", actor } });
      if (r.op === "blocked") return text("Not saved: that looked like a secret or unsafe text.", true);
      return text({ saved: true, status: r.op, statement: r.statement });
    }
    case "memory_forget": {
      const { query } = Forget.parse(args ?? {});
      const r = await eng.forgetMemory({ ...base, query, actor });
      if (r.status === "ambiguous") return text({ forgotten: false, ask: "Several memories match; be more specific.", candidates: r.candidates?.map((c) => c.statement) });
      return text({ forgotten: r.status === "forgotten" });
    }
    default:
      return null;
  }
}

/** Handle one JSON-RPC message; `null` means a notification (HTTP 202, no body). */
export async function handleRpc(key: VerifiedAgentKey, msg: Rpc): Promise<Json | null> {
  const reply = (result: unknown) => ({ jsonrpc: "2.0", id: msg.id ?? null, result });
  const fail = (code: number, message: string) => ({ jsonrpc: "2.0", id: msg.id ?? null, error: { code, message } });
  if (msg.id === undefined) return null;
  switch (msg.method) {
    case "initialize":
      return reply({
        protocolVersion: typeof msg.params?.protocolVersion === "string" ? msg.params.protocolVersion : MCP_PROTOCOL,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "radahn", title: "Radahn memory", version: "1.0.0" },
        instructions: "The user's long-term memory. Search it before answering personal questions; save only durable things the user would want kept.",
      });
    case "ping":
      return reply({});
    case "tools/list":
      return reply({ tools: TOOLS });
    case "tools/call": {
      const name = String(msg.params?.name ?? "");
      try {
        const result = await callTool(key, name, msg.params?.arguments);
        return result ? reply(result) : fail(-32602, `Unknown tool: ${name}`);
      } catch (e) {
        if (e instanceof z.ZodError) return reply(text(`Invalid arguments: ${e.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`, true));
        const code = (e as { code?: string })?.code;
        return reply(text(code === "SPACE_ACCESS_DENIED" ? "This key can't access that space." : "Memory is unavailable right now; try again.", true));
      }
    }
    default:
      return fail(-32601, `Method not found: ${msg.method}`);
  }
}
