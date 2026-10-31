/** Retained content snapshots: memory-engine.md §2–§3 and §5; CODEX_TASKS C12.
 * Content versions are retained, but mutable metadata has no complete transaction-time history.
 * Forgotten/TTL-purged content and expired/rejected/pending rows cannot be reconstructed.
 */
import type {Filter} from "mongodb";
import type {MemoryUnit} from "./types";
export function parseAsOf(value?:string):Date|undefined {
 if(value===undefined)return undefined;
 const match=/^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(?:\.\d{1,3})?(Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(value);
 const parsed=new Date(value);
 if(!match || !Number.isFinite(+parsed))throw new Error("Invalid asOf: expected an absolute ISO timestamp");
 const [,year,month,day]=match;
 const calendar=new Date(0);calendar.setUTCFullYear(+year,+month-1,+day);
 if(calendar.getUTCFullYear()!==+year || calendar.getUTCMonth()!==+month-1 || calendar.getUTCDate()!==+day)throw new Error("Invalid asOf calendar date");
 return parsed;
}
export function historicalFilter(at:Date):Filter<MemoryUnit> {
 return {status:{$in:["active","superseded"]},validFrom:{$lte:at},$and:[{$or:[{validTo:{$exists:false}},{validTo:{$gt:at}}]},{$or:[{expiresAt:{$exists:false}},{expiresAt:{$gt:at}}]}]};
}
export function isHistoricalMemory(unit:{status:string;validFrom:Date|string;validTo?:Date|string;expiresAt?:Date|string;createdAt?:Date|string},at:Date):boolean {
 return ["active","superseded"].includes(unit.status) && +new Date(unit.validFrom)<=+at && (unit.validTo===undefined || +new Date(unit.validTo)>+at) && (unit.expiresAt===undefined || +new Date(unit.expiresAt)>+at);
}
export function historicalMetadata(unit:MemoryUnit,at:Date):MemoryUnit {
 const updatedAt=+unit.updatedAt<=+at?unit.updatedAt:unit.validFrom;
 // A counter is cumulative; without metadata versions its value before a later update is unknown.
 const unknownConfirmations=+unit.updatedAt>+at || (unit.stats.lastConfirmedAt!==undefined && +unit.stats.lastConfirmedAt>+at);
 return {...unit,updatedAt,stats:{...unit.stats,...(unknownConfirmations?{confirmCount:0,lastConfirmedAt:undefined}:{})}};
}
