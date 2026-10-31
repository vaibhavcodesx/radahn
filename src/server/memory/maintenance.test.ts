import {beforeEach,expect,it,vi} from "vitest";
import {ObjectId} from "mongodb";
vi.mock("server-only",()=>({}));
const m=vi.hoisted(()=>({aggregate:vi.fn(),find:vi.fn(),update:vi.fn(),distinct:vi.fn(),embed:vi.fn(),lock:vi.fn(),findOne:vi.fn(),deleteMany:vi.fn(),deleteOne:vi.fn(),end:vi.fn(),expired:vi.fn()}));
vi.mock("./lifecycle",()=>({flipExpired:m.expired}));
vi.mock("./mutation",()=>({lockOwner:m.lock}));
vi.mock("@/server/llm/registry",()=>({embed:m.embed}));
vi.mock("@/server/db/collections",()=>({OWNED_COLLECTIONS:["memories","messages"],collections:()=>({memories:{find:m.find,distinct:m.distinct,updateOne:m.update},settings:{updateOne:m.update,findOne:m.findOne,deleteOne:m.deleteOne}})}));
vi.mock("@/server/db/client",()=>({db:()=>({collection:()=>({aggregate:m.aggregate,find:m.find,findOne:m.findOne,deleteMany:m.deleteMany,deleteOne:m.deleteOne})}),mongo:()=>({startSession:()=>({withTransaction:async(fn:()=>unknown)=>fn(),endSession:m.end})})}));
let guestId=new ObjectId();
const load=()=>import("./maintenance");
beforeEach(()=>{vi.clearAllMocks();m.expired.mockResolvedValue(0);m.find.mockReturnValue({limit:()=>({toArray:async()=>[]})});m.distinct.mockResolvedValue([]);m.update.mockResolvedValue({matchedCount:1});m.embed.mockResolvedValue([Array(768).fill(0.1)]);m.findOne.mockResolvedValue(null);m.aggregate.mockImplementation(()=>({toArray:async()=>[{_id:guestId}]}));});
it("scopes hosted maintenance and backfills with unchanged content CAS",async()=>{
 const unit={_id:new ObjectId(),ownerId:"eval",statement:"test",type:"fact",status:"active"};
 m.find.mockReturnValue({limit:()=>({toArray:async()=>[unit]})});
 const result=await (await load()).runMaintenance({now:new Date(),ownerId:"eval"});
 expect(result.embedded).toBe(1);expect(m.distinct).not.toHaveBeenCalled();expect(m.find.mock.calls).toHaveLength(1);expect(m.find.mock.calls[0][0].ownerId).toBe("eval");expect(m.update.mock.calls[0][0]).toMatchObject({ownerId:"eval",statement:"test",type:"fact",needsEmbedding:true});expect(m.embed).toHaveBeenCalledWith([{text:"test",title:"fact"}],"document");
});
it("keeps embedding markers on provider failure and rejects malformed vectors",async()=>{
 m.find.mockReturnValue({limit:()=>({toArray:async()=>[{_id:new ObjectId(),statement:"x",type:"fact"}]})});m.embed.mockRejectedValue(new Error("private"));
 expect((await (await load()).runMaintenance({now:new Date(),ownerId:"eval"})).embeddingFailures).toBe(1);expect(m.update).not.toHaveBeenCalled();
 m.embed.mockResolvedValue([[NaN]]);expect((await (await load()).runMaintenance({now:new Date(),ownerId:"eval"})).embeddingFailures).toBe(1);
});
it("does not count a concurrently changed embedding",async()=>{
 m.find.mockReturnValue({limit:()=>({toArray:async()=>[{_id:new ObjectId(),statement:"x",type:"fact"}]})});m.update.mockResolvedValue({matchedCount:0});
 expect((await (await load()).runMaintenance({now:new Date(),ownerId:"eval"})).embedded).toBe(0);
});
it("rejects empty scoped owner without any discovery",async()=>{
 await expect((await load()).runMaintenance({now:new Date(),ownerId:""})).rejects.toThrow();expect(m.expired).not.toHaveBeenCalled();expect(m.find).not.toHaveBeenCalled();
});
it("purges only revalidated anonymous owners using ObjectId references and a single transaction",async()=>{
 const id=guestId=new ObjectId(),old=new Date(0);let finds=0;
 m.find.mockImplementation(()=>({limit:()=>({toArray:async()=>++finds===1?[]:[{_id:id}]})}));
 m.findOne.mockResolvedValueOnce({updatedAt:old,memoryRevision:3}).mockResolvedValueOnce({memoryRevision:4}).mockResolvedValueOnce({_id:id}).mockResolvedValueOnce(null);
 m.deleteOne.mockResolvedValue({deletedCount:1});m.deleteMany.mockResolvedValue({deletedCount:1});
 const result=await (await load()).runMaintenance({now:new Date(),guestActivityGuardReady:true});expect(result.purgedGuests).toBe(1);
 const active=m.findOne.mock.calls.find(([filter])=>filter.userId);expect(active?.[0].userId.$in).toEqual([String(id),id]);
 expect(m.deleteMany.mock.calls.some(([filter])=>filter.ownerId===String(id))).toBe(true);expect(m.deleteMany.mock.calls.some(([filter])=>filter._id===String(id))).toBe(true);
 expect(m.deleteOne.mock.calls.at(-1)?.[0]).toMatchObject({_id:id,isAnonymous:true});expect(m.end).toHaveBeenCalledOnce();
});
it("preserves active sessions, recently active settings, and converted users",async()=>{
 for(const situation of ["settings","converted","session"]) {
  vi.clearAllMocks();let finds=0;const id=guestId=new ObjectId();m.find.mockImplementation(()=>({limit:()=>({toArray:async()=>++finds===1?[]:[{_id:id}]})}));
  m.findOne.mockReset();m.findOne.mockResolvedValueOnce({updatedAt:situation==="settings"?new Date():new Date(0),memoryRevision:0}).mockResolvedValueOnce({memoryRevision:1}).mockResolvedValueOnce(situation==="converted"?null:{_id:id}).mockResolvedValueOnce({_id:new ObjectId()});
  expect((await (await load()).runMaintenance({now:new Date(),guestActivityGuardReady:true})).purgedGuests).toBe(0);expect(m.deleteMany).not.toHaveBeenCalled();
 }
});
it("isolates guest transaction failures and does not count partial erasure",async()=>{
 const id=guestId=new ObjectId();let finds=0;m.find.mockImplementation(()=>({limit:()=>({toArray:async()=>++finds===1?[]:[{_id:id}]})}));
 m.findOne.mockResolvedValueOnce({updatedAt:new Date(0),memoryRevision:0}).mockResolvedValueOnce({memoryRevision:1}).mockResolvedValueOnce({_id:id}).mockResolvedValueOnce(null);m.deleteMany.mockRejectedValueOnce(new Error("rollback"));
 const result=await (await load()).runMaintenance({now:new Date(),guestActivityGuardReady:true});expect(result.guestFailures).toBe(1);expect(result.purgedGuests).toBe(0);expect(m.deleteOne).not.toHaveBeenCalled();expect(m.end).toHaveBeenCalledOnce();
});
it("stops launching phases when the cooperative budget is exhausted",async()=>{
 const clock=vi.spyOn(Date,"now");clock.mockReturnValueOnce(0).mockReturnValue(61_000);
 try {const result=await (await load()).runMaintenance({now:new Date(),ownerId:"eval"});expect(result.budgetExhausted).toBe(1);expect(m.find).not.toHaveBeenCalled();}finally{clock.mockRestore();}
});
it("aborts erasure if the final anonymous-user CAS loses",async()=>{
 const id=guestId=new ObjectId();let finds=0;m.find.mockImplementation(()=>({limit:()=>({toArray:async()=>++finds===1?[]:[{_id:id}]})}));
 m.findOne.mockResolvedValueOnce({updatedAt:new Date(0),memoryRevision:0}).mockResolvedValueOnce({memoryRevision:1}).mockResolvedValueOnce({_id:id}).mockResolvedValueOnce(null);m.deleteMany.mockResolvedValue({deletedCount:1});m.deleteOne.mockResolvedValue({deletedCount:0});
 const result=await (await load()).runMaintenance({now:new Date(),guestActivityGuardReady:true});expect(result.guestFailures).toBe(1);expect(result.purgedGuests).toBe(0);
});

it("defers destructive guest discovery until the auth integration is explicitly enabled",async()=>{
 const result=await (await load()).runMaintenance({now:new Date()});expect(result.guestPurgeDeferred).toBe(1);expect(m.aggregate).not.toHaveBeenCalled();expect(m.deleteMany).not.toHaveBeenCalled();
});
it("records owner activity under the shared lock only if the auth user still exists",async()=>{
 const now=new Date();m.findOne.mockResolvedValue({_id:guestId});expect(await (await load()).noteOwnerActivity(String(guestId),now)).toBe(true);expect(m.lock).toHaveBeenCalledWith(String(guestId),expect.anything());expect(m.update).toHaveBeenCalledWith({_id:String(guestId)},{$set:{updatedAt:now}},expect.anything());
});
it("aborts an activity heartbeat when erasure already removed its auth owner",async()=>{
 m.findOne.mockResolvedValue(null);expect(await (await load()).noteOwnerActivity(String(guestId))).toBe(false);expect(m.update).not.toHaveBeenCalled();expect(m.end).toHaveBeenCalledOnce();
});
it("filters protected guests before applying the global candidate limit",async()=>{
 await (await load()).runMaintenance({now:new Date(),guestActivityGuardReady:true});const pipeline=m.aggregate.mock.calls[0][0];const limit=pipeline.findIndex((s:object)=>"$limit" in s);expect(limit).toBeGreaterThan(pipeline.findIndex((s:object)=>"$lookup" in s));expect(pipeline[limit]).toEqual({$limit:25});expect(pipeline.at(-1)).toEqual({$project:{_id:1}});
});

