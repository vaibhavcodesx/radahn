import "server-only";
/** Hosted integration checks (CODEX_TASKS overnight notes, memory-engine.md §5/§9). */
import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import { collections } from "@/server/db/collections";
import { embed } from "@/server/llm/registry";
import { recall } from "./recall";
import type { MemoryUnit, MemoryType } from "./types";
export interface SelfTestCheck { name:string;ok:boolean;ms:number;detail?:string }
export async function runSelfTest():Promise<{ok:boolean;checks:SelfTestCheck[]}> {
  const ownerId=`eval:selftest:${Date.now()}:${randomUUID()}`;
  const spaceKey=new ObjectId().toHexString(), c=collections(), checks:SelfTestCheck[]=[];
  const check=async(name:string,fn:()=>Promise<void>)=>{const t=performance.now();try{await fn();checks.push({name,ok:true,ms:Math.round(performance.now()-t)});}catch{checks.push({name,ok:false,ms:Math.round(performance.now()-t),detail:"Check failed; provider and content details suppressed."});}};
  try {
    const data:Array<{type:MemoryType;statement:string;importance:number}>=[
      {type:"constraint",statement:"Aarav must submit Radahn by 9 PM today.",importance:10},
      {type:"preference",statement:"Aarav likes plans broken into time boxes of 30 to 60 minutes.",importance:8},
      {type:"goal",statement:"Aarav wants a top-16 finish at UNCHARTED 2026.",importance:9},
    ];
    const now=new Date();
    await check("embed-and-seed-isolated-owner",async()=>{
      const vectors=await embed(data.map(m=>({text:m.statement,title:m.type})),"document");
      const units:MemoryUnit[]=data.map((m,i)=>({...m,_id:new ObjectId(),ownerId,spaceKey,entities:["aarav","radahn"],tags:[],confidence:0.95,sensitivity:"none",pinned:false,status:"active",source:{kind:"seed",actor:{kind:"system",name:"selftest"}},evidenceIds:[],relatedIds:[],validFrom:now,createdAt:now,updatedAt:now,stats:{recallCount:0,confirmCount:0,citedCount:0},embedding:vectors[i],embeddingModel:"gemini-embedding-2@768"}));
      await c.memories.insertMany(units);
    });
    if(checks[0].ok) await check("hybrid-recall-planning-and-owner-isolation",async()=>{
      // Atlas Search is eventually consistent; wait only inside the integration probe.
      let result:Awaited<ReturnType<typeof recall>>|undefined;
      for(let attempt=0;attempt<8;attempt++) {
        result=await recall({ownerId,spaceKey,query:"Plan my next 4 hours.",persistTrace:false});
        if(result.picks.length===3) break;
        await new Promise(resolve=>setTimeout(resolve,500));
      }
      if(result?.picks.length!==3 || !result.channelsRan.includes("semantic") || !result.channelsRan.includes("lexical")) throw new Error("Recall check failed");
      const other=await recall({ownerId:`${ownerId}:other`,spaceKey,query:"Plan my next 4 hours.",persistTrace:false});
      if(other.picks.length || other.core.length || other.strategies.length) throw new Error("Owner isolation failed");
      const warm=await recall({ownerId,spaceKey,query:"Plan my next 4 hours.",persistTrace:false});
      checks.push({name:"warm-recall-latency",ok:warm.latencyMs.total<400,ms:Math.round(warm.latencyMs.total),detail:"Warm query; retrieval and scoring budget is 400 ms."});
    });
  } finally {
    await check("cleanup-isolated-owner",async()=>{
      await Promise.all([c.memories.deleteMany({ownerId}),c.events.deleteMany({ownerId}),c.recalls.deleteMany({ownerId}),c.reflections.deleteMany({ownerId})]);
    });
  }
  return {ok:checks.every(check=>check.ok),checks};
}
