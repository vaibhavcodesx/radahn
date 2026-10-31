import "server-only";
/** Profile block: memory-engine.md §7 / C13. Global, non-sensitive evidence only; no additional model call. */
import {createHash} from "node:crypto";
import {ObjectId,type ClientSession} from "mongodb";
import {collections,type ProfileDoc,type ProfileSnapshot} from "@/server/db/collections";
import {preScan} from "./gate";
import type {MemoryUnit} from "./types";
export interface ProfileOutput {text:string;evidenceIds:string[]}
const minDate=(dates:(Date|undefined)[])=>dates.filter((d):d is Date=>d instanceof Date).sort((a,b)=>+a-+b)[0];
function fingerprint(m:MemoryUnit):string {
 return createHash("sha256").update(JSON.stringify([m.statement,m.type,m.spaceKey,m.sensitivity,m.validFrom,m.expiresAt,m.purgeAt,m.evidenceIds])).digest("hex");
}
export function profileEligible(m:MemoryUnit,ownerId:string,now:Date):boolean {
 const scan=preScan(m.statement);
 return m.ownerId===ownerId&&m.spaceKey==="global"&&["profile","fact","preference"].includes(m.type)&&m.sensitivity==="none"&&m.status==="active"&&(!m.expiresAt||+m.expiresAt>+now)&&(!m.purgeAt||+m.purgeAt>+now)&&!scan.injection&&!scan.kinds.length;
}
function safeText(text:string):boolean {
 const scan=preScan(text);
 // Profiles are automatic summaries: never infer consent for sensitive categories.
 return text.trim().length>=3&&text.length<=1200&&!scan.injection&&!scan.kinds.length&&!/\[redacted:|\b(?:diagnos\w*|adhd|depression|medication|salary|income|bank account|credit card|medical|pregnan\w*|sexual\w*|religio\w*|precise location)\b/i.test(text);
}
async function validEvidence(ownerId:string,snapshot:ProfileSnapshot,now:Date,session?:ClientSession,history=false):Promise<boolean> {
 if(!snapshot.evidence.length||snapshot.evidence.length!==snapshot.evidenceIds.length||!safeText(snapshot.text)||(snapshot.expiresAt&&+snapshot.expiresAt<=+now)||(snapshot.purgeAt&&+snapshot.purgeAt<=+now))return false;
 const rows=await collections().memories.find({ownerId,_id:{$in:snapshot.evidenceIds}},session?{session}:{}).toArray();
 const byId=new Map(rows.map(m=>[m._id.toHexString(),m]));
 for(const source of snapshot.evidence){
  if(!snapshot.evidenceIds.some(id=>id.equals(source.id)))return false;
  const m=byId.get(source.id.toHexString());
  if(!m||!profileEligible(history&&m.status==="superseded"?{...m,status:"active"}:m,ownerId,now)||fingerprint(m)!==source.fingerprint)return false;
 }
 return true;
}
/** Called inside reflection's owner lock. Re-read every contributing source, including old stable facts. */
export async function writeProfile(ownerId:string,raw:ProfileOutput|undefined,gathered:MemoryUnit[],session:ClientSession,now=new Date()):Promise<void> {
 if(!raw||!safeText(raw.text)||!raw.evidenceIds.length||raw.evidenceIds.length>60)return;
 const byId=new Map(gathered.map(m=>[m._id.toHexString(),m]));
 const ids=[...new Set(raw.evidenceIds)];
 if(ids.some(id=>!ObjectId.isValid(id)||!byId.has(id)||!profileEligible(byId.get(id)!,ownerId,now)))return;
 const freshRows=await collections().memories.find({ownerId,_id:{$in:ids.map(id=>byId.get(id)!._id)}},{session}).toArray();
 const freshById=new Map(freshRows.map(m=>[m._id.toHexString(),m]));
 const sources:MemoryUnit[]=[];
 for(const id of ids){
  const old=byId.get(id)!;
  const fresh=freshById.get(id);
  if(!fresh||!profileEligible(fresh,ownerId,now)||fingerprint(old)!==fingerprint(fresh))return;sources.push(fresh);
 }
 const prior=await collections().profiles.findOne({_id:ownerId,ownerId},{session});
 const expiresAt=minDate(sources.map(m=>m.expiresAt));
 // Missing source purge is bounded by its expiry, rather than retaining derived text forever.
 const ownPurge=minDate(sources.map(m=>m.purgeAt??m.expiresAt));
 const previous=prior&&await validEvidence(ownerId,prior,now,session,true)?(({text,version,updatedAt,evidenceIds,evidence,expiresAt,purgeAt}:ProfileSnapshot)=>({text,version,updatedAt,evidenceIds,evidence,...(expiresAt?{expiresAt}:{}),...(purgeAt?{purgeAt}:{})}))(prior):undefined;
 // The single physical document contains both snapshots: purge when EITHER snapshot must purge.
 const purgeAt=minDate([ownPurge,previous?.purgeAt]);
 const doc:ProfileDoc={_id:ownerId,ownerId,text:raw.text.trim(),version:(prior?.version??0)+1,updatedAt:now,evidenceIds:sources.map(m=>m._id),evidence:sources.map(m=>({id:m._id,fingerprint:fingerprint(m)})),...(expiresAt?{expiresAt}:{}),...(purgeAt?{purgeAt}:{}),...(previous?{previous}:{})};
 await collections().profiles.replaceOne({_id:ownerId,ownerId},doc,{session,upsert:true});
}
export async function readProfile(ownerId:string,now=new Date()):Promise<string|undefined> {
 try{const doc=await collections().profiles.findOne({_id:ownerId,ownerId});return doc&&doc._id===ownerId&&doc.ownerId===ownerId&&!doc.invalidatedAt&&await validEvidence(ownerId,doc,now)?doc.text:undefined;}catch{return undefined;}
}
/** Invalidate in the source transaction; erasure deletes both snapshots, corrections retain bounded diff history. */
export async function invalidateProfile(ownerId:string,session:ClientSession,affectedIds?:ObjectId[],erase=true):Promise<void> {
 if(affectedIds&&!affectedIds.length)return;
 const filter={_id:ownerId,ownerId,...(affectedIds?{$or:[{evidenceIds:{$in:affectedIds}},{"previous.evidenceIds":{$in:affectedIds}}]}:{})};
 if(erase)await collections().profiles.deleteOne(filter,{session});
 else await collections().profiles.updateOne(filter,{$set:{invalidatedAt:new Date()}},{session});
}
/** Auth handoff: call under both owner locks in the migration transaction; rebuild instead of reusing stale ids. */
export async function migrateProfile(fromOwnerId:string,toOwnerId:string,session:ClientSession):Promise<void> {await invalidateProfile(fromOwnerId,session);if(fromOwnerId!==toOwnerId)await invalidateProfile(toOwnerId,session);}
