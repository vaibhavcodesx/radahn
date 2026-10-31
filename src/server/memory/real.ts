import "server-only";
import { preScan } from "./gate";
import { recall, getRecallTrace } from "./recall";
import { buildSystemPrompt, buildGhostPrompt } from "./context";
import { extractAndWrite, rememberExplicit } from "./extract";
import { correctMemory, forgetMemory, reviewMemory, updateMemory, listMemories, getMemory, listEvents, pendingCount } from "./tools";
import { seedDemo, removeDemo, deleteAll } from "./seed";
import { runReflection, listReflections } from "./reflect";
import { graph, insights } from "./insights";
import type { MemoryEngine } from "./index";

/**
 * Real engine — OWNED BY CODEX (docs/CODEX_TASKS.md C2–C8).
 * MongoDB-backed implementation of the shared facade.
 */


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
  graph,
  insights,
  pendingCount,
  seedDemo,
  removeDemo,
  deleteAll,
};
