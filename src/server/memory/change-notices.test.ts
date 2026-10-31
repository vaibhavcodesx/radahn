import {describe,expect,it} from 'vitest';
import {ObjectId} from 'mongodb';
import {shouldAnnounceChange} from './change-notices';
import type {MemoryUnit} from './types';
import type {Ranked} from './score';
const at=new Date('2026-10-31T08:00:00Z');
const old={_id:new ObjectId(),ownerId:'alice',spaceKey:'s',status:'superseded',slotKey:'alice.deadline',value:'9 PM',statement:'Alice deadline is 9 PM.',updatedAt:at} as MemoryUnit;
const current={_id:new ObjectId(),ownerId:'alice',spaceKey:'s',status:'active',type:'fact',slotKey:'alice.deadline',value:'10 PM',statement:'Alice deadline is 10 PM.',stats:{recallCount:0,confirmCount:0,citedCount:0}} as MemoryUnit;
const row=(patch:Partial<Ranked['scores']>={}):Ranked=>({unit:current,hits:{ranks:{semantic:1}},selected:true,scores:{final:.8,rrf:.85,vector:.9,recency:1,importance:1,confidence:.9,typeBoost:0,...patch}});
describe('changed notices',()=>{
 it('announces a strong relevant unseen slot value change',()=>{expect(shouldAnnounceChange(old,row())).toBe(true);});
 it('rejects recency-driven picks despite crossing the final threshold',()=>{expect(shouldAnnounceChange(old,row({final:.51,rrf:.15,vector:.3}))).toBe(false);});
 it('rejects weak final scores',()=>{expect(shouldAnnounceChange(old,row({final:.49}))).toBe(false);});
 it('does not repeat a change after the replacement has been recalled',()=>{expect(shouldAnnounceChange(old,{...row(),unit:{...current,stats:{...current.stats,lastRecalledAt:at}}})).toBe(false);});
 it('does not label a role refinement as a value change',()=>{expect(shouldAnnounceChange({...old,value:'student',statement:'The user is a student at NIT Surat.'},{...row(),unit:{...current,value:'student, B.Tech 2nd year',statement:'Aarav is a B.Tech 2nd year student at NIT Surat.'}})).toBe(false);});
 it('requires an explicit shared slot and different values',()=>{expect(shouldAnnounceChange({...old,slotKey:undefined},row())).toBe(false);expect(shouldAnnounceChange({...old,value:'10 PM'},row())).toBe(false);});
});

it('announces negated and former values rather than mistaking them for refinements',()=>{
 for(const value of ['not employed','formerly employed','no longer employed'])expect(shouldAnnounceChange({...old,value:'employed'},{...row(),unit:{...current,value}})).toBe(true);
});
it('announces changed numeric constraints even when the old tokens are retained',()=>{
 expect(shouldAnnounceChange({...old,type:'constraint',value:'9 PM'},{...row(),unit:{...current,type:'constraint',value:'9 PM tomorrow'}})).toBe(true);
});


it('suppresses lexical strength with weak query cosine after semantic blending',()=>{
 const r=row({rrf:1,final:.61});r.hits={ranks:{lexical:1},semanticSimilarity:.1};
 expect(shouldAnnounceChange(old,r)).toBe(false);
});
it('announces a locally strong cosine-only change without an Atlas score',()=>{
 const r=row({rrf:.3,final:.9,vector:undefined});r.hits={ranks:{semantic:1},semanticSimilarity:.95};
 expect(shouldAnnounceChange(old,r)).toBe(true);
});
