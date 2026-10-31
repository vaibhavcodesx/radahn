import {describe,it,expect} from "vitest";
import {parseAsOf,historicalFilter,isHistoricalMemory,historicalMetadata} from "./historical";
import type {MemoryUnit} from "./types";
const at=new Date("2026-10-01T00:00:00Z");
const unit={status:"superseded",validFrom:new Date("2026-09-01T00:00:00Z"),validTo:new Date("2026-10-02T00:00:00Z"),createdAt:new Date("2026-09-01T00:00:00Z"),updatedAt:new Date("2026-10-10T00:00:00Z"),stats:{confirmCount:4,lastConfirmedAt:new Date("2026-10-10T00:00:00Z")}} as MemoryUnit;
describe("retained content history",()=>{
 it("validates absolute ISO instants including calendar dates",()=>{
  expect(parseAsOf(undefined)).toBeUndefined();expect(parseAsOf("2026-10-01T05:30:00+05:30")).toEqual(at);
  for(const value of ["", "yesterday","2026-10-01","2026-02-30T00:00:00Z","2026-10-01T24:00:00Z","2026-10-01T00:00:00+24:00"])expect(()=>parseAsOf(value)).toThrow(/asOf/);
 });
 it("uses inclusive start, exclusive end and expiry with safe status allowlist",()=>{
  expect(isHistoricalMemory(unit,at)).toBe(true);
  expect(isHistoricalMemory({...unit,validFrom:at},at)).toBe(true);
  for(const patch of [{validFrom:new Date(+at+1)},{validTo:at},{expiresAt:at},...(["expired","rejected","pending_review"] as const).map(status=>({status}))])expect(isHistoricalMemory({...unit,...patch},at)).toBe(false);
  expect(historicalFilter(at)).toMatchObject({status:{$in:["active","superseded"]},validFrom:{$lte:at}});
 });
 it("does not use future metadata as historical evidence or mutate stored units",()=>{
  const projected=historicalMetadata(unit,at);expect(projected.updatedAt).toEqual(unit.validFrom);expect(projected.stats.confirmCount).toBe(0);expect(projected.stats.lastConfirmedAt).toBeUndefined();expect(unit.stats.confirmCount).toBe(4);
 });
});
