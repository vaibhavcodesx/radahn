import {expect,it,vi} from "vitest";
vi.mock("server-only",()=>({}));
const db=vi.hoisted(()=>vi.fn(()=>{throw new Error("Authentication input reached owner storage");}));
vi.mock("@/server/db/client",()=>({db}));
it("mock key verification never hydrates an owner using an authentication secret",async()=>{
 vi.stubEnv("MEMORY_MOCK_STORE","mongo");
 try{
  const {mockEngine}=await import("./mock");
  expect(await mockEngine.verifyAgentKey("radahn_"+"a".repeat(64))).toBeNull();
  expect(db).not.toHaveBeenCalled();
 }finally{vi.unstubAllEnvs();}
});
