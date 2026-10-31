import "server-only";
/** Hosted integration checks (CODEX_TASKS overnight notes, memory-engine.md §5/§9). */
import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import { collections } from "@/server/db/collections";
import { embed } from "@/server/llm/registry";
import { recall } from "./recall";
import { writeCandidates } from "./write";
import { extractAndWrite, rememberExplicit } from "./extract";
import { correctMemory, forgetMemory, reviewMemory, updateMemory, listMemories } from "./tools";
import { runReflection, listReflections } from "./reflect";
import { graph, insights } from "./insights";
import { seedDemo, removeDemo } from "./seed";
import { DEMO_MEMORIES } from "./fixtures/demo";
import { flipExpired, runMaintenance } from "./lifecycle";
import { createAgentKey, verifyAgentKey, listAgentKeys, revokeAgentKey } from "./agentKeys";
import { listConflicts, resolveConflict } from "./conflicts";
import { buildSystemPrompt } from "./context";
import { mongo } from "@/server/db/client";
import type { CandidateMemory } from "./types";
import type { MemoryUnit, MemoryType } from "./types";
class SelfTestAssertion extends Error {}
export interface SelfTestCheck { name:string;ok:boolean;ms:number;detail?:string;model?:string }
export async function runSelfTest():Promise<{ok:boolean;checks:SelfTestCheck[]}> {
  const ownerId=`eval:selftest:${Date.now()}:${randomUUID()}`;
  const isolatedOwners=[ownerId,`${ownerId}:conflicts`,`${ownerId}:history`];
  const spaceKey=new ObjectId().toHexString(), c=collections(), checks:SelfTestCheck[]=[];
  const check=async(name:string,fn:()=>Promise<void|{model?:string}>)=>{const t=performance.now();try{const metadata=await fn();checks.push({name,ok:true,ms:Math.round(performance.now()-t),...(metadata?.model?{model:metadata.model}:{})});}catch(error){checks.push({name,ok:false,ms:Math.round(performance.now()-t),detail:error instanceof SelfTestAssertion?error.message:"Check failed; provider and content details suppressed."});}};
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
      for(let attempt=0;attempt<30;attempt++) {
        result=await recall({ownerId,spaceKey,query:"Plan my next 4 hours.",persistTrace:false});
        if(result.picks.length===3 && result.channelsRan.includes("semantic") && result.channelsRan.includes("lexical")) break;
        await new Promise(resolve=>setTimeout(resolve,500));
      }
      if(result?.picks.length!==3 || !result.channelsRan.includes("semantic") || !result.channelsRan.includes("lexical")) throw new SelfTestAssertion("Recall check failed");
      const other=await recall({ownerId:`${ownerId}:other`,spaceKey,query:"Plan my next 4 hours.",persistTrace:false});
      if(other.picks.length || other.core.length || other.strategies.length) throw new SelfTestAssertion("Owner isolation failed");
      const warm=await recall({ownerId,spaceKey,query:"Plan my next 4 hours.",persistTrace:false});
      checks.push({name:"warm-recall-latency",ok:warm.latencyMs.total<400,ms:Math.round(warm.latencyMs.total),detail:"Warm query; retrieval and scoring budget is 400 ms."});
    });
    await check("transactional-slot-reconcile-and-idempotency",async()=>{
      const candidate:CandidateMemory={statement:"Aarav's integration deadline is 9 PM.",type:"constraint",subject:"aarav",attribute:"integration_deadline",value:"9 PM",entities:["aarav"],importance:9,confidence:0.9,sensitivity:"none",scope:"space",explicit:true,hint:"new"};
      const writeSpaceKey=new ObjectId().toHexString();
      const context={ownerId,spaceKey:writeSpaceKey,now:new Date(),policy:"review_sensitive" as const,source:{kind:"manual" as const,messageId:"selftest-create",actor:{kind:"system" as const,name:"selftest"}},recalled:[]};
      const first=await writeCandidates([candidate],context);
      if(first.added!==1)throw new SelfTestAssertion("Create failed");
      const duplicate=await writeCandidates([candidate],context);
      if(duplicate.ops[0]?.op!=="skip")throw new SelfTestAssertion("Idempotency failed");
      const confirmed=await writeCandidates([candidate],{...context,source:{...context.source,messageId:"selftest-confirm"}});
      if(confirmed.confirmed!==1)throw new SelfTestAssertion("Confirm failed");
      const updated=await writeCandidates([{...candidate,statement:"Aarav's integration deadline is 10 PM.",value:"10 PM"}],{...context,source:{...context.source,messageId:"selftest-update"}});
      if(updated.superseded!==1 || !updated.notices.length)throw new SelfTestAssertion("Supersede failed");
      const paraphrase=await writeCandidates([{...candidate,statement:"The integration cutoff for Aarav is ten in the evening.",value:"10 PM"}],{...context,source:{...context.source,messageId:"selftest-paraphrase"}});
      if(paraphrase.confirmed!==1)throw new SelfTestAssertion("Paraphrase did not confirm");
      const chain=await c.memories.find({ownerId,slotKey:"aarav.integration_deadline"}).toArray();
      if(chain.filter(m=>m.status==="active").length!==1 || chain.filter(m=>m.status==="superseded").length!==1)throw new SelfTestAssertion("Single truth failed");
      const historical=await writeCandidates([{...candidate,validFrom:"2026-01-01T00:00:00Z"}],{...context,source:{...context.source,messageId:"selftest-history"}});
      const old=await c.memories.findOne({ownerId,_id:new ObjectId(historical.ops[0].memoryId)});
      if(old?.status!=="superseded")throw new SelfTestAssertion("History guard failed");
    });
    await check("privacy-sensitive-review-and-consent",async()=>{
      const candidate:CandidateMemory={statement:"my password is hunter2",type:"fact",entities:[],importance:6,confidence:0.9,sensitivity:"none",scope:"space",explicit:false,hint:"new"};
      const context={ownerId,spaceKey,now:new Date(),policy:"review_sensitive" as const,source:{kind:"manual" as const,messageId:"selftest-block",actor:{kind:"system" as const,name:"selftest"}},recalled:[]};
      const blocked=await writeCandidates([candidate],context);
      if(blocked.blocked!==1 || await c.memories.countDocuments({ownerId,statement:/hunter2/}))throw new SelfTestAssertion("Privacy gate failed");
      const pending=await writeCandidates([{...candidate,statement:"Aarav has fictional seasonal allergies.",sensitivity:"sensitive"}],{...context,source:{...context.source,messageId:"selftest-pending"}});
      if(pending.pending!==1)throw new SelfTestAssertion("Review gate failed");
      const explicit=await rememberExplicit({ownerId,spaceKey,statement:"Aarav has fictional seasonal allergies.",type:"fact",sensitivity:"sensitive",source:{kind:"manual",actor:{kind:"system",name:"selftest"}}});
      if(explicit.op!=="add")throw new SelfTestAssertion("Explicit consent failed");
    });
    await check("transaction-abort-leaves-no-partial-memory",async()=>{
      const sample=await c.memories.findOne({ownerId});
      if(!sample)throw new SelfTestAssertion("No fixture");
      const _id=new ObjectId(),session=mongo().startSession();
      const probe={...sample,_id};delete probe.slotKey;let inserted=false;
      try {await session.withTransaction(async()=>{await c.memories.insertOne(probe,{session});inserted=true;throw new SelfTestAssertion("intentional rollback");});} catch { /* Expected rollback; verify below. */ } finally {await session.endSession();}
      if(!inserted)throw new SelfTestAssertion("Transaction insert failed before rollback probe");
      if(await c.memories.findOne({ownerId,_id}))throw new SelfTestAssertion("Transaction did not roll back");
    });
    await check("explicit-correction-review-and-forget",async()=>{
      const source=await c.memories.findOne({ownerId,status:"active",slotKey:"aarav.integration_deadline"});
      if(!source)throw new SelfTestAssertion("Missing correction fixture");
      const corrected=await correctMemory({ownerId,spaceKey,memoryId:source._id.toHexString(),newStatement:"Aarav's integration deadline is 11 PM.",actor:{kind:"system",name:"selftest"}});
      if(corrected.status!=="updated" || !corrected.after)throw new SelfTestAssertion("Explicit correction failed");
      const chain=await c.memories.find({ownerId,slotKey:"aarav.integration_deadline"}).toArray();
      const active=chain.filter(m=>m.status==="active");
      if(active.length!==1 || active[0]._id.toHexString()!==corrected.after.id || chain.filter(m=>m.status==="superseded").length<2)throw new SelfTestAssertion("Correction chain lost single truth/history");
      const pending=await c.memories.findOne({ownerId,status:"pending_review"});
      if(pending && (await reviewMemory({ownerId,memoryId:pending._id.toHexString(),decision:"approve",actor:{kind:"system",name:"selftest"}}))?.status!=="active")throw new SelfTestAssertion("Approval failed");
      const forgotten=await forgetMemory({ownerId,memoryId:corrected.after.id,actor:{kind:"system",name:"selftest"}});
      if(forgotten.status!=="forgotten" || await c.memories.findOne({ownerId,_id:new ObjectId(corrected.after.id)}))throw new SelfTestAssertion("Forget failed");
      const tombstone=await c.events.findOne({ownerId,memoryId:new ObjectId(corrected.after.id),kind:"forgotten"});
      if(!tombstone || tombstone.diff || tombstone.summary.includes("11 PM"))throw new SelfTestAssertion("Tombstone leaked content");
    });
    await check("concurrent-core-pin-budget",async()=>{
      const sample=await c.memories.findOne({ownerId,status:"active"});if(!sample)throw new SelfTestAssertion("No fixture");
      const rows=Array.from({length:7},(_,i)=>{const row={...sample,_id:new ObjectId(),statement:(`Synthetic pin ${i} `+"x".repeat(240)).slice(0,240),pinned:i<5};delete row.slotKey;delete row.expiresAt;delete row.purgeAt;return row;});
      try {
        await c.memories.insertMany(rows);
        const results=await Promise.allSettled(rows.slice(5).map(row=>updateMemory({ownerId,memoryId:row._id.toHexString(),patch:{pinned:true},actor:{kind:"system",name:"selftest"}})));
        if(results.filter(r=>r.status==="fulfilled").length!==1 || results.filter(r=>r.status==="rejected" && r.reason?.code==="PIN_BUDGET_EXCEEDED").length!==1)throw new SelfTestAssertion("Concurrent pin budget failed");
      } finally {await c.memories.deleteMany({ownerId,_id:{$in:rows.map(row=>row._id)}});}
    });
    await check("expiry-status-and-event",async()=>{
      const sample=await c.memories.findOne({ownerId,status:"active"});if(!sample)throw new SelfTestAssertion("No fixture");
      const now=new Date(),row={...sample,_id:new ObjectId(),pinned:false,expiresAt:new Date(+now-1000),purgeAt:new Date(+now+180000),createdAt:new Date(+now-3000)};delete row.slotKey;
      await c.memories.insertOne(row);await flipExpired(ownerId,now);
      if((await c.memories.findOne({ownerId,_id:row._id}))?.status!=="expired" || !await c.events.findOne({ownerId,memoryId:row._id,kind:"expired"}))throw new SelfTestAssertion("Expiry event failed");
    });
    await check("owner-only-embedding-maintenance",async()=>{
      const sample=await c.memories.findOne({ownerId,status:"active"});if(!sample)throw new SelfTestAssertion("No maintenance fixture");
      const now=new Date(),row={...sample,_id:new ObjectId(),statement:"An eval memory needs a replacement document embedding.",pinned:false,embedding:Array(768).fill(0),needsEmbedding:true,createdAt:now,updatedAt:now};delete row.slotKey;delete row.contentHash;
      await c.memories.insertOne(row);
      await runMaintenance({ownerId,now});
      const repaired=await c.memories.findOne({ownerId,_id:row._id});
      if(!repaired || repaired.needsEmbedding || repaired.embedding.length!==768 || repaired.embedding.some(n=>!Number.isFinite(n)) || !repaired.embedding.some(n=>n!==0))throw new SelfTestAssertion("Embedding backfill failed");
    });
    await check("agent-key-scope-list-and-revocation",async()=>{
      const created=await createAgentKey(ownerId,"Synthetic selftest",["global"]);
      const access=await verifyAgentKey(created.key);
      if(access?.ownerId!==ownerId || access.spaceKeys.length!==1 || access.spaceKeys[0]!=="global")throw new SelfTestAssertion("Agent key scope verification failed");
      const listed=await listAgentKeys(ownerId);
      if(!listed.some(item=>item.id===created.id) || listed.some(item=>"key" in item || "keyHash" in item))throw new SelfTestAssertion("Agent key metadata failed");
      if(await revokeAgentKey(ownerId+":other",created.id))throw new SelfTestAssertion("Foreign owner revoked agent key");
      if(!await revokeAgentKey(ownerId,created.id) || await verifyAgentKey(created.key))throw new SelfTestAssertion("Agent key revocation failed");
    });
    await check("conflict-detection-and-versioned-resolution",async()=>{
      const sample=await c.memories.findOne({ownerId,status:"active"});if(!sample)throw new SelfTestAssertion("No conflict fixture");
      const conflictOwner=isolatedOwners[1],now=new Date(),scope=new ObjectId().toHexString();
      const rows=["9 PM","10 PM"].map(value=>{
        const row={...sample,_id:new ObjectId(),ownerId:conflictOwner,spaceKey:scope,type:"constraint" as const,statement:`The synthetic demo deadline is ${value}.`,subject:"synthetic-demo",attribute:"deadline",value,pinned:false,entities:["synthetic-demo"],evidenceIds:[],relatedIds:[],stats:{recallCount:0,confirmCount:0,citedCount:0},validFrom:now,createdAt:now,updatedAt:now};
        delete row.slotKey;delete row.expiresAt;delete row.purgeAt;delete row.contentHash;delete row.validTo;delete row.supersedes;delete row.supersededBy;return row;
      });
      await c.memories.insertMany(rows);
      const pairs=await listConflicts(conflictOwner);
      if(!pairs.some(pair=>[pair.left.id,pair.right.id].includes(rows[0]._id.toHexString())&&[pair.left.id,pair.right.id].includes(rows[1]._id.toHexString())))throw new SelfTestAssertion("Contradiction pair missing");
      const resolved=await resolveConflict({ownerId:conflictOwner,keepId:rows[1]._id.toHexString(),dropIds:[rows[0]._id.toHexString()]});
      const old=await c.memories.findOne({ownerId:conflictOwner,_id:rows[0]._id});
      if(resolved.status!=="resolved" || old?.status!=="superseded" || old.supersedeReason!=="conflict_resolution" || !old.validTo || !await c.events.findOne({ownerId:conflictOwner,memoryId:rows[0]._id,kind:"superseded"}))throw new SelfTestAssertion("Conflict resolution history failed");
    });
    await check("historical-validity-and-supersession-boundary",async()=>{
      const sample=await c.memories.findOne({ownerId,status:"active"});if(!sample)throw new SelfTestAssertion("No history fixture");
      const historyOwner=isolatedOwners[2],now=new Date(),boundary=new Date(+now-3600000),past=new Date(+boundary-1000),scope=new ObjectId().toHexString(),oldId=new ObjectId(),newId=new ObjectId();
      const base={...sample,ownerId:historyOwner,spaceKey:scope,type:"constraint" as const,subject:"selftest",attribute:"historical_deadline",slotKey:"selftest.historical_deadline",pinned:false,entities:["synthetic-history"],evidenceIds:[],relatedIds:[],source:{kind:"seed" as const,actor:{kind:"system" as const,name:"selftest"}},stats:{recallCount:0,confirmCount:0,citedCount:0}};
      delete base.expiresAt;delete base.purgeAt;delete base.contentHash;delete base.validTo;delete base.supersedes;delete base.supersededBy;
      await c.memories.insertMany([
        {...base,_id:oldId,statement:"The historical deadline was 9 PM.",value:"9 PM",status:"superseded",validFrom:new Date(+boundary-3600000),validTo:boundary,supersededBy:newId,createdAt:new Date(+boundary-3600000),updatedAt:boundary},
        {...base,_id:newId,statement:"The historical deadline is 10 PM.",value:"10 PM",status:"active",validFrom:boundary,supersedes:oldId,createdAt:boundary,updatedAt:boundary},
      ]);
      const before=await listMemories({ownerId:historyOwner,spaceKey:scope,asOf:past.toISOString()});
      const at=await listMemories({ownerId:historyOwner,spaceKey:scope,asOf:boundary.toISOString()});
      if(before.length!==1||before[0].id!==oldId.toHexString()||at.length!==1||at[0].id!==newId.toHexString())throw new SelfTestAssertion("Historical list boundary failed");
      const result=await recall({ownerId:historyOwner,spaceKey:scope,query:"Plan around my deadline",asOf:past.toISOString(),persistTrace:false});
      if(!result.picks.some(p=>p.memoryId===oldId.toHexString())||result.picks.some(p=>p.memoryId===newId.toHexString())||result.notices.some(n=>n.kind==="changed"))throw new SelfTestAssertion("Historical recall leaked a future version");
    });
    await check("structured-extraction-live-provider",async()=>{
      const result=await extractAndWrite({ownerId,spaceKey,conversationId:"selftest",messageId:"selftest-extract",turns:[{role:"user",text:"Remember that Aarav prefers answers as short bullet lists."}],recalled:[],userName:"Aarav",timeZone:"Asia/Kolkata",now:new Date(),policy:"review_sensitive"});
      if(result.added+result.confirmed+result.pending<1)throw new SelfTestAssertion("Extraction produced no useful memory");
    });
    await check("precomputed-demo-seed-and-removal",async()=>{
      const input={ownerId,spaceIds:{hackathon:spaceKey,personal:new ObjectId().toHexString(),internships:new ObjectId().toHexString()},conversations:[]};
      const before=await c.memories.countDocuments({ownerId,demo:{$ne:true}});
      const result=await seedDemo(input);
      if(result.memories!==DEMO_MEMORIES.length || await c.memories.countDocuments({ownerId,demo:true})!==DEMO_MEMORIES.length)throw new SelfTestAssertion("Demo seed count failed");
      await removeDemo(ownerId);
      if(await c.memories.countDocuments({ownerId,demo:true})!==0 || await c.memories.countDocuments({ownerId,demo:{$ne:true}})!==before)throw new SelfTestAssertion("Demo removal isolation failed");
      await seedDemo(input);
    });
    await check("owner-scoped-insights-and-graph",async()=>{
      const [metrics,field]=await Promise.all([insights(ownerId),graph(ownerId)]);
      if(metrics.storageBytes<=0 || !metrics.byType.length || !metrics.byStatus.length || metrics.recallHitRate<0 || metrics.recallHitRate>1)throw new SelfTestAssertion("Insights aggregate failed");
      const ids=new Set(field.nodes.map(node=>node.id));
      if(field.nodes.length<38 || !field.links.length || field.links.some(link=>!ids.has(link.source)||!ids.has(link.target)) || field.nodes.some(node=>"embedding" in node))throw new SelfTestAssertion("Graph payload failed");
    });
    await check("feedback-reflection-and-strategy-history",async()=>{
      const now=new Date();
      await c.spaces.insertOne({_id:new ObjectId(spaceKey),ownerId,name:"Synthetic reflection",color:"--t-feedback",isDefault:false,unitsSinceReflection:8,createdAt:now});
      // Seed includes the desired rule already: remove only this disposable demo rule to test actual learning.
      await c.memories.deleteMany({ownerId,demo:true,type:"strategy"});
      const run=await runReflection({ownerId,spaceKey,trigger:"manual"});
      if(run.status!=="done" || run.steps.some(step=>step.status!=="done"))throw new SelfTestAssertion("Reflection did not complete all steps");
      const generated=await c.memories.find({ownerId,_id:{$in:run.outputs.strategies.map(id=>new ObjectId(id))},type:"strategy",status:"active"}).toArray();
      if(!generated.some(m=>/bullet/i.test(m.statement)&&/(?:5|five|short|concise)/i.test(m.statement)&&m.evidenceIds.length>=1))throw new SelfTestAssertion("Reflection did not produce an evidence-backed bullet strategy");
      const space=await c.spaces.findOne({ownerId,_id:new ObjectId(spaceKey)});
      if(space?.unitsSinceReflection!==0 || !space.lastReflectionAt)throw new SelfTestAssertion("Reflection counter reset failed");
      if(((await c.settings.findOne({_id:ownerId}))?.reflectionRevision??0)<1)throw new SelfTestAssertion("Reflection generation was not committed");
      if(!(await listReflections(ownerId)).some(r=>r._id.equals(run._id)))throw new SelfTestAssertion("Reflection history missing");
      return {model:run.steps.find(step=>step.name==="consolidate")?.detail?.match(/model: ([a-zA-Z0-9./_-]+)/)?.[1]};
    });
    await check("profile-summary-context-and-erasure",async()=>{
      const profile=await c.profiles.findOne({_id:ownerId,ownerId});
      if(!profile || !profile.text || profile.text.length>1200 || profile.version<1 || !profile.evidenceIds.length)throw new SelfTestAssertion("Reflection profile missing or invalid");
      const evidence=await c.memories.find({ownerId,_id:{$in:profile.evidenceIds}}).toArray();
      if(evidence.length!==profile.evidenceIds.length || evidence.some(unit=>unit.spaceKey!=="global"||unit.sensitivity!=="none"||unit.status!=="active"))throw new SelfTestAssertion("Profile evidence scope failed");
      const input={ownerId,spaceKey,query:"Plan my next 4 hours.",persistTrace:false};
      const current=await recall(input);
      if(current.profile!==profile.text || !buildSystemPrompt({recall:current,userName:"Aarav",timeZone:"Asia/Kolkata",spaceName:"selftest",now:new Date()}).system.includes(profile.text))throw new SelfTestAssertion("Profile context missing");
      const key=await createAgentKey(ownerId,"Scoped synthetic selftest",[spaceKey]);
      const access=await verifyAgentKey(key.key);
      if(!access || access.spaceKeys.includes("global"))throw new SelfTestAssertion("Project key grant invalid");
      const scoped=await recall({...input,allowedSpaceKeys:access.spaceKeys});
      const ids=[...new Set([...scoped.picks.map(p=>p.memoryId),...scoped.candidates.map(p=>p.memoryId),...scoped.notices.flatMap(n=>n.memoryIds)])].map(id=>new ObjectId(id));
      const scopedRows=await c.memories.find({ownerId,_id:{$in:ids}}).toArray();
      const listed=await listMemories({ownerId,spaceKey:"all",allowedSpaceKeys:access.spaceKeys});
      if(!scoped.picks.length || scoped.profile || scopedRows.length!==ids.length || scopedRows.some(unit=>unit.spaceKey!==spaceKey) || [...scoped.core,...scoped.strategies,...listed].some(unit=>unit.spaceKey!==spaceKey))throw new SelfTestAssertion("Project key widened into private spaces");
      const unauthorized=await forgetMemory({ownerId,memoryId:profile.evidenceIds[0].toHexString(),allowedSpaceKeys:access.spaceKeys,actor:{kind:"external_agent",name:access.name}});
      if(unauthorized.status!=="not_found" || !await c.memories.findOne({ownerId,_id:profile.evidenceIds[0]}))throw new SelfTestAssertion("Project key erased a global memory");
      let denied=false;
      try{await rememberExplicit({ownerId,spaceKey,scope:"global",allowedSpaceKeys:access.spaceKeys,statement:"A scoped synthetic agent must not save this global fact.",type:"fact",source:{kind:"agent_api",actor:{kind:"external_agent",name:access.name}}});}
      catch(error){denied=!!error&&typeof error==="object"&&"code" in error&&error.code==="SPACE_ACCESS_DENIED";}
      if(!denied || await c.memories.countDocuments({ownerId,statement:"A scoped synthetic agent must not save this global fact."}))throw new SelfTestAssertion("Project key wrote outside its grant");
      await revokeAgentKey(ownerId,key.id);
      const historical=await recall({...input,asOf:new Date().toISOString()});
      if(historical.profile)throw new SelfTestAssertion("Historical recall included current profile");
      const result=await forgetMemory({ownerId,memoryId:profile.evidenceIds[0].toHexString(),actor:{kind:"system",name:"selftest"}});
      if(result.status!=="forgotten" || await c.profiles.findOne({_id:ownerId,ownerId}))throw new SelfTestAssertion("Forgotten profile evidence retained derived text");
    });
  } finally {
    await check("cleanup-isolated-owner",async()=>{
      const cleanup=await Promise.allSettled(isolatedOwners.flatMap(ownerId=>[c.memories.deleteMany({ownerId}),c.events.deleteMany({ownerId}),c.recalls.deleteMany({ownerId}),c.reflections.deleteMany({ownerId}),c.settings.deleteOne({_id:ownerId}),c.spaces.deleteMany({ownerId}),c.agentKeys.deleteMany({ownerId}),c.profiles.deleteOne({_id:ownerId,ownerId})]));
      if(cleanup.some(result=>result.status==="rejected"))throw new SelfTestAssertion("Isolated owner cleanup incomplete");
    });
  }
  return {ok:checks.every(check=>check.ok),checks};
}
