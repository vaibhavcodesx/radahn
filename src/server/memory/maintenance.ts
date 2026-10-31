import "server-only";
/** Maintenance: memory-engine.md §3 (expiry), §6.1 (embeddings), TRD §5 (guest erasure). */
import {ObjectId} from "mongodb";
import {collections,OWNED_COLLECTIONS} from "@/server/db/collections";
import {db,mongo} from "@/server/db/client";
import {embed} from "@/server/llm/registry";
import {lockOwner} from "./mutation";
import {flipExpired} from "./lifecycle";

export interface MaintenanceStats {expired:number;embedded:number;embeddingFailures:number;purgedGuests:number;guestFailures:number;budgetExhausted:number;guestPurgeDeferred:number}
const RETENTION=7*86_400_000;
// Small batches keep background work inside M0's shared operation budget.
const BATCH=20;
const eligibleStatuses=["active","pending_review","superseded"] as const;
export async function runMaintenance({now,ownerId,guestActivityGuardReady=false}:{now:Date;ownerId?:string;guestActivityGuardReady?:boolean}):Promise<MaintenanceStats> {
 if(ownerId!==undefined&&!ownerId.trim())throw new Error("Invalid maintenance owner");
 const deadline=Date.now()+60_000;
 const stats:MaintenanceStats={expired:await flipExpired(ownerId,now,deadline),embedded:0,embeddingFailures:0,purgedGuests:0,guestFailures:0,budgetExhausted:0,guestPurgeDeferred:0};
 const exhausted=()=>{if(Date.now()<deadline)return false;stats.budgetExhausted=1;return true;};
 if(exhausted())return stats;
 const c=collections();
 const filter={needsEmbedding:true,status:{$in:[...eligibleStatuses]},$or:[{expiresAt:{$exists:false}},{expiresAt:{$gt:now}}]};
 const owners=ownerId!==undefined?[ownerId]:(await c.memories.find(filter,{projection:{ownerId:1}}).limit(BATCH).toArray()).map(x=>x.ownerId);
 let remaining=BATCH;
 for(const owner of new Set(owners)) {
  if(remaining<=0||exhausted())break;
  const rows=await c.memories.find({ownerId:owner,...filter}).limit(remaining).toArray();remaining-=rows.length;
  if(!rows.length)continue;
  if(exhausted())break;
  try {
   const vectors=await embed(rows.map(row=>({text:row.statement,title:row.type})),"document");
   if(vectors.length!==rows.length||vectors.some(v=>v.length!==768||v.some(n=>!Number.isFinite(n))))throw new Error("Invalid vectors");
   const session=mongo().startSession();
   try { stats.embedded+=await session.withTransaction(async()=>{
   await lockOwner(owner,session);let changed=0;
   for(let i=0;i<rows.length;i++) {
    const row=rows[i];
    const result=await c.memories.updateOne({ownerId:owner,_id:row._id,statement:row.statement,type:row.type,...filter},{$set:{embedding:vectors[i],embeddingModel:"gemini-embedding-2@768"},$unset:{needsEmbedding:""}},{session});
    changed+=result.matchedCount;
   }
   return changed;
   });}finally{await session.endSession();}
  }catch {stats.embeddingFailures+=rows.length;}
 }
 // Explicit scope is the hosted selftest boundary: never discover auth owners here.
 if(ownerId!==undefined||exhausted())return stats;
 if(!guestActivityGuardReady){stats.guestPurgeDeferred=1;return stats;}
 const database=db(),cutoff=new Date(+now-RETENTION);
 const users=database.collection<{_id:ObjectId|string;isAnonymous:boolean;createdAt:Date}>("user");
 // Eligibility precedes the limit: protected old guests cannot starve later candidates.
 // Lookups project IDs only and never fetch tokens, account fields or user content.
 const guests=await users.aggregate<{_id:ObjectId|string}>([
  {$match:{isAnonymous:true,createdAt:{$lt:cutoff}}},
  {$lookup:{from:"session",let:{owner:{$toString:"$_id"}},pipeline:[
   {$match:{$expr:{$eq:[{$toString:"$userId"},"$$owner"]},$or:[{createdAt:{$gte:cutoff}},{updatedAt:{$gte:cutoff}},{expiresAt:{$gte:cutoff}}]}},
   {$project:{_id:1}},{$limit:1}],as:"activeSessions"}},
  {$match:{"activeSessions.0":{$exists:false}}},
  {$lookup:{from:"user_settings",let:{owner:{$toString:"$_id"}},pipeline:[
   {$match:{$expr:{$eq:["$_id","$$owner"]},$nor:[{updatedAt:{$lt:cutoff}}]}},
   {$project:{_id:1}},{$limit:1}],as:"activeSettings"}},
  {$match:{"activeSettings.0":{$exists:false}}},{$limit:25},{$project:{_id:1}}
 ]).toArray();
 for(const guest of guests) {
  if(exhausted())break;
  const id=guest._id;
  if(!(id instanceof ObjectId)&&!(typeof id==="string"&&ObjectId.isValid(id)))continue;
  const owner=String(id),ids=[owner,new ObjectId(owner)];
  const session=mongo().startSession();
  try {
   const purged=await session.withTransaction(async()=>{
    // Read before lockOwner's timestamp write. Snapshot isolation + its write conflict
    // ensure concurrent settings mutations retry and get re-evaluated conservatively.
    const before=await c.settings.findOne({_id:owner},{session});
    if(before&&(!before.updatedAt||+before.updatedAt>=+cutoff))return false;
    await lockOwner(owner,session);
    const after=await c.settings.findOne({_id:owner},{session});
    if(after?.memoryRevision!==(before?.memoryRevision??0)+1)return false;
    const user=await users.findOne({_id:{$in:ids},isAnonymous:true,createdAt:{$lt:cutoff}},{session,projection:{_id:1}});
    if(!user)return false;
    const active=await database.collection("session").findOne({userId:{$in:ids},$or:[{createdAt:{$gte:cutoff}},{updatedAt:{$gte:cutoff}},{expiresAt:{$gte:cutoff}}]},{session,projection:{_id:1}});
    if(active)return false;
    for(const name of OWNED_COLLECTIONS)await database.collection(name).deleteMany({ownerId:owner},{session});
    await database.collection<{_id:string}>("profiles").deleteMany({_id:owner},{session});
    await c.settings.deleteOne({_id:owner},{session});
    await database.collection("session").deleteMany({userId:{$in:ids}},{session});
    await database.collection("account").deleteMany({userId:{$in:ids}},{session});
    const result=await users.deleteOne({_id:id,isAnonymous:true,createdAt:{$lt:cutoff}},{session});
    if(result.deletedCount!==1)throw new Error("Guest eligibility changed");
    return true;
   });
   if(purged)stats.purgedGuests++;
  }catch {stats.guestFailures++;}finally {await session.endSession();}
  // Roughly 20 commands/guest; pace outside transactions to share M0 capacity.
  await new Promise(resolve=>setTimeout(resolve,250));
 }
 return stats;
}





/** Auth integration guard: call before every session create/update and account link.
 * A false result MUST reject that auth mutation; callers enable guest purge only once
 * every such path participates. Sharing the owner lock closes the session phantom race.
 */
export async function noteOwnerActivity(ownerId:string,now=new Date()):Promise<boolean> {
 if(!ObjectId.isValid(ownerId)||!Number.isFinite(+now))throw new Error("Invalid owner activity");
 const session=mongo().startSession();
 const missing=new Error("Owner no longer exists");
 try {
  return await session.withTransaction(async()=>{
   await lockOwner(ownerId,session);
   const user=await db().collection<{_id:ObjectId|string}>("user").findOne({_id:{$in:[ownerId,new ObjectId(ownerId)]}},{session,projection:{_id:1}});
   if(!user)throw missing;
   await collections().settings.updateOne({_id:ownerId},{$set:{updatedAt:now}},{session});
   return true;
  });
 }catch(error){if(error===missing)return false;throw error;}finally{await session.endSession();}
}


