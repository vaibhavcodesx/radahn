/** Changed-notice eligibility: memory-engine.md §5.6 / K2. Pure; announcement claims happen in recall. */
import type {MemoryUnit} from './types';
import type {Ranked} from './score';
import {normalise} from './reconcile';
const words=(value:string)=>new Set(normalise(value).match(/[\p{L}\p{N}]+/gu)??[]);
export function shouldAnnounceChange(old:MemoryUnit,current:Ranked):boolean {
 const unit=current.unit;
 if(!old.slotKey||old.slotKey!==unit.slotKey||!old.value||!unit.value||normalise(old.value)===normalise(unit.value))return false;
 // Adding detail to the same value (student -> student, second year) is a refinement.
 const before=words(old.value),after=words(unit.value);
 const reversal=/\b(?:not|no|never|without|former(?:ly)?|previous(?:ly)?|stopped|ceased|ex)\b/i.test(`${old.value} ${unit.value}`);
 if(["profile","fact","preference"].includes(unit.type)&&!reversal&&before.size>0&&[...before].every(token=>after.has(token)))return false;
 if(unit.stats.lastRecalledAt&&+unit.stats.lastRecalledAt>=+old.updatedAt)return false;
 // Query relevance must outweigh recency/importance/confidence, with real semantic/lexical support.
 const background=.15*current.scores.recency+.15*current.scores.importance+.10*current.scores.confidence+current.scores.typeBoost;
 const relevance=current.scores.final-background;
 const semantic=current.hits.semanticSimilarity??current.hits.vector??current.scores.vector??0;
 return current.scores.final>=.5&&relevance>=background&&Boolean(current.hits.ranks.lexical||(current.hits.ranks.semantic&&semantic>=.7));
}

