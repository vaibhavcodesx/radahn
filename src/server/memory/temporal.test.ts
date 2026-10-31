import {it,expect,vi} from 'vitest';
vi.mock('server-only',()=>({}));
vi.mock('@/server/db/collections',()=>({collections:vi.fn()}));
vi.mock('@/server/llm/registry',()=>({embed:vi.fn()}));
import {temporalWindow} from './recall';
it('uses the previous local evening for last night rather than chrono previous-previous day',()=>{
 const now=new Date('2026-10-31T08:30:00Z');
 expect(temporalWindow('what did I do last night?',now,'Asia/Kolkata')).toEqual({start:new Date('2026-10-30T12:30:00Z'),end:new Date('2026-10-31T00:30:00Z')});
 expect(temporalWindow('what did I do yesterday?',now,'Asia/Kolkata')).toEqual({start:new Date('2026-10-29T18:30:00Z'),end:new Date('2026-10-30T18:30:00Z')});
});

it('resolves yesterday by local calendar across DST rather than a fixed 24 hours',()=>{
 const window=temporalWindow('yesterday',new Date('2026-11-02T17:00Z'),'America/New_York');
 expect(window).toEqual({start:new Date('2026-11-01T04:00Z'),end:new Date('2026-11-02T05:00Z')});
});
