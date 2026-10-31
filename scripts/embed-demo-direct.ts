/**
 * Regenerates scripts/fixtures/demo-embeddings.json without touching MongoDB (the quota
 * bookkeeping in `registry.embed` needs Atlas, which some networks block). Same model, input
 * format ("title: <type> | text: <statement>") and 768-d output as `embed(..., "document")`.
 * Usage: npx tsx scripts/embed-demo-direct.ts
 */
import { writeFile } from "node:fs/promises";
import { loadEnvConfig } from "@next/env";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { embedMany } from "ai";
import { DEMO_MEMORIES } from "../src/server/memory/fixtures/demo";
import { contentHash } from "../src/server/memory/reconcile";

async function main() {
  loadEnvConfig(process.cwd());
  const keys = (process.env.GEMINI_API_KEYS ?? "").split(",").map((k) => k.trim()).filter(Boolean);
  const values = DEMO_MEMORIES.map((d) => `title: ${d.type} | text: ${d.statement}`);
  let vectors: number[][] | undefined;
  for (const apiKey of keys) {
    try {
      const { embeddings } = await embedMany({
        model: createGoogleGenerativeAI({ apiKey }).embedding(process.env.GEMINI_EMBED_MODEL ?? "gemini-embedding-2"),
        values,
        providerOptions: { google: { outputDimensionality: 768 } },
        maxRetries: 1,
      });
      vectors = embeddings;
      break;
    } catch {
      continue;
    }
  }
  if (!vectors || vectors.length !== DEMO_MEMORIES.length || vectors.some((v) => v.length !== 768)) throw new Error("embedding failed");
  const entries = Object.fromEntries(DEMO_MEMORIES.map((d, i) => [d.key, { hash: contentHash(d.statement), vector: vectors![i] }]));
  await writeFile(new URL("./fixtures/demo-embeddings.json", import.meta.url), JSON.stringify({ model: "gemini-embedding-2@768", entries }) + "\n");
  console.info(JSON.stringify({ memories: vectors.length, dimensions: 768 }));
}
main().catch(() => {
  console.error("Demo fixture generation failed; provider details suppressed.");
  process.exitCode = 1;
});
