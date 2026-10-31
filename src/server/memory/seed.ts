/** Demo seed: memory-engine.md §2–§3 and TRD §15. Runtime uses precomputed synthetic vectors only. */
import { ObjectId } from "mongodb";
import { mongo } from "@/server/db/client";
import {invalidateProfile} from "./profile";
import { lockOwner } from "./mutation";
import { collections } from "@/server/db/collections";
import { DEMO_MEMORIES } from "./fixtures/demo";
import type { MemoryUnit, SeedDemoInput, SeedResult } from "./types";
import { purgeAt } from "./lifecycle";
import { contentHash } from "./reconcile";
import fixture from "../../../scripts/fixtures/demo-embeddings.json";

export async function seedDemo({ownerId,spaceIds,conversations}:SeedDemoInput):Promise<SeedResult> {
 const now=new Date();
 const ids=new Map(DEMO_MEMORIES.map(d=>[d.key,new ObjectId()]));
 const entries=fixture.entries as Record<string,{hash:string;vector:number[]}>;
 const rows:MemoryUnit[]=DEMO_MEMORIES.map(d=>{
  const item=entries[d.key];
  if(fixture.model!=="gemini-embedding-2@768" || !item || item.hash!==contentHash(d.statement) || item.vector.length!==768 || !item.vector.every(Number.isFinite) || !item.vector.some(n=>n!==0))throw new Error("Demo embedding fixture is stale or invalid; regenerate it");
  const createdAt=new Date(+now-d.ageHours*3600000);
  const expiresAt=d.expiresInMinutes===undefined?undefined:new Date(+now+d.expiresInMinutes*60000);
  const from=d.from;const conversation=from?conversations[from.conversation]:undefined;
  const previous=DEMO_MEMORIES.find(previous=>previous.supersededByKey===d.key);
  return {_id:ids.get(d.key)!,ownerId,spaceKey:d.space==="global"?"global":spaceIds[d.space],type:d.type,statement:d.statement,contentHash:item.hash,
   ...(d.subject!==undefined?{subject:d.subject}:{}),...(d.attribute!==undefined?{attribute:d.attribute}:{}),...(d.value!==undefined?{value:d.value}:{}),
   ...(d.subject&&d.attribute&&!d.unresolvedConflict?{slotKey:`${d.subject}.${d.attribute}`}:{ }),entities:[...d.entities],tags:[...(d.tags??[])],importance:d.importance,confidence:d.confidence,sensitivity:d.sensitivity??"none",pinned:d.pinned??false,status:d.status??"active",
   source:{kind:"seed",actor:{kind:"user",name:"you"},...(from?{quote:from.quote.slice(0,200)}:{}),...(conversation?{conversationId:conversation.conversationId}:{}),...(from&&conversation?.messageIds[from.message]?{messageId:conversation.messageIds[from.message]}:{})},
   evidenceIds:(d.evidenceKeys??[]).map(k=>ids.get(k)!),relatedIds:(d.relatedKeys??[]).map(k=>ids.get(k)!),
   ...(d.supersededByKey?{supersededBy:ids.get(d.supersededByKey)!,validTo:new Date(+now-DEMO_MEMORIES.find(next=>next.key===d.supersededByKey)!.ageHours*3600000)}:{}),
   ...(previous?{supersedes:ids.get(previous.key)!,supersedeReason:"update" as const}:{}),validFrom:createdAt,...(expiresAt?{expiresAt,purgeAt:purgeAt(expiresAt,createdAt)}:{}),stats:{recallCount:d.recallCount??0,confirmCount:d.confirmCount??0,citedCount:Math.floor((d.recallCount??0)/2)},embedding:[...item.vector],embeddingModel:"gemini-embedding-2@768",createdAt,updatedAt:createdAt,demo:true};
 });
 const c=collections();
 const session=mongo().startSession();
 try{await session.withTransaction(async()=>{
 await lockOwner(ownerId,session);
 await invalidateProfile(ownerId,session);
 const existing=await c.memories.find({ownerId,demo:{$ne:true},status:"active",slotKey:{$exists:true}},{session}).toArray();
 const occupied=new Set(existing.map(m=>`${m.spaceKey}:${m.slotKey}`));
 // User truth wins: retain colliding synthetic facts for review instead of replacing it.
 const batch=rows.map(m=>m.status==="active" && m.slotKey && occupied.has(`${m.spaceKey}:${m.slotKey}`)?{...m,status:"pending_review" as const}:m);
 await c.memories.deleteMany({ownerId,demo:true},{session});
 await c.memories.insertMany(batch,{session});
 await c.events.insertOne({_id:new ObjectId(),ownerId,spaceKey:"global",kind:"created",actor:{kind:"user",name:"you"},summary:`Loaded the demo world (${rows.length} memories)`,at:now},{session});
 });}finally{await session.endSession();}
 return {memories:rows.length};
}
/** Cleanup shares reflection's owner lock so derived memories cannot outlive a concurrent deletion. */
export async function removeDemo(ownerId:string):Promise<void>{
 const session=mongo().startSession();
 try{await session.withTransaction(async()=>{
  await lockOwner(ownerId,session);
 await invalidateProfile(ownerId,session);
  await collections().memories.deleteMany({ownerId,demo:true},{session});
 });}finally{await session.endSession();}
}
export async function deleteAll(ownerId:string):Promise<void>{
 const c=collections(),session=mongo().startSession();
 try{await session.withTransaction(async()=>{
  await lockOwner(ownerId,session);
 await invalidateProfile(ownerId,session);
  // MongoDB transactions require sequential operations on their shared session.
  for(const collection of [c.memories,c.events,c.recalls,c.reflections])await collection.deleteMany({ownerId},{session});
 });}finally{await session.endSession();}
}

