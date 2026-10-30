import "server-only";
/** Retain orchestration: memory-engine.md §4.2–§4.4. */
import { z } from "zod";
import { generateStructured } from "@/server/llm/registry";
import { MEMORY_TYPES, SENSITIVITIES, type ExtractInput, type RememberInput, type WriteSummary, type WriteOpResult } from "./types";
import { extractionPrompt } from "./prompts/extract";
import { writeCandidates } from "./write";
export const candidateSchema=z.object({statement:z.string().max(2000),type:z.enum(MEMORY_TYPES),subject:z.string().optional(),attribute:z.string().optional(),value:z.string().optional(),entities:z.array(z.string()).max(30),importance:z.number().min(1).max(10),confidence:z.number().min(0).max(1),sensitivity:z.enum(SENSITIVITIES),scope:z.enum(["global","space"]),expiresAt:z.iso.datetime({offset:true}).optional(),validFrom:z.iso.datetime({offset:true}).optional(),explicit:z.boolean(),hint:z.enum(["new","update","confirm"]),targetRef:z.string().optional()});
export const extractionSchema=z.object({memories:z.array(candidateSchema).max(5)});
export async function extractAndWrite(input:ExtractInput):Promise<WriteSummary> {
  const {object}=await generateStructured("fast",{prompt:extractionPrompt(input),schema:extractionSchema,timeoutMs:20000});
  const parsed=extractionSchema.safeParse(object);
  if(!parsed.success)throw new Error("Extraction response failed validation");
  const memories=parsed.data.memories;
  const latestUser=[...input.turns].reverse().find(t=>t.role==="user")?.text ?? "";
  const consent=/^\s*(?:(?:please|kindly)\s+|I want you to\s+)?(?:remember|save|store)\b/i.test(latestUser) && !/\b(?:don'?t|do not|never|not to)\b/i.test(latestUser);
  return writeCandidates(memories.map(m=>({...m,explicit:m.explicit && consent})),{ownerId:input.ownerId,spaceKey:input.spaceKey,now:input.now,policy:input.policy,source:{kind:"chat",conversationId:input.conversationId,messageId:input.messageId,actor:{kind:"radahn",name:"radahn"}},recalled:input.recalled});
}
export async function rememberExplicit(input:RememberInput):Promise<WriteOpResult> {
  const summary=await writeCandidates([{statement:input.statement,type:input.type,entities:[],importance:input.importance??6,confidence:0.95,sensitivity:input.sensitivity??"none",scope:input.scope??"space",expiresAt:input.expiresAt,explicit:true,hint:"new"}],{ownerId:input.ownerId,spaceKey:input.spaceKey,now:new Date(),policy:"review_sensitive",source:input.source,recalled:[],pinned:input.pinned});
  return summary.ops[0] ?? {op:"skip"};
}
