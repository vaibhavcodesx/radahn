/**
 * CLI wrapper: `npm run db:setup` (MONGODB_DB=radahn_eval for evals).
 * Logic lives in src/server/db/setup.ts. Owned by Codex (C0).
 */
import { MongoClient } from "mongodb";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set (.env.local).");
  const { runDbSetup } = await import("../src/server/db/setup");
  const client = new MongoClient(uri, { appName: "radahn-setup" });
  await client.connect();
  try {
    await runDbSetup(client, process.env.MONGODB_DB || "radahn", { log: (s) => console.log(s) });
  } finally {
    await client.close();
  }
}

main().catch((e) => {
  console.error("db:setup failed:", String((e as Error).message).replace(/mongodb(\+srv)?:\/\/\S+/g, "<uri>"));
  process.exit(1);
});
