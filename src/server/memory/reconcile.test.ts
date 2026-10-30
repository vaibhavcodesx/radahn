import {describe,expect,it} from "vitest";
import {contentHash,confirmConfidence,slotDecision,neighbourDecision} from "./reconcile";
import {purgeAt} from "./lifecycle";
import type {CandidateMemory,MemoryUnit} from "./types";
const active={value:"9 PM",validFrom:new Date("2026-10-31T00:00:00Z")} as MemoryUnit;
const candidate=(patch:Partial<CandidateMemory>={})=>({value:"9 pm",...patch}) as CandidateMemory;
describe("deterministic reconcile",()=>{
 it("confirms the same normalized slot value and supersedes different values",()=>{expect(slotDecision(candidate(),active)).toBe("confirm");expect(slotDecision(candidate({value:"10 PM"}),active)).toBe("supersede");});
 it("keeps historical corrections from replacing current truth",()=>{expect(slotDecision(candidate({value:"8 PM",validFrom:"2026-10-30T00:00:00Z"}),active)).toBe("history");});
 it("uses normalized hash dedup and a saturating confidence curve",()=>{expect(contentHash(" Tea  TODAY ")).toBe(contentHash("tea today"));expect(confirmConfidence(1)).toBeCloseTo(0.673286795);expect(confirmConfidence(99)).toBe(0.95);});
 it("resolves semantic boundaries without confirming different types",()=>{expect(neighbourDecision(0.92,true)).toBe("confirm");expect(neighbourDecision(0.80,true)).toBe("ambiguous");expect(neighbourDecision(0.799,true)).toBe("add");expect(neighbourDecision(0.99,false)).not.toBe("confirm");});
});
describe("TTL grace",()=>{
 it("uses 3-minute grace for lifetimes under one hour",()=>{const created=new Date(0);expect(purgeAt(new Date(120000),created)).toEqual(new Date(300000));});
 it("uses 24-hour grace from one hour onward",()=>{expect(purgeAt(new Date(3600000),new Date(0))).toEqual(new Date(90000000));});
});
