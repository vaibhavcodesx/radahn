import { describe,it,expect,vi } from 'vitest';
vi.mock('server-only',()=>({}));
const mocks=vi.hoisted(()=>({collections:vi.fn()}));
vi.mock('@/server/db/collections',()=>mocks);
import { insights, graph } from './insights';
describe('analytics',()=>{
 it('uses windowed owner scoped counts, correction reasons and actual BSON bytes',async()=>{
 const pipes:unknown[][]=[];
 const agg=(rows:unknown[])=>vi.fn((p:unknown[])=>{pipes.push(p);return {toArray:async()=>rows};});
 mocks.collections.mockReturnValue({memories:{aggregate:agg([{byType:[{type:'fact',count:2}],byStatus:[],storage:[{count:120}],corrections:[{count:1}]}])},recalls:{aggregate:agg([{count:2}])},messages:{aggregate:agg([{count:9}])},events:{aggregate:agg([{day:'2026-10-31',count:3}])}});
 const result=await insights('owner','space',new Date('2026-10-31'));
 expect(result).toMatchObject({storageBytes:120,correctionsThisWeek:1,recallHitRate:1});
 expect(pipes.every(p=>JSON.stringify(p[0]).includes('owner'))).toBe(true);
 expect(JSON.stringify(pipes)).toContain('correction');
 expect(JSON.stringify(pipes)).toContain('$bsonSize');
 });
 it('bounds graph, removes embeddings, deduplicates one-way related links and excludes foreign targets',async()=>{
 const id=(s:string)=>({toHexString:()=>s,toString:()=>s});
 const unit=(s:string)=>({_id:id(s),type:'fact',status:'active',statement:s,importance:5,spaceKey:'a',updatedAt:new Date(),stats:{recallCount:0},evidenceIds:[],relatedIds:[]});
 const find=vi.fn((...args:unknown[])=>{void args;return ({sort:()=>({limit:()=>({toArray:async()=>[{...unit('b'),relatedIds:[id('a'),id('foreign')]},unit('a')]})})});});
 mocks.collections.mockReturnValue({memories:{find}});
 const result=await graph('owner','a');
 expect(result.links).toEqual([{source:'a',target:'b',kind:'related'}]);
 expect(result.nodes[0]).not.toHaveProperty('embedding');
 expect(find.mock.calls[0][0]).toMatchObject({ownerId:'owner',spaceKey:'a'});
 });
});
