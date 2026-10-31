import 'server-only';
/** Hosted bounded evaluation: memory-engine.md §9. Disposable eval: owner only, finally cleanup. */
import {randomUUID} from 'node:crypto';
import {db} from '@/server/db/client';
import {collections} from '@/server/db/collections';
import {writeCandidates} from './write';
import {recall,temporalWindow} from './recall';
import {ObjectId} from 'mongodb';
import {forgetMemory} from './tools';
import {candidate,jaccard,percentile,runDeterministic} from '../../../evals/measure';
import {preScan} from './gate';
import {generateText} from 'ai';
import {candidates,report,classifyError,thinkingOptions} from '@/server/llm/registry';
import {buildSystemPrompt,buildGhostPrompt} from './context';
export async function runEvals(){
 const database=db();if(database.databaseName!=='radahn')throw new Error('Evaluation database is not authorized');
 const c=collections(database),ownerId=`eval:${randomUUID()}`,spaceKey='eval',now=new Date(),start=performance.now();
 const deterministic=runDeterministic(),rows:Array<{id:string;passed:boolean}>=[],latencies:number[]=[],precisions:number[]=[],recalls:number[]=[];
 let budgetExceeded=false;
 // Leave 210 seconds before each phase: slow provider/retry/transaction work plus cleanup headroom.
 const checkBudget=()=>{if(performance.now()-start>60000){budgetExceeded=true;throw new Error('Evaluation budget exhausted');}};
 let cleanupSucceeded=false;
 let secretsStored:number|null=null,changed:number|null=null,model:string|null=null,abSamples=0,errorCount=0;
 try{
 const ctx={ownerId,spaceKey,now,policy:'review_sensitive' as const,source:{kind:'manual' as const,actor:{kind:'user' as const,name:'eval'}},recalled:[]};
 const fact={...candidate('Eval user has only two hours to finish the Radahn demo tonight.'),type:'constraint' as const,subject:'eval',attribute:'budget',value:'two hours',entities:['radahn']};
 checkBudget();const first=await writeCandidates([fact],ctx);rows.push({id:'write-add',passed:first.added===1});
 checkBudget();const confirmed=await writeCandidates([fact],ctx);rows.push({id:'write-confirm',passed:confirmed.confirmed===1});
 checkBudget();const updated=await writeCandidates([{...fact,statement:'Eval user has only one hour to finish the Radahn demo tonight.',value:'one hour'}],ctx);rows.push({id:'write-update-history',passed:updated.superseded===1 && await c.memories.countDocuments({ownerId,status:'superseded'})===1});
 checkBudget();const third=await writeCandidates([{...fact,statement:'Eval user has thirty minutes to finish the Radahn demo tonight.',value:'thirty minutes'}],ctx);
 const chain=await c.memories.find({ownerId,spaceKey,slotKey:'eval.budget'}).toArray(),active=chain.find(m=>m.status==='active');
 rows.push({id:'write-correction-A-B-C-one-active-history',passed:third.superseded===1 && chain.length===3 && chain.filter(m=>m.status==='active').length===1 && chain.filter(m=>m.status==='superseded').length===2 && chain.filter(m=>m.status==='superseded').every(m=>m.supersededBy && chain.some(next=>next._id.equals(m.supersededBy!)&&next.supersedes?.equals(m._id))) && chain.find(m=>m._id.toHexString()===first.ops[0]?.memoryId)?.supersededBy?.toHexString()===updated.ops[0]?.memoryId && chain.find(m=>m._id.toHexString()===updated.ops[0]?.memoryId)?.supersededBy?.toHexString()===third.ops[0]?.memoryId});
 checkBudget();const paraphrase=await writeCandidates([{...fact,statement:'The demo time budget is half an hour.',value:'thirty minutes'}],ctx);
 rows.push({id:'write-paraphrase-confirms-no-duplicate',passed:paraphrase.confirmed===1 && (await c.memories.countDocuments({ownerId,spaceKey,slotKey:'eval.budget'}))===3});
 checkBudget();const blocked=await writeCandidates([candidate('password is synthetic-eval-pass')],ctx);rows.push({id:'privacy-no-store',passed:blocked.blocked===1});
 checkBudget();const expected=(await c.memories.find({ownerId,status:'active',subject:'eval'}).toArray()).map(m=>m._id.toHexString());
 // First query is deliberately immediate: no index-readiness wait hides visibility latency.
 for(const [id,query] of [['cold-index-plan','Plan my Radahn demo tonight'],['exact-recall','What is my time budget for Radahn?'],['temporal-recall','What did I decide today about Radahn?']] as const){
 checkBudget();const began=performance.now();const result=await recall({ownerId,spaceKey,query,limit:5,persistTrace:false});latencies.push(performance.now()-began);
 const ids=result.picks.slice(0,5).map(p=>p.memoryId),hits=ids.filter(i=>expected.includes(i)).length;
 precisions.push(hits/5);recalls.push(expected.length?hits/expected.length:0);rows.push({id,passed:hits>0});
 if(id==='cold-index-plan' && performance.now()-start<120000){
 let servedModel:Awaited<ReturnType<typeof candidates>>[number]|undefined;
 try{
 checkBudget();const prompt='Plan my Radahn demo tonight in three short bullets.';
 const served=(await candidates('fast'))[0];servedModel=served;if(!served)throw new Error('No eval model');
 const compare=async()=>{
 checkBudget();const shared={model:served.model,maxRetries:0,maxOutputTokens:180,temperature:0,providerOptions:thinkingOptions(served.modelId,'low')};
 const memory=await generateText({...shared,system:buildSystemPrompt({userName:'Eval user',timeZone:'Asia/Kolkata',now,spaceName:'eval',recall:result}).system,prompt,abortSignal:AbortSignal.timeout(15000)});
 checkBudget();const ghost=await generateText({...shared,system:buildGhostPrompt({timeZone:'Asia/Kolkata',now}),prompt,abortSignal:AbortSignal.timeout(15000)});
 return jaccard(memory.text,ghost.text)<.7;
 };changed=Number(await compare());await report(served,'ok');model=served.modelId;abSamples=1;
 }catch(error){if(servedModel)await report(servedModel,classifyError(error));errorCount++;}
 }
 }
 for(const fixture of [{...candidate('Sam is a designer on the demo team.'),subject:'sam',attribute:'role',value:'designer',entities:['sam']},{...candidate('Sam is a developer on the demo team.'),subject:'sam',attribute:'role',value:'developer',scope:'global' as const,entities:['sam']},{...candidate('The temporary demo meeting is over.'),expiresAt:new Date(+now-1000).toISOString()}]){checkBudget();await writeCandidates([fixture],ctx);}
 checkBudget();const before=await c.memories.countDocuments({ownerId,subject:'sam'});checkBudget();const ambiguous=await forgetMemory({ownerId,spaceKey,query:'Sam',actor:{kind:'user',name:'eval'}});rows.push({id:'ambiguous-name-no-delete',passed:ambiguous.status==='ambiguous' && before===2 && (checkBudget(),await c.memories.countDocuments({ownerId,subject:'sam'}))===before});
 checkBudget();const expiry=await recall({ownerId,spaceKey,query:'temporary demo meeting',limit:5,persistTrace:false});rows.push({id:'expired-excluded',passed:!expiry.picks.some(p=>p.statement.includes('temporary demo meeting'))});
 if(expected[0]){checkBudget();await forgetMemory({ownerId,memoryId:expected[0],actor:{kind:'user',name:'eval'}});checkBudget();rows.push({id:'explicit-forget',passed:await c.memories.countDocuments({ownerId,_id:new (await import('mongodb')).ObjectId(expected[0])})===0});}
 // Isolated spaces prevent unrelated fixtures/global context from making absence checks vacuous.
 checkBudget();const forgetSpace='eval-forget',forgetCtx={...ctx,spaceKey:forgetSpace};
 const disposable=await writeCandidates([candidate('The synthetic launch mascot is an amber otter.')],forgetCtx);
 const forgottenId=disposable.ops.find(op=>op.memoryId)?.memoryId;
 if(forgottenId){await forgetMemory({ownerId,memoryId:forgottenId,actor:{kind:'user',name:'eval'}});checkBudget();
 const absent=await recall({ownerId,spaceKey:forgetSpace,allowedSpaceKeys:[forgetSpace],query:'What is the synthetic launch mascot?',persistTrace:false});
 rows.push({id:'forget-then-recall-none',passed:absent.picks.length===0 && absent.core.length===0 && absent.strategies.length===0});}
 else rows.push({id:'forget-then-recall-none',passed:false});
 // Seed one old memory whose confirmation happened last night: only the event can retrieve it.
 checkBudget();if(active){
 const temporalSpace='eval-temporal',window=temporalWindow('last night',new Date(),'Asia/Kolkata')!,eventAt=new Date((+window.start + +window.end)/2),oldAt=new Date(+window.start-7*86400000);
 const target={...active,_id:new ObjectId(),spaceKey:temporalSpace,statement:'The synthetic prototype was reviewed last night.',createdAt:oldAt,validFrom:oldAt,updatedAt:oldAt,importance:1,confidence:.5};
 delete target.slotKey;delete target.contentHash;delete target.supersedes;delete target.supersededBy;delete target.expiresAt;delete target.purgeAt;
 const expired={...target,_id:new ObjectId(),statement:'The synthetic expired prototype detail.',expiresAt:new Date(Date.now()-1000)};
 const privateRow={...target,_id:new ObjectId(),spaceKey:'eval-private'};
 await c.memories.insertMany([target,expired,privateRow]);
 await c.events.insertMany([target,expired,privateRow].map(m=>({_id:new ObjectId(),ownerId,spaceKey:m.spaceKey,memoryId:m._id,kind:'confirmed' as const,actor:{kind:'system' as const,name:'eval'},summary:'Synthetic scenario event',at:eventAt})));
 checkBudget();const temporal=await recall({ownerId,spaceKey:temporalSpace,allowedSpaceKeys:[temporalSpace],query:'What did I do last night?',persistTrace:false});
 rows.push({id:'temporal-event-window',passed:temporal.picks.length===1 && temporal.picks[0].memoryId===target._id.toHexString() && temporal.picks[0].reasons.includes('time_window')});
 rows.push({id:'temporal-expiry-and-project-isolation',passed:!temporal.candidates.some(p=>[expired._id.toHexString(),privateRow._id.toHexString()].includes(p.memoryId))});
 await forgetMemory({ownerId,memoryId:target._id.toHexString(),actor:{kind:'system',name:'eval'}});
 checkBudget();const erased=await recall({ownerId,spaceKey:temporalSpace,allowedSpaceKeys:[temporalSpace],query:'What did I do last night?',persistTrace:false});
 rows.push({id:'temporal-forgotten-event-no-resurrection',passed:erased.picks.length===0});
 }
 checkBudget();secretsStored=0;for(const m of await c.memories.find({ownerId},{projection:{statement:1}}).toArray())if(preScan(m.statement).kinds.length)secretsStored++;
 }catch{errorCount++;}
 finally{
 // Never discover owners. These exact unique-owner deletes also run on partial failure.
 const cleanup=await Promise.allSettled([...([c.memories,c.events,c.recalls,c.reflections,c.messages,c.conversations,c.spaces].map(collection=>collection.deleteMany({ownerId}))),c.settings.deleteOne({_id:ownerId}),database.collection<{_id:string}>('profiles').deleteOne({_id:ownerId})]);
 cleanupSucceeded=cleanup.every(r=>r.status==='fulfilled');if(!cleanupSucceeded)errorCount++;
 }
 const metrics={writeOpAccuracy:rows.filter(r=>r.id.startsWith('write-')).length?rows.filter(r=>r.id.startsWith('write-')&&r.passed).length/rows.filter(r=>r.id.startsWith('write-')).length:null,writeSamples:rows.filter(r=>r.id.startsWith('write-')).length,precisionAt5:precisions.length?precisions.reduce((a,b)=>a+b,0)/precisions.length:null,recallAt5:recalls.length?recalls.reduce((a,b)=>a+b,0)/recalls.length:null,recallSamples:latencies.length,secretsStored,memoryChangedRate:changed,abSamples,model,p50RecallMs:percentile(latencies,.5),p95RecallMs:percentile(latencies,.95),errorCount};
 const markdown=`# Memory evaluation\n\nMode: hosted; budgetExceeded=${budgetExceeded}; ${cleanupSucceeded?'Disposable eval owner cleaned in finally.':'Cleanup incomplete; operator action required.'}\n\n${deterministic.passed}/${deterministic.samples} deterministic cases passed. Live samples are intentionally small on M0.\n\n| Metric | Measured value |\n|---|---|\n${Object.entries(metrics).map(([k,v])=>`| ${k} | ${v??'pending'} |`).join('\n')}\n\nPrecision@5 uses a fixed denominator of five; recall@5 uses relevant active units. Cold-index query runs immediately. A/B uses identical served model, temperature and token limit; Jaccard < 0.7 is a difference heuristic, not proof of answer quality.\n\n| Case | Passed |\n|---|---|\n${rows.map(r=>`| ${r.id} | ${r.passed} |`).join('\n')}\n`;
 return {mode:'hosted' as const,budgetExceeded,cleanupSucceeded,...(!cleanupSucceeded?{cleanupOwnerId:ownerId}:{}),metrics,rows,deterministic,markdown};
}

