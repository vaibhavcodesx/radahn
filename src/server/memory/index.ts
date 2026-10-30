import "server-only";
import { env } from "@/server/env";
import type {
  BuildContextInput,
  BuiltContext,
  CorrectInput,
  CorrectResult,
  ExtractInput,
  ForgetInput,
  ForgetResult,
  GhostContextInput,
  GraphLink,
  GraphNode,
  Insights,
  ListMemoriesInput,
  MemoryDetail,
  MemoryDTO,
  MemoryEventDTO,
  PreScanResult,
  RecallInput,
  RecallResult,
  RecallTrace,
  ReflectInput,
  ReflectionRun,
  RememberInput,
  ReviewInput,
  SeedDemoInput,
  SeedResult,
  SpaceKey,
  UpdateMemoryInput,
  WriteOpResult,
  WriteSummary,
} from "./types";

/**
 * The memory engine facade — CONTRACT (build-plan.md §3.2).
 *
 * Routes, the chat turn, and the MCP endpoint call ONLY these functions. Two implementations:
 *   - `mock.ts`  (Claude): in-memory fixtures so UI work never waits on the engine.
 *   - `real.ts`  (Codex): MongoDB + Gemini, per docs/memory-engine.md.
 * Selected by MEMORY_ENGINE=mock|real. Keep this interface stable; changes go through a PR.
 *
 * Every function takes `ownerId` from the session (never from the client) and must scope
 * every query by it.
 */
export interface MemoryEngine {
  /** §4.1 — redact secrets before the LLM or DB sees the text. Pure and synchronous. */
  preScan(text: string): PreScanResult;

  /** §5 — hybrid recall + scoring + selection; persists a trace unless persistTrace=false. */
  recall(input: RecallInput): Promise<RecallResult>;

  /** §6.2 — system prompt for a memory-aware turn + ref→id map for citations. */
  buildContext(input: BuildContextInput): BuiltContext;

  /** §6.2 — system prompt for the ghost answer (no memory, no history, no tools). */
  ghostContext(input: GhostContextInput): string;

  /** §4.2–4.4 — runs after the reply (inside after()). Writes events with messageId. */
  extractAndWrite(input: ExtractInput): Promise<WriteSummary>;

  /** §6.3 tools + manual create. Explicit = consent for sensitive items. */
  rememberExplicit(input: RememberInput): Promise<WriteOpResult>;
  correctMemory(input: CorrectInput): Promise<CorrectResult>;
  forgetMemory(input: ForgetInput): Promise<ForgetResult>;
  reviewMemory(input: ReviewInput): Promise<MemoryDTO | null>;
  updateMemory(input: UpdateMemoryInput): Promise<MemoryDTO | null>;

  /** §7 — reflection run (manual / auto / cron). Steps are written as they progress. */
  runReflection(input: ReflectInput): Promise<ReflectionRun>;
  listReflections(ownerId: string, limit?: number): Promise<ReflectionRun[]>;

  /** Reads for the UI. */
  listMemories(input: ListMemoriesInput): Promise<MemoryDTO[]>;
  getMemory(ownerId: string, memoryId: string): Promise<MemoryDetail | null>;
  getRecallTrace(ownerId: string, messageId: string): Promise<RecallTrace | null>;
  listEvents(ownerId: string, opts?: { limit?: number; after?: string; messageId?: string }): Promise<MemoryEventDTO[]>;
  graph(ownerId: string, spaceKey?: SpaceKey | "all"): Promise<{ nodes: GraphNode[]; links: GraphLink[] }>;
  insights(ownerId: string, spaceKey?: SpaceKey | "all"): Promise<Insights>;
  pendingCount(ownerId: string): Promise<number>;

  /**
   * Demo memories for this user (TRD §15). Idempotent: re-seeding replaces demo-flagged units.
   * The app (Claude) creates the spaces and demo conversations first and passes their ids, so
   * provenance links resolve; the engine owns memories + events only.
   */
  seedDemo(input: SeedDemoInput): Promise<SeedResult>;
  removeDemo(ownerId: string): Promise<void>;
  /** Hard-delete all memory data for this owner (Settings → Data). */
  deleteAll(ownerId: string): Promise<void>;
}

let impl: MemoryEngine | undefined;

export async function engine(): Promise<MemoryEngine> {
  if (impl) return impl;
  if (env().MEMORY_ENGINE === "real") {
    impl = (await import("./real")).realEngine;
  } else {
    impl = (await import("./mock")).mockEngine;
  }
  return impl;
}

/** Which engine is serving (shown subtly in Settings and the README). */
export function engineKind(): "mock" | "real" {
  return env().MEMORY_ENGINE;
}

export type * from "./types";
