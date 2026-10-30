/**
 * Demo world — synthetic persona "Aarav" (TRD §15, PRD F-03). Labelled DEMO everywhere.
 * Shared by the mock engine and by Codex's seedDemo (C6), which adds embeddings.
 *
 * Deliberate states: one superseded chain (frontend Vite → Next.js), one pending sensitive
 * item, one expiring 10 minutes after seed, one already expired, three feedback units about
 * long answers (so one Reflect yields the bullet strategy), one active strategy, two
 * observations with evidence, decisions linked to outcomes. The 9 PM deadline is NOT
 * superseded here: that correction is performed live in the demo.
 */
import type { MemoryStatus, MemoryType, Sensitivity } from "../types";

export type DemoSpace = "personal" | "hackathon" | "internships";

export const DEMO_SPACES: Array<{ key: DemoSpace; name: string; color: string; isDefault: boolean }> = [
  { key: "hackathon", name: "UNCHARTED Hackathon", color: "--t-constraint", isDefault: true },
  { key: "personal", name: "Personal", color: "--t-preference", isDefault: false },
  { key: "internships", name: "Internships", color: "--t-fact", isDefault: false },
];

export interface DemoMemory {
  key: string;
  space: DemoSpace | "global";
  type: MemoryType;
  statement: string;
  subject?: string;
  attribute?: string;
  value?: string;
  entities: string[];
  tags?: string[];
  importance: number;
  confidence: number;
  sensitivity?: Sensitivity;
  status?: MemoryStatus;
  pinned?: boolean;
  /** Created this many hours before seed time. */
  ageHours: number;
  confirmCount?: number;
  recallCount?: number;
  expiresInMinutes?: number;
  supersededByKey?: string;
  evidenceKeys?: string[];
  relatedKeys?: string[];
  /** Index into DEMO_CONVERSATIONS + message index, for provenance. */
  from?: { conversation: number; message: number; quote: string };
}

export const DEMO_MEMORIES: DemoMemory[] = [
  // ── profile ──
  { key: "p1", space: "global", type: "profile", statement: "Aarav Mehta is a 3rd-year CSE student at SVNIT Surat.", subject: "aarav", attribute: "education", value: "3rd-year CSE, SVNIT Surat", entities: ["aarav", "svnit"], importance: 9, confidence: 0.95, pinned: true, ageHours: 140, confirmCount: 2 },
  { key: "p2", space: "global", type: "profile", statement: "Aarav lives in IST (Asia/Kolkata) and usually works late at night.", subject: "aarav", attribute: "timezone", value: "Asia/Kolkata", entities: ["aarav"], importance: 7, confidence: 0.9, pinned: true, ageHours: 140 },
  { key: "p3", space: "hackathon", type: "profile", statement: "Aarav is building Radahn for UNCHARTED 2026 with two teammates.", entities: ["aarav", "radahn", "uncharted"], importance: 8, confidence: 0.95, ageHours: 30, from: { conversation: 0, message: 0, quote: "we're building Radahn for UNCHARTED, three of us" } },

  // ── preference ──
  { key: "pr1", space: "global", type: "preference", statement: "Aarav prefers bullet lists over long paragraphs.", subject: "aarav", attribute: "answer_format", value: "bullets", entities: ["aarav"], importance: 8, confidence: 0.92, pinned: true, ageHours: 96, confirmCount: 3, recallCount: 11 },
  { key: "pr2", space: "global", type: "preference", statement: "Aarav likes plans broken into time boxes of 30 to 60 minutes.", entities: ["aarav"], importance: 7, confidence: 0.85, ageHours: 72, recallCount: 6 },
  { key: "pr3", space: "global", type: "preference", statement: "Aarav prefers TypeScript over Python for web projects.", subject: "aarav", attribute: "web_language", value: "typescript", entities: ["aarav", "typescript", "python"], importance: 6, confidence: 0.8, ageHours: 120 },
  { key: "pr4", space: "personal", type: "preference", statement: "Aarav drinks chai, not coffee, during late-night work.", entities: ["aarav", "chai"], importance: 3, confidence: 0.7, sensitivity: "personal", ageHours: 60 },
  { key: "pr5", space: "global", type: "preference", statement: "Aarav wants direct answers without motivational filler.", entities: ["aarav"], importance: 6, confidence: 0.8, ageHours: 40, recallCount: 4 },

  // ── fact ──
  { key: "f1", space: "hackathon", type: "fact", statement: "Radahn stores memory in MongoDB Atlas M0 in AWS Mumbai (ap-south-1).", entities: ["radahn", "mongodb atlas", "m0", "mumbai"], tags: ["stack"], importance: 6, confidence: 0.9, ageHours: 20, from: { conversation: 0, message: 2, quote: "Atlas M0 in Mumbai, free tier" } },
  { key: "f2", space: "hackathon", type: "fact", statement: "Radahn's chat model is Gemini 3.8 Flash on the free tier.", entities: ["radahn", "gemini"], tags: ["stack"], importance: 5, confidence: 0.9, ageHours: 20 },
  { key: "f3", space: "hackathon", type: "fact", statement: "The team uses Claude Code and Codex as coding agents alongside three humans.", entities: ["claude code", "codex"], importance: 5, confidence: 0.85, ageHours: 18 },
  { key: "f4", space: "internships", type: "fact", statement: "Aarav's resume is one page and was last updated on 20 Oct 2026.", entities: ["aarav", "resume"], importance: 4, confidence: 0.8, ageHours: 260 },
  { key: "f5", space: "personal", type: "fact", statement: "Aarav's DBMS end-semester exam is on 12 Nov 2026.", subject: "aarav", attribute: "dbms_exam_date", value: "2026-11-12", entities: ["aarav", "dbms"], importance: 7, confidence: 0.9, ageHours: 200 },

  // ── goal ──
  { key: "g1", space: "hackathon", type: "goal", statement: "Aarav wants a top-16 finish at UNCHARTED 2026.", entities: ["aarav", "uncharted"], importance: 8, confidence: 0.9, ageHours: 30, recallCount: 5 },
  { key: "g2", space: "internships", type: "goal", statement: "Aarav wants a summer 2027 backend internship, ideally in Bengaluru.", entities: ["aarav", "bengaluru"], importance: 7, confidence: 0.85, ageHours: 300 },
  { key: "g3", space: "personal", type: "goal", statement: "Aarav wants at least 6 hours of sleep before the finals presentation.", entities: ["aarav", "finals"], importance: 5, confidence: 0.75, ageHours: 12 },

  // ── constraint ──
  { key: "c1", space: "hackathon", type: "constraint", statement: "The UNCHARTED build window closes on 31 Oct 2026 at 9:00 PM IST.", subject: "uncharted", attribute: "build_deadline", value: "2026-10-31T21:00+05:30", entities: ["uncharted"], importance: 10, confidence: 0.95, ageHours: 26, confirmCount: 2, recallCount: 9, from: { conversation: 0, message: 0, quote: "build window closes 9 PM on the 31st" } },
  { key: "c2", space: "hackathon", type: "constraint", statement: "The UNCHARTED submission form closes on 31 Oct 2026 at 10:00 PM IST.", subject: "uncharted", attribute: "submission_deadline", value: "2026-10-31T22:00+05:30", entities: ["uncharted"], importance: 9, confidence: 0.9, ageHours: 26 },
  { key: "c3", space: "hackathon", type: "constraint", statement: "Radahn must run on free tiers only: Atlas M0, Gemini free tier, Vercel Hobby.", entities: ["radahn", "mongodb atlas", "gemini", "vercel"], importance: 8, confidence: 0.9, ageHours: 22 },
  { key: "c4", space: "hackathon", type: "constraint", statement: "The UNCHARTED demo video must be 7 minutes or shorter.", subject: "uncharted", attribute: "video_length", value: "7 min", entities: ["uncharted", "demo video"], importance: 7, confidence: 0.9, ageHours: 26 },
  { key: "c5", space: "internships", type: "constraint", statement: "Applications for the Razorpay backend internship close on 15 Nov 2026.", subject: "razorpay", attribute: "application_deadline", value: "2026-11-15", entities: ["razorpay"], importance: 8, confidence: 0.85, ageHours: 100 },

  // ── decision ──
  { key: "d0", space: "hackathon", type: "decision", statement: "The team chose Vite with React for Radahn's frontend.", subject: "radahn", attribute: "frontend_framework", value: "vite", entities: ["radahn", "vite", "react"], importance: 6, confidence: 0.8, status: "superseded", supersededByKey: "d2", ageHours: 28 },
  { key: "d2", space: "hackathon", type: "decision", statement: "The team chose Next.js over Vite for Radahn's frontend, to deploy on Vercel in one step.", subject: "radahn", attribute: "frontend_framework", value: "next.js", entities: ["radahn", "next.js", "vercel"], importance: 6, confidence: 0.9, ageHours: 24, recallCount: 3 },
  { key: "d1", space: "hackathon", type: "decision", statement: "The team chose Better Auth over Auth.js because it supports guest accounts.", entities: ["better auth", "auth.js", "radahn"], importance: 6, confidence: 0.9, ageHours: 22, relatedKeys: ["o1"] },
  { key: "d3", space: "hackathon", type: "decision", statement: "The team picked Track 1 (Agentic Memory) over Track 2 (RAG Engine).", entities: ["uncharted", "track 1"], importance: 7, confidence: 0.95, ageHours: 34 },
  { key: "d4", space: "internships", type: "decision", statement: "Aarav decided to apply to 5 companies carefully rather than 20 quickly.", entities: ["aarav"], importance: 6, confidence: 0.85, ageHours: 150, relatedKeys: ["o3"] },

  // ── outcome ──
  { key: "o1", space: "hackathon", type: "outcome", statement: "Better Auth's anonymous plugin worked on the first try in local testing.", entities: ["better auth"], importance: 5, confidence: 0.85, ageHours: 16, relatedKeys: ["d1"] },
  { key: "o2", space: "hackathon", type: "outcome", statement: "MongoDB change streams worked on Atlas M0 in a local test.", entities: ["mongodb atlas", "change streams", "m0"], importance: 5, confidence: 0.8, ageHours: 14 },
  { key: "o3", space: "internships", type: "outcome", statement: "Aarav's Zerodha application was rejected after the online assessment.", entities: ["zerodha", "aarav"], importance: 6, confidence: 0.9, ageHours: 90, relatedKeys: ["d4"] },

  // ── feedback (three about length → reflection produces the bullet strategy) ──
  { key: "fb1", space: "global", type: "feedback", statement: "Aarav said Radahn's study plan was too long to use.", entities: ["aarav"], importance: 6, confidence: 0.9, ageHours: 50 },
  { key: "fb2", space: "global", type: "feedback", statement: "Aarav asked for just the bullets after a long answer.", entities: ["aarav"], importance: 6, confidence: 0.9, ageHours: 30 },
  { key: "fb3", space: "global", type: "feedback", statement: "Aarav said a 12-step plan was overwhelming at 2 AM.", entities: ["aarav"], importance: 6, confidence: 0.9, ageHours: 8 },

  // ── strategy ──
  { key: "s1", space: "global", type: "strategy", statement: "When Aarav asks for a plan, give at most 5 bullets, each with a time box.", entities: ["aarav"], importance: 8, confidence: 0.8, ageHours: 7, evidenceKeys: ["fb1", "fb2"], recallCount: 4 },

  // ── observation ──
  { key: "ob1", space: "global", type: "observation", statement: "Aarav works late at night and plans in short sprints.", entities: ["aarav"], importance: 6, confidence: 0.7, ageHours: 6, evidenceKeys: ["pr2", "fb3", "p2"] },
  { key: "ob2", space: "hackathon", type: "observation", statement: "Aarav worries more about the live deployment than about adding features.", entities: ["aarav", "radahn"], importance: 5, confidence: 0.6, ageHours: 6, evidenceKeys: ["c3", "o2"] },

  // ── pending (sensitive, held for review) ──
  { key: "pd1", space: "global", type: "profile", statement: "Aarav has mild ADHD and finds short task lists easier to follow.", entities: ["aarav"], importance: 7, confidence: 0.75, sensitivity: "sensitive", status: "pending_review", ageHours: 3, from: { conversation: 2, message: 0, quote: "honestly I have mild ADHD, long lists kill me" } },

  // ── expiring + expired ──
  { key: "e1", space: "hackathon", type: "fact", statement: "Aarav is pairing with Codex on the memory engine for the next few minutes.", entities: ["aarav", "codex"], importance: 4, confidence: 0.8, ageHours: 0.2, expiresInMinutes: 10 },
  { key: "e0", space: "hackathon", type: "fact", statement: "Aarav was waiting for the Atlas cluster to finish provisioning.", entities: ["aarav", "mongodb atlas"], importance: 3, confidence: 0.8, status: "expired", ageHours: 2, expiresInMinutes: -60 },
];

export interface DemoConversation {
  space: DemoSpace;
  title: string;
  ageHours: number;
  messages: Array<{ role: "user" | "assistant"; text: string }>;
}

export const DEMO_CONVERSATIONS: DemoConversation[] = [
  {
    space: "hackathon",
    title: "Kickoff: what we're building",
    ageHours: 30,
    messages: [
      { role: "user", text: "Hey, we're building Radahn for UNCHARTED, three of us. Build window closes 9 PM on the 31st, Track 1, agentic memory." },
      { role: "assistant", text: "Got it. Radahn for UNCHARTED 2026, Track 1, three of you, build window closes 31 Oct at 9:00 PM IST. What's the stack?" },
      { role: "user", text: "Next.js on Vercel, Atlas M0 in Mumbai, free tier everything. Gemini 3.8 Flash for chat." },
      { role: "assistant", text: "Noted: Next.js + Vercel, Atlas M0 (Mumbai), Gemini 3.8 Flash, all free tier. I'll keep plans inside those limits." },
    ],
  },
  {
    space: "internships",
    title: "Internship shortlist",
    ageHours: 150,
    messages: [
      { role: "user", text: "I'm going to apply to 5 companies properly instead of spraying 20. Razorpay closes on Nov 15." },
      { role: "assistant", text: "Five careful applications. Razorpay's backend internship closes 15 Nov 2026. Want a checklist per company?" },
    ],
  },
  {
    space: "personal",
    title: "Study plan, take two",
    ageHours: 3,
    messages: [
      { role: "user", text: "honestly I have mild ADHD, long lists kill me. Can you redo the DBMS plan, shorter?" },
      { role: "assistant", text: "Shorter it is:\n- Normalisation, 45 min\n- Transactions + ACID, 45 min\n- Indexing, 30 min\n- One past paper, 60 min" },
    ],
  },
];

/** The three suggestions shown after the demo loads (judge path, PRD §7.1). */
export const DEMO_SUGGESTIONS = [
  "Plan my next 4 hours.",
  "What did we decide about auth, and how did it go?",
  "Actually, the build deadline moved to 10 PM.",
];
