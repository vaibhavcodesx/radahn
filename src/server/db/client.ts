import "server-only";
import { MongoClient, type Db } from "mongodb";
import { env } from "@/server/env";

// One client per lambda instance, cached on globalThis so dev HMR and warm invocations
// reuse the pool. maxPoolSize 10 keeps us well under M0's connection limit (TRD §13).
const g = globalThis as unknown as { __radahnMongo?: MongoClient };

export function mongo(): MongoClient {
  if (!g.__radahnMongo) {
    g.__radahnMongo = new MongoClient(env().MONGODB_URI, {
      maxPoolSize: 10,
      appName: "radahn",
      serverSelectionTimeoutMS: 8000,
    });
  }
  return g.__radahnMongo;
}

export function db(name = env().MONGODB_DB): Db {
  return mongo().db(name);
}
