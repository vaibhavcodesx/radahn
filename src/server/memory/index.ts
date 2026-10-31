import "server-only";
import { env } from "@/server/env";
import type { CreatedAgentKey, VerifiedAgentKey, AgentKeyMetadata } from "./agentKeys";
import type { ConflictPairDTO, ResolveConflictInput, ResolveConflictResult } from "./conflicts";
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
 * Content methods take `ownerId` from the session or a verified agent key and scope all queries by it.
 * verifyAgentKey is the hash-only authentication boundary that establishes an owner.
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
  /** C11 — current contradictions and explicit owner-scoped resolution. */
  listConflicts(ownerId: string): Promise<ConflictPairDTO[]>;
  resolveConflict(input: ResolveConflictInput): Promise<ResolveConflictResult>;
  /** Agent-key control plane (C10). Raw key is returned only at creation. */
  createAgentKey(ownerId: string, name: string, spaceKeys: SpaceKey[]): Promise<CreatedAgentKey>;
  /** Authentication boundary: hash-only lookup establishes owner before any content access. */
  verifyAgentKey(rawKey: string): Promise<VerifiedAgentKey | null>;
  listAgentKeys(ownerId: string): Promise<AgentKeyMetadata[]>;
  revokeAgentKey(ownerId: string, keyId: string): Promise<boolean>;
  /** Hard-delete all memory data for this owner (Settings → Data). */
  deleteAll(ownerId: string): Promise<void>;
}

let impl: MemoryEngine | undefined;

const isNotImplemented = (e: unknown) => /not implemented/i.test(String((e as Error)?.message));

/**
 * While Codex lands C7/C8, derive graph + insights from listMemories so the Field and Activity
 * pages work on the real engine; reflection reports "not available yet" instead of crashing.
 * Each fallback is used only when the real method throws "not implemented".
 */
function withFallbacks(real: MemoryEngine): MemoryEngine {
  const all = (ownerId: string) =>
    real.listMemories({ ownerId, spaceKey: "all", statuses: ["active", "pending_review", "superseded", "expired"], limit: 1000 });
  return {
    ...real,
    async graph(ownerId, spaceKey) {
      try {
        return await real.graph(ownerId, spaceKey);
      } catch (e) {
        if (!isNotImplemented(e)) throw e;
        const list = await all(ownerId);
        const ids = new Set(list.map((m) => m.id));
        const links: GraphLink[] = [];
        for (const m of list) {
          if (m.supersededBy && ids.has(m.supersededBy)) links.push({ source: m.id, target: m.supersededBy, kind: "supersede" });
          for (const ev of m.evidenceIds) if (ids.has(ev)) links.push({ source: ev, target: m.id, kind: "evidence" });
          for (const r of m.relatedIds) if (ids.has(r) && m.id < r) links.push({ source: m.id, target: r, kind: "related" });
        }
        const nodes: GraphNode[] = list.map((m) => ({ id: m.id, type: m.type, status: m.status, statement: m.statement, importance: m.importance, spaceKey: m.spaceKey, updatedAt: m.updatedAt, recallCount: m.stats.recallCount }));
        return { nodes, links };
      }
    },
    async insights(ownerId, spaceKey) {
      try {
        return await real.insights(ownerId, spaceKey);
      } catch (e) {
        if (!isNotImplemented(e)) throw e;
        const list = await all(ownerId);
        const count = <K extends string>(key: (m: MemoryDTO) => K) => {
          const out = new Map<K, number>();
          for (const m of list) out.set(key(m), (out.get(key(m)) ?? 0) + 1);
          return out;
        };
        const recalled = list.reduce((n, m) => n + m.stats.recallCount, 0);
        const cited = list.reduce((n, m) => n + m.stats.citedCount, 0);
        const weekAgo = Date.now() - 7 * 86_400_000;
        return {
          byType: [...count((m) => m.type)].filter(([, n]) => n).map(([type, c]) => ({ type, count: c })),
          byStatus: [...count((m) => m.status)].map(([status, c]) => ({ status, count: c })),
          recallHitRate: recalled ? Math.min(1, cited / recalled) : 0,
          correctionsThisWeek: list.filter((m) => m.status === "superseded" && m.validTo && Date.parse(m.validTo) > weekAgo).length,
          storageBytes: list.length * 7_400,
          eventsPerDay: [],
        };
      }
    },
    async listReflections(ownerId, limit) {
      try {
        return await real.listReflections(ownerId, limit);
      } catch (e) {
        if (isNotImplemented(e)) return [];
        throw e;
      }
    },
  };
}

export async function engine(): Promise<MemoryEngine> {
  if (impl) return impl;
  if (env().MEMORY_ENGINE === "real") {
    impl = withFallbacks((await import("./real")).realEngine);
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
