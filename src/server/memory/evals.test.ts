import {it,expect,vi} from 'vitest';
vi.mock('server-only',()=>({}));
const state=vi.hoisted(()=>({owners:[] as string[],deletes:[] as string[],fail:false,settings:0,profiles:0,slow:false,clock:0}));
vi.mock('@/server/db/client',()=>({db:()=>({databaseName:'radahn',collection:()=>({deleteOne:async()=>{state.profiles++;return {};}})})}));
vi.mock('@/server/db/collections',()=>({collections:()=>{const collection={deleteMany:async(f:{ownerId:string})=>{state.deletes.push(f.ownerId);if(state.fail)throw new Error('cleanup');}};return {memories:collection,events:collection,recalls:collection,reflections:collection,messages:collection,conversations:collection,spaces:collection,settings:{deleteOne:async()=>{state.settings++;return {};}}};}}));
vi.mock('./write',()=>({writeCandidates:async(_c:unknown,ctx:{ownerId:string})=>{state.owners.push(ctx.ownerId);if(state.slow){state.clock=80000;return {added:1,confirmed:0,superseded:0};}throw new Error('provider private content');}}));
vi.mock('./recall',()=>({recall:vi.fn()}));
vi.mock('@/server/llm/registry',()=>({candidates:vi.fn(),report:vi.fn(),thinkingOptions:vi.fn()}));
import {runEvals} from './evals';
it('cleans its exact disposable owner on failure and exposes no provider content',async()=>{
 const result=await runEvals();expect(state.owners[0]).toMatch(/^eval:/);expect(state.deletes).toHaveLength(7);expect(state.deletes.every(o=>o===state.owners[0])).toBe(true);expect(result.metrics.errorCount).toBe(1);expect(JSON.stringify(result)).not.toContain('private content');expect(result.metrics.recallSamples).toBe(0);
});
it('attempts settings and profile cleanup even when content deletion fails',async()=>{state.fail=true;const settings=state.settings,profiles=state.profiles;const result=await runEvals();expect(state.settings).toBe(settings+1);expect(state.profiles).toBe(profiles+1);expect(result.cleanupSucceeded).toBe(false);state.fail=false;});
it('stops later phases after a slow write consumes launch headroom and still cleans its owner',async()=>{state.slow=true;state.clock=0;const clock=vi.spyOn(performance,'now').mockImplementation(()=>state.clock);const before=state.owners.length;try{const result=await runEvals();expect(state.owners.length-before).toBe(1);expect(result.budgetExceeded).toBe(true);expect(result.markdown).toContain('budgetExceeded=true');expect(result.cleanupSucceeded).toBe(true);expect(result.metrics.recallSamples).toBe(0);}finally{clock.mockRestore();state.slow=false;}});
