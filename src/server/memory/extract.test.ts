import {beforeEach,describe,expect,it,vi} from "vitest";
import {ObjectId} from "mongodb";
vi.mock("server-only",()=>({}));
const mock=vi.hoisted(()=>({mem:{findOne:vi.fn(),aggregate:vi.fn(),insertOne:vi.fn(),updateOne:vi.fn(),find:vi.fn()},events:{findOne:vi.fn(),insertOne:vi.fn()},spaces:{updateOne:vi.fn()},generateStructured:vi.fn(),embed:vi.fn(),transaction:vi.fn(),end:vi.fn()}));
vi.mock("@/server/db/collections",()=>({collections:()=>({memories:mock.mem,events:mock.events,spaces:mock.spaces})}));
vi.mock("@/server/db/client",()=>({mongo:()=>({startSession:()=>({withTransaction:mock.transaction,endSession:mock.end})})}));
vi.mock("@/server/llm/registry",()=>({generateStructured:mock.generateStructured,embed:mock.embed}));
const {extractAndWrite,rememberExplicit}=await import("./extract");
import type {CandidateMemory,ExtractInput,MemoryUnit} from "./types";
const now=new Date("2026-10-31T01:00:00Z"),spaceKey=new ObjectId().toHexString();
const candidate=(patch:Partial<CandidateMemory>={}):CandidateMemory=>({statement:"Aarav's deadline is 10 PM.",type:"constraint",subject:"aarav",attribute:"deadline",value:"10 PM",entities:["aarav"],importance:9,confidence:0.8,sensitivity:"none",scope:"space",explicit:false,hint:"new",...patch});
const input:ExtractInput={ownerId:"alice",spaceKey,conversationId:"conversation",messageId:"message",turns:[{role:"user",text:"The deadline changed to 10 PM."}],recalled:[],userName:"Aarav",timeZone:"Asia/Kolkata",now,policy:"review_sensitive"};
const active=(patch:Partial<MemoryUnit>={}):MemoryUnit=>({_id:new ObjectId(),ownerId:"alice",spaceKey,type:"constraint",statement:"Aarav's deadline is 9 PM.",subject:"aarav",attribute:"deadline",slotKey:"aarav.deadline",value:"9 PM",entities:["aarav"],tags:[],importance:9,confidence:0.8,sensitivity:"none",pinned:false,status:"active",source:{kind:"chat",actor:{kind:"user",name:"you"}},evidenceIds:[],relatedIds:[],validFrom:new Date("2026-10-31T00:00:00Z"),createdAt:now,updatedAt:now,stats:{recallCount:0,confirmCount:0,citedCount:0},embedding:Array(768).fill(0.1),embeddingModel:"gemini-embedding-2@768",...patch});
beforeEach(()=>{
 vi.clearAllMocks();mock.mem.findOne.mockResolvedValue(null);mock.events.findOne.mockResolvedValue(null);
 mock.mem.aggregate.mockReturnValue({toArray:async()=>[]});mock.mem.find.mockReturnValue({toArray:async()=>[]});
 mock.mem.insertOne.mockResolvedValue({});mock.events.insertOne.mockResolvedValue({});mock.mem.updateOne.mockResolvedValue({matchedCount:1});mock.spaces.updateOne.mockResolvedValue({});
 mock.transaction.mockImplementation(async fn=>fn({}));mock.end.mockResolvedValue(undefined);
 mock.embed.mockImplementation(async items=>items.map(()=>Array(768).fill(0.1)));
 mock.generateStructured.mockResolvedValue({object:{memories:[candidate()]}});
});
describe("transactional writes",()=>{
 it("supersedes a changed slot with linked versions, events and a notice",async()=>{
  const old=active();mock.mem.findOne.mockImplementation(async filter=>filter.slotKey || filter._id?old:null);
  const result=await extractAndWrite(input);
  expect(result.superseded).toBe(1);expect(result.notices[0]).toContain("9 PM; now 10 PM");
  const unit=mock.mem.insertOne.mock.calls[0][0];expect(unit.supersedes).toEqual(old._id);expect(unit.ownerId).toBe("alice");
  expect(mock.mem.updateOne.mock.calls[0][1].$set.status).toBe("superseded");
  expect(mock.events.insertOne.mock.calls.map(c=>c[0].kind)).toEqual(["superseded","created"]);
  expect(mock.transaction).toHaveBeenCalled();
 });
 it("confirms identical slots without an embedding call",async()=>{
  const old=active({value:"10 pm"});mock.mem.findOne.mockImplementation(async filter=>filter.slotKey || filter._id?old:null);
  const result=await extractAndWrite(input);expect(result.confirmed).toBe(1);expect(mock.embed).not.toHaveBeenCalled();
  expect(mock.mem.updateOne.mock.calls[0][1].$set.confidence).toBeCloseTo(0.673286795);
 });
 it("stores older effective facts as superseded history without modifying current truth",async()=>{
  const old=active();mock.mem.findOne.mockImplementation(async filter=>filter.slotKey || filter._id?old:null);
  mock.generateStructured.mockResolvedValue({object:{memories:[candidate({validFrom:"2026-10-30T00:00:00Z"})]}});
  await extractAndWrite(input);expect(mock.mem.insertOne.mock.calls[0][0].status).toBe("superseded");expect(mock.mem.updateOne).not.toHaveBeenCalled();
 });
 it("blocks secrets without storing their statement or embedding",async()=>{
  mock.generateStructured.mockResolvedValue({object:{memories:[candidate({statement:"my password is hunter2"})]}});
  const result=await extractAndWrite(input);expect(result.blocked).toBe(1);expect(mock.mem.insertOne).not.toHaveBeenCalled();expect(mock.embed).not.toHaveBeenCalled();
  expect(JSON.stringify(mock.events.insertOne.mock.calls)).not.toContain("hunter2");expect(JSON.stringify(result)).not.toContain("hunter2");
 });
 it("sends implicit sensitive extraction to review even if the model claims consent",async()=>{
  mock.generateStructured.mockResolvedValue({object:{memories:[candidate({statement:"Aarav has asthma.",sensitivity:"sensitive",explicit:true})]}});
  expect((await extractAndWrite(input)).pending).toBe(1);expect(mock.mem.insertOne.mock.calls[0][0].status).toBe("pending_review");
 });
 it("treats explicit sensitive saves as consent",async()=>{
  const result=await rememberExplicit({ownerId:"alice",spaceKey,statement:"Aarav has asthma.",type:"fact",sensitivity:"sensitive",source:{kind:"manual",actor:{kind:"user",name:"you"}}});
  expect(result.op).toBe("add");expect(mock.mem.insertOne.mock.calls[0][0].status).toBe("active");
 });
 it("skips repeated candidate writes for a message",async()=>{
  mock.events.findOne.mockResolvedValue({kind:"created"});expect((await extractAndWrite(input)).ops[0].op).toBe("skip");expect(mock.mem.insertOne).not.toHaveBeenCalled();
 });
 it("uses content hashes to confirm before embedding",async()=>{
  const old=active({statement:candidate().statement,value:"10 PM"});mock.mem.findOne.mockImplementation(async filter=>filter.contentHash || filter._id?old:null);
  expect((await extractAndWrite(input)).confirmed).toBe(1);expect(mock.embed).not.toHaveBeenCalled();
 });
 it("retries a duplicate active slot as a supersede",async()=>{
  const old=active();let slots=0;
  mock.mem.findOne.mockImplementation(async filter=>filter.slotKey ? (++slots===1?null:old) : filter._id?old:null);
  mock.mem.insertOne.mockRejectedValueOnce({code:11000});
  expect((await extractAndWrite(input)).superseded).toBe(1);
  expect(mock.mem.insertOne.mock.calls[1][0].supersedes).toEqual(old._id);
 });
 it("preserves pinned and slot metadata for an update hint without fields",async()=>{
  const old=active({pinned:true});mock.mem.findOne.mockImplementation(async filter=>filter._id?old:null);
  mock.mem.find.mockReturnValue({toArray:async()=>[old]});
  mock.generateStructured.mockResolvedValue({object:{memories:[candidate({subject:undefined,attribute:undefined,hint:"update",targetRef:"m1"})]}});
  await extractAndWrite({...input,recalled:[{ref:"m1",memoryId:old._id.toHexString(),statement:old.statement}] as ExtractInput["recalled"]});
  const saved=mock.mem.insertOne.mock.calls[0][0];expect(saved.slotKey).toBe("aarav.deadline");expect(saved.pinned).toBe(true);
 });
 it("batches ambiguous reconciliation once and ignores unknown target ids",async()=>{
  const old=active();mock.mem.aggregate.mockReturnValue({toArray:async()=>[{...old,similarity:0.93}]});
  mock.generateStructured.mockResolvedValueOnce({object:{memories:[candidate({subject:undefined,attribute:undefined}),candidate({statement:"Aarav prefers short plans.",subject:undefined,attribute:undefined})]}}).mockResolvedValueOnce({object:{decisions:[{index:0,op:"supersede",targetId:new ObjectId().toHexString()},{index:1,op:"add"}]}});
  const result=await extractAndWrite(input);expect(result.added).toBe(2);expect(mock.generateStructured).toHaveBeenCalledTimes(2);expect(mock.embed).toHaveBeenCalledTimes(1);expect(mock.mem.updateOne).not.toHaveBeenCalled();
 });
 it("marks embeddings for backfill when a stale confirmation becomes an insertion",async()=>{
  const old=active({value:"10 PM"}),replacement=active();let slots=0;
  mock.mem.findOne.mockImplementation(async filter=>filter.slotKey ? (++slots===1?old:replacement) : filter._id?.equals(replacement._id)?replacement:null);
  await extractAndWrite(input);expect(mock.mem.insertOne.mock.calls[0][0].needsEmbedding).toBe(true);
 });
 it("preserves older semantic updates as history",async()=>{
  const old=active();mock.mem.aggregate.mockReturnValue({toArray:async()=>[{...old,similarity:0.93}]});
  mock.mem.findOne.mockImplementation(async filter=>filter._id?old:null);
  mock.generateStructured.mockResolvedValueOnce({object:{memories:[candidate({subject:undefined,attribute:undefined,validFrom:"2026-10-30T00:00:00Z"})]}}).mockResolvedValueOnce({object:{decisions:[{index:0,op:"supersede",targetId:old._id.toHexString()}]}});
  await extractAndWrite(input);expect(mock.mem.insertOne.mock.calls[0][0].status).toBe("superseded");expect(mock.mem.updateOne).not.toHaveBeenCalled();
 });
 it("marks fallback embeddings when the original target disappears entirely",async()=>{
  const old=active({value:"10 PM"});let slots=0;
  mock.mem.findOne.mockImplementation(async filter=>filter.slotKey && ++slots===1?old:null);
  await extractAndWrite(input);expect(mock.mem.insertOne.mock.calls[0][0].needsEmbedding).toBe(true);
 });
 it("does not inherit an unrelated target from an LLM add decision",async()=>{
  const old=active();mock.mem.aggregate.mockReturnValue({toArray:async()=>[{...old,similarity:0.93}]});
  mock.mem.findOne.mockImplementation(async filter=>filter._id?old:null);
  mock.generateStructured.mockResolvedValueOnce({object:{memories:[candidate({subject:undefined,attribute:undefined})]}}).mockResolvedValueOnce({object:{decisions:[{index:0,op:"add",targetId:old._id.toHexString()}]}});
  await extractAndWrite(input);expect(mock.mem.insertOne.mock.calls[0][0].slotKey).toBeUndefined();expect(mock.mem.updateOne).not.toHaveBeenCalled();
 });
 it("omits absent BSON optional fields so TTL and partial slot indexes work",async()=>{
  mock.generateStructured.mockResolvedValue({object:{memories:[candidate({subject:undefined,attribute:undefined})]}});
  await extractAndWrite(input);const saved=mock.mem.insertOne.mock.calls[0][0];
  expect(Object.hasOwn(saved,"slotKey")).toBe(false);expect(Object.hasOwn(saved,"expiresAt")).toBe(false);expect(Object.hasOwn(saved,"purgeAt")).toBe(false);
 });
 it("scans normalized metadata before it can introduce plaintext secrets",async()=>{
  mock.generateStructured.mockResolvedValue({object:{memories:[candidate({entities:["ｐａｓｓｗｏｒｄ ｉｓ ｈｕｎｔｅｒ２"]})]}});
  expect((await extractAndWrite(input)).blocked).toBe(1);expect(mock.mem.insertOne).not.toHaveBeenCalled();
 });
 it("blocks secrets in candidate metadata as well as statements",async()=>{
  mock.generateStructured.mockResolvedValue({object:{memories:[candidate({entities:["sk-"+"a".repeat(25)]})]}});
  expect((await extractAndWrite(input)).blocked).toBe(1);expect(mock.mem.insertOne).not.toHaveBeenCalled();
 });
});
