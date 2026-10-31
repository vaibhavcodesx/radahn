/** Deterministic recall scoring: memory-engine.md §5.3–§5.5. */
import type { MemoryUnit, MemoryType, RecallIntent, ScoreBreakdown, RecallChannel } from "./types";
export interface Hits { ranks: Partial<Record<RecallChannel, number>>; vector?: number; semanticSimilarity?: number }
export interface Ranked { unit: MemoryUnit; hits: Hits; scores: ScoreBreakdown; selected: boolean; droppedBy?: "threshold" | "mmr" | "budget" }
const HALF_LIFE: Record<MemoryType, number> = { profile: Infinity, preference: 90, fact: 60, goal: 14, constraint: 14, decision: 30, outcome: 30, feedback: 21, strategy: Infinity, observation: 60 };
export function cosine(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length) return 0;
  let dot = 0, aa = 0, bb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; aa += a[i] ** 2; bb += b[i] ** 2; }
  return aa && bb ? Math.max(-1, Math.min(1, dot / Math.sqrt(aa * bb))) : 0;
}
export function rrf(ranks: number[], channels: number): number {
  if (!channels) return 0;
  return Math.min(1, ranks.reduce((sum, rank) => sum + 1 / (60 + Math.max(1, rank)), 0) / (channels / 61));
}
export function score(unit: MemoryUnit, hits: Hits, intent: RecallIntent, channels: number, now: Date): ScoreBreakdown {
  const age = Math.max(0, (+now - Math.max(+unit.updatedAt, +(unit.stats.lastConfirmedAt ?? unit.updatedAt))) / 86_400_000);
  const recency = Math.pow(0.5, age / HALF_LIFE[unit.type]);
  const importance = unit.importance / 10;
  const typeBoost = (intent === "plan" && ["constraint", "goal", "decision", "preference"].includes(unit.type)) || (intent === "recall" && ["fact", "decision", "outcome"].includes(unit.type)) ? 0.10 : 0;
  const fused = rrf(Object.values(hits.ranks), channels);
  // Compute cosine from stored/query embeddings upstream; do not assume search-score normalization.
  // Semantic strength gets 75% of relevance so repeated incidental words/entities cannot outvote meaning.
  const semantic = hits.semanticSimilarity === undefined ? undefined : Math.max(0, Math.min(1, hits.semanticSimilarity));
  const relevance = semantic === undefined ? fused : 0.75 * semantic + 0.25 * fused;
  return { vector: hits.vector, lexicalRank: hits.ranks.lexical, temporalRank: hits.ranks.temporal, graphRank: hits.ranks.graph, rrf: fused, recency, importance, confidence: unit.confidence, typeBoost, final: 0.55 * relevance + 0.15 * recency + 0.15 * importance + 0.10 * unit.confidence + typeBoost };
}
export function select(rows: Ranked[], opts: { maxUnits?: number; maxTokens?: number; preserveSemanticBest?: boolean } = {}): Ranked[] {
  const maxUnits = Math.max(0, Math.min(8, opts.maxUnits ?? 8));
  const maxTokens = Math.max(0, Math.min(1200, opts.maxTokens ?? 1200));
  const pool = rows.filter(row => {
    row.selected = false; delete row.droppedBy;
    if (row.unit.pinned || row.unit.type === "strategy") return false;
    const otherHit = Object.keys(row.hits.ranks).some(key => key !== "semantic");
    if (row.scores.final < 0.35 || (!otherHit && (row.hits.semanticSimilarity === undefined ? (row.hits.vector ?? 0) < 0.55 : row.hits.semanticSimilarity < 0.3))) { row.droppedBy = "threshold"; return false; }
    return true;
  });
  // One focused semantic leader survives multi-channel keyword voting; no type is forced.
  const semanticBest=opts.preserveSemanticBest ? pool.filter(r=>(r.hits.semanticSimilarity??0)>=0.55).sort((a,b)=>(b.hits.semanticSimilarity??0)-(a.hits.semanticSimilarity??0))[0] : undefined;
  const picked: Ranked[] = [];
  let tokens = 0;
  while (pool.length) {
    let best = 0, bestUtility = -Infinity;
    pool.forEach((row, i) => {
      const similarity = picked.reduce((max, p) => Math.max(max, cosine(p.unit.embedding, row.unit.embedding)), 0);
      const utility = !picked.length && row===semanticBest ? Infinity : 0.7 * row.scores.final - 0.3 * similarity;
      if (utility > bestUtility) { best = i; bestUtility = utility; }
    });
    const [row] = pool.splice(best, 1);
    const duplicate = picked.some(p => {
      const conflict = p.unit.slotKey && p.unit.slotKey === row.unit.slotKey && p.unit.value !== row.unit.value;
      // 0.95 suppresses near-identical facts after MMR ordering; retain conflicts for clarification.
      return !conflict && p.unit.type === row.unit.type && cosine(p.unit.embedding, row.unit.embedding) >= 0.95;
    });
    if (duplicate) { row.droppedBy = "mmr"; continue; }
    const cost = Math.ceil((row.unit.statement.length + 64) / 4); // Include ref/type/age metadata.
    if (picked.length >= maxUnits || tokens + cost > maxTokens) { row.droppedBy = "budget"; continue; }
    row.selected = true; tokens += cost; picked.push(row);
  }
  return picked;
}
