import cases from './golden/core.json';
import {gateCandidate} from '../src/server/memory/gate';
import {purgeAt} from '../src/server/memory/lifecycle';
import {neighbourDecision,slotDecision} from '../src/server/memory/reconcile';
import type {CandidateMemory,WritePolicy,MemoryUnit} from '../src/server/memory/types';
/** Evaluation computations: memory-engine.md §9; never substitute pure metrics for live ones. */
export const candidate=(statement:string):CandidateMemory=>({statement,type:'fact',entities:[],importance:7,confidence:.9,sensitivity:'none',scope:'space',explicit:true,hint:'new'});
export function percentile(values:number[],p:number):number|null {if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.max(0,Math.ceil(p*sorted.length)-1)];}
export function jaccard(a:string,b:string):number {const tokens=(s:string)=>new Set(s.toLowerCase().match(/[\p{L}\p{N}]+/gu)??[]),x=tokens(a),y=tokens(b),union=new Set([...x,...y]);return union.size?[...x].filter(t=>y.has(t)).length/union.size:1;}
export function runDeterministic(){
 const rows=cases.map(c=>{const start=performance.now();const actual='kind' in c && c.kind==='slot'?slotDecision({...candidate('Eval value'),value:c.value,validFrom:c.historical?'2026-01-01':undefined},{value:c.previous,validFrom:new Date('2026-10-31')} as MemoryUnit):'kind' in c && c.kind==='ttl'?+purgeAt(new Date(c.lifetime!),new Date(0))-c.lifetime!:c.similarity!==undefined?neighbourDecision(c.similarity,c.sameType??true):gateCandidate({...candidate(c.statement??''),...c.patch} as CandidateMemory,(c.policy??'review_sensitive') as WritePolicy).op;return {id:c.id,expected:c.expected,actual,passed:actual===c.expected,latencyMs:performance.now()-start};});
 const passed=rows.filter(r=>r.passed).length;
 return {mode:'deterministic' as const,samples:rows.length,passed,rows,markdown:`# Memory evaluation\n\nMode: deterministic; ${passed}/${rows.length} pure golden cases passed.\n\nHosted write accuracy, precision@5, secrets stored, memory-changed rate and recall latency: pending (not measured in this mode).\n\n| Case | Passed |\n|---|---|\n${rows.map(r=>`| ${r.id} | ${r.passed} |`).join('\n')}\n`};
}
