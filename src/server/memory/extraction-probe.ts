import 'server-only';
/** Synthetic operator measurement: memory-engine.md §9 / K1. Caller owns finally cleanup. */
import {randomUUID} from 'node:crypto';
import {collections} from '@/server/db/collections';
import {extractAndWrite} from './extract';
export interface ExtractionSample {firstEventObservedMs:number|null;completionMs:number;wrote:boolean;failed:boolean}
export async function measureExtractionLatency(ownerId:string,spaceKey:string,count=3,beforeSample?:()=>boolean):Promise<{samples:ExtractionSample[];errorCount:number}>{
 if(!ownerId.startsWith('eval:')||ownerId.length<=5)throw new Error('Extraction probe requires a disposable eval owner');
 if(!Number.isInteger(count)||count<1||count>3)throw new Error('Extraction probe sample count must be between one and three');
 const samples:ExtractionSample[]=[];let errorCount=0;
 for(let i=0;i<count;i++){
  // Await every active write, then let the harness reserve cleanup headroom before the next.
  if(beforeSample&&!beforeSample())break;
  const started=performance.now(),messageId=`eval-extraction:${randomUUID()}`;
  let done=false,wrote=false,failed=false,completionMs=0,firstEventObservedMs:number|null=null;
  let wake!:()=>void;const finished=new Promise<void>(resolve=>{wake=resolve;});
  const observe=async()=>{
   try{return Boolean(await collections().events.findOne({ownerId,messageId},{projection:{_id:1}}));}
   catch{failed=true;return false;}
  };
  const operation=extractAndWrite({ownerId,spaceKey,conversationId:'eval-extraction',messageId,userName:'Eval user',timeZone:'Asia/Kolkata',now:new Date(),policy:'review_sensitive',recalled:[],turns:[{role:'user',text:'Remember that Eval user prefers concise bullet points in future explanations.'},{role:'assistant',text:'I will remember that preference.'}]}).then(summary=>{wrote=summary.added+summary.confirmed+summary.superseded+summary.pending+summary.blocked>0;}).catch(()=>{failed=true;}).finally(()=>{completionMs=performance.now()-started;done=true;wake();});
  while(!done&&firstEventObservedMs===null){
   if(await observe()){firstEventObservedMs=performance.now()-started;break;}
   if(done)break;
   let timer:ReturnType<typeof setTimeout>|undefined;
   try{await Promise.race([finished,new Promise<void>(resolve=>{timer=setTimeout(resolve,200);})]);}finally{if(timer!==undefined)clearTimeout(timer);}
  }
  await operation;
  // Fast one-candidate commits can finish between polls; observe their event once after completion.
  if(firstEventObservedMs===null&&wrote&&await observe())firstEventObservedMs=performance.now()-started;
  if(wrote&&firstEventObservedMs===null)failed=true;
  if(failed)errorCount++;
  samples.push({firstEventObservedMs,completionMs,wrote,failed});
 }
 return {samples,errorCount};
}
