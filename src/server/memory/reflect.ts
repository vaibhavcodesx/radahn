import "server-only";
/** Reflection: memory-engine.md §7. Evidence and replacements are revalidated under one owner-locked transaction. */
import {ObjectId} from "mongodb";
import {z} from "zod";
import {collections} from "@/server/db/collections";
import {mongo} from "@/server/db/client";
import {generateStructured,embed} from "@/server/llm/registry";
import {cosine} from "./score";
import {contentHash,normalise} from "./reconcile";
import {gateCandidate,preScan} from "./gate";
import {lockOwner} from "./mutation";
import {purgeAt} from "./lifecycle";
import {PinBudgetError} from "./errors";
import {writeProfile,profileEligible,invalidateProfile} from "./profile";
import {reflectionPrompt} from "./prompts/reflect";
import type {CandidateMemory,MemoryUnit,ReflectInput,ReflectionRun,ReflectionStep,Sensitivity,WritePolicy} from "./types";
const item=z.object({statement:z.string().min(3).max(240),evidenceIds:z.array(z.string()).max(60),targetId:z.string().optional()});
export const reflectionSchema=z.object({profile:z.object({text:z.string().max(1200),evidenceIds:z.array(z.string()).max(60)}).optional(),merges:z.array(item).max(30),observations:z.array(item).max(5),strategies:z.array(item.extend({trigger:z.string().min(2).max(80)})).max(3)});
type Output=z.infer<typeof reflectionSchema>;
// Gemini answers "invalid argument" for nested maxItems in response schemas (probed 08:50 IST), so the
// model gets an uncapped shape and the caps above are enforced by clamping before the strict parse.
const llmItem=z.object({statement:z.string(),evidenceIds:z.array(z.string()),targetId:z.string().optional()});
export const reflectionLlmSchema=z.object({profile:z.object({text:z.string(),evidenceIds:z.array(z.string())}).optional(),merges:z.array(llmItem),observations:z.array(llmItem),strategies:z.array(llmItem.extend({trigger:z.string()}))});
export function clampReflection(raw:z.infer<typeof reflectionLlmSchema>):Output {
 const fit=<T extends z.infer<typeof llmItem>>(list:T[],max:number)=>list.filter(i=>i.statement.trim().length>=3&&i.statement.length<=240).slice(0,max).map(i=>({...i,evidenceIds:i.evidenceIds.slice(0,60)}));
 const profile=raw.profile&&raw.profile.text.length<=1200?{text:raw.profile.text,evidenceIds:raw.profile.evidenceIds.slice(0,60)}:undefined;
 return reflectionSchema.parse({...(profile?{profile}:{}),merges:fit(raw.merges,30),observations:fit(raw.observations,5),strategies:fit(raw.strategies.filter(s=>s.trigger.length>=2&&s.trigger.length<=80),3)});
}
type Plan={unit:MemoryUnit;parents:MemoryUnit[];evidence:MemoryUnit[];kind:keyof ReflectionRun["outputs"]};
const explicit=(m:MemoryUnit)=>(m.source.kind==="manual"||m.source.kind==="tool")&&m.source.actor.kind==="user";
const alive=(m:MemoryUnit,now:Date)=>m.status==="active"&&(!m.expiresAt||+m.expiresAt>+now);
/** Complete-link clustering avoids merging a weak endpoint through a chain of near duplicates. */
export function clusterMemories(units:MemoryUnit[]):MemoryUnit[][] {
 const groups:MemoryUnit[][]=[];
 for(const m of units){const group=groups.find(g=>g.every(p=>p.type===m.type&&p.spaceKey===m.spaceKey&&cosine(p.embedding,m.embedding)>=0.90));if(group)group.push(m);else groups.push([m]);}
 return groups.filter(g=>g.length>1);
}
function sameTrigger(old:MemoryUnit,trigger:string):boolean {
 if(old.slotKey===`strategy.${normalise(trigger)}`)return true;
 // Trigger identity is independent of historical evidence: new feedback refines old rules.
 const words=(text:string)=>normalise(text).replace(/\bplanning\b/g,"plan").match(/[a-z0-9]+/g)??[];
 const generic=new Set(["when","with","user","give","answer","answers","always","every","response","responses","general"]);
 const tokens=words(trigger).filter(t=>t.length>3&&!generic.has(t));
 const existing=new Set(words(old.statement));
 return tokens.length>0&&tokens.every(t=>existing.has(t));
}function plansFor(result:Output,units:MemoryUnit[],clusters:MemoryUnit[][],input:ReflectInput,policy:WritePolicy,now:Date):Plan[] {
 const byId=new Map(units.map(m=>[m._id.toHexString(),m])),plans:Plan[]=[],used=new Set<string>(),hashes=new Set<string>();
 for(const kind of ["merges","observations","strategies"] as const)for(const raw of result[kind]) {
  const evidence=[...new Set(raw.evidenceIds)].map(id=>byId.get(id)).filter((m):m is MemoryUnit=>!!m);
  if(!evidence.length)continue;
  let parents:MemoryUnit[]=[],type:MemoryUnit["type"]=kind==="observations"?"observation":"strategy";
  const trigger="trigger" in raw?normalise(String(raw.trigger)).slice(0,80):undefined;
  if(raw.targetId&&!byId.has(raw.targetId))continue;
  if(kind==="merges") {
   const group=clusters.find(g=>g.length===evidence.length&&g.every(m=>evidence.some(e=>e._id.equals(m._id))));
   if(!group||raw.targetId)continue;parents=group;type=group[0].type;
  }else if(kind==="strategies") {
   // K7: one complete behavioral source supports a rule; ordinary facts and unknown ids do not.
   if(evidence.filter(m=>m.type==="feedback"||m.type==="outcome").length<1&&!evidence.some(explicit))continue;
   const strategies=units.filter(m=>m.type==="strategy"&&sameTrigger(m,trigger!));
   const target=raw.targetId?byId.get(raw.targetId):strategies[0];
   if(target&&(target.type!=="strategy"||!sameTrigger(target,trigger!)))continue;
   if(target)parents=[target];
  }else if(raw.targetId) {
   const target=byId.get(raw.targetId)!;
   if(target.type!=="observation"||!evidence.some(m=>m._id.equals(target._id))||evidence.length<2||!/\bpreviously\b[\s\S]*\bnow\b/i.test(raw.statement))continue;
   parents=[target];
  }
  if(parents.some(p=>used.has(p._id.toHexString())))continue;
  const spaces=new Set([...evidence,...parents].map(m=>m.spaceKey));
  // Project evidence never becomes globally visible merely because the model requests it.
  const spaceKey=spaces.has(input.spaceKey)?input.spaceKey:"global";
  if(parents.some(p=>p.spaceKey!==spaceKey))continue;
  const sensitivitySources=[...evidence,...parents];
  const sensitivity:Sensitivity=sensitivitySources.some(m=>m.sensitivity==="sensitive")?"sensitive":sensitivitySources.some(m=>m.sensitivity==="personal")?"personal":"none";
  const candidate:CandidateMemory={statement:raw.statement,type,entities:[...new Set(evidence.flatMap(m=>m.entities))].slice(0,20),importance:Math.max(...evidence.map(m=>m.importance)),confidence:Math.min(0.95,0.5+0.1*evidence.length),sensitivity,scope:spaceKey==="global"?"global":"space",explicit:false,hint:"new"};
  const meta=preScan([...candidate.entities,trigger??""].join(" "));
  const gate=gateCandidate(candidate,policy);
  if(meta.kinds.length||meta.injection||!gate.candidate||gate.op==="blocked"||gate.op==="skip")continue;
  const hash=contentHash(gate.candidate.statement);if(hashes.has(hash))continue;hashes.add(hash);
  const base=parents[0],expires= [...evidence,...parents].flatMap(m=>m.expiresAt?[m.expiresAt]:[]).sort((a,b)=>+a-+b)[0];
  const unit:MemoryUnit={_id:new ObjectId(),ownerId:input.ownerId,spaceKey,type,statement:gate.candidate.statement,contentHash:hash,entities:candidate.entities,tags:[],importance:candidate.importance,confidence:candidate.confidence,sensitivity,pinned:parents.some(m=>m.pinned),status:gate.op==="pending"?"pending_review":"active",source:{kind:"reflection",actor:{kind:"reflection",name:"reflection"}},evidenceIds:evidence.map(m=>m._id),relatedIds:[],validFrom:now,stats:{recallCount:0,confirmCount:0,citedCount:0},embedding:[],embeddingModel:"gemini-embedding-2@768",createdAt:now,updatedAt:now};
  if([...evidence,...parents].every(m=>m.demo===true))unit.demo=true;
  if(trigger){unit.subject="strategy";unit.attribute=trigger;unit.slotKey=`strategy.${trigger}`;}
  else if(base?.slotKey){unit.subject=base.subject;unit.attribute=base.attribute;unit.slotKey=base.slotKey;}
  if(expires){unit.expiresAt=expires;unit.purgeAt=purgeAt(expires,now);}
  if(unit.status==="active"&&base){unit.supersedes=base._id;unit.supersedeReason=kind==="merges"?"merge":"update";parents.forEach(m=>used.add(m._id.toHexString()));}
  plans.push({unit,parents:unit.status==="active"?parents:[],evidence,kind:kind==="merges"?"merged":kind});
 }
 return plans;
}
export async function runReflection(input:ReflectInput):Promise<ReflectionRun> {
 const c=collections(),now=new Date();
 const run:ReflectionRun={_id:new ObjectId(),...input,status:"running",steps:(["gather","cluster","consolidate","write"] as const).map(name=>({name,status:"pending"})),outputs:{merged:[],observations:[],strategies:[]},startedAt:now};
 await c.reflections.insertOne(run);
 let current:ReflectionStep["name"]="gather";
 const step=async(name:ReflectionStep["name"],status:ReflectionStep["status"],count?:number,modelId?:string)=>{current=name;run.steps=run.steps.map(s=>s.name===name?{name,status,at:new Date(),...(count===undefined?{}:{detail:`count: ${count}${modelId?`; model: ${modelId}`:""}`})}:s);await c.reflections.updateOne({_id:run._id,ownerId:input.ownerId},{$set:{steps:run.steps}});};
 try {
  await step("gather","running");
  const scope={ownerId:input.ownerId,spaceKey:{$in:[...new Set([input.spaceKey,"global"])]},status:"active" as const,$or:[{expiresAt:{$exists:false}},{expiresAt:{$gt:now}}]};
  // Capture before any gather read: another reflection must not pair a new generation with an old counter.
  const settings=await c.settings.findOne({_id:input.ownerId});
  const revision=settings?.reflectionRevision??0;
  const space=ObjectId.isValid(input.spaceKey)?await c.spaces.findOne({ownerId:input.ownerId,_id:new ObjectId(input.spaceKey)}):null;
  const recent=await c.memories.find({...scope,...(space?.lastReflectionAt?{updatedAt:{$gt:space.lastReflectionAt}}:{})}).sort({updatedAt:-1}).limit(60).toArray();
  const feedback=await c.memories.find({...scope,type:{$in:["feedback","outcome"]},createdAt:{$gte:new Date(+now-30*86400000)}}).sort({createdAt:-1}).limit(60).toArray();
  const strategies=await c.memories.find({...scope,type:"strategy"}).sort({importance:-1}).limit(30).toArray();
  const stable=await c.memories.find({...scope,spaceKey:"global",type:{$in:["profile","fact","preference"]},sensitivity:"none"}).sort({importance:-1}).limit(60).toArray();
  const units=[...new Map([...recent,...feedback,...strategies,...stable.filter(m=>profileEligible(m,input.ownerId,now))].filter(m=>m.ownerId===input.ownerId&&[input.spaceKey,"global"].includes(m.spaceKey)&&alive(m,now)).map(m=>[m._id.toHexString(),m])).values()];
  await step("gather","done",units.length);await step("cluster","running");
  const clusters=clusterMemories(units);await step("cluster","done",clusters.length);await step("consolidate","running");
  const generated=units.length?await generateStructured("reflect",{schema:reflectionLlmSchema,prompt:reflectionPrompt(units,clusters)}):undefined;
  const output=generated?clampReflection(generated.object):{merges:[],observations:[],strategies:[]};
  const plans=plansFor(output,units,clusters,input,settings?.writePolicy??"review_sensitive",now);
  if(plans.length){const vectors=await embed(plans.map(p=>({text:p.unit.statement,title:p.unit.type})),"document");if(vectors.length!==plans.length||vectors.some(v=>v.length!==768||v.some(n=>!Number.isFinite(n))))throw new Error("Embedding unavailable");plans.forEach((p,i)=>{p.unit.embedding=vectors[i];});}
  await step("consolidate","done",plans.length,generated?.servedBy?.modelId);await step("write","running");
  const session=mongo().startSession();
  try {
   const outputs=await session.withTransaction(async()=>{
    const opts={session};await lockOwner(input.ownerId,session);
    const latestSettings=await c.settings.findOne({_id:input.ownerId},opts);
    if((latestSettings?.reflectionRevision??0)!==revision)throw new Error("Stale reflection checkpoint");
    if((latestSettings?.writePolicy??"review_sensitive")!==(settings?.writePolicy??"review_sensitive"))throw new Error("Reflection policy changed");
    const used=[...new Map(plans.flatMap(p=>[...p.evidence,...p.parents]).map(m=>[m._id.toHexString(),m])).values()];
    for(const old of used){const fresh=await c.memories.findOne({ownerId:input.ownerId,_id:old._id,spaceKey:old.spaceKey,status:"active"},opts);if(!fresh||!alive(fresh,new Date())||+fresh.updatedAt!==+old.updatedAt||fresh.statement!==old.statement)throw new Error("Stale reflection evidence");}
    const applied:ReflectionRun["outputs"]={merged:[],observations:[],strategies:[]};
    for(const plan of plans){const {unit,parents}=plan;
     if(unit.status==="active"&&unit.slotKey){const conflict=await c.memories.findOne({ownerId:input.ownerId,spaceKey:unit.spaceKey,status:"active",slotKey:unit.slotKey},opts);if(conflict&&!parents.some(p=>p._id.equals(conflict._id)))throw new Error("Reflection slot changed");}
     await invalidateProfile(input.ownerId,session,parents.map(m=>m._id),false);
     for(const parent of parents){const changed=await c.memories.updateOne({ownerId:input.ownerId,_id:parent._id,status:"active"},{$set:{status:"superseded",validTo:now,supersededBy:unit._id,supersedeReason:unit.supersedeReason,updatedAt:now}},opts);if(!changed.matchedCount)throw new Error("Reflection target changed");await c.events.insertOne({_id:new ObjectId(),ownerId:input.ownerId,spaceKey:parent.spaceKey,memoryId:parent._id,type:parent.type,kind:"superseded",actor:{kind:"reflection",name:"reflection"},summary:"Memory superseded by reflection",at:now},opts);}
     if(unit.pinned&&unit.status==="active"){
      const pins=await c.memories.find({ownerId:input.ownerId,status:"active",pinned:true,$or:[{expiresAt:{$exists:false}},{expiresAt:{$gt:now}}]},opts).toArray();
      if(pins.filter(m=>!parents.some(p=>p._id.equals(m._id))).reduce((n,m)=>n+m.statement.length,0)+unit.statement.length>1500)throw new PinBudgetError();
     }
     const stored=Object.fromEntries(Object.entries(unit).filter(([,v])=>v!==undefined)) as unknown as MemoryUnit;
     await c.memories.insertOne(stored,opts);await c.events.insertOne({_id:new ObjectId(),ownerId:input.ownerId,spaceKey:unit.spaceKey,memoryId:unit._id,type:unit.type,kind:"reflected",actor:{kind:"reflection",name:"reflection"},summary:`Reflection ${unit.status==="active"?"applied":"pending"}`,at:now},opts);applied[plan.kind].push(unit._id.toHexString());
    }
    await writeProfile(input.ownerId,output.profile,units,session,new Date());
    if(ObjectId.isValid(input.spaceKey)){
     const currentSpace=await c.spaces.findOne({ownerId:input.ownerId,_id:new ObjectId(input.spaceKey)},opts);
     // Preserve increments from writes completed while the model was consolidating.
     const observed=Math.max(0,space?.unitsSinceReflection??0),currentCount=Math.max(0,currentSpace?.unitsSinceReflection??0);
     await c.spaces.updateOne({ownerId:input.ownerId,_id:new ObjectId(input.spaceKey)},{$set:{lastReflectionAt:now,unitsSinceReflection:Math.max(0,currentCount-observed)}},opts);
    }
    // Separate from memoryRevision so ordinary writes during model work remain valid.
    await c.settings.updateOne({_id:input.ownerId},{$inc:{reflectionRevision:1}},opts);
    const steps=run.steps.map(s=>s.name==="write"?{...s,status:"done" as const,detail:`count: ${plans.length}`,at:new Date()}:s);
    await c.reflections.updateOne({ownerId:input.ownerId,_id:run._id},{$set:{status:"done",outputs:applied,steps,finishedAt:new Date()}},opts);
    return {outputs:applied,steps};
   });run.outputs=outputs.outputs;run.steps=outputs.steps;
  }finally{await session.endSession();}
  run.status="done";run.finishedAt=new Date();return run;
 }catch(e){
  // Logged (message only) so a failed run is diagnosable; the stored run keeps the generic error.
  console.error(`[reflect] failed at ${current}:`,(e as Error)?.message?.slice(0,300));
  run.status="failed";run.error="Reflection could not complete";run.finishedAt=new Date();run.steps=run.steps.map(s=>s.name===current?{...s,status:"failed",detail:"operation failed"}:s);
  await c.reflections.updateOne({ownerId:input.ownerId,_id:run._id},{$set:{status:run.status,error:run.error,steps:run.steps,finishedAt:run.finishedAt}});return run;
 }
}
export async function listReflections(ownerId:string,limit=20):Promise<ReflectionRun[]> {return collections().reflections.find({ownerId}).sort({startedAt:-1}).limit(Math.min(100,Math.max(1,Number.isFinite(limit)?Math.trunc(limit):20))).toArray();}




