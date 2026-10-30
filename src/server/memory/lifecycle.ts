/** Lifecycle helpers: memory-engine.md §3 (expiry is independent of TTL deletion). */
export function purgeAt(expiresAt:Date,createdAt:Date):Date {return new Date(+expiresAt+(+expiresAt-+createdAt<3600000 ? 180000 : 86400000));}
/** Optional owner discovery is maintenance-only; all content reads/mutations remain owner-scoped. */
export async function flipExpired(ownerId?:string,now=new Date()):Promise<number> {
  const [{collections},{mongo},{ObjectId},{lockOwner}]=await Promise.all([import("@/server/db/collections"),import("@/server/db/client"),import("mongodb"),import("./mutation")]);
  const c=collections();
  const owners=ownerId?[ownerId]:await c.memories.distinct("ownerId",{status:"active",expiresAt:{$lte:now}});
  let count=0;
  for(const owner of owners) {
    const rows=await c.memories.find({ownerId:owner,status:"active",expiresAt:{$lte:now}}).limit(100).toArray();
    if(!rows.length)continue;
    const session=mongo().startSession();
    try {count+=await session.withTransaction(async()=>{
      await lockOwner(owner,session);let changed=0;
      for(const unit of rows) {
        const result=await c.memories.updateOne({ownerId:owner,_id:unit._id,status:"active",expiresAt:unit.expiresAt},{$set:{status:"expired",updatedAt:now,purgeAt:purgeAt(unit.expiresAt!,unit.createdAt)}},{session});
        if(result.matchedCount) {changed++;await c.events.insertOne({_id:new ObjectId(),ownerId:owner,spaceKey:unit.spaceKey,memoryId:unit._id,type:unit.type,kind:"expired",actor:{kind:"system",name:"maintenance"},summary:"Memory expired",at:now},{session});}
      }
      return changed;
    });}finally{await session.endSession();}
  }
  return count;
}
