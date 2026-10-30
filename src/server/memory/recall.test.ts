import {beforeEach,describe,expect,it,vi} from "vitest";
import {ObjectId} from "mongodb";
vi.mock("server-only",()=>({}));
const mock=vi.hoisted(()=>({aggregate:vi.fn(),find:vi.fn(),findOne:vi.fn(),insertOne:vi.fn(),bulkWrite:vi.fn(),embed:vi.fn()}));
vi.mock("@/server/db/collections",()=>({collections:()=>({memories:mock,events:mock,recalls:mock,settings:{findOne:async()=>({timeZone:"Asia/Kolkata"})}})}));
vi.mock("@/server/llm/registry",()=>({embed:mock.embed}));
const {recall,temporalWindow}=await import("./recall");
import type {MemoryUnit} from "./types";
const now=new Date("2026-10-31T00:00:00Z");
const memory=(patch:Partial<MemoryUnit>={}):MemoryUnit=>({_id:new ObjectId(),ownerId:"alice",spaceKey:"s",type:"constraint",statement:"Aarav's deadline is 9 PM.",entities:["radahn"],tags:[],importance:10,confidence:0.9,pinned:false,sensitivity:"none",status:"active",source:{kind:"chat",actor:{kind:"user",name:"you"}},evidenceIds:[],relatedIds:[],validFrom:now,createdAt:now,updatedAt:now,stats:{recallCount:0,confirmCount:0,citedCount:0},embedding:[1,0],embeddingModel:"gemini-embedding-2@768",...patch});
beforeEach(()=>{vi.clearAllMocks();mock.embed.mockResolvedValue([[1,0]]);mock.aggregate.mockReturnValue({toArray:async()=>[]});mock.find.mockReturnValue({sort:()=>({limit:()=>({toArray:async()=>[]})}),limit:()=>({toArray:async()=>[]}),toArray:async()=>[]});mock.insertOne.mockResolvedValue({});mock.bulkWrite.mockResolvedValue({});});
describe("hybrid recall",()=>{
 it("degrades to lexical when embeddings fail and scopes every DB operation",async()=>{
  const m=memory();mock.embed.mockRejectedValue(new Error("offline"));mock.aggregate.mockReturnValue({toArray:async()=>[m]});
  const result=await recall({ownerId:"alice",spaceKey:"s",query:"plan deadlines",messageId:"message"});
  expect(result.picks.map(p=>p.memoryId)).toContain(m._id.toHexString());expect(result.channelsRan).not.toContain("semantic");
  for(const [pipeline] of mock.aggregate.mock.calls) expect(JSON.stringify(pipeline)).toContain("alice");
  for(const [filter] of mock.find.mock.calls) expect(filter.ownerId).toBe("alice");
  expect(mock.bulkWrite.mock.calls[0][0][0].updateOne.filter.ownerId).toBe("alice");
  expect(mock.insertOne.mock.calls[0][0].ownerId).toBe("alice");
 });
 it("returns degraded results when trace persistence fails",async()=>{
  mock.insertOne.mockRejectedValueOnce(new Error("database unavailable"));
  const result=await recall({ownerId:"alice",spaceKey:"s",query:"hello"});
  expect(result.recallId).toBe("");expect(result.picks).toEqual([]);
 });
 it("keeps a planning strategy when three unrelated strategies rank higher",async()=>{
  const strategies=[...Array.from({length:3},(_,i)=>memory({type:"strategy",statement:`When debugging ${i}, show code.`})),memory({type:"strategy",statement:"When planning, use time boxes.",embedding:[0,1]})];
  mock.find.mockReturnValue({sort:()=>({limit:()=>({toArray:async()=>strategies})})});
  const result=await recall({ownerId:"alice",spaceKey:"s",query:"plan",persistTrace:false});
  expect(result.strategies.some(m=>m.statement.includes("time boxes"))).toBe(true);expect(result.strategies.length).toBeLessThanOrEqual(3);
 });
 it("survives missing vector and lexical indexes with an empty result",async()=>{
  mock.aggregate.mockReturnValue({toArray:async()=>{throw new Error("index missing");}});
  const result=await recall({ownerId:"alice",spaceKey:"s",query:"hello",persistTrace:false});
  expect(result.picks).toEqual([]);expect(result.recallId).toBe("");expect(mock.insertOne).not.toHaveBeenCalled();
 });
 it("excludes expired, foreign-owner and wrong-space rows even from stale search results",async()=>{
  mock.aggregate.mockReturnValue({toArray:async()=>[memory({expiresAt:new Date(0)}),memory({ownerId:"bob"}),memory({spaceKey:"elsewhere"})]});
  expect((await recall({ownerId:"alice",spaceKey:"s",query:"plan",persistTrace:false})).picks).toEqual([]);
 });
 it("runs semantic prefilters and lexical filters before retrieval",async()=>{
  await recall({ownerId:"alice",spaceKey:"s",query:"plan",persistTrace:false});
  const pipelines=mock.aggregate.mock.calls.map(c=>c[0]);
  const vector=pipelines.find(p=>p[0].$vectorSearch)?.[0].$vectorSearch;
  expect(vector.filter).toEqual({ownerId:"alice",status:"active",spaceKey:{$in:["s","global"]}});
  expect(vector.numCandidates).toBe(150);expect(vector.limit).toBe(40);
 });
 it("parses date-only windows in the user timezone",()=>{
  const window=temporalWindow("what did I decide yesterday?",now,"Asia/Kolkata");
  expect(window?.start.toISOString()).toBe("2026-10-29T18:30:00.000Z");
  expect(window?.end.toISOString()).toBe("2026-10-30T18:30:00.000Z");
  expect(temporalWindow("hello",now,"Asia/Kolkata")).toBeNull();
 });
});
