import {describe,expect,it} from "vitest";
import {effectiveSpaceKeys,assertSpaceAllowed,spaceFilter} from "./scope";
describe("trusted effective scopes",()=>{
 it("preserves unrestricted UI and restricts all-space access to deduplicated grants",()=>{
  expect(effectiveSpaceKeys(undefined,undefined)).toBeUndefined();expect(spaceFilter(undefined)).toEqual({});
  expect(effectiveSpaceKeys(["a","global"],undefined)).toEqual(["a","global"]);
  expect(effectiveSpaceKeys(undefined,["a","a"])).toEqual(["a"]);
  expect(effectiveSpaceKeys(["a","global"],["a","b"])).toEqual(["a"]);
  expect(()=>assertSpaceAllowed("global",["a"])).toThrowError("Memory space access denied");
 });
 it.each([null,"global",[],[""],[null],[" a"],["a",3]].map(allowed=>({allowed})))("rejects malformed or empty grant $allowed",({allowed})=>{
  expect(()=>effectiveSpaceKeys(undefined,allowed as unknown as string[])).toThrowError("Memory space access denied");
 });
});
