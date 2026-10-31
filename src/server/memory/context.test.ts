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
