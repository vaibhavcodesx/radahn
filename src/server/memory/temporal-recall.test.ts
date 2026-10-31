import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {ObjectId} from 'mongodb';
import type {MemoryUnit} from './types';
vi.mock('server-only',()=>({}));
const m=vi.hoisted(()=>({find:vi.fn(),events:vi.fn(),aggregate:vi.fn(),embed:vi.fn()}));
vi.mock('@/server/db/collections',()=>({collections:()=>({memories:{find:m.find,aggregate:m.aggregate},events:{find:m.events},settings:{findOne:async()=>({timeZone:'Asia/Kolkata'})}})}));
vi.mock('@/server/llm/registry',()=>({embed:m.embed}));
vi.mock('./profile',()=>({readProfile:async()=>undefined}));
import {recall} from './recall';
const cursor=(rows:unknown[])=>({sort:()=>cursor(rows),limit:()=>cursor(rows),toArray:async()=>rows});
const row=(patch:Partial<MemoryUnit>={}):MemoryUnit=>({_id:new ObjectId(),ownerId:'alice',spaceKey:'s',type:'fact',statement:'Built the local prototype.',entities:[],tags:[],importance:1,confidence:.5,pinned:false,sensitivity:'none',status:'active',source:{kind:'manual',actor:{kind:'user',name:'Alice'}},evidenceIds:[],relatedIds:[],validFrom:new Date('2026-10-01Z'),createdAt:new Date('2026-10-01Z'),updatedAt:new Date('2026-10-01Z'),stats:{recallCount:0,confirmCount:0,citedCount:0},embedding:[1,0],embeddingModel:'gemini-embedding-2@768',...patch});
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-31T08:30Z'));m.embed.mockResolvedValue([[1,0]]);m.aggregate.mockReturnValue(cursor([]));m.find.mockReturnValue(cursor([]));m.events.mockReturnValue(cursor([]));});
afterEach(()=>vi.useRealTimers());
it('retrieves scoped event-linked live memories and prioritizes them over unrelated semantic matches',async()=>{
 const target=row(),noise=row({importance:10,confidence:1,updatedAt:new Date()});
 m.aggregate.mockReturnValue(cursor([noise]));m.events.mockReturnValue(cursor([{ownerId:'alice',spaceKey:'s',memoryId:target._id,kind:'confirmed',at:new Date('2026-10-30T15:00Z')}]));
 m.find.mockImplementation(f=>cursor(f._id?[target]:[]));
 const result=await recall({ownerId:'alice',spaceKey:'s',allowedSpaceKeys:['s'],query:'What did I do last night?',persistTrace:false});
 expect(result.picks.map(p=>p.memoryId)).toEqual([target._id.toHexString()]);
 expect(result.picks[0].reasons).toContain('time_window');
 expect(m.events.mock.calls[0][0]).toMatchObject({ownerId:'alice',spaceKey:{$in:['s']},at:{$gte:new Date('2026-10-30T12:30Z'),$lt:new Date('2026-10-31T00:30Z')}});
 expect(m.find.mock.calls.find(([f])=>f._id)?.[0]).toMatchObject({ownerId:'alice',spaceKey:{$in:['s']},status:'active'});
 vi.useRealTimers();
});
it('does not resurrect missing, expired, pending, forgotten or cross-space event-linked rows',async()=>{
 const rows=[row({status:'pending_review'}),row({expiresAt:new Date(0)}),row({status:'superseded'}),row({ownerId:'other'}),row({spaceKey:'private'})];
 m.events.mockReturnValue(cursor(rows.map(r=>({ownerId:'alice',spaceKey:'s',memoryId:r._id,kind:'confirmed',at:new Date('2026-10-30T15:00Z')}))));m.find.mockImplementation(f=>cursor(f._id?rows:[]));
 const result=await recall({ownerId:'alice',spaceKey:'s',query:'what did I do last night?',persistTrace:false});
 expect(result.picks).toEqual([]);vi.useRealTimers();
});

it('keeps retained asOf semantics for event-linked historical versions',async()=>{
 const old=row({status:'superseded',validTo:new Date('2026-11-01Z')}),future=row({createdAt:new Date('2026-11-02Z'),validFrom:new Date('2026-11-02Z')});
 m.events.mockReturnValue(cursor([old,future].map(r=>({ownerId:'alice',spaceKey:'s',memoryId:r._id,kind:'confirmed',at:new Date('2026-10-30T15:00Z')}))));
 m.find.mockImplementation(f=>cursor(f._id?[old,future]:[]));
 const result=await recall({ownerId:'alice',spaceKey:'s',query:'what did I do last night?',asOf:'2026-10-31T08:30:00Z',persistTrace:false});
 expect(result.picks.map(p=>p.memoryId)).toEqual([old._id.toHexString()]);
 expect(m.find.mock.calls.find(([f])=>f._id)?.[0]).toMatchObject({ownerId:'alice',status:{$in:['active','superseded']},validFrom:{$lte:new Date('2026-10-31T08:30Z')}});
});
it('returns no unrelated semantic picks when the requested window has no memories',async()=>{
 m.aggregate.mockReturnValue(cursor([row({importance:10,confidence:1})]));
 const result=await recall({ownerId:'alice',spaceKey:'s',query:'what did I do last night?',persistTrace:false});
 expect(result.picks).toEqual([]);
});

it('keeps the fact a correction targets when the message only mentions a clock time',async()=>{
 const launch=row({type:'constraint',statement:"Kestrel's public beta ships on 7 Nov 2026 at 9:00 PM IST.",importance:10,confidence:.95,updatedAt:new Date('2026-10-30Z')});
 m.aggregate.mockReturnValue(cursor([launch]));
 const result=await recall({ownerId:'alice',spaceKey:'s',query:'Actually, the beta launch moved to 10 PM.',persistTrace:false});
 expect(result.picks.map(p=>p.memoryId)).toContain(launch._id.toHexString());
});

it('does not use events after the asOf instant even inside the requested night',async()=>{
 const target=row();
 m.events.mockReturnValue(cursor([{ownerId:'alice',spaceKey:'s',memoryId:target._id,kind:'confirmed',at:new Date('2026-10-30T23:30Z')}]));
 m.find.mockImplementation(f=>cursor(f._id?[target]:[]));
 const result=await recall({ownerId:'alice',spaceKey:'s',query:'what did I do last night?',asOf:'2026-10-30T21:30:00Z',persistTrace:false});
 expect(result.picks).toEqual([]);
});
it('preserves healthy event-linked hits when the independent direct-window read fails',async()=>{
 const target=row();
 const failed={sort:()=>failed,limit:()=>failed,toArray:async()=>{throw new Error('direct read failed');}};
 m.find.mockImplementation(f=>f._id?cursor([target]):f.$and?.some((part:{ $or?: Array<{createdAt?:unknown}> })=>part.$or?.some(item=>item.createdAt))?failed:cursor([]));
 m.events.mockReturnValue(cursor([{ownerId:'alice',spaceKey:'s',memoryId:target._id,kind:'confirmed',at:new Date('2026-10-30T15:00Z')}]));
 const result=await recall({ownerId:'alice',spaceKey:'s',query:'what did I do last night?',persistTrace:false});
 expect(result.picks.map(p=>p.memoryId)).toEqual([target._id.toHexString()]);
});
it('preserves healthy direct-window hits when resolving event-linked IDs fails',async()=>{
 const target=row({createdAt:new Date('2026-10-30T15:00Z')});
 const failed={limit:()=>failed,toArray:async()=>{throw new Error('linked lookup failed');}};
 m.find.mockImplementation(f=>f._id?failed:f.$and?.some((part:{ $or?: Array<{createdAt?:unknown}> })=>part.$or?.some(item=>item.createdAt))?cursor([target]):cursor([]));
 m.events.mockReturnValue(cursor([{ownerId:'alice',spaceKey:'s',memoryId:new ObjectId(),kind:'confirmed',at:new Date('2026-10-30T15:00Z')}]));
 const result=await recall({ownerId:'alice',spaceKey:'s',query:'what did I do last night?',persistTrace:false});
 expect(result.picks.map(p=>p.memoryId)).toEqual([target._id.toHexString()]);
});
