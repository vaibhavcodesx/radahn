/** Privacy gate: memory-engine.md §4.1 and §4.3. Pure; returns kinds, never secret values. */
import type { CandidateMemory, PreScanResult, SecretKind, WritePolicy } from "./types";
const INVISIBLE = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/g;
const PATTERNS: Array<[SecretKind, RegExp]> = [
 ["private_key", /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g],
 ["mongodb_uri", /mongodb(?:\+srv)?:\/\/[^:\s/]+:[^@\s]+@[^\s]+/gi],
 ["google_api_key", /AIza[0-9A-Za-z_-]{35,}/g],
 ["openai_key", /\bsk-[A-Za-z0-9_-]{20,}/g],
 ["github_token", /\bgh[pousr]_[A-Za-z0-9]{36,}/g],
 ["aws_key", /\bAKIA[0-9A-Z]{16}\b/g],
 ["jwt", /\beyJ[\w-]+\.[\w-]+\.[\w-]+/g],
 ["password", /\b(?:password|passwd|pwd)\s*(?:is\b|=|:)\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi],
 ["otp", /\b(?:otp|one[- ]time (?:code|password))\s*(?:is\b|=|:)?\s*\d{4,8}\b/gi],
 ["pan", /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g],
];
function entropy(token: string): number {
 const counts = new Map<string,number>();
 for (const c of token) counts.set(c,(counts.get(c) ?? 0)+1);
 return [...counts.values()].reduce((sum,n) => {const p=n/token.length; return sum-p*Math.log2(p);},0);
}
function luhn(digits: string): boolean {
 let sum=0;
 for (let i=digits.length-1,alternate=false;i>=0;i--,alternate=!alternate) {
  let n=Number(digits[i]); if(alternate) {n*=2;if(n>9)n-=9;} sum+=n;
 }
 return sum%10===0 && !/^0+$/.test(digits);
}
function injection(text: string): boolean {
 if (new RegExp(INVISIBLE.source).test(text)) return true;
 if (/ignore\s+(?:all|previous|prior)\s+instructions|you are now|system prompt|\bdisregard\b|\bact as\b|<\/?(?:system|developer|assistant)\b|###\s*instruction/i.test(text)) return true;
 for(const match of text.matchAll(/https?:\/\/[^\s<>]+/gi)) {
  try {
   const url=new URL(match[0]);
   for(const key of url.searchParams.keys()) if(/^(?:api[_-]?key|token|secret|password|credential|data|payload|prompt|memory|exfil)$/i.test(key)) return true;
  } catch { /* Not a URL; other deterministic scans still apply. */ }
 }
 return false;
}
export function preScan(text: string): PreScanResult {
 const clean=text.replace(INVISIBLE,"");
 const spans: Array<{start:number;end:number;kind:SecretKind}>=[];
 const add=(start:number,value:string,kind:SecretKind) => {
  let end=start+value.length;
  for(let i=spans.length-1;i>=0;i--) {
   const span=spans[i];
   if(start<span.end && end>span.start) {
    start=Math.min(start,span.start);end=Math.max(end,span.end);kind=span.kind;spans.splice(i,1);
   }
  }
  spans.push({start,end,kind});
 };
 for(const [kind,re] of PATTERNS) for(const match of clean.matchAll(new RegExp(re.source,re.flags))) add(match.index!,match[0],kind);
 // Match the entire digit run so a card cannot leave a suffix after Aadhaar redaction.
 for(const match of clean.matchAll(/\b\d(?:[ -]?\d){10,}\b/g)) {
  const groups=match[0].split(/[ -]/);
  let found: SecretKind | undefined;
  for(let i=0;i<groups.length;i++) {
   let digits="";
   for(let j=i;j<groups.length;j++) {
    digits+=groups[j]; if(digits.length>19) break;
    if(digits.length>=13 && luhn(digits)) {found="card_number";break;}
    if(digits.length===12) found ??= "aadhaar";
   }
   if(found==="card_number") break;
  }
  if(found) add(match.index!,match[0],found);
 }
 for(const match of clean.matchAll(/\S{24,}/g)) {
  // Four bits/char catches token-like randomness; known redaction markers are stable output.
  if(!/^\[redacted:[a-z_]+\]$/.test(match[0]) && [match[0],...match[0].split(/[:/=\[\]]/)].some(part=>part.length>=24 && entropy(part)>=4)) add(match.index!,match[0],"high_entropy");
 }
 let redacted=clean;
 for(const span of [...spans].sort((a,b)=>b.start-a.start)) redacted=redacted.slice(0,span.start)+`[redacted:${span.kind}]`+redacted.slice(span.end);
 return {redacted,kinds:[...new Set(spans.map(s=>s.kind))],injection:injection(text)};
}
export interface GateResult {op:"add"|"pending"|"blocked"|"skip";reason?:string;candidate?:CandidateMemory}
export function gateCandidate(candidate: CandidateMemory, policy: WritePolicy): GateResult {
 const scan=preScan(candidate.statement);
 if(scan.injection) return {op:"blocked",reason:"injection"};
 if(scan.kinds.length) return {op:"blocked",reason:`secret:${scan.kinds[0]}`};
 const statement=scan.redacted.trim().slice(0,240);
 if(statement.length<3 || /^(.+?)\s+(?:is|are|equals)\s+\1[.!]?$/i.test(statement)) return {op:"skip",reason:"empty_or_tautology"};
 const safe={...candidate,statement};
 if(policy==="review_all") return {op:"pending",reason:"review_all",candidate:safe};
 if(policy==="review_sensitive" && candidate.sensitivity==="sensitive" && !candidate.explicit) return {op:"pending",reason:"sensitive",candidate:safe};
 // 0.55 is the spec's uncertainty threshold; weak automatic extractions need consent.
 if(policy==="auto" && candidate.confidence<0.55) return {op:"pending",reason:"low_confidence",candidate:safe};
 return {op:"add",candidate:safe};
}
