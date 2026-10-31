/** Agent credentials: memory-engine.md §8. Only SHA-256 digests persist. */
import "server-only";
import {createHash,randomBytes} from "node:crypto";
import {ObjectId,type ClientSession} from "mongodb";
import {mongo} from "@/server/db/client";
import {lockOwner} from "./mutation";
import {collections,type AgentKeyDoc} from "@/server/db/collections";
import {preScan} from "./gate";
import type {SpaceKey} from "./types";
export interface CreatedAgentKey {id:string;key:string;prefix:string}
export interface VerifiedAgentKey {ownerId:string;spaceKeys:SpaceKey[];name:string}
export interface AgentKeyMetadata {id:string;name:string;prefix:string;spaceKeys:SpaceKey[];createdAt:string;lastUsedAt?:string}
const ID=/^[a-f0-9]{24}$/;
const KEY=/^radahn_[a-f0-9]{64}$/;
function owner(ownerId:string):void {if(typeof ownerId!=="string" || !ownerId.trim() || ownerId.length>256)throw new Error("Invalid owner");}
function scopes(value:SpaceKey[]):SpaceKey[] {
 // A bounded allowlist prevents unbounded ownership lookups from caller-controlled scopes.
 if(!Array.isArray(value) || value.length<1 || value.length>100 || value.some(s=>typeof s!=="string" || (s!=="global" && !ID.test(s))))throw new Error("Invalid agent scopes");
 return [...new Set(value)];
}
async function ownedScopes(ownerId:string,keys:SpaceKey[],session?:ClientSession):Promise<boolean> {
 for(const key of keys)if(key!=="global" && !await collections().spaces.findOne({ownerId,_id:new ObjectId(key)},{projection:{_id:1},...(session?{session}:{})}))return false;
 return true;
}
export async function createAgentKey(ownerId:string,name:string,spaceKeys:SpaceKey[]):Promise<CreatedAgentKey> {
 owner(ownerId);
 if(typeof name!=="string" || name.length>80 || /[\p{Cc}\p{Cf}]/u.test(name))throw new Error("Invalid agent name");
 const label=name.normalize("NFKC").trim(),scan=preScan(label);
 if(!label || label.length>80 || scan.kinds.length || scan.injection || /radahn_[a-f0-9]{64}/i.test(label))throw new Error("Invalid agent name");
 const keys=scopes(spaceKeys);
 if(!await ownedScopes(ownerId,keys))throw new Error("Invalid agent scopes");
 const key=`radahn_${randomBytes(32).toString("hex")}`,prefix=key.slice(0,14),_id=new ObjectId();
 await collections().agentKeys.insertOne({_id,ownerId,name:label,keyHash:createHash("sha256").update(key).digest("hex"),prefix,spaceKeys:keys,createdAt:new Date()});
 return {id:_id.toHexString(),key,prefix};
}
export async function verifyAgentKey(rawKey:string):Promise<VerifiedAgentKey|null> {
 if(typeof rawKey!=="string" || !KEY.test(rawKey))return null;
 const keyHash=createHash("sha256").update(rawKey).digest("hex");
 // Explicit authentication boundary: digest-only discovery establishes owner; later access is owner scoped.
 const discovered=await collections().agentKeys.findOne({keyHash});
 if(!discovered)return null;
 const session=mongo().startSession(),denied=new Error("Credential unavailable");
 try {
  return await session.withTransaction(async()=>{
   await lockOwner(discovered.ownerId,session);
   const doc=await collections().agentKeys.findOne({_id:discovered._id,ownerId:discovered.ownerId,keyHash},{session});
   if(!doc)throw denied;
   let keys:SpaceKey[];
   try {owner(doc.ownerId);keys=scopes(doc.spaceKeys);}catch{throw denied;}
   if(!await ownedScopes(doc.ownerId,keys,session))throw denied;
   // A concurrent revoke must not authenticate the discovered snapshot.
   const used=await collections().agentKeys.updateOne({_id:doc._id,ownerId:doc.ownerId,keyHash},{$set:{lastUsedAt:new Date()}},{session});
   if(used.matchedCount!==1)throw denied;
   return {ownerId:doc.ownerId,name:doc.name,spaceKeys:keys};
  });
 }catch(error){if(error===denied)return null;throw error;}finally{await session.endSession();}
}
function metadata(doc:AgentKeyDoc):AgentKeyMetadata {
 return {id:doc._id.toHexString(),name:doc.name,prefix:doc.prefix,spaceKeys:[...doc.spaceKeys],createdAt:doc.createdAt.toISOString(),...(doc.lastUsedAt?{lastUsedAt:doc.lastUsedAt.toISOString()}:{})};
}
export async function listAgentKeys(ownerId:string):Promise<AgentKeyMetadata[]> {
 owner(ownerId);
 const docs=await collections().agentKeys.find({ownerId},{projection:{keyHash:0}}).sort({createdAt:-1}).toArray();
 return docs.map(metadata);
}
export async function revokeAgentKey(ownerId:string,id:string):Promise<boolean> {
 owner(ownerId);if(typeof id!=="string" || !ID.test(id))return false;
 return (await collections().agentKeys.deleteOne({ownerId,_id:new ObjectId(id)})).deletedCount===1;
}


