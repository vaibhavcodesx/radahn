/**
 * Idempotent database setup (TRD §5). Creates collections, the `memories` validator,
 * regular + TTL + partial-unique indexes, and the two Atlas Search indexes, then waits
 * until the search indexes are queryable.
 *
 *   npm run db:setup                      # MONGODB_DB from env (default radahn)
 *   MONGODB_DB=radahn_eval npm run db:setup
 *
 * Written by Claude in Phase 0 (C0); owned by Codex from here.
 */
import { MongoClient, type Db, type IndexSpecification, type CreateIndexesOptions } from "mongodb";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "radahn";
if (!uri) {
  console.error("MONGODB_URI is not set (.env.local).");
  process.exit(1);
}

const MEMORY_TYPES = ["profile", "preference", "fact", "goal", "constraint", "decision", "outcome", "feedback", "strategy", "observation"];
const EMBED_DIM = Number(process.env.EMBED_DIM || 768);

const memoriesValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: ["ownerId", "spaceKey", "type", "statement", "importance", "confidence", "sensitivity", "status", "source", "entities", "validFrom", "createdAt", "updatedAt", "embedding"],
    properties: {
      ownerId: { bsonType: "string" },
      spaceKey: { bsonType: "string" },
      type: { enum: MEMORY_TYPES },
      status: { enum: ["active", "pending_review", "superseded", "expired", "rejected"] },
      sensitivity: { enum: ["none", "personal", "sensitive"] },
      statement: { bsonType: "string", minLength: 3, maxLength: 240 },
      importance: { bsonType: ["int", "double", "long"], minimum: 1, maximum: 10 },
      confidence: { bsonType: ["double", "int"], minimum: 0, maximum: 1 },
      entities: { bsonType: "array", items: { bsonType: "string" } },
      // Empty array allowed only while needsEmbedding is set (embed failure → backfill).
      embedding: { bsonType: "array", maxItems: EMBED_DIM },
      validFrom: { bsonType: "date" },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
    },
  },
};

type IndexDef = [IndexSpecification, CreateIndexesOptions?];
const INDEXES: Record<string, IndexDef[]> = {
  memories: [
    [{ ownerId: 1, spaceKey: 1, status: 1, type: 1, updatedAt: -1 }, { name: "owner_space_status_type" }],
    [
      { ownerId: 1, spaceKey: 1, slotKey: 1 },
      // DB-enforced "one current truth per slot" (memory-engine.md §4.4, decisions P8).
      { name: "one_active_per_slot", unique: true, partialFilterExpression: { status: "active", slotKey: { $exists: true } } },
    ],
    [{ ownerId: 1, pinned: 1, status: 1 }, { name: "owner_pinned" }],
    [{ ownerId: 1, entities: 1, status: 1 }, { name: "owner_entities" }],
    [{ ownerId: 1, contentHash: 1 }, { name: "owner_hash" }],
    [{ purgeAt: 1 }, { name: "ttl_purge", expireAfterSeconds: 0 }],
  ],
  memory_events: [
    [{ ownerId: 1, at: -1 }, { name: "owner_at" }],
    [{ ownerId: 1, messageId: 1 }, { name: "owner_message" }],
    [{ ownerId: 1, memoryId: 1, at: -1 }, { name: "owner_memory_at" }],
  ],
  recalls: [
    [{ ownerId: 1, messageId: 1 }, { name: "owner_message" }],
    [{ ownerId: 1, "candidates.memoryId": 1 }, { name: "owner_candidate" }],
    [{ createdAt: 1 }, { name: "ttl_14d", expireAfterSeconds: 1_209_600 }],
  ],
  messages: [
    [{ conversationId: 1, createdAt: 1 }, { name: "conversation_created" }],
    [{ ownerId: 1, uiId: 1 }, { name: "owner_uiid" }],
    [{ ownerId: 1, text: "text" }, { name: "owner_text" }],
  ],
  conversations: [[{ ownerId: 1, spaceId: 1, lastMessageAt: -1 }, { name: "owner_space_last" }]],
  spaces: [[{ ownerId: 1, createdAt: 1 }, { name: "owner_created" }]],
  reflections: [[{ ownerId: 1, startedAt: -1 }, { name: "owner_started" }]],
  user_settings: [],
  agent_keys: [
    [{ keyHash: 1 }, { name: "key_hash", unique: true }],
    [{ ownerId: 1 }, { name: "owner" }],
  ],
  rate_limits: [
    [{ key: 1, windowStart: 1 }, { name: "key_window", unique: true }],
    [{ windowStart: 1 }, { name: "ttl_1h", expireAfterSeconds: 3600 }],
  ],
  llm_usage: [],
};

const SEARCH_INDEXES = [
  {
    collection: "memories",
    name: "memories_vec",
    type: "vectorSearch" as const,
    definition: {
      fields: [
        { type: "vector", path: "embedding", numDimensions: EMBED_DIM, similarity: "cosine" },
        { type: "filter", path: "ownerId" },
        { type: "filter", path: "spaceKey" },
        { type: "filter", path: "status" },
        { type: "filter", path: "type" },
        { type: "filter", path: "sensitivity" },
      ],
    },
  },
  {
    collection: "memories",
    name: "memories_text",
    type: "search" as const,
    definition: {
      mappings: {
        dynamic: false,
        fields: {
          statement: { type: "string", analyzer: "lucene.english" },
          entities: { type: "string" },
          tags: { type: "string" },
          ownerId: { type: "token" },
          spaceKey: { type: "token" },
          status: { type: "token" },
        },
      },
    },
  },
];

async function ensureCollections(db: Db) {
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));
  for (const name of Object.keys(INDEXES)) {
    if (!existing.has(name)) {
      await db.createCollection(name, name === "memories" ? { validator: memoriesValidator, validationLevel: "strict", validationAction: "error" } : {});
      console.log(`  + collection ${name}`);
    }
  }
  // Keep the validator current on re-runs.
  await db.command({ collMod: "memories", validator: memoriesValidator, validationLevel: "strict", validationAction: "error" });
}

async function ensureIndexes(db: Db) {
  for (const [coll, defs] of Object.entries(INDEXES)) {
    for (const [spec, opts] of defs) {
      try {
        await db.collection(coll).createIndex(spec, opts);
      } catch (e) {
        const code = (e as { codeName?: string }).codeName;
        // An index with the same name but different options: drop and recreate.
        if (code === "IndexOptionsConflict" || code === "IndexKeySpecsConflict") {
          await db.collection(coll).dropIndex(opts!.name!);
          await db.collection(coll).createIndex(spec, opts);
          console.log(`  ~ recreated ${coll}.${opts?.name}`);
        } else throw e;
      }
    }
    if (defs.length) console.log(`  ✓ ${coll}: ${defs.length} index(es)`);
  }
}

async function ensureSearchIndexes(db: Db) {
  for (const idx of SEARCH_INDEXES) {
    const coll = db.collection(idx.collection);
    const found = await coll.listSearchIndexes(idx.name).toArray();
    if (found.length === 0) {
      await coll.createSearchIndex({ name: idx.name, type: idx.type, definition: idx.definition });
      console.log(`  + search index ${idx.name} (building…)`);
    } else {
      await coll.updateSearchIndex(idx.name, idx.definition);
      console.log(`  ~ search index ${idx.name} updated`);
    }
  }
  const deadline = Date.now() + 180_000;
  for (const idx of SEARCH_INDEXES) {
    const coll = db.collection(idx.collection);
    for (;;) {
      const [info] = await coll.listSearchIndexes(idx.name).toArray();
      if (info?.queryable) {
        console.log(`  ✓ ${idx.name} queryable (${info.status})`);
        break;
      }
      if (Date.now() > deadline) {
        console.warn(`  ! ${idx.name} not queryable after 3 min (status ${info?.status}); it will finish in the background.`);
        break;
      }
      await new Promise((r) => setTimeout(r, 4000));
    }
  }
}

async function checkTransactions(client: MongoClient, db: Db) {
  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      await db.collection("llm_usage").updateOne({ _id: "__txn_probe__" as never }, { $set: { updatedAt: new Date() } }, { upsert: true, session });
    });
    await db.collection("llm_usage").deleteOne({ _id: "__txn_probe__" as never });
    console.log("  ✓ multi-document transactions work");
  } finally {
    await session.endSession();
  }
}

async function main() {
  const client = new MongoClient(uri!, { appName: "radahn-setup" });
  await client.connect();
  const db = client.db(dbName);
  console.log(`Setting up database "${dbName}"`);
  await ensureCollections(db);
  await ensureIndexes(db);
  await checkTransactions(client, db);
  await ensureSearchIndexes(db);
  await client.close();
  console.log("Done.");
}

main().catch((e) => {
  // Never print the URI.
  console.error("db:setup failed:", (e as Error).message?.replace(/mongodb(\+srv)?:\/\/\S+/g, "<uri>"));
  process.exit(1);
});
