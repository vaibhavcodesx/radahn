import "server-only";
/** Serialized owner mutations: memory-engine.md §3/§4.4. A shared write prevents pin-budget write skew. */
import type { ClientSession } from "mongodb";
import { collections } from "@/server/db/collections";
export async function lockOwner(ownerId:string,session:ClientSession):Promise<void> {
  await collections().settings.updateOne({_id:ownerId},{$inc:{memoryRevision:1},$set:{updatedAt:new Date()},$setOnInsert:{timeZone:"Asia/Kolkata",writePolicy:"review_sensitive"}},{session,upsert:true});
}
