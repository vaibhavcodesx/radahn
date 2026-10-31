import "server-only";
/** Explicit tools and lifecycle reads: memory-engine.md §3/§6.3; CODEX_TASKS C5. */
import { ObjectId, type ClientSession, type Filter, type UpdateFilter } from "mongodb";
import { collections } from "@/server/db/collections";
import { mongo } from "@/server/db/client";
import { embed } from "@/server/llm/registry";
import { gateCandidate } from "./gate";
import {parseAsOf,historicalFilter,isHistoricalMemory,historicalMetadata} from "./historical";
import { memoryDTO, eventDTO } from "./serialize";
import { purgeAt } from "./lifecycle";
import { lockOwner } from "./mutation";
import { contentHash } from "./reconcile";
import { writeCandidates } from "./write";
import { score } from "./score";
import type {CorrectInput,CorrectResult,ForgetInput,ForgetResult,ReviewInput,UpdateMemoryInput,MemoryDTO,ListMemoriesInput,MemoryDetail,MemoryUnit,Actor,MemoryEventKind,RecallPick,CandidateMemory} from "./types";
import { PinBudgetError } from "./errors";
export { PinBudgetError } from "./errors";
const id=(value:string)=>ObjectId.isValid(value)?new ObjectId(value):null;
const regex=(text:string)=>new RegExp(text.slice(0,500).replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"i");
async function transaction<T>(ownerId:string,fn:(session:ClientSession)=>Promise<T>):Promise<T> {
  const session=mongo().startSession();
  try{return await session.withTransaction(async()=>{await lockOwner(ownerId,session);return fn(session);});}finally{await session.endSession();}
}
async function event(ownerId:string,unit:MemoryUnit,kind:MemoryEventKind,actor:Actor,session:ClientSession,diff?:{before?:string;after?:string}) {
  await collections().events.insertOne({_id:new ObjectId(),ownerId,spaceKey:unit.spaceKey,memoryId:unit._id,type:unit.type,kind,actor,summary:kind==="forgotten"?"Memory forgotten":`${kind} memory`,...(diff?{diff}:{}),at:new Date()},{session});
}
async function targets(input:{ownerId:string;memoryId?:string;targetRef?:string;refs?:Record<string,string>;query?:string;spaceKey?:string},anyStatus=false):Promise<MemoryUnit[]> {
  const key=input.memoryId ?? (input.targetRef?input.refs?.[input.targetRef]:undefined);
  if(input.memoryId || input.targetRef) {
    const _id=key?id(key):null;if(!_id)return [];
    const unit=await collections().memories.findOne({ownerId:input.ownerId,_id,...(anyStatus?{}:{status:"active"})});
    return unit && unit.ownerId===input.ownerId?[unit]:[];
  }
  if(!input.query?.trim())return [];
  return collections().memories.find({ownerId:input.ownerId,status:{$in:anyStatus?["active","pending_review"]:["active"]},...(input.spaceKey?{spaceKey:{$in:[input.spaceKey,"global"]}}:{}),statement:regex(input.query)}).sort({importance:-1}).limit(6).toArray();
}
async function pinBudget(ownerId:string,unit:MemoryUnit,session:ClientSession):Promise<void> {
  if(!unit.pinned || unit.status!=="active" || (unit.expiresAt && +unit.expiresAt<=Date.now()))return;
  const pins=await collections().memories.find({ownerId,pinned:true,status:"active",$or:[{expiresAt:{$exists:false}},{expiresAt:{$gt:new Date()}}]},{session}).toArray();
  if(pins.filter(p=>!p._id.equals(unit._id)).reduce((sum,p)=>sum+p.statement.length,0)+unit.statement.length>1500)throw new PinBudgetError();
}
export async function correctMemory(input:CorrectInput):Promise<CorrectResult> {
  const matches=await targets(input);
  if(!matches.length)return {status:"not_found"};
  if(matches.length>1)return {status:"ambiguous",candidates:matches.map(memoryDTO)};
  const before=matches[0],now=new Date();
  const target:RecallPick={ref:"target",memoryId:before._id.toHexString(),type:before.type,statement:before.statement,final:1,scores:score(before,{ranks:{}},"general",0,now),reasons:[],why:"explicit correction",status:before.status,ageDays:0,confirmCount:before.stats.confirmCount};
  const candidate:CandidateMemory={statement:input.newStatement,type:before.type,subject:before.subject,attribute:before.attribute,entities:before.entities,importance:before.importance,confidence:0.95,sensitivity:before.sensitivity,scope:before.spaceKey==="global"?"global":"space",expiresAt:before.expiresAt?.toISOString(),explicit:true,hint:"update",targetRef:"target"};
  const result=await writeCandidates([candidate],{ownerId:input.ownerId,spaceKey:before.spaceKey,now,policy:"review_sensitive",source:{kind:"tool",actor:input.actor},recalled:[target],reason:input.reason??"correction"});
  if(result.ops[0]?.op==="blocked")return {status:"blocked"};
  const key=result.ops[0]?.memoryId;
  const after=key?await collections().memories.findOne({ownerId:input.ownerId,_id:new ObjectId(key)}):null;
  return after?{status:"updated",before:memoryDTO(before),after:memoryDTO(after)}:{status:"not_found"};
}
export async function forgetMemory(input:ForgetInput):Promise<ForgetResult> {
  const matches=await targets(input,true);
  if(!matches.length)return {status:"not_found"};
  if(matches.length>1)return {status:"ambiguous",candidates:matches.map(memoryDTO)};
  const unit=matches[0];
  return transaction(input.ownerId,async session=>{
    const result=await collections().memories.deleteOne({ownerId:input.ownerId,_id:unit._id},{session});
    if(!result.deletedCount)return {status:"not_found"};
    await event(input.ownerId,unit,"forgotten",input.actor,session);
    return {status:"forgotten",forgotten:{id:unit._id.toHexString(),type:unit.type}};
  });
}
export async function reviewMemory(input:ReviewInput):Promise<MemoryDTO|null> {
  const _id=id(input.memoryId);if(!_id)return null;
  const c=collections();
  const initial=await c.memories.findOne({ownerId:input.ownerId,_id,status:"pending_review"});
  if(!initial || initial.ownerId!==input.ownerId)return null;
  let updated={...initial,...input.edits};
  if(input.decision==="approve") {
    const gate=gateCandidate({statement:updated.statement,type:updated.type,entities:updated.entities,importance:updated.importance,confidence:updated.confidence,sensitivity:updated.sensitivity,scope:updated.spaceKey==="global"?"global":"space",explicit:true,hint:"new"},"review_sensitive");
    if(gate.op==="blocked" || gate.op==="skip")throw new Error("Review edit blocked by memory policy");
    updated.statement=gate.candidate!.statement;
    if(updated.statement!==initial.statement || updated.type!==initial.type) {
      try{updated.embedding=(await embed([{text:updated.statement,title:updated.type}],"document"))[0];updated.needsEmbedding=false;}catch{updated.embedding=Array(768).fill(0);updated.needsEmbedding=true;}
    }
  }
  return transaction(input.ownerId,async session=>{
    const current=await c.memories.findOne({ownerId:input.ownerId,_id,status:"pending_review"},{session});
    if(!current)return null;
    const now=new Date();updated={...current,...input.edits,statement:updated.statement,...(updated.embedding!==initial.embedding?{embedding:updated.embedding,needsEmbedding:updated.needsEmbedding}:{}),updatedAt:now};
    const set:Partial<MemoryUnit>={updatedAt:now};
    const unset:Record<string, "">={};
    if(input.edits?.statement!==undefined && updated.statement!==initial.statement){delete updated.value;unset.value="";}
    if(input.decision==="reject") {updated.status="rejected";updated.purgeAt=new Date(+now+86400000);Object.assign(set,{status:updated.status,purgeAt:updated.purgeAt});}
    else {
      updated.status=updated.expiresAt && +updated.expiresAt<=+now?"expired":"active";
      if(updated.slotKey && updated.status==="active") {
        const active=await c.memories.findOne({ownerId:input.ownerId,spaceKey:updated.spaceKey,slotKey:updated.slotKey,status:"active",_id:{$ne:_id}},{session});
        if(active) {
          if(+updated.validFrom<+active.validFrom) {updated.status="superseded";updated.validTo=active.validFrom;updated.supersededBy=active._id;Object.assign(set,{validTo:updated.validTo,supersededBy:active._id});}
          else {await c.memories.updateOne({ownerId:input.ownerId,_id:active._id,status:"active"},{$set:{status:"superseded",validTo:updated.validFrom,supersededBy:_id,updatedAt:now,supersedeReason:"update"}},{session});updated.supersedes=active._id;set.supersedes=active._id;await event(input.ownerId,active,"superseded",input.actor,session);}
        }
      }
      await pinBudget(input.ownerId,updated,session);
      Object.assign(set,{statement:updated.statement,type:updated.type,spaceKey:updated.spaceKey,importance:updated.importance,sensitivity:updated.sensitivity,status:updated.status,embedding:updated.embedding,needsEmbedding:updated.needsEmbedding??false,contentHash:contentHash(updated.statement)});
    }
    const result=await c.memories.updateOne({ownerId:input.ownerId,_id,status:"pending_review"},{$set:set,...(Object.keys(unset).length?{$unset:unset}:{})},{session});
    if(!result.matchedCount)return null;
    await event(input.ownerId,updated,input.decision==="approve"?"approved":"rejected",input.actor,session);
    return memoryDTO(updated);
  });
}
export async function updateMemory(input:UpdateMemoryInput):Promise<MemoryDTO|null> {
  const _id=id(input.memoryId);if(!_id)return null;
  return transaction(input.ownerId,async session=>{
    const c=collections(),unit=await c.memories.findOne({ownerId:input.ownerId,_id},{session});if(!unit || unit.ownerId!==input.ownerId)return null;
    const next={...unit},set:Partial<MemoryUnit>={updatedAt:new Date()},unset:Record<string, "">={};
    for(const key of ["pinned","spaceKey","importance","type"] as const) if(input.patch[key]!==undefined)Object.assign(set,{[key]:input.patch[key]});
    Object.assign(next,set);
    if(input.patch.expiresAt===null) {delete next.expiresAt;delete next.purgeAt;unset.expiresAt="";unset.purgeAt="";}
    else if(input.patch.expiresAt!==undefined) {const date=new Date(input.patch.expiresAt);if(!Number.isFinite(+date))throw new Error("Invalid expiry");next.expiresAt=date;next.purgeAt=purgeAt(date,unit.createdAt);set.expiresAt=next.expiresAt;set.purgeAt=next.purgeAt;}
    await pinBudget(input.ownerId,next,session);
    const update:UpdateFilter<MemoryUnit>={$set:set,...(Object.keys(unset).length?{$unset:unset}:{})};
    const result=await c.memories.updateOne({ownerId:input.ownerId,_id},update,{session});if(!result.matchedCount)return null;
    await event(input.ownerId,next,input.patch.pinned===undefined?"updated":input.patch.pinned?"pinned":"unpinned",input.actor,session);
    return memoryDTO(next);
  });
}
export async function listMemories(input:ListMemoriesInput):Promise<MemoryDTO[]> {
  const at=parseAsOf(input.asOf),c=collections(),filter:Filter<MemoryUnit>={ownerId:input.ownerId};
  const space=input.spaceKey ?? (await c.settings.findOne({_id:input.ownerId}))?.currentSpaceId ?? "global";
  if(space!=="all")filter.spaceKey={$in:[...new Set([space,"global"])]};
  filter.status={$in:input.statuses?.length?input.statuses:["active","pending_review","superseded"]};
  if(at)Object.assign(filter,historicalFilter(at),{status:{$in:(input.statuses?.length?input.statuses:["active","superseded"]).filter(s=>s==="active" || s==="superseded")}});
  if(input.types?.length)filter.type={$in:input.types};
  if(input.q?.trim())filter.statement=regex(input.q.trim());
  const field={updated:"updatedAt",importance:"importance",recalled:"stats.recallCount",created:"createdAt"}[input.sort??"updated"];
  return (await c.memories.find(filter).sort({[field]:-1,_id:-1}).limit(Math.max(1,Math.min(input.limit??200,500))).toArray()).filter(m=>!at || (m.ownerId===input.ownerId && (space==="all" || [space,"global"].includes(m.spaceKey)) && isHistoricalMemory(m,at) && (!input.statuses?.length || input.statuses.includes(m.status)))).map(m=>memoryDTO(at?historicalMetadata(m,at):m));
}
export async function getMemory(ownerId:string,memoryId:string):Promise<MemoryDetail|null> {
  const _id=id(memoryId);if(!_id)return null;
  const c=collections(),unit=await c.memories.findOne({ownerId,_id});if(!unit || unit.ownerId!==ownerId)return null;
  const versions=new Map<string,MemoryUnit>([[memoryId,unit]]),queue=[unit];
  while(queue.length && versions.size<100) {
    const row=queue.shift()!;
    for(const linked of [row.supersedes,row.supersededBy]) if(linked && !versions.has(linked.toHexString())) {
      const next=await c.memories.findOne({ownerId,_id:linked});if(next && next.ownerId===ownerId){versions.set(linked.toHexString(),next);queue.push(next);}
    }
  }
  const [evidence,related,recalls,events]=await Promise.all([
    c.memories.find({ownerId,_id:{$in:unit.evidenceIds}}).toArray(),c.memories.find({ownerId,_id:{$in:unit.relatedIds}}).toArray(),
    c.recalls.find({ownerId,"candidates.memoryId":memoryId}).sort({createdAt:-1}).limit(50).toArray(),
    c.events.find({ownerId,memoryId:{$in:[...versions.values()].map(m=>m._id)}}).sort({at:-1}).limit(100).toArray(),
  ]);
  return {memory:memoryDTO(unit),versions:[...versions.values()].sort((a,b)=>+a.validFrom-+b.validFrom).map(memoryDTO),evidence:evidence.map(memoryDTO),related:related.map(memoryDTO),recallHistory:recalls.flatMap(r=>{const candidate=r.candidates.find(m=>m.memoryId===memoryId && m.selected);return candidate?[{recallId:r._id.toHexString(),messageId:r.messageId,conversationId:r.conversationId,final:candidate.scores.final,at:r.createdAt.toISOString()}]:[];}),events:events.map(eventDTO),raw:{...unit,embedding:"[768 floats]"}};
}
export async function listEvents(ownerId:string,opts:{limit?:number;after?:string;messageId?:string}={}) {
  const filter:Filter<import("./types").MemoryEvent>={ownerId};
  if(opts.messageId)filter.messageId=opts.messageId;
  if(opts.after) {const after=id(opts.after);if(after)filter._id={$gt:after};else {const date=new Date(opts.after);if(Number.isFinite(+date))filter.at={$gt:date};}}
  return (await collections().events.find(filter).sort({at:-1,_id:-1}).limit(Math.max(1,Math.min(opts.limit??100,500))).toArray()).map(eventDTO);
}
export async function pendingCount(ownerId:string):Promise<number> {return collections().memories.countDocuments({ownerId,status:"pending_review"});}
