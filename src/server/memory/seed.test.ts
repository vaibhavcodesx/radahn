import { beforeEach, expect, test, vi } from "vitest";
import type { MemoryUnit } from "./types";
const c=vi.hoisted(()=>({memories:{find:vi.fn(()=>({toArray:async()=>[]})),deleteMany:vi.fn(),insertMany:vi.fn()},events:{insertOne:vi.fn(),deleteMany:vi.fn()},recalls:{deleteMany:vi.fn()},reflections:{deleteMany:vi.fn()}}));
vi.mock("@/server/db/collections",()=>({collections:()=>c}));
import { seedDemo, removeDemo, deleteAll } from "./seed";
import { DEMO_MEMORIES } from "./fixtures/demo";
beforeEach(()=>vi.clearAllMocks());
const input={ownerId:"owner",spaceIds:{personal:"personal",hackathon:"hack",internships:"intern"},conversations:[{conversationId:"conv",messageIds:["m0","m1","m2"]}]};
test("seeds one owner-scoped batch with resolved links, real vectors and optional fields omitted",async()=>{
 const before=Date.now();expect(await seedDemo(input)).toEqual({memories:DEMO_MEMORIES.length});
 expect(c.memories.deleteMany).toHaveBeenCalledWith({ownerId:"owner",demo:true},{session});
 expect(c.memories.insertMany).toHaveBeenCalledTimes(1);
 const rows=c.memories.insertMany.mock.calls[0][0] as MemoryUnit[];
 const row=(key:string)=>rows[DEMO_MEMORIES.findIndex(d=>d.key===key)];
 expect(rows).toHaveLength(DEMO_MEMORIES.length);
 for(const m of rows){expect(m.ownerId).toBe("owner");expect(m.embedding).toHaveLength(768);expect(m.embedding.every(Number.isFinite)).toBe(true);expect(m.embedding.some(n=>n!==0)).toBe(true);expect(Object.values(m)).not.toContain(undefined);}
 expect(row("d0").supersededBy).toEqual(row("d2")._id);expect(row("d2").supersedes).toEqual(row("d0")._id);
 expect(row("s1").evidenceIds).toEqual([row("fb1")._id,row("fb2")._id]);expect(row("d1").relatedIds).toEqual([row("o1")._id]);
 expect(row("p3").source).toMatchObject({conversationId:"conv",messageId:"m0"});expect(row("pd1").source).not.toHaveProperty("conversationId");
 expect(row("e1").expiresAt!.getTime()).toBeGreaterThanOrEqual(before+600000);expect(row("e1").purgeAt!.getTime()-row("e1").expiresAt!.getTime()).toBe(180000);
 expect(row("e0").purgeAt!.getTime()-row("e0").expiresAt!.getTime()).toBe(86400000);expect(row("e0").purgeAt!.getTime()).toBeGreaterThan(before);
 expect(row("p1")).not.toHaveProperty("expiresAt");expect(row("p3")).not.toHaveProperty("slotKey");
 expect(c.events.insertOne).toHaveBeenCalledTimes(1);expect(c.events.insertOne.mock.calls[0][0]).toMatchObject({ownerId:"owner",kind:"created"});
});
test("removeDemo preserves non-demo data and deleteAll clears owner memory history",async()=>{
 await removeDemo("owner");expect(c.memories.deleteMany).toHaveBeenCalledWith({ownerId:"owner",demo:true});expect(c.events.deleteMany).not.toHaveBeenCalled();
 await deleteAll("owner");for(const collection of [c.memories,c.events,c.recalls,c.reflections])expect(collection.deleteMany).toHaveBeenCalledWith({ownerId:"owner"});
});

const session=vi.hoisted(()=>({withTransaction:vi.fn(async(fn:()=>Promise<unknown>)=>fn()),endSession:vi.fn()}));
const lockOwner=vi.hoisted(()=>vi.fn());
vi.mock("@/server/db/client",()=>({mongo:()=>({startSession:()=>session})}));
vi.mock("./mutation",()=>({lockOwner}));
test("atomic replacement holds owner lock and preserves active non-demo slot truth",async()=>{
 const find=vi.fn(()=>({toArray:async()=>[{spaceKey:"global",slotKey:"aarav.education"}]}));
 Object.assign(c.memories,{find});
 await seedDemo(input);
 expect(lockOwner).toHaveBeenCalledWith("owner",session);
 expect(session.withTransaction).toHaveBeenCalled();expect(session.endSession).toHaveBeenCalled();
 expect(find).toHaveBeenCalledWith({ownerId:"owner",demo:{$ne:true},status:"active",slotKey:{$exists:true}},{session});
 expect(c.memories.deleteMany).toHaveBeenCalledWith({ownerId:"owner",demo:true},{session});
 expect(c.memories.insertMany.mock.calls[0][1]).toEqual({session});expect(c.events.insertOne.mock.calls[0][1]).toEqual({session});
 const rows=c.memories.insertMany.mock.calls[0][0] as MemoryUnit[];
 expect(rows.find(m=>m.slotKey==="aarav.education")?.status).toBe("pending_review");
 expect(rows).toHaveLength(DEMO_MEMORIES.length);
});
