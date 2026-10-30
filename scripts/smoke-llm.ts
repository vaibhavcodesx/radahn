/** C1 smoke / memory-engine.md §6.1. Fictional input; quota state only in radahn_eval. */
import { spawnSync } from "node:child_process";
import { loadEnvConfig } from "@next/env";

async function main() {
  if (!process.execArgv.includes("--conditions=react-server")) {
    const child = spawnSync(process.execPath, ["--conditions=react-server", "--import", "tsx", process.argv[1]], {stdio: "inherit", env: {...process.env, MONGODB_DB: "radahn_eval"}});
    process.exitCode = child.status ?? 1;
    return;
  }
  loadEnvConfig(process.cwd());
  process.env.MONGODB_DB = "radahn_eval";
  const { withFallback, embed } = await import("../src/server/llm/registry");
  const { generateText } = await import("ai");
  const { mongo } = await import("../src/server/db/client");
  try {
    const { servedBy } = await withFallback("fast", async c => generateText({ model: c.model, prompt: "Reply with OK.", maxOutputTokens: 1, maxRetries: 0, abortSignal: AbortSignal.timeout(20_000) }));
    const [vector] = await embed([{text:"fictional demo memory"}], "query");
    console.info(JSON.stringify({model: servedBy.modelId, embeddingLength: vector.length}));
  } finally { await mongo().close(); }
}
main().catch(() => { console.error("LLM smoke failed; provider details suppressed."); process.exitCode = 1; });
