/** Local report writer; hosted runEvals deliberately never writes the deployment checkout. */
import {writeFile,mkdir} from 'node:fs/promises';
import {loadEnvConfig} from '@next/env';
import {runDeterministic} from './measure';
async function main(){
 const args=process.argv.slice(2);
 // Validate before loading credentials: an unknown flag must never choose hosted mode.
 if(args.some(arg=>arg!=='--deterministic'&&arg!=='--help'))throw new Error('Unsupported evaluation option; use --help');
 if(args.includes('--help')){console.info('Usage: npm run eval -- [--deterministic | --help]\nNo arguments: authenticated hosted evaluation. --deterministic: offline goldens. Both evaluation modes write evals/results.md.');return;}
 let result:{markdown:string};
 if(args.includes('--deterministic'))result=runDeterministic();
 else{
 loadEnvConfig(process.cwd());
 const origin=process.env.EVAL_BASE_URL??'https://radahn-ai.vercel.app',secret=process.env.CRON_SECRET;
 if(!origin||!secret)throw new Error('Set EVAL_BASE_URL and CRON_SECRET for the authenticated hosted evaluation');
 const endpoint=new URL('/api/admin/eval',origin);if(endpoint.protocol!=='https:' && endpoint.hostname!=='localhost')throw new Error('Evaluation endpoint requires HTTPS');
 const response=await fetch(endpoint,{method:'POST',headers:{authorization:`Bearer ${secret}`},signal:AbortSignal.timeout(290000),redirect:'error'});
 if(!response.ok)throw new Error(`Hosted evaluation failed (${response.status})`);
 const body=await response.json();result=body.report??body;
 if(typeof result.markdown!=='string')throw new Error('Hosted evaluation response is missing markdown');
 }
 await mkdir('evals',{recursive:true});await writeFile('evals/results.md',result.markdown);console.info('Evaluation report written to evals/results.md');
}
main().catch(()=>{console.error('Evaluation failed; check configuration or hosted status');process.exitCode=1;});
