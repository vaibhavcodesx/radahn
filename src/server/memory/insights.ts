import 'server-only';
/** Owner analytics and graph: memory-engine.md §5.6, §9; TRD Insights contract. */
import { collections } from '@/server/db/collections';
import type { GraphNode,GraphLink,Insights,MemoryType,MemoryStatus } from './types';
export async function insights(ownerId:string,spaceKey='all',now=new Date()):Promise<Insights> {
 const c=collections(), scoped={ownerId,...(spaceKey==='all'?{}:{spaceKey})};
 const since=new Date(+now-7*86400000);
 const group=(field:string)=>[{$group:{_id:`$${field}`,count:{$sum:1}}},{$project:{_id:0,[field]:'$_id',count:1}}];
 type Stats={byType:Insights['byType'];byStatus:Insights['byStatus'];storage:{count:number}[];corrections:{count:number}[]};
 const [stats,recalls,citations,events]=await Promise.all([
 c.memories.aggregate<Stats>([{$match:scoped},{$facet:{byType:group('type'),byStatus:group('status'),storage:[{$group:{_id:null,count:{$sum:{$bsonSize:'$$ROOT'}}}}],corrections:[{$match:{status:'superseded',supersedeReason:'correction',updatedAt:{$gte:since,$lte:now}}},{$count:'count'}]}}]).toArray(),
 // Count selected units per trace, restricted to the requested memory space via lookup.
 c.recalls.aggregate<{count:number}>([{$match:{ownerId,createdAt:{$gte:since,$lte:now}}},{$unwind:'$picks'},...(spaceKey==='all'?[]:[{$lookup:{from:'memories',let:{id:'$picks.memoryId'},pipeline:[{$match:scoped},{$match:{$expr:{$eq:[{$toString:'$_id'},'$$id']}}}],as:'scopedMemory'}},{$match:{'scopedMemory.0':{$exists:true}}}]),{$count:'count'}]).toArray(),
 // Distinct citations per assistant message; repeated markup does not inflate use.
 c.messages.aggregate<{count:number}>([{$match:{ownerId,role:'assistant',createdAt:{$gte:since,$lte:now}}},{$project:{ids:{$setUnion:[{$ifNull:['$citedMemoryIds',[]]},[]]}}},{$unwind:'$ids'},...(spaceKey==='all'?[]:[{$lookup:{from:'memories',let:{id:'$ids'},pipeline:[{$match:scoped},{$match:{$expr:{$eq:[{$toString:'$_id'},'$$id']}}}],as:'scopedMemory'}},{$match:{'scopedMemory.0':{$exists:true}}}]),{$count:'count'}]).toArray(),
 c.events.aggregate<{day:string;count:number}>([{$match:{...scoped,at:{$gte:since,$lte:now}}},{$group:{_id:{$dateToString:{date:'$at',format:'%Y-%m-%d',timezone:'UTC'}},count:{$sum:1}}},{$project:{_id:0,day:'$_id',count:1}},{$sort:{day:1}}]).toArray(),
 ]);
 const s=stats[0],denominator=recalls[0]?.count??0;
 return {byType:s?.byType??[],byStatus:s?.byStatus??[],storageBytes:s?.storage[0]?.count??0,correctionsThisWeek:s?.corrections[0]?.count??0,recallHitRate:denominator?Math.min(1,Math.max(0,(citations[0]?.count??0)/denominator)):0,eventsPerDay:events};
}
/** 1000 most recently updated units bound Field payload and graph work on M0. */
export async function graph(ownerId:string,spaceKey='all'):Promise<{nodes:GraphNode[];links:GraphLink[]}> {
 const rows=await collections().memories.find({ownerId,...(spaceKey==='all'?{}:{spaceKey})},{projection:{embedding:0,source:0}}).sort({updatedAt:-1,_id:1}).limit(1000).toArray();
 const ids=new Set(rows.map(m=>m._id.toString())),links:GraphLink[]=[],seen=new Set<string>();
 const link=(source:string,target:string,kind:GraphLink['kind'])=>{if(source===target||!ids.has(source)||!ids.has(target))return;if(kind==='related' && source>target)[source,target]=[target,source];const key=`${kind}:${source}:${target}`;if(!seen.has(key)){seen.add(key);links.push({source,target,kind});}};
 for(const m of rows){const id=m._id.toString();if(m.supersededBy)link(id,m.supersededBy.toString(),'supersede');if(m.supersedes)link(m.supersedes.toString(),id,'supersede');for(const e of m.evidenceIds)link(e.toString(),id,'evidence');for(const r of m.relatedIds)link(id,r.toString(),'related');}
 const nodes=rows.map(m=>({id:m._id.toString(),type:m.type as MemoryType,status:m.status as MemoryStatus,statement:m.statement,importance:m.importance,spaceKey:m.spaceKey,updatedAt:m.updatedAt.toISOString(),recallCount:m.stats.recallCount}));
 return {nodes,links};
}
