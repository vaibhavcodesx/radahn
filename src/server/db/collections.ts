import "server-only";
import type { Collection, Db, ObjectId } from "mongodb";
import { db as defaultDb } from "./client";
import type {
  MemoryEvent,
  MemoryUnit,
  RecallTrace,
  ReflectionRun,
  SpaceKey,
  WritePolicy,
  WriteSummary,
} from "@/server/memory/types";

/**
 * Typed collection accessors (TRD §5). Every query against these MUST include `ownerId`
 * taken from the session — never from the client.
 */

/** C13 derived profile snapshots, bounded to current + one previous version. */
export interface ProfileSnapshot {
  text: string;
  version: number;
  updatedAt: Date;
  evidenceIds: ObjectId[];
  evidence: { id: ObjectId; fingerprint: string }[];
  expiresAt?: Date;
  purgeAt?: Date;
}
export interface ProfileDoc extends ProfileSnapshot {
  _id: string;
  ownerId: string;
  previous?: ProfileSnapshot;
  invalidatedAt?: Date;
}

export interface SpaceDoc {
  _id: ObjectId;
  ownerId: string;
  name: string;
  color: string; // a memory-type colour var name, e.g. '--t-fact'
  isDefault: boolean;
  unitsSinceReflection: number;
  lastReflectionAt?: Date;
  demo?: boolean;
  createdAt: Date;
}

export interface ConversationDoc {
  _id: ObjectId;
  ownerId: string;
  spaceId: string; // space _id hex
  title: string;
  summary?: string;
  lastMessageAt: Date;
  demo?: boolean;
  createdAt: Date;
}

export interface MessageDoc {
  _id: ObjectId;
  conversationId: string;
  ownerId: string;
  role: "user" | "assistant";
  /** AI SDK UIMessage id (client-generated for user turns, server-generated for assistant). */
  uiId: string;
  parts: unknown[]; // AI SDK UIMessage parts (redacted)
  text: string; // plain, redacted
  recallId?: string;
  citedMemoryIds: string[];
  writeSummary?: Omit<WriteSummary, "ops" | "notices">;
  feedback?: { rating: 1 | -1; note?: string; at: Date };
  ghost?: { text: string; model: string; at: Date };
  model?: string;
  redactions?: string[];
  demo?: boolean;
  createdAt: Date;
}

export interface UserSettingsDoc {
  /** Set on a guest owner after Google upgrade; late background writes are swept to this owner. */
  retiredTo?: string;
  reflectionRevision?: number; // Owner-wide successful reflection generation; distinct from ordinary writes.
  memoryRevision?: number; // Serializes owner memory mutations for cross-document budgets (C5).
  _id: string; // = ownerId
  displayName?: string;
  timeZone: string;
  writePolicy: WritePolicy;
  chatModel?: string;
  currentSpaceId?: string;
  demoLoadedAt?: Date;
  updatedAt: Date;
}

export interface AgentKeyDoc {
  _id: ObjectId;
  ownerId: string;
  name: string;
  keyHash: string; // sha256
  prefix: string;
  spaceKeys: SpaceKey[];
  lastUsedAt?: Date;
  createdAt: Date;
}

export interface RateLimitDoc {
  _id?: ObjectId;
  key: string;
  windowStart: Date;
  count: number;
}

/** Per (key fingerprint, model) quota state for quota-aware routing (research/quotas.md). */
export interface LlmUsageDoc {
  _id: string; // `${keyFingerprint}:${model}`
  exhaustedUntil?: Date;
  cooldownUntil?: Date;
  calls: number;
  failures: number;
  updatedAt: Date;
}

export const COLLECTIONS = {
  profiles: "profiles",
  spaces: "spaces",
  conversations: "conversations",
  messages: "messages",
  memories: "memories",
  events: "memory_events",
  recalls: "recalls",
  reflections: "reflections",
  settings: "user_settings",
  agentKeys: "agent_keys",
  rateLimits: "rate_limits",
  llmUsage: "llm_usage",
} as const;

/** Collections whose `ownerId` moves when a guest links a Google account (TRD §4). */
export const OWNED_COLLECTIONS = [
  COLLECTIONS.spaces,
  COLLECTIONS.conversations,
  COLLECTIONS.messages,
  COLLECTIONS.memories,
  COLLECTIONS.events,
  COLLECTIONS.recalls,
  COLLECTIONS.reflections,
  COLLECTIONS.agentKeys,
] as const;

export function collections(database: Db = defaultDb()) {
  return {
    profiles: database.collection<ProfileDoc>(COLLECTIONS.profiles),
    spaces: database.collection<SpaceDoc>(COLLECTIONS.spaces),
    conversations: database.collection<ConversationDoc>(COLLECTIONS.conversations),
    messages: database.collection<MessageDoc>(COLLECTIONS.messages),
    memories: database.collection<MemoryUnit>(COLLECTIONS.memories),
    events: database.collection<MemoryEvent>(COLLECTIONS.events),
    recalls: database.collection<RecallTrace>(COLLECTIONS.recalls),
    reflections: database.collection<ReflectionRun>(COLLECTIONS.reflections),
    settings: database.collection<UserSettingsDoc>(COLLECTIONS.settings),
    agentKeys: database.collection<AgentKeyDoc>(COLLECTIONS.agentKeys),
    rateLimits: database.collection<RateLimitDoc>(COLLECTIONS.rateLimits),
    llmUsage: database.collection<LlmUsageDoc>(COLLECTIONS.llmUsage),
  };
}

export type Collections = ReturnType<typeof collections>;
export type { Collection };
