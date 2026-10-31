import {beforeEach,describe,expect,it,vi} from "vitest";
import {ObjectId} from "mongodb";
vi.mock("server-only",()=>({}));
const mock=vi.hoisted(()=>({aggregate:vi.fn(),find:vi.fn(),findOne:vi.fn(),insertOne:vi.fn(),bulkWrite:vi.fn(),findOneAndUpdate:vi.fn(),embed:vi.fn(),profile:vi.fn()}));
vi.mock("@/server/db/collections",()=>({collections:()=>({memories:mock,events:mock,recalls:mock,settings:{findOne:async()=>({timeZone:"Asia/Kolkata"})}})}));
vi.mock("@/server/llm/registry",()=>({embed:mock.embed}));
vi.mock("./profile",()=>({readProfile:mock.profile}));
const {recall,temporalWindow}=await import("./recall");
import type {MemoryUnit} from "./types";
const now=new Date("2026-10-31T00:00:00Z");
const memory=(patch:Partial<MemoryUnit>={}):MemoryUnit=>({_id:new ObjectId(),ownerId:"alice",spaceKey:"s",type:"constraint",statement:"Aarav's deadline is 9 PM.",entities:["radahn"],tags:[],importance:10,confidence:0.9,pinned:false,sensitivity:"none",status:"active",source:{kind:"chat",actor:{kind:"user",name:"you"}},evidenceIds:[],relatedIds:[],validFrom:now,createdAt:now,updatedAt:now,stats:{recallCount:0,confirmCount:0,citedCount:0},embedding:[1,0],embeddingModel:"gemini-embedding-2@768",...patch});
beforeEach(()=>{vi.clearAllMocks();mock.embed.mockResolvedValue([[1,0]]);mock.aggregate.mockReturnValue({toArray:async()=>[]});mock.find.mockReturnValue({sort:()=>({limit:()=>({toArray:async()=>[]})}),limit:()=>({toArray:async()=>[]}),toArray:async()=>[]});mock.insertOne.mockResolvedValue({});mock.bulkWrite.mockResolvedValue({});mock.findOneAndUpdate.mockResolvedValue(null);});
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

describe("planning before search index visibility",()=>{
 it("recalls planning context immediately while both search channels are empty",async()=>{
  const pin=memory({pinned:true,type:"profile",statement:"Aarav is a student."});
  const rows=[memory({statement:"The build closes at 9 PM."}),memory({type:"goal",statement:"Aarav wants a top-16 finish."}),memory({type:"preference",statement:"Aarav prefers 30-minute time boxes."})];
  mock.find.mockImplementation((filter)=>({sort:()=>({limit:()=>({toArray:async()=>filter.$or?.some((v:Record<string,unknown>)=>v.pinned)?[pin]:filter.type?rows:[]})}),limit:()=>({toArray:async()=>[]})}));
  const result=await recall({ownerId:"alice",spaceKey:"s",query:"Plan my next 4 hours.",persistTrace:false});
  expect(new Set(result.picks.map(p=>p.memoryId))).toEqual(new Set(rows.map(m=>m._id.toHexString())));
  expect(result.channelsRan).toContain("graph");
  expect(result.picks.every(p=>p.reasons.includes("plan_relevant_constraint")&&!p.reasons.includes("linked_entity"))).toBe(true);
  const filter=mock.find.mock.calls.find(([f])=>f.type?.$in)?.[0];
  expect(filter).toMatchObject({ownerId:"alice",spaceKey:{$in:["s","global"]},status:"active",type:{$in:["constraint","goal","decision","preference"]}});
 });
 it("does not widen unrelated general queries or an explicit incompatible type filter",async()=>{
  await recall({ownerId:"alice",spaceKey:"s",query:"hello",persistTrace:false});
  expect(mock.find.mock.calls.some(([filter])=>filter.type?.$in?.includes("constraint"))).toBe(false);
  mock.find.mockClear();
  await recall({ownerId:"alice",spaceKey:"s",query:"Plan my day",types:["fact"],persistTrace:false});
  expect(mock.find.mock.calls.some(([filter])=>filter.type?.$in?.includes("constraint"))).toBe(false);
 });
});

describe("historical recall",()=>{
 it("uses the valid version across all channels and omits future updates and notices",async()=>{
  const asOf="2026-10-01T00:00:00.000Z",at=new Date(asOf),start=new Date("2026-09-01T00:00:00Z");
  const old=memory({validFrom:start,createdAt:start,updatedAt:now,status:"superseded",validTo:new Date("2026-10-15T00:00:00Z"),stats:{confirmCount:7,recallCount:2,citedCount:0,lastConfirmedAt:now}});
  const future=memory({pinned:true,type:"profile"});
  mock.aggregate.mockReturnValue({toArray:async()=>[old,future]});
  mock.find.mockReturnValue({sort:()=>({limit:()=>({toArray:async()=>[old,future]})}),limit:()=>({toArray:async()=>[future]})});
  const result=await recall({ownerId:"alice",spaceKey:"s",query:"plan yesterday",asOf});
  expect(result.asOf).toBe(asOf);expect(result.picks.map(p=>p.memoryId)).toEqual([old._id.toHexString()]);
  expect(result.core).toEqual([]);expect(result.strategies).toEqual([]);expect(result.notices).toEqual([]);
  expect(result.picks[0].scores.recency).toBeCloseTo(Math.pow(0.5,30/14));
  expect(result.picks[0].confirmCount).toBe(0);expect(result.picks[0].ageDays).toBe((+at-+start)/86400000);
  expect(mock.bulkWrite).not.toHaveBeenCalled();expect(mock.insertOne.mock.calls[0][0].asOf).toBe(asOf);
 });
 it("rejects invalid ISO dates before retrieval",async()=>{
  await expect(recall({ownerId:"alice",spaceKey:"s",query:"plan",asOf:"2026-02-30T00:00:00Z"})).rejects.toThrow(/asOf/);
  expect(mock.aggregate).not.toHaveBeenCalled();expect(mock.embed).not.toHaveBeenCalled();
 });
});

it("returns historical core and strategies while keeping every temporal predicate composed",async()=>{
 const asOf="2026-10-01T00:00:00Z",start=new Date("2026-09-01T00:00:00Z"),end=new Date("2026-10-15T00:00:00Z");
 const pin=memory({type:"profile",pinned:true,status:"superseded",validFrom:start,validTo:end});
 const strategy=memory({type:"strategy",statement:"When planning use time boxes.",status:"superseded",validFrom:start,validTo:end});
 mock.find.mockReturnValue({sort:()=>({limit:()=>({toArray:async()=>[pin,strategy,memory({pinned:true})]})}),limit:()=>({toArray:async()=>[]})});
 const result=await recall({ownerId:"alice",spaceKey:"s",query:"plan yesterday",asOf,persistTrace:false});
 expect(result.core.map(m=>m.id)).toEqual([pin._id.toHexString()]);expect(result.strategies.map(m=>m.id)).toEqual([strategy._id.toHexString()]);
 const filters=mock.find.mock.calls.map(([filter])=>filter);
 const core=filters.find(f=>JSON.stringify(f).includes('"pinned":true'));
 expect(core.$and).toEqual(expect.arrayContaining([{$or:[{validTo:{$exists:false}},{validTo:{$gt:new Date(asOf)}}]},{$or:[{expiresAt:{$exists:false}},{expiresAt:{$gt:new Date(asOf)}}]},{$or:[{pinned:true},{type:"strategy"}]}]));
 const temporal=filters.find(f=>JSON.stringify(f).includes('"createdAt"'));
 expect(temporal.$and.length).toBe(3);
 const pipelines=mock.aggregate.mock.calls.map(([p])=>p);
 expect(pipelines.find(p=>p[0].$vectorSearch)[0].$vectorSearch.filter).not.toHaveProperty("validFrom");
 expect(pipelines.find(p=>p[0].$vectorSearch)[1].$match.validFrom).toEqual({$lte:new Date(asOf)});
});

it("includes a validated profile only for current recall and never reads it for asOf",async()=>{mock.profile.mockResolvedValue("Alice studies computer science.");expect((await recall({ownerId:"alice",spaceKey:"s",query:"hello",persistTrace:false})).profile).toBe("Alice studies computer science.");mock.profile.mockClear();expect((await recall({ownerId:"alice",spaceKey:"s",query:"hello",asOf:now.toISOString(),persistTrace:false})).profile).toBeUndefined();expect(mock.profile).not.toHaveBeenCalled();});

it("includes validated profile loading in reported recall latency",async()=>{mock.profile.mockImplementation(async()=>{await new Promise(resolve=>setTimeout(resolve,25));return "Alice likes programming.";});const result=await recall({ownerId:"alice",spaceKey:"s",query:"hello",persistTrace:false});expect(result.latencyMs.total).toBeGreaterThanOrEqual(20);});


describe("trusted credential space restrictions",()=>{
 it.each([{allowedSpaceKeys:["s"]},{allowedSpaceKeys:["global","s"]}])("restricts every recall surface before retrieval to $allowedSpaceKeys",async({allowedSpaceKeys})=>{
  const local=memory({pinned:true}),global=memory({spaceKey:"global",pinned:true,type:"strategy",statement:"When planning use global rules."}),other=memory({spaceKey:"other",pinned:true});
  const rows=[local,global,other];
  mock.profile.mockResolvedValue("Private global profile");
  mock.aggregate.mockReturnValue({toArray:async()=>rows});
  mock.find.mockReturnValue({sort:()=>({limit:()=>({toArray:async()=>rows})}),limit:()=>({toArray:async()=>rows})});
  const result=await recall({ownerId:"alice",spaceKey:"s",allowedSpaceKeys,query:"plan yesterday"});
  const permitted=rows.filter(m=>allowedSpaceKeys.includes(m.spaceKey)).map(m=>m._id.toHexString());
  for(const list of [result.picks,result.candidates])expect(list.every(m=>permitted.includes(m.memoryId))).toBe(true);
  for(const list of [result.core,result.strategies])expect(list.every(m=>permitted.includes(m.id))).toBe(true);
  expect(result.notices.flatMap(n=>n.memoryIds).every(id=>permitted.includes(id))).toBe(true);
  expect(result.profile).toBe(allowedSpaceKeys.includes("global")?"Private global profile":undefined);
  if(!allowedSpaceKeys.includes("global"))expect(mock.profile).not.toHaveBeenCalled();
  for(const [pipeline] of mock.aggregate.mock.calls){const first=pipeline[0];if(first.$vectorSearch)expect(first.$vectorSearch.filter.spaceKey.$in).toEqual(allowedSpaceKeys.includes("global")?["s","global"]:["s"]);else expect(first.$search.compound.filter.find((f:{in?:{path:string}})=>f.in?.path==="spaceKey").in.value).toEqual(allowedSpaceKeys.includes("global")?["s","global"]:["s"]);}
  for(const [filter] of mock.find.mock.calls)expect(filter.spaceKey.$in.every((s:string)=>allowedSpaceKeys.includes(s))).toBe(true);
  expect(mock.insertOne.mock.calls[0][0].candidates.every((m:{memoryId:string})=>permitted.includes(m.memoryId))).toBe(true);
 });
 it.each([{allowed:[]},{allowed:["other"]},{allowed:null},{allowed:[""]}])("fails closed before retrieval for invalid/effectively empty grants $allowed",async({allowed})=>{
  await expect(recall({ownerId:"alice",spaceKey:"s",query:"plan",allowedSpaceKeys:allowed as unknown as string[]})).rejects.toMatchObject({code:"SPACE_ACCESS_DENIED"});
  expect(mock.embed).not.toHaveBeenCalled();expect(mock.aggregate).not.toHaveBeenCalled();expect(mock.profile).not.toHaveBeenCalled();
 });
});


describe('changed-notice announcement claims',()=>{
 const setup=()=>{
  const current=memory({type:'fact',slotKey:'alice.deadline',value:'10 PM',statement:'Alice deadline is 10 PM.',entities:[],vector:.95} as Partial<MemoryUnit>);
  const old=memory({type:'fact',slotKey:'alice.deadline',value:'9 PM',status:'superseded',supersededBy:current._id});
  mock.aggregate.mockReturnValue({toArray:async()=>[current]});
  mock.find.mockImplementation(filter=>({sort:()=>({limit:()=>({toArray:async()=>filter.status==='superseded'?[old]:[]})}),limit:()=>({toArray:async()=>filter.status==='superseded'?[old]:[]})}));
  mock.findOneAndUpdate.mockResolvedValueOnce(current).mockResolvedValue(null);
  return {current,old};
 };
 it('announces a real query-relevant change once even when concurrent search snapshots are stale',async()=>{
  setup();
  const first=await recall({ownerId:'alice',spaceKey:'s',query:'what is my deadline?'});
  const second=await recall({ownerId:'alice',spaceKey:'s',query:'what is my deadline?'});
  expect(first.notices.filter(n=>n.kind==='changed')).toHaveLength(1);
  expect(second.notices.filter(n=>n.kind==='changed')).toHaveLength(0);
  expect(mock.findOneAndUpdate.mock.calls[0][0]).toMatchObject({ownerId:'alice',status:'active',spaceKey:{$in:['s','global']}});
 });
 it('does not consume or emit an announcement in a read-only recall',async()=>{
  setup();const result=await recall({ownerId:'alice',spaceKey:'s',query:'what is my deadline?',persistTrace:false});
  expect(result.notices.filter(n=>n.kind==='changed')).toEqual([]);expect(mock.findOneAndUpdate).not.toHaveBeenCalled();
 });
});



it('never moves recall timestamps backwards and claims after a supersede that happens during retrieval',async()=>{
 const started=Date.now(),supersededAt=new Date(started+1000);
 const current=memory({type:'fact',entities:[],slotKey:'alice.deadline',value:'10 PM',statement:'Alice deadline is 10 PM.',vector:.95,updatedAt:supersededAt} as Partial<MemoryUnit>);
 const old=memory({type:'fact',slotKey:'alice.deadline',value:'9 PM',status:'superseded',supersededBy:current._id,updatedAt:supersededAt});
 mock.aggregate.mockReturnValue({toArray:async()=>[current]});
 mock.find.mockImplementation(filter=>({sort:()=>({limit:()=>({toArray:async()=>filter.status==='superseded'?[old]:[]})})}));
 mock.findOneAndUpdate.mockResolvedValue(current);
 const result=await recall({ownerId:'alice',spaceKey:'s',query:'what is my deadline?'});
 expect(result.notices.filter(n=>n.kind==='changed')).toHaveLength(1);
 expect(+mock.findOneAndUpdate.mock.calls[0][1].$max['stats.lastRecalledAt']).toBeGreaterThanOrEqual(+supersededAt);
 expect(mock.bulkWrite.mock.calls[0][0][0].updateOne.update).toHaveProperty('$max');
 expect(mock.bulkWrite.mock.calls[0][0][0].updateOne.update).not.toHaveProperty('$set');
});
