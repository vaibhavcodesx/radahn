/**
 * Radahn memory engine — CONTRACT TYPES.
 *
 * Owned by Claude (lead). Codex implements against these; changes go through a PR
 * that both agents agree on (build-plan.md §3.1). Spec: docs/memory-engine.md §1–§7.
 *
 * Rule of thumb: server-side shapes use `ObjectId`/`Date`; anything crossing the wire
 * to the browser uses the `*DTO` variants (string ids, ISO dates) from `toDTO` helpers.
 */
import type { ObjectId } from 'mongodb';

// ── Taxonomy (memory-engine.md §1) ──────────────────────────────────────────────

export const MEMORY_TYPES = [
  'profile',
  'preference',
  'fact',
  'goal',
  'constraint',
  'decision',
  'outcome',
  'feedback',
  'strategy',
  'observation',
] as const;
export type MemoryType = (typeof MEMORY_TYPES)[number];

export const MEMORY_STATUSES = ['active', 'pending_review', 'superseded', 'expired', 'rejected'] as const;
export type MemoryStatus = (typeof MEMORY_STATUSES)[number];

export const SENSITIVITIES = ['none', 'personal', 'sensitive'] as const;
export type Sensitivity = (typeof SENSITIVITIES)[number];

export type WritePolicy = 'auto' | 'review_sensitive' | 'review_all';

/** 'global' sentinel keeps $vectorSearch pre-filters to a plain `$in` on strings (§2). */
export const GLOBAL_SPACE = 'global' as const;
export type SpaceKey = string; // space ObjectId hex, or 'global'

export type ActorKind = 'user' | 'radahn' | 'reflection' | 'external_agent' | 'system';
export interface Actor {
  kind: ActorKind;
  name: string; // 'you' | 'radahn' | 'reflection' | 'codex' …
}

export type SourceKind = 'chat' | 'tool' | 'feedback' | 'reflection' | 'seed' | 'agent_api' | 'manual';

export type SupersedeReason = 'correction' | 'update' | 'merge' | 'conflict_resolution';

// ── The memory unit (memory-engine.md §2) ───────────────────────────────────────

export interface MemoryUnit {
  _id: ObjectId;
  ownerId: string;
  spaceKey: SpaceKey;
  type: MemoryType;
  contentHash?: string; // SHA-1 normalized statement for pre-embedding dedup (C4).
  statement: string; // ≤ 240 chars, third person, absolute dates
  subject?: string;
  attribute?: string;
  value?: string;
  slotKey?: string; // `${subject}.${attribute}` — one active value per slot (partial unique index)
  entities: string[];
  tags: string[];
  importance: number; // 1–10
  confidence: number; // 0–1
  sensitivity: Sensitivity;
  pinned: boolean;
  status: MemoryStatus;
  source: {
    kind: SourceKind;
    conversationId?: string;
    messageId?: string;
    quote?: string; // ≤ 200 chars, redacted
    actor: Actor;
  };
  evidenceIds: ObjectId[];
  supersedes?: ObjectId;
  supersededBy?: ObjectId;
  supersedeReason?: SupersedeReason;
  relatedIds: ObjectId[];
  validFrom: Date;
  validTo?: Date;
  expiresAt?: Date; // stops being recalled at this instant (query-time filter)
  purgeAt?: Date; // TTL index field: physical deletion
  stats: {
    recallCount: number;
    lastRecalledAt?: Date;
    confirmCount: number;
    lastConfirmedAt?: Date;
    citedCount: number;
  };
  /** C11 contradiction cache; technical cache writes preserve semantic updatedAt. */
  conflictWith?: ObjectId[];
  conflictCheckedAt?: Date;
  conflictFingerprint?: string;
  embedding: number[]; // 768 floats
  embeddingModel: 'gemini-embedding-2@768';
  createdAt: Date;
  updatedAt: Date;
  demo?: boolean;
  /** Set when the embed call failed; maintenance backfills (architecture.md §7). */
  needsEmbedding?: boolean;
}

/** Wire-safe memory (no embedding, string ids, ISO dates). */
export interface MemoryDTO {
  id: string;
  spaceKey: SpaceKey;
  type: MemoryType;
  statement: string;
  subject?: string;
  attribute?: string;
  value?: string;
  slotKey?: string;
  entities: string[];
  tags: string[];
  importance: number;
  confidence: number;
  sensitivity: Sensitivity;
  pinned: boolean;
  status: MemoryStatus;
  source: MemoryUnit['source'];
  evidenceIds: string[];
  supersedes?: string;
  supersededBy?: string;
  supersedeReason?: SupersedeReason;
  relatedIds: string[];
  validFrom: string;
  validTo?: string;
  expiresAt?: string;
  stats: {
    recallCount: number;
    lastRecalledAt?: string;
    confirmCount: number;
    lastConfirmedAt?: string;
    citedCount: number;
  };
  createdAt: string;
  updatedAt: string;
  demo?: boolean;
}

// ── Privacy gate (memory-engine.md §4.1, §4.3) ──────────────────────────────────

export type SecretKind =
  | 'google_api_key'
  | 'openai_key'
  | 'github_token'
  | 'aws_key'
  | 'jwt'
  | 'mongodb_uri'
  | 'private_key'
  | 'card_number'
  | 'aadhaar'
  | 'pan'
  | 'otp'
  | 'password'
  | 'high_entropy';

export interface PreScanResult {
  /** Input with every match replaced by `[redacted:<kind>]`. Safe to send to the LLM and store. */
  redacted: string;
  /** Kinds found (deduplicated). Never the values. */
  kinds: SecretKind[];
  /** True when instruction-injection patterns were found (informational for the chat turn). */
  injection: boolean;
}

// ── Recall (memory-engine.md §5) ────────────────────────────────────────────────

export type RecallIntent = 'plan' | 'recall' | 'general';
export type RecallChannel = 'semantic' | 'lexical' | 'temporal' | 'graph';

export type ReasonCode =
  | 'semantic_match'
  | 'keyword_match'
  | 'time_window'
  | 'linked_entity'
  | 'high_importance'
  | 'recent'
  | 'plan_relevant_constraint'
  | 'confirmed_often'
  | 'pinned_core';

export interface ScoreBreakdown {
  vector?: number; // raw vectorSearchScore
  lexicalRank?: number;
  temporalRank?: number;
  graphRank?: number;
  rerank?: number; // optional Voyage rerank score (§5.3)
  rrf: number; // normalised 0–1
  recency: number;
  importance: number;
  confidence: number;
  typeBoost: number;
  final: number;
}

export interface RecallCandidate {
  memoryId: string;
  statement: string;
  type: MemoryType;
  scores: ScoreBreakdown;
  selected: boolean;
  reasons: ReasonCode[];
  droppedBy?: 'threshold' | 'mmr' | 'budget';
}

/** A selected unit, with the short ref (`m1`…) the model cites. */
export interface RecallPick {
  ref: string; // 'm1'
  memoryId: string;
  type: MemoryType;
  statement: string;
  final: number;
  scores: ScoreBreakdown;
  reasons: ReasonCode[];
  /** Plain-language reason line for the UI, e.g. "Matched 'deadline' · constraint relevant to planning". */
  why: string;
  status: MemoryStatus;
  ageDays: number;
  confirmCount: number;
}

export interface RecallNotice {
  kind: 'changed' | 'ambiguous';
  text: string;
  memoryIds: string[];
}

export interface RecallLatency {
  embed: number;
  vector: number;
  lexical: number;
  temporal: number;
  graph: number;
  total: number;
}

export interface RecallInput {
  /** Server-trusted verified credential scopes; omit for normal authenticated UI access. */
  allowedSpaceKeys?: SpaceKey[];
  asOf?: string; // retained content snapshot, absolute ISO timestamp
  ownerId: string;
  spaceKey: SpaceKey; // current space (global included only when permitted)
  query: string; // already pre-scanned/redacted
  previousUserMessage?: string;
  intent?: RecallIntent; // detected if omitted
  conversationId?: string;
  messageId?: string; // assistant message id the trace attaches to
  limit?: number; // default 8
  types?: MemoryType[]; // recall_memory tool filter
  persistTrace?: boolean; // default true
}

export interface RecallResult {
  /** Current validated global profile; absent for historical recall. */
  profile?: string;
  asOf?: string; // retained content snapshot, absolute ISO timestamp
  recallId: string; // recalls._id hex ('' when persistTrace=false)
  intent: RecallIntent;
  channelsRan: RecallChannel[];
  picks: RecallPick[];
  candidates: RecallCandidate[]; // everything scored, for the Trace tab
  core: MemoryDTO[]; // pinned units (always in the prompt)
  strategies: MemoryDTO[]; // active strategy units, top 5 by importance
  notices: RecallNotice[];
  latencyMs: RecallLatency;
}

/** Stored trace document (`recalls`, TTL 14 d). §5.6 */
export interface RecallTrace {
  asOf?: string; // retained content snapshot, absolute ISO timestamp
  _id: ObjectId;
  ownerId: string;
  conversationId?: string;
  messageId?: string;
  query: string;
  intent: RecallIntent;
  channelsRan: RecallChannel[];
  candidates: RecallCandidate[];
  picks: Array<Pick<RecallPick, 'ref' | 'memoryId'>>;
  notices: RecallNotice[];
  latencyMs: RecallLatency;
  createdAt: Date;
}

// ── Context assembly (memory-engine.md §6) ──────────────────────────────────────

export interface BuildContextInput {
  userName: string;
  timeZone: string; // IANA, e.g. 'Asia/Kolkata'
  now: Date;
  spaceName: string;
  recall: RecallResult;
}

export interface BuiltContext {
  /** Full system prompt: identity/rules · now · learned behaviours · core · relevant · notices. */
  system: string;
  /** ref → memoryId for every ref the prompt exposes (citations resolve only through this). */
  refs: Record<string, string>;
}

// ── Write path (memory-engine.md §4) ────────────────────────────────────────────

export type ReconcileOp = 'add' | 'confirm' | 'supersede' | 'skip' | 'pending' | 'blocked';

export interface CandidateMemory {
  statement: string;
  type: MemoryType;
  subject?: string;
  attribute?: string;
  value?: string;
  entities: string[];
  importance: number;
  confidence: number;
  sensitivity: Sensitivity;
  scope: 'global' | 'space';
  expiresAt?: string; // ISO
  validFrom?: string; // Optional event-time ISO; out-of-order guard (C4).
  explicit: boolean;
  hint: 'new' | 'update' | 'confirm';
  targetRef?: string;
}

export interface WriteOpResult {
  op: ReconcileOp;
  memoryId?: string;
  previousId?: string; // for supersede
  type?: MemoryType;
  statement?: string; // omitted for blocked
  reason?: string; // 'secret:google_api_key', 'injection', 'sensitive', 'low_confidence', …
}

export interface WriteSummary {
  messageId?: string;
  added: number;
  confirmed: number;
  superseded: number;
  pending: number;
  blocked: number;
  ops: WriteOpResult[];
  /** "On 31 Oct 02:10 you said 9 PM; now 10 PM." — surfaced as a notice next turn. */
  notices: string[];
}

export interface TurnSnippet {
  role: 'user' | 'assistant';
  text: string; // redacted
}

export interface ExtractInput {
  ownerId: string;
  spaceKey: SpaceKey;
  conversationId: string;
  messageId: string; // the user message id (provenance)
  turns: TurnSnippet[]; // previous 2 turns + latest exchange, oldest first
  recalled: RecallPick[]; // so the extractor can say "update m4"
  userName: string;
  timeZone: string;
  now: Date;
  policy: WritePolicy;
}

export interface RememberInput {
  /** Server-trusted verified credential scopes; omit for normal authenticated UI access. */
  allowedSpaceKeys?: SpaceKey[];
  ownerId: string;
  spaceKey: SpaceKey;
  statement: string;
  type: MemoryType;
  scope?: 'global' | 'space';
  expiresAt?: string;
  importance?: number;
  sensitivity?: Sensitivity;
  pinned?: boolean;
  source: { kind: SourceKind; conversationId?: string; messageId?: string; actor: Actor };
}

export interface CorrectInput {
  /** Server-trusted verified credential scopes; omit for normal authenticated UI access. */
  allowedSpaceKeys?: SpaceKey[];
  ownerId: string;
  spaceKey: SpaceKey;
  /** One of memoryId / targetRef(+refs) / query must identify the target. */
  memoryId?: string;
  targetRef?: string;
  refs?: Record<string, string>;
  query?: string;
  newStatement: string;
  reason?: SupersedeReason; // default 'correction'
  actor: Actor;
}

export interface CorrectResult {
  status: 'updated' | 'not_found' | 'ambiguous' | 'blocked';
  before?: MemoryDTO;
  after?: MemoryDTO;
  candidates?: MemoryDTO[];
}

export interface ForgetInput {
  /** Server-trusted verified credential scopes; omit for normal authenticated UI access. */
  allowedSpaceKeys?: SpaceKey[];
  ownerId: string;
  memoryId?: string;
  targetRef?: string;
  refs?: Record<string, string>;
  query?: string;
  spaceKey?: SpaceKey;
  actor: Actor;
}

export interface ForgetResult {
  status: 'forgotten' | 'not_found' | 'ambiguous';
  forgotten?: { id: string; type: MemoryType };
  candidates?: MemoryDTO[];
}

export interface ReviewInput {
  /** Server-trusted verified credential scopes; omit for normal authenticated UI access. */
  allowedSpaceKeys?: SpaceKey[];
  ownerId: string;
  memoryId: string;
  decision: 'approve' | 'reject';
  edits?: Partial<Pick<MemoryDTO, 'statement' | 'type' | 'spaceKey' | 'importance' | 'sensitivity'>>;
  actor: Actor;
}

/** In-place edits that do not change meaning (statement edits go through correctMemory). */
export interface UpdateMemoryInput {
  /** Server-trusted verified credential scopes; omit for normal authenticated UI access. */
  allowedSpaceKeys?: SpaceKey[];
  ownerId: string;
  memoryId: string;
  patch: Partial<{
    pinned: boolean;
    expiresAt: string | null; // null clears
    spaceKey: SpaceKey;
    importance: number;
    type: MemoryType;
  }>;
  actor: Actor;
}

// ── Events (append-only audit + realtime source) ───────────────────────────────

export type MemoryEventKind =
  | 'created'
  | 'confirmed'
  | 'superseded'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'blocked'
  | 'expired'
  | 'forgotten'
  | 'recalled'
  | 'reflected'
  | 'updated'
  | 'pinned'
  | 'unpinned';

export interface MemoryEvent {
  _id: ObjectId;
  ownerId: string;
  spaceKey: SpaceKey;
  memoryId?: ObjectId; // absent for blocked
  kind: MemoryEventKind;
  actor: Actor;
  type?: MemoryType;
  /** One-line summary. NO content for 'forgotten' and 'blocked'. */
  summary: string;
  messageId?: string; // turn that caused it (drives write chips)
  candidateHash?: string; // Idempotent final event per owner/message/candidate (C4).
  diff?: { before?: string; after?: string };
  at: Date;
}

export interface MemoryEventDTO {
  id: string;
  spaceKey: SpaceKey;
  memoryId?: string;
  kind: MemoryEventKind;
  actor: Actor;
  type?: MemoryType;
  summary: string;
  messageId?: string;
  diff?: { before?: string; after?: string };
  at: string;
}

// ── Reflection (memory-engine.md §7) ────────────────────────────────────────────

export type ReflectionTrigger = 'manual' | 'auto' | 'cron';
export type StepStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped';

export interface ReflectionStep {
  name: 'gather' | 'cluster' | 'consolidate' | 'write';
  status: StepStatus;
  detail?: string;
  at?: Date;
}

export interface ReflectionRun {
  _id: ObjectId;
  ownerId: string;
  spaceKey: SpaceKey;
  trigger: ReflectionTrigger;
  status: 'running' | 'done' | 'failed';
  steps: ReflectionStep[];
  outputs: { merged: string[]; observations: string[]; strategies: string[] };
  startedAt: Date;
  finishedAt?: Date;
  error?: string;
}

export interface ReflectInput {
  ownerId: string;
  spaceKey: SpaceKey;
  trigger: ReflectionTrigger;
}

// ── Ghost answer (memory-engine.md §6.2) ────────────────────────────────────────

export interface GhostContextInput {
  userName?: string; // intentionally unused: ghost knows nothing about the user
  timeZone: string;
  now: Date;
}

// ── Reads for the UI ────────────────────────────────────────────────────────────

export interface ListMemoriesInput {
  /** Server-trusted verified credential scopes; omit for normal authenticated UI access. */
  allowedSpaceKeys?: SpaceKey[];
  asOf?: string; // retained content snapshot, absolute ISO timestamp
  ownerId: string;
  spaceKey?: SpaceKey | 'all'; // default: current space + global
  types?: MemoryType[];
  statuses?: MemoryStatus[]; // default: active + pending_review + superseded
  q?: string;
  sort?: 'updated' | 'importance' | 'recalled' | 'created';
  limit?: number; // default 200
}

export interface MemoryDetail {
  memory: MemoryDTO;
  versions: MemoryDTO[]; // supersede chain, oldest → newest (includes this one)
  evidence: MemoryDTO[];
  related: MemoryDTO[];
  recallHistory: Array<{ recallId: string; messageId?: string; conversationId?: string; final: number; at: string }>;
  events: MemoryEventDTO[];
  /** Raw MongoDB document for the "this is the document" view, embedding summarised. */
  raw: Record<string, unknown>;
}

export interface GraphNode {
  id: string;
  type: MemoryType;
  status: MemoryStatus;
  statement: string;
  importance: number;
  spaceKey: SpaceKey;
  updatedAt: string;
  recallCount: number;
}
export interface GraphLink {
  source: string;
  target: string;
  kind: 'supersede' | 'evidence' | 'related';
}

export interface Insights {
  byType: Array<{ type: MemoryType; count: number }>;
  byStatus: Array<{ status: MemoryStatus; count: number }>;
  recallHitRate: number; // cited / recalled over last 7 d
  correctionsThisWeek: number;
  storageBytes: number;
  eventsPerDay: Array<{ day: string; count: number }>;
}

export interface SeedDemoInput {
  ownerId: string;
  /** Space _id hex for each demo space key (fixtures/demo.ts DEMO_SPACES). */
  spaceIds: Record<'personal' | 'hackathon' | 'internships', string>;
  /** Demo conversations already inserted by the app, in DEMO_CONVERSATIONS order. */
  conversations: Array<{ conversationId: string; messageIds: string[] }>;
}

export interface SeedResult {
  memories: number;
}
