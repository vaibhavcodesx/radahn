/** C6 fixture generation: memory-engine.md §6.1 / TRD §15. Synthetic text only. */
import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { loadEnvConfig } from "@next/env";
async function main(){
 if(!process.argv.includes("--gen-embeddings"))throw new Error("Use --gen-embeddings; demo loading is available in the app");
 if(!process.execArgv.includes("--conditions=react-server")){
  const child=spawnSync(process.execPath,["--conditions=react-server","--import","tsx",process.argv[1],...process.argv.slice(2)],{stdio:"inherit",env:process.env});process.exitCode=child.status??1;return;
 }
 loadEnvConfig(process.cwd());
 const [{embed},{DEMO_MEMORIES},{contentHash},{mongo}]=await Promise.all([import("../src/server/llm/registry"),import("../src/server/memory/fixtures/demo"),import("../src/server/memory/reconcile"),import("../src/server/db/client")]);
 try{
  const vectors=await embed(DEMO_MEMORIES.map(d=>({text:d.statement,title:d.type})),"document");
  const entries=Object.fromEntries(DEMO_MEMORIES.map((d,i)=>[d.key,{hash:contentHash(d.statement),vector:vectors[i]}]));
  await writeFile(new URL("./fixtures/demo-embeddings.json",import.meta.url),JSON.stringify({model:"gemini-embedding-2@768",entries})+"\n");
  console.info(JSON.stringify({memories:vectors.length,dimensions:768}));
 }finally{await mongo().close();}
}
main().catch(()=>{console.error("Demo fixture generation failed; provider details suppressed.");process.exitCode=1;});
