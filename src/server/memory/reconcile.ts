/** Reconcile decisions: memory-engine.md §4.4, CODEX_TASKS R5–R7. Pure deterministic core. */
import { createHash } from "node:crypto";
import type { CandidateMemory, MemoryUnit } from "./types";
export const normalise=(text:string)=>text.normalize("NFKC").trim().replace(/\s+/g," ").toLowerCase();
export const contentHash=(text:string)=>createHash("sha1").update(normalise(text)).digest("hex");
export function confirmConfidence(count:number):number {return Math.min(0.95,0.5+Math.log1p(Math.max(0,count))/4);}
export function slotDecision(candidate:CandidateMemory,active:MemoryUnit):"confirm"|"supersede"|"history" {if(candidate.validFrom && +new Date(candidate.validFrom)<+active.validFrom) return "history";
  return normalise(candidate.value ?? candidate.statement)===normalise(active.value ?? active.statement) ? "confirm" : "supersede";}
export function neighbourDecision(similarity:number,sameType:boolean):"confirm"|"ambiguous"|"add" {if(similarity>=0.92 && sameType)return "confirm";
  return similarity>=0.80 ? "ambiguous" : "add";}
