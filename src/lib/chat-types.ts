/**
 * Chat stream protocol — CONTRACT (TRD §7). Client-safe (no server imports).
 * Custom data parts ride on the AI SDK UI message stream; citations stay inline as [[m3]].
 */
import type { UIMessage } from "ai";
import type { MemoryTypeName } from "./memory-types";

export interface RecallPickWire {
  ref: string;
  memoryId: string;
  type: MemoryTypeName;
  statement: string;
  final: number;
  scores: {
    vector?: number;
    rrf: number;
    recency: number;
    importance: number;
    confidence: number;
    typeBoost: number;
    final: number;
  };
  reasons: string[];
  why: string;
  ageDays: number;
  confirmCount: number;
}

export type RadahnDataParts = {
  /** Before the first token: status running → done (same part id). */
  recall: {
    status: "running" | "done" | "error";
    recallId?: string;
    intent?: "plan" | "recall" | "general";
    channels?: string[];
    picks?: RecallPickWire[];
    core?: Array<{ id: string; type: MemoryTypeName; statement: string }>;
    strategies?: Array<{ id: string; statement: string }>;
    notices?: string[];
    latencyMs?: number;
    candidateCount?: number;
  };
  /** A supersede / ambiguity notice that applies to this turn. */
  notice: { kind: "changed" | "ambiguous"; text: string };
  /** Explicit memory tool ran (remember / correct / forget). */
  "memory-op": {
    op: "remember" | "correct" | "forget" | "recall";
    status: "done" | "blocked" | "not_found" | "ambiguous" | "pending";
    memoryId?: string;
    type?: MemoryTypeName;
    statement?: string;
    before?: string;
    after?: string;
  };
  /** Pre-scan found secrets — kinds only, never values. */
  redaction: { kinds: string[] };
  /** Which model actually served the reply. */
  model: { id: string; label: string; fallback: boolean };
  /** Ids the client needs to link this turn to stored docs. */
  turn: { conversationId: string; userMessageId: string; assistantMessageId: string };
};

export type RadahnUIMessage = UIMessage<{ createdAt?: string }, RadahnDataParts>;

/** Write summary delivered over SSE after after() finishes (not on the chat stream). */
export interface WritesEvent {
  messageId: string;
  added: number;
  confirmed: number;
  superseded: number;
  pending: number;
  blocked: number;
  ops: Array<{ op: string; memoryId?: string; type?: MemoryTypeName; statement?: string; reason?: string }>;
}
