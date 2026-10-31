import "server-only";
/** Hybrid recall and traces: memory-engine.md §5.1–§5.6, relevance strategies per CODEX_TASKS R4. */
import { ObjectId, type Filter } from "mongodb";
import * as chrono from "chrono-node";
import { collections } from "@/server/db/collections";
import { embed } from "@/server/llm/registry";
import { cosine, score, select, type Ranked, type Hits } from "./score";
import {parseAsOf,historicalFilter,isHistoricalMemory,historicalMetadata} from "./historical";
import {effectiveSpaceKeys} from "./scope";
import {readProfile} from "./profile";
import {shouldAnnounceChange} from "./change-notices";
import { memoryDTO } from "./serialize";
import type { MemoryUnit, RecallInput, RecallResult, RecallIntent, RecallChannel, RecallNotice, ReasonCode, RecallLatency } from "./types";
export function detectIntent(query: string): RecallIntent {
  if (/\b(plan|schedule|next|should i|prioriti[sz]e|today|tonight|hours?)\b/i.test(query)) return "plan";
  return /\b(what did i|when did|remind me|last time|did we|what do you know)\b/i.test(query) ? "recall" : "general";
}
function timezoneOffset(date: Date, timeZone: string): number {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {timeZone,year:"numeric",month:"numeric",day:"numeric",hour:"numeric",minute:"numeric",second:"numeric",hourCycle:"h23"}).formatToParts(date).map(p=>[p.type,Number(p.value)]));
  return (Date.UTC(parts.year,parts.month-1,parts.day,parts.hour,parts.minute,parts.second)-Math.floor(+date/1000)*1000)/60000;
}
export function temporalWindow(query: string, now: Date, timeZone: string): {start: Date; end: Date} | null {
  const offset = timezoneOffset(now, timeZone);
  // Relative calendar words need local dates; chrono can shift "last night" back an extra day.
  if (/\b(last night|yesterday)\b/i.test(query)) {
    const local=new Date(+now+offset*60000);
    const midnight=Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate());
    const instant=(localMs:number)=>{
      let utc=localMs-offset*60000;
      // Resolve each boundary separately so DST nights/calendar days keep local wall time.
      for(let i=0;i<3;i++)utc=localMs-timezoneOffset(new Date(utc),timeZone)*60000;
      return new Date(utc);
    };
    return /\b(last night|yesterday (?:evening|night))\b/i.test(query)
      ? {start:instant(midnight-86400000+18*3600000),end:instant(midnight+6*3600000)}
      : {start:instant(midnight-86400000),end:instant(midnight)};
  }
  const parsed = chrono.parse(query, {instant: now, timezone: offset})[0];
  if (!parsed) return null;
  if (parsed.start.isCertain("hour")) {
    const start=parsed.start.date(); return {start,end:parsed.end?.date() ?? new Date(+start+3600000)};
  }
  const c=parsed.start;
  const start=new Date(Date.UTC(c.get("year")!,c.get("month")!-1,c.get("day")!)-offset*60000);
  if (/\blast week\b/i.test(parsed.text)) {
    const day=new Date(+start+offset*60000).getUTCDay();
    start.setUTCDate(start.getUTCDate()-(day+6)%7);
    return {start,end:new Date(+start+7*86400000)};
  }
  const end=parsed.end ? new Date(+parsed.end.date()+86400000) : new Date(+start+86400000);
  return {start,end};
}
const REASONS: Record<ReasonCode,string> = {semantic_match:"close in meaning",keyword_match:"matched your words",time_window:"in the requested time window",linked_entity:"linked to a matched entity",high_importance:"high importance",recent:"recent",plan_relevant_constraint:"relevant to planning",confirmed_often:"confirmed several times",pinned_core:"pinned core"};
function reasons(row: Ranked, intent: RecallIntent, planningFallback=false): ReasonCode[] {
  const out: ReasonCode[]=[];
  if(row.hits.ranks.semantic) out.push("semantic_match");
  if(row.hits.ranks.lexical) out.push("keyword_match");
  if(row.hits.ranks.temporal) out.push("time_window");
  if(row.hits.ranks.graph && !planningFallback) out.push("linked_entity");
  if(intent==="plan" && row.scores.typeBoost) out.push("plan_relevant_constraint");
  if(row.unit.importance>=8) out.push("high_importance");
  if(row.unit.stats.confirmCount>=2) out.push("confirmed_often");
  if(row.scores.recency>=0.9) out.push("recent");
  return out.slice(0,3);
}
export async function recall(input: RecallInput): Promise<RecallResult> {
  const started=performance.now(), wallNow=new Date(), at=parseAsOf(input.asOf), now=at ?? wallNow, c=collections();
  const snapshot=at?{asOf:at.toISOString()}:{};
  const query=(input.query.trim().length<40 || /\b(it|that|this|they|them|those)\b/i.test(input.query)) && input.previousUserMessage ? `${input.previousUserMessage}\n${input.query}` : input.query;
  const intent=input.intent ?? detectIntent(input.query);
  const spaces=effectiveSpaceKeys([input.spaceKey,"global"],input.allowedSpaceKeys)!;
  const base: Filter<MemoryUnit>={ownerId:input.ownerId,status:at?{$in:["active","superseded"]}:"active",spaceKey:{$in:spaces},...(input.types?.length ? {type:{$in:input.types}} : {})};
  const expiry={$or:[{expiresAt:{$exists:false}},{expiresAt:{$gt:now}}]};
  const filter:Filter<MemoryUnit>={...base,...(at?historicalFilter(at):expiry)};
  const live=(m:MemoryUnit)=>m.ownerId===input.ownerId && spaces.includes(m.spaceKey) && (at?isHistoricalMemory(m,at):m.status==="active" && (!m.expiresAt || +m.expiresAt>+now)) && (!input.types?.length || input.types.includes(m.type));
  const latency:RecallLatency={embed:0,vector:0,lexical:0,temporal:0,graph:0,total:0};
  const channels:RecallChannel[]=[];
  const run=async (channel:RecallChannel,fn:()=>Promise<MemoryUnit[]>):Promise<MemoryUnit[]>=>{
    const t=performance.now();
    try {const rows=(await fn()).filter(live).map(m=>at?historicalMetadata(m,at):m);channels.push(channel);return rows;} catch {return [];} finally {latency[channel==="semantic"?"vector":channel]=performance.now()-t;}
  };
  let queryVector:number[]|undefined;
  const embedStart=performance.now();
  // Meal constraints concern the eating request; incidental demo context otherwise dominates embeddings.
  const mealQuestion=/\b(eat|food|meal|snack|breakfast|lunch|dinner)\b/i.test(input.query);
  const semanticQuery=mealQuestion
    ? query.replace(/\s+\b(?:before|after|during)\b.*$/i,"").trim() : query;
  const vectorPromise=embed([{text:semanticQuery}],"query").then(([vector])=>{queryVector=vector;return vector;}).catch(()=>undefined).finally(()=>{latency.embed=performance.now()-embedStart;});
  // Temporal fields are not vector-index filters; broaden the bounded pool before the historical postfilter.
  const semanticPromise=vectorPromise.then(vector=>vector ? run("semantic",()=>c.memories.aggregate<MemoryUnit & {vector:number}>([
    {$vectorSearch:{index:"memories_vec",path:"embedding",queryVector:vector,numCandidates:at?600:150,limit:at?150:40,filter:base}},
    {$match:filter},{$set:{vector:{$meta:"vectorSearchScore"}}},
  ],{maxTimeMS:1500}).toArray()) : []);
  const lexicalPromise=run("lexical",()=>c.memories.aggregate<MemoryUnit>([
    {$search:{index:"memories_text",compound:{must:[{text:{query,path:["statement","entities","tags"]}}],filter:[{equals:{path:"ownerId",value:input.ownerId}},at?{in:{path:"status",value:["active","superseded"]}}:{equals:{path:"status",value:"active"}},{in:{path:"spaceKey",value:spaces}}]}}},
    {$match:filter},{$limit:40},
  ],{maxTimeMS:1500}).toArray());
  let requestedWindow:ReturnType<typeof temporalWindow>=null;
  const temporalPromise=(async()=>{
    const settings=await c.settings.findOne({_id:input.ownerId}).catch(()=>null);
    const window=temporalWindow(query,now,settings?.timeZone ?? "Asia/Kolkata");
    requestedWindow=window;
    return window ? run("temporal",async()=>{
      const [direct,events]=await Promise.all([
        c.memories.find({...filter,$and:[...(filter.$and ?? []),{$or:[{createdAt:{$gte:window.start,$lt:window.end}},{validFrom:{$gte:window.start,$lt:window.end}}]}]}).sort({createdAt:-1}).limit(40).toArray().catch(()=>[]),
        c.events.find({ownerId:input.ownerId,spaceKey:{$in:spaces},at:{$gte:window.start,$lt:window.end,...(at?{$lte:at}:{})},kind:{$nin:["forgotten","blocked"]}}).sort({at:-1}).limit(100).toArray().catch(()=>[]),
      ]);
      const ids=events.filter(e=>e.ownerId===input.ownerId && spaces.includes(e.spaceKey) && e.at>=window.start && e.at<window.end && (!at || e.at<=at) && e.kind!=="forgotten" && e.kind!=="blocked").flatMap(e=>e.memoryId?[e.memoryId]:[]);
      // Event summaries can retain old wording: resolve IDs through the same live/snapshot filter.
      const linked=ids.length?await c.memories.find({...filter,_id:{$in:ids}}).limit(40).toArray().catch(()=>[]):[];
      return [...new Map([...direct,...linked].map(m=>[m._id.toHexString(),m])).values()];
    }) : [];
  })();
  const corePromise=c.memories.find({...filter,$and:[...(filter.$and ?? []),expiry,{$or:[{pinned:true},{type:"strategy"}]}]}).sort({importance:-1}).limit(200).toArray().catch(()=>[]);
  const [semantic,lexical,temporal,coreRows]=await Promise.all([semanticPromise,lexicalPromise,temporalPromise,corePromise]);
  // Cold general recall and recent dietary constraints remain searchable while Atlas indexes catch up.
  // Planning retains its existing bounded context fallback; general recall requires actual cosine support.
  // This bounded classic read uses the same scope and eligibility as every other channel.
  const coldSemantic=!semantic.length&&!lexical.length&&intent!=="plan";
  if((mealQuestion || coldSemantic) && queryVector) {
    const types:MemoryUnit["type"][]=["profile","preference","constraint"];
    const allowed=coldSemantic ? (input.types?.length?input.types:undefined) : types.filter(type=>!input.types?.length || input.types.includes(type));
    if(!allowed || allowed.length) {
      const recent=await c.memories.find({...filter,...(allowed?{type:{$in:allowed}}:{}),pinned:false}).sort({updatedAt:-1}).limit(40).toArray().catch(()=>[]);
      const visible=new Set(semantic.map(m=>m._id.toHexString()));
      // 0.55 positive cosine excludes weak broad-profile matches; rank by actual local similarity.
      for(const unit of recent.filter(live).map(m=>at?historicalMetadata(m,at):m).filter(m=>Array.isArray(m.embedding)&&cosine(queryVector!,m.embedding)>=0.55).sort((a,b)=>cosine(queryVector!,b.embedding)-cosine(queryVector!,a.embedding))) {
        if(!visible.has(unit._id.toHexString())) {semantic.push(unit);visible.add(unit._id.toHexString());}
      }
      if(semantic.length&&!channels.includes("semantic"))channels.push("semantic");
    }
  }
  const top=[...semantic.slice(0,3),...lexical.slice(0,3)].slice(0,3);
  const entities=[...new Set(top.flatMap(m=>m.entities))];
  const planningTypes:MemoryUnit["type"][]=["constraint","goal","decision","preference"];
  const allowedPlanningTypes=planningTypes.filter(type=>!input.types?.length || input.types.includes(type));
  // Atlas indexes are eventually consistent; bounded space context keeps the first plan useful immediately after seed/write.
  const planningFallback=intent==="plan" && !semantic.length && !lexical.length && allowedPlanningTypes.length>0;
  const graph=planningFallback
    ? await run("graph",()=>c.memories.find({...filter,type:{$in:allowedPlanningTypes}}).sort({importance:-1}).limit(15).toArray())
    : entities.length ? await run("graph",()=>c.memories.find({...filter,entities:{$in:entities}}).sort({importance:-1}).limit(15).toArray()) : [];
  const fused=new Map<string,{unit:MemoryUnit;hits:Hits}>();
  for(const [channel,rows] of [["semantic",semantic],["lexical",lexical],["temporal",temporal],["graph",graph]] as Array<[RecallChannel,MemoryUnit[]]>) rows.forEach((unit,index)=>{
    const id=unit._id.toHexString();
    const row=fused.get(id) ?? {unit,hits:{ranks:{}}};
    row.hits.ranks[channel]=index+1;
    if(channel==="semantic") {
      row.hits.vector=(unit as MemoryUnit & {vector?:number}).vector;
      if(queryVector)row.hits.semanticSimilarity=cosine(queryVector,unit.embedding);
    }
    // Score every candidate against the query, including lexical/entity-only hits.
    if(queryVector)row.hits.semanticSimilarity=cosine(queryVector,unit.embedding);
    fused.set(id,row);
  });
  const ranked:Ranked[]=[...fused.values()].map(row=>({...row,scores:score(row.unit,row.hits,intent,channels.length,now),selected:false}));
  // Explicit time questions use their requested window as an eligibility boundary, not a weak semantic boost.
  // Otherwise one fresh, high-importance semantic neighbour can displace every actual event.
  // Only a question about the past narrows recall to its window. A statement that merely contains a
  // clock time ("the launch moved to 10 PM") must still see the fact it corrects. (Claude, 31 Oct:
  // corrections that mentioned a time recalled nothing, so they were saved as new facts.)
  const askedAboutPast=/\b(what did|when did|what happened|did i|did we|yesterday|last (night|week|month)|ago|this morning|earlier today)\b/i.test(query);
  const temporalQuestion=Boolean(requestedWindow) && askedAboutPast && (intent!=="plan" ||/\b(what did|when did|yesterday|last night|last week)\b/i.test(query));
  const eligible=temporalQuestion?ranked.filter(row=>row.hits.ranks.temporal):ranked;
  if(temporalQuestion)for(const row of ranked){
    if(!row.hits.ranks.temporal)row.droppedBy="threshold";
    else row.scores=score(row.unit,row.hits,intent,1,now);
  }
  const picked=select(eligible,{maxUnits:input.limit,preserveSemanticBest:mealQuestion&&!temporalQuestion});
  const notices:RecallNotice[]=[];
  const [a,b]=picked;
  if(a && b && a.unit.value && b.unit.value && a.unit.value!==b.unit.value && ((a.unit.slotKey && a.unit.slotKey===b.unit.slotKey) || (a.unit.subject && a.unit.subject===b.unit.subject && a.unit.attribute===b.unit.attribute && Math.abs(a.scores.final-b.scores.final)<0.03))) notices.push({kind:"ambiguous",text:"Conflicting memories match. Ask one short clarifying question.",memoryIds:[a.unit._id.toHexString(),b.unit._id.toHexString()]});
  const ids=picked.map(row=>row.unit._id);
  if(ids.length && !at && input.persistTrace!==false) {
    const history=(await Promise.all(ids.map(id=>c.memories.find({ownerId:input.ownerId,spaceKey:{$in:spaces},status:"superseded",supersededBy:id,updatedAt:{$gte:new Date(+now-86400000)}}).sort({updatedAt:-1,createdAt:-1}).limit(1).toArray().catch(()=>[])))).flat();
    // One notice per current memory (its newest prior version), in words both the model and the UI can use.
    const seen=new Set<string>();
    for(const old of history.filter(m=>m.ownerId===input.ownerId&&spaces.includes(m.spaceKey)).sort((x,y)=>+y.createdAt-+x.createdAt)) {
      const current=picked.find(p=>p.unit._id.equals(old.supersededBy!));
      if(!current || seen.has(current.unit._id.toHexString()) || !shouldAnnounceChange(old,current))continue;
      seen.add(current.unit._id.toHexString());
      // Atomic compare-and-set consumes this announcement even if two recalls read the same stale snapshot.
      const claimed=await c.memories.findOneAndUpdate({ownerId:input.ownerId,_id:current.unit._id,spaceKey:{$in:spaces},status:"active",updatedAt:current.unit.updatedAt,$or:[{"stats.lastRecalledAt":{$exists:false}},{"stats.lastRecalledAt":{$lt:old.updatedAt}}]},{$max:{"stats.lastRecalledAt":new Date(Math.max(Date.now(),+old.updatedAt))}},{returnDocument:"before"}).catch(()=>null);
      if(!claimed)continue;
      const when=old.createdAt.toLocaleDateString("en-IN",{day:"numeric",month:"short",timeZone:"Asia/Kolkata"});
      notices.push({kind:"changed",text:`Earlier (${when}): ${old.statement} Now: ${current.unit.statement}`,memoryIds:[old._id.toHexString(),current.unit._id.toHexString()]});
    }
  }
  let chars=0;
  const core=coreRows.filter(live).map(m=>at?historicalMetadata(m,at):m).filter(m=>{if(!m.pinned || chars+m.statement.length>1500)return false;chars+=m.statement.length;return true;}).map(memoryDTO);
  const strategies=coreRows.filter(live).map(m=>at?historicalMetadata(m,at):m).filter(m=>m.type==="strategy").map(m=>({unit:m,relevance:queryVector?cosine(queryVector,m.embedding):0})).filter(x=>x.unit.pinned || x.relevance>=0.6 || (intent==="plan" && /plan|schedule|time.?box/i.test(x.unit.statement))).sort((a,b)=>Number(b.unit.pinned)-Number(a.unit.pinned) || (intent==="plan" ? Number(/plan|schedule|time.?box/i.test(b.unit.statement))-Number(/plan|schedule|time.?box/i.test(a.unit.statement)) : 0) || b.relevance-a.relevance || b.unit.importance-a.unit.importance).slice(0,3).map(x=>memoryDTO(x.unit));
  const picks=picked.map((row,i)=>{const codes=reasons(row,intent,planningFallback);return {ref:`m${i+1}`,memoryId:row.unit._id.toHexString(),type:row.unit.type,statement:row.unit.statement,final:row.scores.final,scores:row.scores,reasons:codes,why:codes.map(code=>REASONS[code]).join(" · "),status:row.unit.status,ageDays:Math.max(0,(+now-+row.unit.updatedAt)/86400000),confirmCount:row.unit.stats.confirmCount};});
  const candidates=ranked.map(row=>({memoryId:row.unit._id.toHexString(),statement:row.unit.statement,type:row.unit.type,scores:row.scores,selected:row.selected,reasons:reasons(row,intent,planningFallback),droppedBy:row.droppedBy}));
  const profile=at||!spaces.includes("global")?undefined:await readProfile(input.ownerId,wallNow);
  latency.total=performance.now()-started;
  let recallId="";
  if(input.persistTrace!==false) {
    const _id=new ObjectId();
    try { await c.recalls.insertOne({_id,...snapshot,ownerId:input.ownerId,conversationId:input.conversationId,messageId:input.messageId,query,intent,channelsRan:channels,candidates,picks:picks.map(({ref,memoryId})=>({ref,memoryId})),notices,latencyMs:latency,createdAt:wallNow});
    recallId=_id.toHexString(); } catch { /* Trace storage is best effort during a DB interruption. */ }
    if(ids.length && !at) void c.memories.bulkWrite(ids.map(_id=>({updateOne:{filter:{ownerId:input.ownerId,_id,spaceKey:{$in:spaces},status:"active"},update:{$inc:{"stats.recallCount":1},$max:{"stats.lastRecalledAt":now}}}}))).catch(()=>{});
  }
  return {recallId,...snapshot,...(profile?{profile}:{}),intent,channelsRan:channels,picks,candidates,core,strategies,notices,latencyMs:latency};
}
export async function getRecallTrace(ownerId:string,messageId:string) {return collections().recalls.findOne({ownerId,messageId});}


