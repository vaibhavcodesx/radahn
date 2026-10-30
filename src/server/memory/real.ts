import "server-only";
import { preScan } from "./gate";
import { recall, getRecallTrace } from "./recall";
import { buildSystemPrompt, buildGhostPrompt } from "./context";
import type { MemoryEngine } from "./index";

/**
 * Real engine — OWNED BY CODEX (docs/CODEX_TASKS.md C2–C8).
 * Each method is replaced task by task. Until then it throws, and MEMORY_ENGINE=mock serves.
 */
function notImplemented(name: string): never {
  throw new Error(`memory engine: ${name} not implemented yet (MEMORY_ENGINE=real)`);
}

export const realEngine: MemoryEngine = {
  preScan,
  recall,
  buildContext: buildSystemPrompt,
  ghostContext: buildGhostPrompt,
  extractAndWrite: async () => notImplemented("extractAndWrite"),
  rememberExplicit: async () => notImplemented("rememberExplicit"),
  correctMemory: async () => notImplemented("correctMemory"),
  forgetMemory: async () => notImplemented("forgetMemory"),
  reviewMemory: async () => notImplemented("reviewMemory"),
  updateMemory: async () => notImplemented("updateMemory"),
  runReflection: async () => notImplemented("runReflection"),
  listReflections: async () => notImplemented("listReflections"),
  listMemories: async () => notImplemented("listMemories"),
  getMemory: async () => notImplemented("getMemory"),
  getRecallTrace,
  listEvents: async () => notImplemented("listEvents"),
  graph: async () => notImplemented("graph"),
  insights: async () => notImplemented("insights"),
  pendingCount: async () => notImplemented("pendingCount"),
  seedDemo: async () => notImplemented("seedDemo"),
  removeDemo: async () => notImplemented("removeDemo"),
  deleteAll: async () => notImplemented("deleteAll"),
};
