import {afterEach,beforeEach,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
const m=vi.hoisted(()=>({extract:vi.fn(),find:vi.fn()}));
vi.mock('./extract',()=>({extractAndWrite:m.extract}));
vi.mock('@/server/db/collections',()=>({collections:()=>({events:{findOne:m.find}})}));
import {measureExtractionLatency} from './extraction-probe';
const summary={added:1,confirmed:0,superseded:0,pending:0,blocked:0,ops:[{op:'add'}],notices:[]};
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-31T10:00Z'));vi.spyOn(performance,'now').mockImplementation(()=>Date.now());vi.clearAllMocks();m.find.mockResolvedValue(null);});
afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();});
it('refuses non-eval owners before invoking extraction or database access',async()=>{
 await expect(measureExtractionLatency('alice','s',1)).rejects.toThrow(/disposable/);expect(m.extract).not.toHaveBeenCalled();expect(m.find).not.toHaveBeenCalled();
});
it('measures first committed-event visibility separately from extraction completion',async()=>{
 const started=Date.now();m.extract.mockImplementation(()=>new Promise(resolve=>setTimeout(()=>resolve(summary),1500)));m.find.mockImplementation(async()=>Date.now()-started>=1000?{_id:'event'}:null);
 const pending=measureExtractionLatency('eval:synthetic-probe','s',1);await vi.advanceTimersByTimeAsync(2000);const result=await pending;
 expect(result.samples[0].firstEventObservedMs).toBeGreaterThanOrEqual(1000);expect(result.samples[0].firstEventObservedMs).toBeLessThan(1500);expect(result.samples[0].completionMs).toBe(1500);
 expect(m.find.mock.calls.every(([filter])=>filter.ownerId==='eval:synthetic-probe'&&typeof filter.messageId==='string')).toBe(true);
});
it('reports an empty extraction without creating a fictional event',async()=>{
 m.extract.mockResolvedValue({...summary,added:0,ops:[]});const result=await measureExtractionLatency('eval:synthetic-probe','s',1);expect(result.samples[0].firstEventObservedMs).toBeNull();expect(result.samples[0].wrote).toBe(false);expect(result.errorCount).toBe(0);
});
it('suppresses provider details when an extraction sample fails',async()=>{
 m.extract.mockRejectedValue(new Error('private provider content'));const result=await measureExtractionLatency('eval:synthetic-probe','s',1);expect(result.errorCount).toBe(1);expect(JSON.stringify(result)).not.toContain('private provider content');
});
it('checks launch headroom before each sample and preserves completed timings when it runs out',async()=>{
 m.extract.mockResolvedValue(summary);m.find.mockResolvedValue({_id:'event'});
 let launches=0;const result=await measureExtractionLatency('eval:synthetic-probe','s',3,()=>++launches===1);
 expect(result.samples).toHaveLength(1);expect(m.extract).toHaveBeenCalledTimes(1);expect(launches).toBe(2);
});
