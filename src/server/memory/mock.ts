import "server-only";
/**
 * MOCK engine (Claude, Phase 0). In-memory, per-process, seeded from fixtures/demo.ts.
 * Exists so UI and routes can be built before Codex's real engine lands. The scoring here
 * follows memory-engine.md §5.3's formula over a lexical proxy, so screens look like
 * production; it is NOT the real engine and is never deployed with MEMORY_ENGINE=real.
 */
import { ObjectId } from "mongodb";
import { buildGhostPrompt, buildSystemPrompt } from "./context";
import { DEMO_MEMORIES } from "./fixtures/demo";
import type { MemoryEngine } from "./index";
import { preScan as gatePreScan } from "./gate";
import { effectiveSpaceKeys, spaceAllowed, assertSpaceAllowed } from "./scope";
import { parseAsOf, isHistoricalMemory } from "./historical";
import type {
  GraphLink,
  MemoryDTO,
  MemoryEventDTO,
  MemoryEventKind,
  MemoryType,
  RecallCandidate,
  RecallIntent,
  RecallPick,
  RecallTrace,
  ReasonCode,
  ReflectionRun,
  ScoreBreakdown,
  SpaceKey,
  WriteOpResult,
  WriteSummary,
} from "./types";

interface OwnerState {
  memories: Map<string, MemoryDTO>;
  events: MemoryEventDTO[];
  traces: Map<string, RecallTrace>;
  reflections: ReflectionRun[];
  spaceIds: Record<string, string>;
}

const g = globalThis as unknown as { __radahnMock?: Map<string, OwnerState> };
const store = (g.__radahnMock ??= new Map());

function state(ownerId: string): OwnerState {
  let s = store.get(ownerId);
  if (!s) {
    s = { memories: new Map(), events: [], traces: new Map(), reflections: [], spaceIds: {} };
    store.set(ownerId, s);
  }
  return s;
}

const HALF_LIFE: Record<MemoryType, number> = {
  profile: Infinity,
  preference: 90,
  fact: 60,
  goal: 14,
  constraint: 14,
  decision: 30,
  outcome: 30,
  feedback: 21,
  strategy: Infinity,
  observation: 60,
};

const STOP = new Set(
  "the a an and or but to of in on for with my me i you is are was be it this that what when how do does did can could should would next give about from at by as".split(
    " ",
  ),
);
const tokens = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9.\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOP.has(t));

export function detectIntent(q: string): RecallIntent {
  if (/\b(plan|schedule|next|should i|prioriti[sz]e|today|tonight|hours?)\b/i.test(q)) return "plan";
  if (/\b(what did i|when did|remind me|last time|did we|what do you know)\b/i.test(q)) return "recall";
  return "general";
}

const ageDays = (m: MemoryDTO, now: number) =>
  (now - Math.max(Date.parse(m.updatedAt), m.stats.lastConfirmedAt ? Date.parse(m.stats.lastConfirmedAt) : 0)) /
  86_400_000;

function historicalMockMetadata(m:MemoryDTO,at:Date):MemoryDTO {
  const unknown=Date.parse(m.updatedAt)>+at || (m.stats.lastConfirmedAt!==undefined&&Date.parse(m.stats.lastConfirmedAt)>+at);
  return {...m,updatedAt:Date.parse(m.updatedAt)>+at?m.validFrom:m.updatedAt,stats:{...m.stats,...(unknown?{confirmCount:0,lastConfirmedAt:undefined}:{})}};
}
const isLive = (m: MemoryDTO, now: number) =>
  m.status === "active" && (!m.expiresAt || Date.parse(m.expiresAt) > now);

const REASON_TEXT: Record<ReasonCode, string> = {
  semantic_match: "close in meaning",
  keyword_match: "matched your words",
  time_window: "in the time window you asked about",
  linked_entity: "linked to a matched memory",
  high_importance: "high importance",
  recent: "recent",
  plan_relevant_constraint: "relevant to planning",
  confirmed_often: "confirmed several times",
  pinned_core: "pinned to core",
};

function event(
  s: OwnerState,
  kind: MemoryEventKind,
  m: Partial<MemoryDTO> & { spaceKey: SpaceKey },
  summary: string,
  messageId?: string,
  actorName = "radahn",
): MemoryEventDTO {
  const e: MemoryEventDTO = {
    id: new ObjectId().toHexString(),
    spaceKey: m.spaceKey,
    memoryId: m.id,
    kind,
    actor: { kind: actorName === "you" ? "user" : actorName === "reflection" ? "reflection" : "radahn", name: actorName },
    type: m.type,
    summary,
    messageId,
    at: new Date().toISOString(),
  };
  s.events.push(e);
  return e;
}

function newMemory(partial: Omit<MemoryDTO, "id" | "stats" | "createdAt" | "updatedAt" | "validFrom" | "evidenceIds" | "relatedIds" | "tags"> & Partial<MemoryDTO>): MemoryDTO {
  const now = new Date().toISOString();
  return {
    id: new ObjectId().toHexString(),
    tags: [],
    evidenceIds: [],
    relatedIds: [],
    validFrom: now,
    createdAt: now,
    updatedAt: now,
    stats: { recallCount: 0, confirmCount: 0, citedCount: 0 },
    ...partial,
  };
}

const baseMock: MemoryEngine = {
  preScan: gatePreScan,

  async recall(input) {
    const scopes=effectiveSpaceKeys([input.spaceKey,"global"],input.allowedSpaceKeys)!;
    const t0 = performance.now();
    const s = state(input.ownerId);
    const asOf = parseAsOf(input.asOf);
    const now = asOf ? +asOf : Date.now();
    const intent = input.intent ?? detectIntent(input.query);
    const q = new Set(tokens(`${input.query} ${input.previousUserMessage ?? ""}`));
    const pool = [...s.memories.values()].filter(
      (m) =>
        (asOf ? isHistoricalMemory(m, asOf) : isLive(m, now)) &&
        scopes.includes(m.spaceKey) &&
        (!input.types || input.types.includes(m.type)),
    ).map(m=>asOf?historicalMockMetadata(m,asOf):m);

    const core = pool.filter((m) => m.pinned);
    const strategies = pool
      .filter((m) => m.type === "strategy")
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 5);

    const scored: RecallCandidate[] = pool
      .filter((m) => !m.pinned && m.type !== "strategy")
      .map((m) => {
        const words = tokens(`${m.statement} ${m.entities.join(" ")}`);
        const overlap = words.filter((w) => q.has(w)).length;
        const lexical = overlap > 0 ? Math.min(1, overlap / Math.max(2, q.size)) : 0;
        const rrf = Math.min(1, lexical * 1.4);
        const hl = HALF_LIFE[m.type];
        const days = ageDays(m, now);
        const recency = hl === Infinity ? 1 : Math.pow(0.5, days / hl);
        const importance = m.importance / 10;
        const typeBoost =
          (intent === "plan" && ["constraint", "goal", "decision", "preference"].includes(m.type)) ||
          (intent === "recall" && ["fact", "decision", "outcome"].includes(m.type))
            ? 0.1
            : 0;
        const final = 0.55 * rrf + 0.15 * recency + 0.15 * importance + 0.1 * m.confidence + typeBoost;
        const reasons: ReasonCode[] = [];
        if (overlap) reasons.push("keyword_match");
        if (intent === "plan" && m.type === "constraint") reasons.push("plan_relevant_constraint");
        if (m.importance >= 8) reasons.push("high_importance");
        if (recency > 0.95 && days < 2) reasons.push("recent");
        if (m.stats.confirmCount >= 2) reasons.push("confirmed_often");
        const scores: ScoreBreakdown = {
          lexicalRank: overlap ? 1 : undefined,
          rrf,
          recency,
          importance,
          confidence: m.confidence,
          typeBoost,
          final,
        };
        return {
          memoryId: m.id,
          statement: m.statement,
          type: m.type,
          scores,
          selected: false,
          reasons: reasons.slice(0, 3),
          droppedBy: final < 0.35 ? ("threshold" as const) : undefined,
        };
      })
      .sort((a, b) => b.scores.final - a.scores.final);

    const limit = input.limit ?? 8;
    const picks: RecallPick[] = [];
    for (const c of scored) {
      if (c.droppedBy) continue;
      if (picks.length >= limit) {
        c.droppedBy = "budget";
        continue;
      }
      c.selected = true;
      const m = pool.find(m=>m.id===c.memoryId)!;
      if (c.reasons.length === 0) c.reasons.push("high_importance");
      picks.push({
        ref: `m${picks.length + 1}`,
        memoryId: c.memoryId,
        type: c.type,
        statement: c.statement,
        final: c.scores.final,
        scores: c.scores,
        reasons: c.reasons,
        why: c.reasons.map((r) => REASON_TEXT[r]).join(" · "),
        status: m.status,
        ageDays: ageDays(m, now),
        confirmCount: m.stats.confirmCount,
      });
    }

    if (!asOf) for (const p of picks) {
      const m = s.memories.get(p.memoryId)!;
      m.stats.recallCount++;
      m.stats.lastRecalledAt = new Date().toISOString();
    }

    const total = Math.round(performance.now() - t0) + 40; // pretend network, so the UI timing looks honest-ish
    const recallId = input.persistTrace === false ? "" : new ObjectId().toHexString();
    const result = {
      recallId,
      ...(asOf ? {asOf:asOf.toISOString()} : {}),
      intent,
      channelsRan: ["semantic", "lexical"] as Array<"semantic" | "lexical">,
      picks,
      candidates: scored.slice(0, 30),
      core,
      strategies,
      notices: [],
      latencyMs: { embed: 0, vector: 0, lexical: total - 40, temporal: 0, graph: 0, total },
    };
    if (recallId && input.messageId) {
      s.traces.set(input.messageId, {
        _id: new ObjectId(recallId),
        ownerId: input.ownerId,
        conversationId: input.conversationId,
        messageId: input.messageId,
        query: input.query,
        ...(asOf ? {asOf:asOf.toISOString()} : {}),
        intent,
        channelsRan: result.channelsRan,
        candidates: result.candidates,
        picks: picks.map((p) => ({ ref: p.ref, memoryId: p.memoryId })),
        notices: [],
        latencyMs: result.latencyMs,
        createdAt: new Date(),
      });
    }
    return result;
  },

  buildContext: buildSystemPrompt,
  ghostContext: buildGhostPrompt,

  async extractAndWrite(input) {
    // Heuristic stand-in for Flash-Lite extraction: enough to drive the write chips in dev.
    const s = state(input.ownerId);
    const user = [...input.turns].reverse().find((t) => t.role === "user")?.text ?? "";
    const ops: WriteOpResult[] = [];
    const summary: WriteSummary = { messageId: input.messageId, added: 0, confirmed: 0, superseded: 0, pending: 0, blocked: 0, ops, notices: [] };
    if (/\[redacted:/.test(user)) {
      summary.blocked++;
      ops.push({ op: "blocked", reason: "secret" });
      event(s, "blocked", { spaceKey: input.spaceKey }, "Blocked a credential-like value (not stored)", input.messageId);
    }
    const m = user.match(/\b(i (?:prefer|like|hate|love|want|need)|remember that|my .{2,30} is|we (?:chose|decided|picked))\b.{3,160}/i);
    if (m) {
      const type: MemoryType = /prefer|like|hate|love/i.test(m[1]) ? "preference" : /chose|decided|picked/i.test(m[1]) ? "decision" : "fact";
      const unit = newMemory({
        spaceKey: type === "preference" ? "global" : input.spaceKey,
        type,
        statement: `${input.userName} said: ${m[0].trim()}`.slice(0, 240),
        entities: [],
        importance: 6,
        confidence: 0.7,
        sensitivity: "none",
        pinned: false,
        status: "active",
        source: { kind: "chat", conversationId: input.conversationId, messageId: input.messageId, quote: m[0].slice(0, 200), actor: { kind: "radahn", name: "radahn" } },
      });
      s.memories.set(unit.id, unit);
      summary.added++;
      ops.push({ op: "add", memoryId: unit.id, type, statement: unit.statement });
      event(s, "created", unit, `Remembered: ${unit.statement}`, input.messageId);
    }
    return summary;
  },

  async rememberExplicit(input) {
    assertSpaceAllowed(input.scope === "global" ? "global" : input.spaceKey,input.allowedSpaceKeys);
    const s = state(input.ownerId);
    const scan = gatePreScan(input.statement);
    if (scan.kinds.length) {
      event(s, "blocked", { spaceKey: input.spaceKey }, "Blocked a credential-like value (not stored)", input.source.messageId);
      return { op: "blocked", reason: `secret:${scan.kinds[0]}` };
    }
    const unit = newMemory({
      spaceKey: input.scope === "global" ? "global" : input.spaceKey,
      type: input.type,
      statement: input.statement.slice(0, 240),
      entities: [],
      importance: input.importance ?? 6,
      confidence: 0.9,
      sensitivity: input.sensitivity ?? "none",
      pinned: input.pinned ?? false,
      status: "active",
      expiresAt: input.expiresAt,
      source: { ...input.source },
    });
    s.memories.set(unit.id, unit);
    event(s, "created", unit, `Remembered: ${unit.statement}`, input.source.messageId, input.source.actor.name);
    return { op: "add", memoryId: unit.id, type: unit.type, statement: unit.statement };
  },

  async correctMemory(input) {
    const scopes=effectiveSpaceKeys(undefined,input.allowedSpaceKeys);
    const s = state(input.ownerId);
    const id = input.memoryId ?? (input.targetRef && input.refs?.[input.targetRef]);
    let target = id ? s.memories.get(id) : undefined;
    if (!target && input.query) {
      const q = new Set(tokens(input.query));
      const hits = [...s.memories.values()].filter((m) => m.status === "active" && spaceAllowed(m.spaceKey,effectiveSpaceKeys([input.spaceKey,"global"],scopes)) && tokens(m.statement).some((w) => q.has(w)));
      if (hits.length > 1) return { status: "ambiguous", candidates: hits.slice(0, 5) };
      target = hits[0];
    }
    if (!target || target.status !== "active" || !spaceAllowed(target.spaceKey,scopes)) return { status: "not_found" };
    const now = new Date().toISOString();
    const next = newMemory({ ...target, id: undefined as unknown as string, validFrom:now,createdAt:now,updatedAt:now,stats:{recallCount:0,confirmCount:0,citedCount:0}, statement: input.newStatement.slice(0, 240), supersedes: target.id, supersedeReason: input.reason ?? "correction", status: "active" });
    next.id = new ObjectId().toHexString();
    target.status = "superseded";
    target.supersededBy = next.id;
    target.validTo = now;
    target.updatedAt = now;
    s.memories.set(next.id, next);
    event(s, "superseded", next, `Updated: ${target.statement} → ${next.statement}`, undefined, input.actor.name);
    return { status: "updated", before: target, after: next };
  },

  async forgetMemory(input) {
    const scopes=effectiveSpaceKeys(undefined,input.allowedSpaceKeys);
    const s = state(input.ownerId);
    const id = input.memoryId ?? (input.targetRef && input.refs?.[input.targetRef]);
    const target = id ? s.memories.get(id) : undefined;
    if (!target || !spaceAllowed(target.spaceKey,scopes)) return { status: "not_found" };
    s.memories.delete(target.id);
    event(s, "forgotten", { spaceKey: target.spaceKey, id: target.id, type: target.type }, `Forgot a ${target.type} memory`, undefined, input.actor.name);
    return { status: "forgotten", forgotten: { id: target.id, type: target.type } };
  },

  async reviewMemory(input) {
    const scopes=effectiveSpaceKeys(undefined,input.allowedSpaceKeys);
    const s = state(input.ownerId);
    const m = s.memories.get(input.memoryId);
    if (!m || m.status !== "pending_review" || !spaceAllowed(m.spaceKey,scopes) || !spaceAllowed(input.edits?.spaceKey??m.spaceKey,scopes)) return null;
    if (input.decision === "approve") {
      Object.assign(m, input.edits ?? {}, { status: "active", updatedAt: new Date().toISOString() });
      event(s, "approved", m, `Approved: ${m.statement}`, undefined, "you");
    } else {
      m.status = "rejected";
      event(s, "rejected", m, `Rejected a ${m.type} memory`, undefined, "you");
    }
    return m;
  },

  async updateMemory(input) {
    const scopes=effectiveSpaceKeys(undefined,input.allowedSpaceKeys);
    const s = state(input.ownerId);
    const m = s.memories.get(input.memoryId);
    if (!m || !spaceAllowed(m.spaceKey,scopes) || !spaceAllowed(input.patch.spaceKey??m.spaceKey,scopes)) return null;
    const p = input.patch;
    if (p.pinned !== undefined) m.pinned = p.pinned;
    if (p.expiresAt !== undefined) m.expiresAt = p.expiresAt ?? undefined;
    if (p.spaceKey) m.spaceKey = p.spaceKey;
    if (p.importance) m.importance = p.importance;
    if (p.type) m.type = p.type;
    m.updatedAt = new Date().toISOString();
    event(s, p.pinned === true ? "pinned" : p.pinned === false ? "unpinned" : "updated", m, `Edited: ${m.statement}`, undefined, "you");
    return m;
  },

  async runReflection(input) {
    const s = state(input.ownerId);
    const now = new Date();
    const run: ReflectionRun = {
      _id: new ObjectId(),
      ownerId: input.ownerId,
      spaceKey: input.spaceKey,
      trigger: input.trigger,
      status: "done",
      steps: [
        { name: "gather", status: "done", detail: `${s.memories.size} units`, at: now },
        { name: "cluster", status: "done", detail: "0 duplicate clusters", at: now },
        { name: "consolidate", status: "done", detail: "mock: no LLM call", at: now },
        { name: "write", status: "done", detail: "nothing to write", at: now },
      ],
      outputs: { merged: [], observations: [], strategies: [] },
      startedAt: now,
      finishedAt: now,
    };
    s.reflections.unshift(run);
    return run;
  },

  async listReflections(ownerId, limit = 10) {
    return state(ownerId).reflections.slice(0, limit);
  },

  async listMemories(input) {
    const scopes=effectiveSpaceKeys(input.spaceKey&&input.spaceKey!=="all"?[input.spaceKey,"global"]:undefined,input.allowedSpaceKeys);
    const s = state(input.ownerId);
    const asOf=parseAsOf(input.asOf);
    const statuses = input.statuses ?? ["active", "pending_review", "superseded"];
    const q = input.q?.toLowerCase();
    const list = [...s.memories.values()].filter(
      (m) =>
        statuses.includes(m.status) && (!asOf || isHistoricalMemory(m,asOf)) &&
        (!input.types?.length || input.types.includes(m.type)) &&
        spaceAllowed(m.spaceKey,scopes) &&
        (!q || m.statement.toLowerCase().includes(q)),
    );
    const key = input.sort ?? "updated";
    list.sort((a, b) =>
      key === "importance"
        ? b.importance - a.importance
        : key === "recalled"
          ? b.stats.recallCount - a.stats.recallCount
          : Date.parse(key === "created" ? b.createdAt : b.updatedAt) - Date.parse(key === "created" ? a.createdAt : a.updatedAt),
    );
    return list.slice(0, input.limit ?? 200).map(m=>asOf?historicalMockMetadata(m,asOf):m);
  },

  async getMemory(ownerId, memoryId) {
    const s = state(ownerId);
    const memory = s.memories.get(memoryId);
    if (!memory) return null;
    const versions: MemoryDTO[] = [memory];
    let cur = memory;
    while (cur.supersedes && s.memories.get(cur.supersedes)) {
      cur = s.memories.get(cur.supersedes)!;
      versions.unshift(cur);
    }
    cur = memory;
    while (cur.supersededBy && s.memories.get(cur.supersededBy)) {
      cur = s.memories.get(cur.supersededBy)!;
      versions.push(cur);
    }
    const pick = (ids: string[]) => ids.map((i) => s.memories.get(i)).filter(Boolean) as MemoryDTO[];
    const recallHistory = [...s.traces.values()]
      .flatMap((t) =>
        t.candidates
          .filter((c) => c.memoryId === memoryId && c.selected)
          .map((c) => ({ recallId: t._id.toHexString(), messageId: t.messageId, conversationId: t.conversationId, final: c.scores.final, at: t.createdAt.toISOString() })),
      )
      .slice(-20);
    return {
      memory,
      versions,
      evidence: pick(memory.evidenceIds),
      related: pick(memory.relatedIds),
      recallHistory,
      events: s.events.filter((e) => e.memoryId === memoryId).slice(-20).reverse(),
      raw: { _id: { $oid: memory.id }, ownerId, ...memory, embedding: "[768 floats]", embeddingModel: "gemini-embedding-2@768" },
    };
  },

  async getRecallTrace(ownerId, messageId) {
    return state(ownerId).traces.get(messageId) ?? null;
  },

  async listEvents(ownerId, opts = {}) {
    let ev = state(ownerId).events;
    if (opts.after) {
      const i = ev.findIndex((e) => e.id === opts.after);
      ev = i >= 0 ? ev.slice(i + 1) : ev;
    }
    if (opts.messageId) ev = ev.filter((e) => e.messageId === opts.messageId);
    return ev.slice(-(opts.limit ?? 50));
  },

  async graph(ownerId) {
    const list = [...state(ownerId).memories.values()].filter((m) => m.status !== "rejected");
    const links: GraphLink[] = [];
    for (const m of list) {
      if (m.supersededBy) links.push({ source: m.id, target: m.supersededBy, kind: "supersede" });
      for (const e of m.evidenceIds) links.push({ source: e, target: m.id, kind: "evidence" });
      for (const r of m.relatedIds) if (m.id < r) links.push({ source: m.id, target: r, kind: "related" });
    }
    return {
      nodes: list.map((m) => ({ id: m.id, type: m.type, status: m.status, statement: m.statement, importance: m.importance, spaceKey: m.spaceKey, updatedAt: m.updatedAt, recallCount: m.stats.recallCount })),
      links,
    };
  },

  async insights(ownerId) {
    const list = [...state(ownerId).memories.values()];
    const count = <K extends string>(f: (m: MemoryDTO) => K) => {
      const out = new Map<K, number>();
      for (const m of list) out.set(f(m), (out.get(f(m)) ?? 0) + 1);
      return out;
    };
    return {
      byType: [...count((m) => m.type)].map(([type, c]) => ({ type, count: c })),
      byStatus: [...count((m) => m.status)].map(([status, c]) => ({ status, count: c })),
      recallHitRate: 0.62,
      correctionsThisWeek: list.filter((m) => m.status === "superseded").length,
      storageBytes: list.length * 7_400,
      eventsPerDay: [],
    };
  },

  async pendingCount(ownerId) {
    return [...state(ownerId).memories.values()].filter((m) => m.status === "pending_review").length;
  },

  async seedDemo({ ownerId, spaceIds, conversations }) {
    const s = state(ownerId);
    for (const [id, m] of s.memories) if (m.demo) s.memories.delete(id);
    s.spaceIds = { ...spaceIds };
    const keyToId = new Map(DEMO_MEMORIES.map((d) => [d.key, new ObjectId().toHexString()]));
    const now = Date.now();
    for (const d of DEMO_MEMORIES) {
      const created = new Date(now - d.ageHours * 3_600_000).toISOString();
      const unit: MemoryDTO = {
        id: keyToId.get(d.key)!,
        spaceKey: d.space === "global" ? "global" : s.spaceIds[d.space],
        type: d.type,
        statement: d.statement,
        subject: d.subject,
        attribute: d.attribute,
        value: d.value,
        slotKey: d.subject && d.attribute ? `${d.subject}.${d.attribute}` : undefined,
        entities: d.entities,
        tags: d.tags ?? [],
        importance: d.importance,
        confidence: d.confidence,
        sensitivity: d.sensitivity ?? "none",
        pinned: d.pinned ?? false,
        status: d.status ?? "active",
        source: {
          kind: "seed",
          quote: d.from?.quote,
          conversationId: d.from ? conversations[d.from.conversation]?.conversationId : undefined,
          messageId: d.from ? conversations[d.from.conversation]?.messageIds[d.from.message] : undefined,
          actor: { kind: "user", name: "you" },
        },
        evidenceIds: (d.evidenceKeys ?? []).map((k) => keyToId.get(k)!),
        relatedIds: (d.relatedKeys ?? []).map((k) => keyToId.get(k)!),
        supersededBy: d.supersededByKey ? keyToId.get(d.supersededByKey) : undefined,
        validFrom: created,
        expiresAt: d.expiresInMinutes !== undefined ? new Date(now + d.expiresInMinutes * 60_000).toISOString() : undefined,
        stats: { recallCount: d.recallCount ?? 0, confirmCount: d.confirmCount ?? 0, citedCount: Math.floor((d.recallCount ?? 0) / 2) },
        createdAt: created,
        updatedAt: created,
        demo: true,
      };
      s.memories.set(unit.id, unit);
    }
    for (const d of DEMO_MEMORIES) {
      if (d.supersededByKey) {
        const next = s.memories.get(keyToId.get(d.supersededByKey)!)!;
        next.supersedes = keyToId.get(d.key);
        next.supersedeReason = "update";
      }
    }
    event(s, "created", { spaceKey: "global" }, `Loaded the demo world (${DEMO_MEMORIES.length} memories)`, undefined, "you");
    return { memories: DEMO_MEMORIES.length };
  },

  async removeDemo(ownerId) {
    const s = state(ownerId);
    for (const [id, m] of s.memories) if (m.demo) s.memories.delete(id);
  },

  async listConflicts() { return []; },
  async resolveConflict() { return {status:"not_found",supersededIds:[]}; },
  async createAgentKey() { throw new Error("Agent keys are unavailable in the mock engine"); },
  async verifyAgentKey() { return null; },
  async listAgentKeys() { return []; },
  async revokeAgentKey() { return false; },
  async deleteAll(ownerId) {
    store.delete(ownerId);
  },
};

// ── Optional Mongo persistence (MEMORY_MOCK_STORE=mongo) ─────────────────────────────────────
// On Vercel every route is its own function with its own memory, so a purely in-memory mock
// can't share state between /api/demo/seed and /api/chat. With this flag each call hydrates the
// owner's state from one `mock_state` doc and mutating calls write it back (last write wins —
// fine for a fallback engine). This is what makes build-plan §7's "ship with the mock" real.
const MUTATING = new Set<keyof MemoryEngine>([
  "recall", "extractAndWrite", "rememberExplicit", "correctMemory", "forgetMemory", "reviewMemory",
  "updateMemory", "runReflection", "seedDemo", "removeDemo", "deleteAll",
]);

interface StoredState {
  _id: string;
  memories: MemoryDTO[];
  events: MemoryEventDTO[];
  traces: Array<[string, RecallTrace]>;
  reflections: ReflectionRun[];
  spaceIds: Record<string, string>;
  updatedAt: Date;
}

async function stateCollection() {
  const { db } = await import("@/server/db/client");
  return db().collection<StoredState>("mock_state");
}

async function hydrate(ownerId: string) {
  const doc = await (await stateCollection()).findOne({ _id: ownerId });
  store.set(ownerId, {
    memories: new Map((doc?.memories ?? []).map((m) => [m.id, m])),
    events: doc?.events ?? [],
    traces: new Map(doc?.traces ?? []),
    reflections: doc?.reflections ?? [],
    spaceIds: doc?.spaceIds ?? {},
  });
}

async function persist(ownerId: string) {
  const s = store.get(ownerId);
  const coll = await stateCollection();
  if (!s) {
    await coll.deleteOne({ _id: ownerId });
    return;
  }
  await coll.replaceOne(
    { _id: ownerId },
    {
      memories: [...s.memories.values()],
      events: s.events.slice(-300),
      traces: [...s.traces.entries()].slice(-40),
      reflections: s.reflections.slice(0, 20),
      spaceIds: s.spaceIds,
      updatedAt: new Date(),
    },
    { upsert: true },
  );
}

function ownerOf(args: unknown[]): string | undefined {
  const a = args[0];
  if (typeof a === "string") return a;
  if (a && typeof a === "object" && "ownerId" in a) return (a as { ownerId: string }).ownerId;
  return undefined;
}

function withMongoState(engine: MemoryEngine): MemoryEngine {
  const wrapped = { ...engine } as Record<string, unknown>;
  for (const [key, fn] of Object.entries(engine)) {
    if (key === "preScan" || key === "buildContext" || key === "ghostContext" || key === "verifyAgentKey") continue;
    wrapped[key] = async (...args: unknown[]) => {
      const ownerId = ownerOf(args);
      if (ownerId) await hydrate(ownerId);
      const result = await (fn as (...a: unknown[]) => Promise<unknown>)(...args);
      if (ownerId && MUTATING.has(key as keyof MemoryEngine)) await persist(ownerId);
      return result;
    };
  }
  return wrapped as unknown as MemoryEngine;
}

export const mockEngine: MemoryEngine = process.env.MEMORY_MOCK_STORE === "mongo" ? withMongoState(baseMock) : baseMock;
