import {beforeEach,describe,expect,it,vi} from "vitest";
import {ObjectId} from "mongodb";
vi.mock("server-only",()=>({}));
const mock=vi.hoisted(()=>({profiles:{updateOne:vi.fn(),deleteOne:vi.fn()},mem:{findOne:vi.fn(),find:vi.fn(),deleteOne:vi.fn(),updateOne:vi.fn(),countDocuments:vi.fn()},events:{insertOne:vi.fn(),find:vi.fn()},settings:{findOne:vi.fn(),updateOne:vi.fn()},recalls:{find:vi.fn()},transaction:vi.fn(),end:vi.fn(),embed:vi.fn()}));
vi.mock("@/server/db/collections",()=>({collections:()=>({profiles:mock.profiles,memories:mock.mem,events:mock.events,settings:mock.settings,recalls:mock.recalls})}));
vi.mock("@/server/db/client",()=>({mongo:()=>({startSession:()=>({withTransaction:mock.transaction,endSession:mock.end})})}));
vi.mock("@/server/llm/registry",()=>({embed:mock.embed}));
const {forgetMemory,updateMemory,reviewMemory,getMemory,listMemories,pendingCount}=await import("./tools");
import type {MemoryUnit} from "./types";
const ownerId="alice",actor={kind:"user" as const,name:"you"},now=new Date();
const unit=(patch:Partial<MemoryUnit>={}):MemoryUnit=>({_id:new ObjectId(),ownerId,spaceKey:"s",type:"fact",statement:"Aarav uses Atlas.",entities:[],tags:[],importance:6,confidence:0.9,sensitivity:"none",status:"active",pinned:false,source:{kind:"manual",actor},evidenceIds:[],relatedIds:[],validFrom:now,createdAt:now,updatedAt:now,stats:{recallCount:0,confirmCount:0,citedCount:0},embedding:Array(768).fill(0.1),embeddingModel:"gemini-embedding-2@768",...patch});
const cursor=(rows:unknown[])=>({toArray:async()=>rows,sort:()=>cursor(rows),limit:()=>cursor(rows)});
beforeEach(()=>{vi.clearAllMocks();mock.mem.findOne.mockResolvedValue(null);mock.mem.find.mockReturnValue(cursor([]));mock.events.find.mockReturnValue(cursor([]));mock.recalls.find.mockReturnValue(cursor([]));mock.events.insertOne.mockResolvedValue({});mock.mem.deleteOne.mockResolvedValue({deletedCount:1});mock.mem.updateOne.mockResolvedValue({matchedCount:1});mock.mem.countDocuments.mockResolvedValue(3);mock.settings.findOne.mockResolvedValue({currentSpaceId:"s"});mock.settings.updateOne.mockResolvedValue({});mock.transaction.mockImplementation(async fn=>fn({}));mock.end.mockResolvedValue(undefined);mock.embed.mockResolvedValue([Array(768).fill(0.2)]);});
describe("explicit lifecycle tools",()=>{
 it("hard deletes only an owned target and stores a content-free tombstone",async()=>{
  const m=unit();mock.mem.findOne.mockResolvedValue(m);
  const result=await forgetMemory({ownerId,memoryId:m._id.toHexString(),actor});
  expect(result.status).toBe("forgotten");expect(mock.mem.deleteOne.mock.calls[0][0]).toEqual({ownerId,_id:m._id});
  const event=mock.events.insertOne.mock.calls[0][0];expect(event.kind).toBe("forgotten");expect(JSON.stringify(event)).not.toContain(m.statement);expect(event.diff).toBeUndefined();
 });
 it("does not delete on an ambiguous query",async()=>{
  mock.mem.find.mockReturnValue(cursor([unit(),unit()]));const result=await forgetMemory({ownerId,query:"Atlas",actor});
  expect(result.status).toBe("ambiguous");expect(mock.mem.deleteOne).not.toHaveBeenCalled();
 });
 it("refuses core pin overflow with a typed route-compatible error",async()=>{
  const m=unit({statement:"x".repeat(200)});mock.mem.findOne.mockResolvedValue(m);mock.mem.find.mockReturnValue(cursor(Array.from({length:6},()=>unit({pinned:true,statement:"x".repeat(240)}))));
  await expect(updateMemory({ownerId,memoryId:m._id.toHexString(),patch:{pinned:true},actor})).rejects.toMatchObject({code:"PIN_BUDGET_EXCEEDED"});expect(mock.mem.updateOne).not.toHaveBeenCalled();
 });
 it("clears expiresAt and purgeAt together",async()=>{
  const m=unit({expiresAt:new Date(+now+10000)});mock.mem.findOne.mockResolvedValue(m);
  await updateMemory({ownerId,memoryId:m._id.toHexString(),patch:{expiresAt:null},actor});
  expect(mock.mem.updateOne.mock.calls[0][1].$unset).toEqual({expiresAt:"",purgeAt:""});
 });
 it("revalidates review edits so a secret cannot be approved",async()=>{
  const m=unit({status:"pending_review"});mock.mem.findOne.mockResolvedValue(m);
  await expect(reviewMemory({ownerId,memoryId:m._id.toHexString(),decision:"approve",edits:{statement:"password is hunter2"},actor})).rejects.toThrow(/blocked/i);expect(mock.mem.updateOne).not.toHaveBeenCalled();
 });
 it("clears stale slot values when a reviewer changes the statement",async()=>{
  const m=unit({status:"pending_review",statement:"Aarav's deadline is 9 PM.",slotKey:"aarav.deadline",value:"9 PM"});mock.mem.findOne.mockImplementation(async filter=>filter.status==="active"?null:m);
  const result=await reviewMemory({ownerId,memoryId:m._id.toHexString(),decision:"approve",edits:{statement:"Aarav's deadline is 10 PM."},actor});
  expect(result?.value).toBeUndefined();expect(mock.mem.updateOne.mock.calls[0][1].$unset).toEqual({value:""});
 });
 it("rejects pending units with 24-hour TTL grace and an event",async()=>{
  const m=unit({status:"pending_review"});mock.mem.findOne.mockResolvedValue(m);
  const result=await reviewMemory({ownerId,memoryId:m._id.toHexString(),decision:"reject",actor});expect(result?.status).toBe("rejected");
  const set=mock.mem.updateOne.mock.calls[0][1].$set;expect(+set.purgeAt-+set.updatedAt).toBe(86400000);expect(mock.events.insertOne.mock.calls[0][0].kind).toBe("rejected");
 });
 it("returns detail without embedding floats and uses owner filters throughout",async()=>{
  const m=unit();mock.mem.findOne.mockResolvedValue(m);
  const detail=await getMemory(ownerId,m._id.toHexString());expect(detail?.raw.embedding).toBe("[768 floats]");expect(detail?.memory).not.toHaveProperty("embedding");
  for(const [filter] of mock.mem.findOne.mock.calls)expect(filter.ownerId).toBe(ownerId);
 });
 it("scopes default lists to the current space and global",async()=>{
  await listMemories({ownerId});expect(mock.mem.find.mock.calls[0][0]).toMatchObject({ownerId,spaceKey:{$in:["s","global"]}});
  expect(await pendingCount(ownerId)).toBe(3);expect(mock.mem.countDocuments.mock.calls[0][0]).toEqual({ownerId,status:"pending_review"});
 });
});

it("lists only retained valid historical content and rejects invalid snapshots",async()=>{
 const asOf="2026-10-01T00:00:00Z",start=new Date("2026-09-01T00:00:00Z");
 const old=unit({validFrom:start,createdAt:start,status:"superseded",validTo:new Date("2026-10-15T00:00:00Z")});
 mock.mem.find.mockReturnValue(cursor([old,unit(),unit({status:"pending_review",validFrom:start}),unit({ownerId:"bob",validFrom:start}),unit({validFrom:start,expiresAt:new Date(asOf)})]));
 expect((await listMemories({ownerId,spaceKey:"s",asOf,statuses:["pending_review","active","superseded"]})).map(m=>m.id)).toEqual([old._id.toHexString()]);
 await expect(listMemories({ownerId,asOf:"yesterday"})).rejects.toThrow(/asOf/);
});

it("forgets and updates with profile invalidation in the source transaction including previous evidence",async()=>{const m=unit();mock.mem.findOne.mockResolvedValue(m);await forgetMemory({ownerId,memoryId:m._id.toHexString(),actor});expect(mock.profiles.deleteOne.mock.lastCall?.[0]).toMatchObject({ownerId,$or:[{evidenceIds:{$in:[m._id]}},{"previous.evidenceIds":{$in:[m._id]}}]});expect(mock.profiles.deleteOne.mock.lastCall?.[1]).toEqual(mock.mem.deleteOne.mock.lastCall?.[1]);await updateMemory({ownerId,memoryId:m._id.toHexString(),patch:{spaceKey:"other"},actor});expect(mock.profiles.deleteOne).toHaveBeenCalledTimes(2);});
