import "server-only";
import { preScan } from "./gate";
import { recall, getRecallTrace } from "./recall";
import { buildSystemPrompt, buildGhostPrompt } from "./context";
import { extractAndWrite, rememberExplicit } from "./extract";
import { correctMemory, forgetMemory, reviewMemory, updateMemory, listMemories, getMemory, listEvents, pendingCount } from "./tools";
import { seedDemo, removeDemo, deleteAll } from "./seed";
import { runReflection, listReflections } from "./reflect";
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
  extractAndWrite,
  rememberExplicit,
  correctMemory,
  forgetMemory,
  reviewMemory,
  updateMemory,
  runReflection,
  listReflections,
  listMemories,
  getMemory,
  getRecallTrace,
  listEvents,
  graph: async () => notImplemented("graph"),
  insights: async () => notImplemented("insights"),
  pendingCount,
  seedDemo,
  removeDemo,
  deleteAll,
};
