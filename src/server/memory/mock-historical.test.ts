import {expect,it,vi} from "vitest";
vi.mock("server-only",()=>({}));
import {mockEngine} from "./mock";
it("mock list and recall select the version valid at a historical boundary",async()=>{
 vi.useFakeTimers();
 const ownerId="historical-mock-boundary",spaceKey="historical-space",start=new Date("2026-10-31T00:00:00Z"),changed=new Date("2026-10-31T02:00:00Z");
 try{
  vi.setSystemTime(start);
  const before=await mockEngine.rememberExplicit({ownerId,spaceKey,statement:"The deadline is 9 PM.",type:"constraint",importance:10,source:{kind:"manual",actor:{kind:"user",name:"you"}}});
  vi.setSystemTime(changed);
  const corrected=await mockEngine.correctMemory({ownerId,spaceKey,memoryId:before.memoryId!,newStatement:"The deadline is 10 PM.",actor:{kind:"user",name:"you"}});
  expect(corrected.status).toBe("updated");
  const asOf="2026-10-31T01:00:00Z";
  const list=await mockEngine.listMemories({ownerId,spaceKey,asOf});
  expect(list.map(m=>m.statement)).toEqual(["The deadline is 9 PM."]);
  const recalled=await mockEngine.recall({ownerId,spaceKey,asOf,query:"deadline plan",persistTrace:false});
  expect(recalled.picks.map(p=>p.statement)).toEqual(["The deadline is 9 PM."]);
  expect(recalled.asOf).toBe("2026-10-31T01:00:00.000Z");
  expect((await mockEngine.listMemories({ownerId,spaceKey,asOf:changed.toISOString()})).map(m=>m.statement)).toEqual(["The deadline is 10 PM."]);
  await expect(mockEngine.listMemories({ownerId,spaceKey,asOf:"not-a-date"})).rejects.toThrow();
 }finally{await mockEngine.deleteAll(ownerId);vi.useRealTimers();}
});
