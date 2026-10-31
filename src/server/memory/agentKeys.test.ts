import {beforeEach,expect,it,vi} from "vitest";
import {ObjectId} from "mongodb";
import {createHash} from "node:crypto";
vi.mock("server-only",()=>({}));
const m=vi.hoisted(()=>({insertOne:vi.fn(),findOne:vi.fn(),find:vi.fn(),updateOne:vi.fn(),deleteOne:vi.fn(),space:vi.fn(),lock:vi.fn(),end:vi.fn(),session:{}}));
vi.mock("@/server/db/collections",()=>({collections:()=>({agentKeys:m,spaces:{findOne:m.space}})}));
vi.mock("./mutation",()=>({lockOwner:m.lock}));
vi.mock("@/server/db/client",()=>({mongo:()=>({startSession:()=>Object.assign(m.session,{withTransaction:async (fn:()=>Promise<unknown>)=>fn(),endSession:m.end})})}));
const api=await import("./agentKeys");
const sid="0123456789abcdef01234567", id=new ObjectId("abcdef0123456789abcdef01");
const raw="radahn_"+"ab".repeat(32);
const doc=()=>({_id:id,ownerId:"alice",name:"Desktop",spaceKeys:["global",sid],prefix:"radahn_abababab",keyHash:createHash("sha256").update(raw).digest("hex"),createdAt:new Date(0)});
beforeEach(()=>{vi.clearAllMocks();m.insertOne.mockResolvedValue({});m.space.mockResolvedValue({_id:new ObjectId(sid)});m.findOne.mockResolvedValue(doc());m.updateOne.mockResolvedValue({matchedCount:1});m.deleteOne.mockResolvedValue({deletedCount:1});});
it("creates independent secure keys and stores only a digest with owned scopes",async()=>{
 const a=await api.createAgentKey("alice"," Desktop ",["global",sid,sid]);const b=await api.createAgentKey("alice","Laptop",["global"]);
 expect(/^radahn_[a-f0-9]{64}$/.test(a.key)).toBe(true);expect(a.key===b.key).toBe(false);
 const stored=m.insertOne.mock.calls[0][0];expect(stored.keyHash===createHash("sha256").update(a.key).digest("hex")).toBe(true);expect(JSON.stringify(stored).includes(a.key)).toBe(false);expect(stored.spaceKeys).toEqual(["global",sid]);expect(stored.name).toBe("Desktop");expect(a.id).toBe(stored._id.toHexString());expect(a.key.startsWith(a.prefix)).toBe(true);expect(m.space.mock.calls[0][0]).toEqual({ownerId:"alice",_id:new ObjectId(sid)});
});
it.each(["", "a".repeat(81),"password=secret", "sk-"+"x".repeat(25),"radahn_"+"ab".repeat(32),"hello\nworld"])("rejects unsafe name case %# before writes",async name=>{await expect(api.createAgentKey("alice",name,["global"])).rejects.toThrow();expect(m.insertOne).not.toHaveBeenCalled();});
it.each([[],["foreign"],Array(101).fill("global")])("rejects invalid scopes case %#",async scopes=>{await expect(api.createAgentKey("alice","Desktop",scopes)).rejects.toThrow();expect(m.insertOne).not.toHaveBeenCalled();});
it("rejects foreign space ownership",async()=>{m.space.mockResolvedValue(null);await expect(api.createAgentKey("alice","Desktop",[sid])).rejects.toThrow();expect(m.insertOne).not.toHaveBeenCalled();});
it("uses hash discovery then scoped last-use CAS, returning no key material",async()=>{expect(await api.verifyAgentKey(raw)).toEqual({ownerId:"alice",name:"Desktop",spaceKeys:["global",sid]});expect(m.findOne.mock.calls[0][0]).toEqual({keyHash:doc().keyHash});expect(m.updateOne.mock.calls[0][0]).toEqual({_id:id,ownerId:"alice",keyHash:doc().keyHash});expect(m.updateOne.mock.calls[0][1].$set.lastUsedAt).toBeInstanceOf(Date);});
it("rejects unknown or malformed keys without authentication",async()=>{expect(await api.verifyAgentKey("bad")).toBeNull();expect(m.findOne).not.toHaveBeenCalled();m.findOne.mockResolvedValue(null);expect(await api.verifyAgentKey(raw)).toBeNull();expect(m.updateOne).not.toHaveBeenCalled();});
it("fails closed when a scope was deleted or transferred",async()=>{m.space.mockResolvedValue(null);expect(await api.verifyAgentKey(raw)).toBeNull();expect(m.updateOne).not.toHaveBeenCalled();});
it("does not authenticate a key revoked between discovery and last-use update",async()=>{m.updateOne.mockResolvedValue({matchedCount:0});expect(await api.verifyAgentKey(raw)).toBeNull();});
it("lists only owner metadata even if the database returns extra fields",async()=>{m.find.mockReturnValue({sort:()=>({toArray:async()=>[doc()]})});const rows=await api.listAgentKeys("alice");expect(rows).toEqual([{id:id.toHexString(),name:"Desktop",prefix:doc().prefix,spaceKeys:["global",sid],createdAt:new Date(0).toISOString()}]);expect(m.find.mock.calls[0][0]).toEqual({ownerId:"alice"});expect(m.find.mock.calls[0][1].projection.keyHash).toBe(0);});
it("revokes only an owned id and reports missing keys",async()=>{expect(await api.revokeAgentKey("alice",id.toHexString())).toBe(true);expect(m.deleteOne.mock.calls[0][0]).toEqual({ownerId:"alice",_id:id});m.deleteOne.mockResolvedValue({deletedCount:0});expect(await api.revokeAgentKey("bob",id.toHexString())).toBe(false);expect(await api.revokeAgentKey("alice","bad")).toBe(false);});

it("serializes authentication with owner purge and rereads the credential under the lock",async()=>{m.findOne.mockResolvedValueOnce(doc()).mockResolvedValueOnce(null);expect(await api.verifyAgentKey(raw)).toBeNull();expect(m.lock).toHaveBeenCalled();expect(m.findOne.mock.calls[1][0]).toEqual({_id:id,ownerId:"alice",keyHash:doc().keyHash});expect(m.updateOne).not.toHaveBeenCalled();expect(m.end).toHaveBeenCalled();});
it("passes the same transaction to space validation and last-use update",async()=>{await api.verifyAgentKey(raw);expect(m.space.mock.calls[0][1].session).toBe(m.session);expect(m.updateOne.mock.calls[0][2].session).toBe(m.session);expect(m.lock.mock.invocationCallOrder[0]).toBeLessThan(m.space.mock.invocationCallOrder[0]);});

