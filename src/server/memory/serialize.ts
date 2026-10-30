/** Wire serialization for memory-engine.md §2 (embeddings never cross to the UI). */
import type { MemoryUnit, MemoryDTO, MemoryEvent, MemoryEventDTO } from "./types";
export function memoryDTO(m: MemoryUnit): MemoryDTO {
  return { id: m._id.toHexString(), spaceKey:m.spaceKey,type:m.type,statement:m.statement,subject:m.subject,attribute:m.attribute,value:m.value,slotKey:m.slotKey,entities:m.entities,tags:m.tags,importance:m.importance,confidence:m.confidence,sensitivity:m.sensitivity,pinned:m.pinned,status:m.status,source:m.source,evidenceIds:m.evidenceIds.map(id=>id.toHexString()),supersedes:m.supersedes?.toHexString(),supersededBy:m.supersededBy?.toHexString(),supersedeReason:m.supersedeReason,relatedIds:m.relatedIds.map(id=>id.toHexString()),validFrom:m.validFrom.toISOString(),validTo:m.validTo?.toISOString(),expiresAt:m.expiresAt?.toISOString(),stats:{...m.stats,lastRecalledAt:m.stats.lastRecalledAt?.toISOString(),lastConfirmedAt:m.stats.lastConfirmedAt?.toISOString()},createdAt:m.createdAt.toISOString(),updatedAt:m.updatedAt.toISOString(),demo:m.demo };
}
export function eventDTO(e: MemoryEvent): MemoryEventDTO {
  return {id:e._id.toHexString(),spaceKey:e.spaceKey,memoryId:e.memoryId?.toHexString(),kind:e.kind,actor:e.actor,type:e.type,summary:e.summary,messageId:e.messageId,diff:e.diff,at:e.at.toISOString()};
}
