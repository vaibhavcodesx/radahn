import "server-only";
import { tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import type { RadahnUIMessage } from "@/lib/chat-types";
import type { MemoryEngine } from "@/server/memory";
import { MEMORY_TYPES, type RecallResult, type SpaceKey } from "@/server/memory/types";

/**
 * Memory tools for the chat model (memory-engine.md §6.3). The model calls these only for
 * explicit requests ("remember that…", "forget…", "that's wrong, it's…"). Each run also emits a
 * `data-memory-op` part so the UI renders a tool chip with the real outcome.
 */
export function memoryTools(ctx: {
  engine: MemoryEngine;
  ownerId: string;
  spaceKey: SpaceKey;
  conversationId: string;
  messageId: string;
  refs: Record<string, string>;
  writer: UIMessageStreamWriter<RadahnUIMessage>;
}) {
  const { engine, ownerId, spaceKey, writer } = ctx;
  const actor = { kind: "user" as const, name: "you" };

  return {
    remember: tool({
      description:
        "Save something the user explicitly asked you to remember. One self-contained third-person statement with absolute dates.",
      inputSchema: z.object({
        statement: z.string().min(3).max(240),
        type: z.enum(MEMORY_TYPES),
        scope: z.enum(["global", "space"]).optional().describe("global = true in every space"),
        expiresAt: z.string().optional().describe("ISO time when this stops being true, if temporary"),
        importance: z.number().int().min(1).max(10).optional(),
      }),
      execute: async (input) => {
        const r = await engine.rememberExplicit({
          ownerId,
          spaceKey,
          ...input,
          source: { kind: "tool", conversationId: ctx.conversationId, messageId: ctx.messageId, actor },
        });
        writer.write({
          type: "data-memory-op",
          data: {
            op: "remember",
            status: r.op === "blocked" ? "blocked" : r.op === "pending" ? "pending" : "done",
            memoryId: r.memoryId,
            type: r.type,
            statement: r.op === "blocked" ? undefined : r.statement,
          },
        });
        return r.op === "blocked"
          ? { saved: false, reason: "That looked like a secret or unsafe text, so it was not stored." }
          : { saved: true, status: r.op, statement: r.statement };
      },
    }),

    recall_memory: tool({
      description: "Search long-term memory for something specific, e.g. 'what do you know about my internships?'.",
      inputSchema: z.object({
        query: z.string().min(2),
        types: z.array(z.enum(MEMORY_TYPES)).optional(),
      }),
      execute: async ({ query, types }) => {
        const r: RecallResult = await engine.recall({ ownerId, spaceKey, query, types, limit: 8, persistTrace: false });
        writer.write({ type: "data-memory-op", data: { op: "recall", status: "done", statement: `${r.picks.length} found for “${query.slice(0, 60)}”` } });
        return r.picks.map((p) => ({ type: p.type, statement: p.statement, ageDays: Math.round(p.ageDays) }));
      },
    }),

    correct_memory: tool({
      description:
        "Correct a stored memory when the user says it is wrong or changed. Use targetRef (e.g. 'm2') when the memory is in 'Relevant memories', else a short query.",
      inputSchema: z.object({
        targetRef: z.string().optional(),
        query: z.string().optional(),
        newStatement: z.string().min(3).max(240),
      }),
      execute: async ({ targetRef, query, newStatement }) => {
        const r = await engine.correctMemory({ ownerId, spaceKey, targetRef, refs: ctx.refs, query, newStatement, actor });
        writer.write({
          type: "data-memory-op",
          data: {
            op: "correct",
            status: r.status === "updated" ? "done" : r.status === "blocked" ? "blocked" : r.status,
            memoryId: r.after?.id,
            type: r.after?.type,
            before: r.before?.statement,
            after: r.after?.statement,
          },
        });
        if (r.status === "ambiguous") return { updated: false, ask: "Which one?", candidates: r.candidates?.map((c) => c.statement) };
        if (r.status === "not_found") return { updated: false, reason: "No matching memory." };
        return { updated: r.status === "updated", before: r.before?.statement, after: r.after?.statement, previouslySetAt: r.before?.createdAt };
      },
    }),

    forget_memory: tool({
      description: "Permanently forget a memory the user asked you to forget. Never use for implicit cleanup.",
      inputSchema: z.object({
        targetRef: z.string().optional(),
        query: z.string().optional(),
      }),
      execute: async ({ targetRef, query }) => {
        const r = await engine.forgetMemory({ ownerId, spaceKey, targetRef, refs: ctx.refs, query, actor });
        writer.write({
          type: "data-memory-op",
          data: { op: "forget", status: r.status === "forgotten" ? "done" : r.status, memoryId: r.forgotten?.id, type: r.forgotten?.type },
        });
        if (r.status === "ambiguous") return { forgotten: false, ask: "Which one?", candidates: r.candidates?.map((c) => c.statement) };
        return { forgotten: r.status === "forgotten" };
      },
    }),
  };
}
