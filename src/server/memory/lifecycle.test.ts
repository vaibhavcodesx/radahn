import {beforeEach,describe,expect,it,vi} from "vitest";
import {ObjectId} from "mongodb";
vi.mock("server-only",()=>({}));
const mock=vi.hoisted(()=>({find:vi.fn(),updateOne:vi.fn(),insertOne:vi.fn(),transaction:vi.fn(),end:vi.fn()}));
vi.mock("@/server/db/collections",()=>({collections:()=>({memories:{find:mock.find,updateOne:mock.updateOne},events:{insertOne:mock.insertOne},settings:{updateOne:async()=>({})}})}));
vi.mock("@/server/db/client",()=>({mongo:()=>({startSession:()=>({withTransaction:mock.transaction,endSession:mock.end})})}));
const {flipExpired}=await import("./lifecycle");
beforeEach(()=>{vi.clearAllMocks();mock.updateOne.mockResolvedValue({matchedCount:1});mock.insertOne.mockResolvedValue({});mock.transaction.mockImplementation(async fn=>fn({}));mock.end.mockResolvedValue(undefined);});
describe("expiry maintenance",()=>{
 it("flips expired units with an owner filter and event atomically",async()=>{
  const now=new Date(),unit={_id:new ObjectId(),ownerId:"alice",spaceKey:"s",type:"fact",expiresAt:new Date(+now-1000),createdAt:new Date(+now-3000)};
  mock.find.mockReturnValue({limit:()=>({toArray:async()=>[unit]})});expect(await flipExpired("alice",now)).toBe(1);
  expect(mock.find.mock.calls[0][0].ownerId).toBe("alice");expect(mock.updateOne.mock.calls[0][0].expiresAt).toEqual(unit.expiresAt);expect(mock.updateOne.mock.calls[0][1].$set.status).toBe("expired");expect(mock.insertOne.mock.calls[0][0].kind).toBe("expired");
 });
 it("does not emit expiry if a concurrent update extended the unit",async()=>{
  const now=new Date();mock.find.mockReturnValue({limit:()=>({toArray:async()=>[{_id:new ObjectId(),ownerId:"alice",spaceKey:"s",type:"fact",expiresAt:now,createdAt:now}]})});mock.updateOne.mockResolvedValue({matchedCount:0});
  expect(await flipExpired("alice",now)).toBe(0);expect(mock.insertOne).not.toHaveBeenCalled();
 });
});
