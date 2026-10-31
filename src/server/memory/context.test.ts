import {expect,it} from "vitest";
import {buildSystemPrompt} from "./context";
import type {RecallResult} from "./types";
it("labels a historical validity snapshot without claiming complete transaction-time history",()=>{
 const recall:RecallResult={asOf:"2026-10-31T01:00:00.000Z",recallId:"",intent:"recall",channelsRan:[],picks:[],candidates:[],core:[],strategies:[],notices:[],latencyMs:{embed:0,vector:0,lexical:0,temporal:0,graph:0,total:0}};
 const result=buildSystemPrompt({recall,userName:"Aarav",timeZone:"Asia/Kolkata",now:new Date("2026-10-31T04:00:00Z"),spaceName:"demo"});
 expect(result.system).toContain("## Historical snapshot");
 expect(result.system).toContain(recall.asOf);
 expect(result.system).toContain("valid as of");
 expect(result.system).toContain("do not present them as current facts");
});

it("uses profile About text while retaining pinned constraints, and defensively excludes profile for asOf",()=>{
 const recall={recallId:"",profile:"Alice studies computer science.",intent:"general",channelsRan:[],picks:[],candidates:[],core:[{statement:"Deadline is 9 PM.",type:"constraint"}],strategies:[],notices:[],latencyMs:{}} as unknown as RecallResult;
 const input={recall,userName:"Alice",timeZone:"Asia/Kolkata",now:new Date(),spaceName:"demo"};
 const current=buildSystemPrompt(input).system;expect(current).toContain("## About Alice\nAlice studies computer science.");expect(current).toContain("Deadline is 9 PM.");expect(current).not.toContain("About Alice (core)");
 recall.asOf="2026-10-31T01:00:00Z";const past=buildSystemPrompt(input).system;expect(past).not.toContain(recall.profile);expect(past).toContain("About Alice (core)");
});
