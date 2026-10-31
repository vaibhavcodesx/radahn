import {it,expect} from 'vitest';
import {runDeterministic, jaccard, percentile} from './measure';
it('measures all golden expectations and reports hosted metrics unavailable',()=>{const r=runDeterministic();expect(r.samples).toBeGreaterThanOrEqual(25);expect(r.passed).toBe(r.samples);expect(r.mode).toBe('deterministic');expect(r.markdown).toContain('pending');});
it('measures token Jaccard and observed percentile',()=>{expect(jaccard('a b','b c')).toBeCloseTo(1/3);expect(percentile([1,2,3,4],.95)).toBe(4);expect(percentile([], .5)).toBeNull();});
