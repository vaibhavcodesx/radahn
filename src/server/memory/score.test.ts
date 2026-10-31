import { describe,expect,it } from "vitest";
import { ObjectId } from "mongodb";
import { rrf,score,select,cosine,type Ranked } from "./score";
import { buildSystemPrompt } from "./context";
import type { MemoryUnit,RecallResult } from "./types";
const now=new Date("2026-10-31T00:00:00Z");
const unit=(patch:Partial<MemoryUnit>={}):MemoryUnit=>({_id:new ObjectId(),ownerId:"a",spaceKey:"s",type:"fact",statement:"Aarav uses Atlas.",entities:[],tags:[],importance:8,confidence:0.8,sensitivity:"none",status:"active",pinned:false,source:{kind:"chat",actor:{kind:"user",name:"you"}},evidenceIds:[],relatedIds:[],validFrom:now,createdAt:now,updatedAt:now,stats:{recallCount:0,confirmCount:0,citedCount:0},embedding:[1,0],embeddingModel:"gemini-embedding-2@768",...patch});
const ranked=(patch:Partial<MemoryUnit>={},vector=0.9):Ranked=>{const u=unit(patch);const hits={ranks:{semantic:1},vector};return {unit:u,hits,scores:score(u,hits,"general",1,now),selected:false};};
describe("recall scoring",()=>{
 it("normalizes one-based RRF by successful channel count",()=>{expect(rrf([1,1,1,1],4)).toBeCloseTo(1);expect(rrf([1],4)).toBeCloseTo(0.25);expect(rrf([],0)).toBe(0);});
 it("uses half-lives and confirmation freshness",()=>{
  const updatedAt=new Date(+now-60*86400000);
  expect(score(unit({updatedAt}),{ranks:{semantic:1}},"general",1,now).recency).toBeCloseTo(0.5);
  expect(score(unit({type:"profile",updatedAt}),{ranks:{}},"general",1,now).recency).toBe(1);
  expect(score(unit({type:"strategy",updatedAt}),{ranks:{}},"general",1,now).recency).toBe(1);
  expect(score(unit({updatedAt,stats:{recallCount:0,confirmCount:1,citedCount:0,lastConfirmedAt:now}}),{ranks:{}},"general",1,now).recency).toBe(1);
 });
 it("applies formula and intent-specific boosts",()=>{
  const s=score(unit({type:"constraint"}),{ranks:{semantic:1}},"plan",1,now);
  expect(s.typeBoost).toBe(0.1);expect(s.final).toBeCloseTo(1);
  expect(score(unit({type:"outcome"}),{ranks:{}},"recall",1,now).typeBoost).toBe(0.1);
  expect(score(unit(),{ranks:{}},"plan",1,now).typeBoost).toBe(0);
 });
 it("drops thresholds and semantic-only noise without losing lexical matches",()=>{
  const low=ranked({importance:1,confidence:0,updatedAt:new Date(0)},0.4);
  const lexical=ranked({},0.4);lexical.hits.ranks.lexical=1;
  const result=select([low,lexical]);expect(result).toHaveLength(1);expect(low.droppedBy).toBe("threshold");expect(result[0]).toBe(lexical);
 });
 it("MMR skips near duplicates while keeping distinct relevant units",()=>{
  const a=ranked(),duplicate=ranked({statement:"Atlas is Aarav's database."}),other=ranked({embedding:[0,1]});
  expect(select([a,duplicate,other])).toEqual([a,other]);expect(duplicate.droppedBy).toBe("mmr");
 });
 it("keeps conflicting slot values for ambiguity notices",()=>{
  const a=ranked({slotKey:"aarav.deadline",value:"9 PM"}),b=ranked({slotKey:"aarav.deadline",value:"10 PM"});
  expect(select([a,b])).toHaveLength(2);
 });
 it("enforces unit and token budgets and excludes pinned core",()=>{
  const rows=Array.from({length:10},(_,i)=>ranked({embedding:[i,1],statement:"x".repeat(240)}));
  expect(select(rows,{maxUnits:1})).toHaveLength(1);
  const big=ranked({statement:"x".repeat(240)});expect(select([big],{maxTokens:10})).toEqual([]);expect(big.droppedBy).toBe("budget");
  expect(select([ranked({pinned:true})])).toEqual([]);
 });
 it("computes cosine safely",()=>{expect(cosine([1,0],[1,0])).toBe(1);expect(cosine([0,0],[1,0])).toBe(0);expect(cosine([1],[1,0])).toBe(0);});
 it("context citations map exactly to selected refs",()=>{
  const recall={picks:[{ref:"m1",memoryId:"id1",type:"fact",statement:"Aarav uses Atlas.",ageDays:0,confirmCount:0}],core:[],strategies:[],notices:[]} as unknown as RecallResult;
  expect(buildSystemPrompt({userName:"Aarav",now,timeZone:"Asia/Kolkata",spaceName:"hackathon",recall}).refs).toEqual({m1:"id1"});
 });
});

// Explicit mocked search scores and vectors: deterministic flood regression, no hosted embeddings.
it("keeps a strong dietary semantic hit ahead of incidental demo lexical/entity flood",()=>{
 const diet=unit({type:"profile",importance:6,statement:"Aarav switched to a vegetarian diet in October 2026",embedding:[0,1]});
 const hits={ranks:{semantic:1},vector:.88,semanticSimilarity:.76};
 const dietary:Ranked={unit:diet,hits,scores:score(diet,hits,"plan",4,now),selected:false};
 const flood=Array.from({length:8},(_,i)=>{
  const u=unit({type:"constraint",importance:10,statement:`Demo detail ${i}`,embedding:Array.from({length:10},(_,j)=>j===i?1:0)});
  const h={ranks:{semantic:i+2,lexical:i+1,graph:i+1},vector:.56,semanticSimilarity:.12};
  return {unit:u,hits:h,scores:score(u,h,"plan",4,now),selected:false};
 });
 expect(select([...flood,dietary]).map(r=>r.unit._id)).toContainEqual(diet._id);
 expect(dietary.scores.final).toBeGreaterThan(flood[0].scores.final);
});

it("reserves the strongest focused semantic match against real measured close cosine competitors",()=>{
 // Synthetic fixture metadata; cosine scalars are parent synthetic Gemini probe measurements.
 const diet=unit({type:"profile",importance:7,confidence:.9,statement:"Aarav switched to a vegetarian diet in October 2026."});
 const hits={ranks:{semantic:1},semanticSimilarity:.619713};
 const dietary:Ranked={unit:diet,hits,scores:score(diet,hits,"plan",3,now),selected:false};
 const flood=Array.from({length:8},(_,i)=>{const u=unit({type:"constraint",importance:10,confidence:.9,embedding:[i,1]});const h={ranks:{semantic:i+2,lexical:i+1,graph:i+1},semanticSimilarity:.60536-i*.001};return {unit:u,hits:h,scores:score(u,h,"plan",3,now),selected:false};});
 expect(select([...flood,dietary],{preserveSemanticBest:true})[0]).toBe(dietary);
});
