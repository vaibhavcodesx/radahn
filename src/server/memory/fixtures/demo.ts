/**
 * Demo world — synthetic persona "Aarav" (TRD §15, PRD F-03). Labelled DEMO everywhere.
 * Shared by the mock engine and by Codex's seedDemo (C6), which adds embeddings.
 *
 * Deliberate states: one superseded chain (frontend Vite → Next.js), one pending sensitive
 * item, one expiring 10 minutes after seed, one already expired, three feedback units about
 * long answers (so one Reflect yields the bullet strategy), one active strategy, two
 * observations with evidence, decisions linked to outcomes. The 9 PM beta launch is NOT
 * superseded here: that correction is performed live in the demo. The persona builds Kestrel,
 * a flight-log app for hobby drone pilots (a standalone product story, no event references).
 */
import type { MemoryStatus, MemoryType, Sensitivity } from "../types";

export type DemoSpace = "personal" | "project" | "internships";

export const DEMO_SPACES: Array<{ key: DemoSpace; name: string; color: string; isDefault: boolean }> = [
  { key: "project", name: "Kestrel", color: "--t-constraint", isDefault: true },
  { key: "personal", name: "Personal", color: "--t-preference", isDefault: false },
  { key: "internships", name: "Internships", color: "--t-fact", isDefault: false },
];

export interface DemoMemory {
  key: string;
  space: DemoSpace | "global";
  type: MemoryType;
  statement: string;
  /** Imported conflicting claims retain semantic metadata but await a canonical slot decision. */
  unresolvedConflict?: boolean;
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
  { key: "p1", space: "global", type: "profile", statement: "Aarav Mehta is a final-year CSE student who builds apps on the side.", subject: "aarav", attribute: "education", value: "final-year CSE", entities: ["aarav"], importance: 9, confidence: 0.95, pinned: true, ageHours: 140, confirmCount: 2 },
  { key: "p2", space: "global", type: "profile", statement: "Aarav lives in IST (Asia/Kolkata) and usually works late at night.", subject: "aarav", attribute: "timezone", value: "Asia/Kolkata", entities: ["aarav"], importance: 7, confidence: 0.9, pinned: true, ageHours: 140 },
  { key: "p3", space: "project", type: "profile", statement: "Aarav is building Kestrel, a flight-log app for hobby drone pilots, with two friends.", entities: ["aarav", "kestrel"], importance: 8, confidence: 0.95, ageHours: 30, from: { conversation: 0, message: 0, quote: "we're building Kestrel, a flight-log app for drone pilots, three of us" } },

  // ── preference ──
  { key: "pr1", space: "global", type: "preference", statement: "Aarav prefers bullet lists over long paragraphs.", subject: "aarav", attribute: "answer_format", value: "bullets", entities: ["aarav"], importance: 8, confidence: 0.92, pinned: true, ageHours: 96, confirmCount: 3, recallCount: 11 },
  { key: "pr2", space: "global", type: "preference", statement: "Aarav likes plans broken into time boxes of 30 to 60 minutes.", entities: ["aarav"], importance: 7, confidence: 0.85, ageHours: 72, recallCount: 6 },
  { key: "pr3", space: "global", type: "preference", statement: "Aarav prefers TypeScript over Python for web projects.", subject: "aarav", attribute: "web_language", value: "typescript", entities: ["aarav", "typescript", "python"], importance: 6, confidence: 0.8, ageHours: 120 },
  { key: "pr4", space: "personal", type: "preference", statement: "Aarav drinks chai, not coffee, during late-night work.", entities: ["aarav", "chai"], importance: 3, confidence: 0.7, sensitivity: "personal", ageHours: 60 },
  { key: "pr5", space: "global", type: "preference", statement: "Aarav wants direct answers without motivational filler.", entities: ["aarav"], importance: 6, confidence: 0.8, ageHours: 40, recallCount: 4 },

  // ── fact ──
  { key: "f1", space: "project", type: "fact", statement: "Kestrel stores flight logs in MongoDB Atlas in the Mumbai region.", entities: ["kestrel", "mongodb atlas", "mumbai"], tags: ["stack"], importance: 6, confidence: 0.9, ageHours: 20, from: { conversation: 0, message: 2, quote: "Atlas in Mumbai, free tier for now" } },
  { key: "f2", space: "project", type: "fact", statement: "Kestrel parses DJI and Betaflight flight logs on the server.", entities: ["kestrel", "dji", "betaflight"], tags: ["stack"], importance: 5, confidence: 0.9, ageHours: 20 },
  { key: "f3", space: "project", type: "fact", statement: "Kestrel's beta waitlist has 140 drone pilots on it.", entities: ["kestrel", "waitlist"], importance: 5, confidence: 0.85, ageHours: 18 },
  { key: "f4", space: "internships", type: "fact", statement: "Aarav's resume is one page and was last updated on 20 Oct 2026.", entities: ["aarav", "resume"], importance: 4, confidence: 0.8, ageHours: 260 },
  { key: "f5", space: "personal", type: "fact", statement: "Aarav's DBMS end-semester exam is on 12 Nov 2026.", subject: "aarav", attribute: "dbms_exam_date", value: "2026-11-12", entities: ["aarav", "dbms"], importance: 7, confidence: 0.9, ageHours: 200 },

  // Deliberately unresolved imports: Review resolves the two launch-call claims before canonicalizing.
  { key: "cf1", space: "project", type: "fact", statement: "The Kestrel beta launch call starts at 6:00 PM IST on 7 Nov 2026.", subject: "kestrel_launch", attribute: "call_time", value: "18:00", unresolvedConflict: true, entities: ["kestrel", "launch call"], tags: ["demo-contradiction"], importance: 5, confidence: 0.8, ageHours: 4 },
  { key: "cf2", space: "project", type: "fact", statement: "The Kestrel beta launch call starts at 7:00 PM IST on 7 Nov 2026.", subject: "kestrel_launch", attribute: "call_time", value: "19:00", unresolvedConflict: true, entities: ["kestrel", "launch call"], tags: ["demo-contradiction"], importance: 5, confidence: 0.8, ageHours: 3 },

  // ── goal ──
  { key: "g1", space: "project", type: "goal", statement: "Aarav wants 500 active pilots on Kestrel by January 2027.", entities: ["aarav", "kestrel"], importance: 8, confidence: 0.9, ageHours: 30, recallCount: 5 },
  { key: "g2", space: "internships", type: "goal", statement: "Aarav wants a summer 2027 backend internship, ideally in Bengaluru.", entities: ["aarav", "bengaluru"], importance: 7, confidence: 0.85, ageHours: 300 },
  { key: "g3", space: "personal", type: "goal", statement: "Aarav wants at least 6 hours of sleep before the beta launch.", entities: ["aarav", "kestrel"], importance: 5, confidence: 0.75, ageHours: 12 },

  // ── constraint ──
  { key: "c1", space: "project", type: "constraint", statement: "Kestrel's public beta ships on 7 Nov 2026 at 9:00 PM IST.", subject: "kestrel", attribute: "beta_launch", value: "2026-11-07T21:00+05:30", entities: ["kestrel", "beta launch"], importance: 10, confidence: 0.95, ageHours: 26, confirmCount: 2, recallCount: 9, from: { conversation: 0, message: 0, quote: "Beta ships 9 PM on the 7th" } },
  { key: "c2", space: "project", type: "constraint", statement: "The Kestrel iOS build must be submitted for App Store review by 5 Nov 2026.", subject: "kestrel", attribute: "app_store_submission", value: "2026-11-05", entities: ["kestrel", "app store"], importance: 9, confidence: 0.9, ageHours: 26 },
  { key: "c3", space: "project", type: "constraint", statement: "Kestrel must run on free tiers until it has paying users: Atlas M0 and Vercel Hobby.", entities: ["kestrel", "mongodb atlas", "vercel"], importance: 8, confidence: 0.9, ageHours: 22 },
  { key: "c4", space: "project", type: "constraint", statement: "Kestrel's launch video must be under 2 minutes.", subject: "kestrel", attribute: "launch_video_length", value: "2 min", entities: ["kestrel", "launch video"], importance: 7, confidence: 0.9, ageHours: 26 },
  { key: "c5", space: "internships", type: "constraint", statement: "Applications for the Razorpay backend internship close on 15 Nov 2026.", subject: "razorpay", attribute: "application_deadline", value: "2026-11-15", entities: ["razorpay"], importance: 8, confidence: 0.85, ageHours: 100 },

  // ── decision ──
  { key: "d0", space: "project", type: "decision", statement: "The team chose Vite with React for Kestrel's web dashboard.", subject: "kestrel", attribute: "dashboard_framework", value: "vite", entities: ["kestrel", "vite", "react"], importance: 6, confidence: 0.8, status: "superseded", supersededByKey: "d2", ageHours: 28 },
  { key: "d2", space: "project", type: "decision", statement: "The team chose Next.js over Vite for Kestrel's web dashboard, to deploy on Vercel in one step.", subject: "kestrel", attribute: "dashboard_framework", value: "next.js", entities: ["kestrel", "next.js", "vercel"], importance: 6, confidence: 0.9, ageHours: 24, recallCount: 3 },
  { key: "d1", space: "project", type: "decision", statement: "The team chose Better Auth over Auth.js because it lets pilots try Kestrel as guests.", entities: ["better auth", "auth.js", "kestrel"], importance: 6, confidence: 0.9, ageHours: 22, relatedKeys: ["o1"] },
  { key: "d3", space: "project", type: "decision", statement: "The team decided to support DJI logs first and add ArduPilot after the beta.", entities: ["kestrel", "dji", "ardupilot"], importance: 7, confidence: 0.95, ageHours: 34 },
  { key: "d4", space: "internships", type: "decision", statement: "Aarav decided to apply to 5 companies carefully rather than 20 quickly.", entities: ["aarav"], importance: 6, confidence: 0.85, ageHours: 150, relatedKeys: ["o3"] },

  // ── outcome ──
  { key: "o1", space: "project", type: "outcome", statement: "Better Auth's anonymous plugin worked on the first try in local testing.", entities: ["better auth"], importance: 5, confidence: 0.85, ageHours: 16, relatedKeys: ["d1"] },
  { key: "o2", space: "project", type: "outcome", statement: "MongoDB change streams kept Kestrel's live flight sync working in a local test.", entities: ["mongodb atlas", "change streams", "kestrel"], importance: 5, confidence: 0.8, ageHours: 14 },
  { key: "o3", space: "internships", type: "outcome", statement: "Aarav's Zerodha application was rejected after the online assessment.", entities: ["zerodha", "aarav"], importance: 6, confidence: 0.9, ageHours: 90, relatedKeys: ["d4"] },

  // ── feedback (three about length → reflection produces the bullet strategy) ──
  { key: "fb1", space: "global", type: "feedback", statement: "Aarav said Radahn's study plan was too long to use.", entities: ["aarav"], importance: 6, confidence: 0.9, ageHours: 50 },
  { key: "fb2", space: "global", type: "feedback", statement: "Aarav asked for just the bullets after a long answer.", entities: ["aarav"], importance: 6, confidence: 0.9, ageHours: 30 },
  { key: "fb3", space: "global", type: "feedback", statement: "Aarav said a 12-step plan was overwhelming at 2 AM.", entities: ["aarav"], importance: 6, confidence: 0.9, ageHours: 8 },

  // ── strategy ──
  { key: "s1", space: "global", type: "strategy", statement: "When Aarav asks for a plan, give at most 5 bullets, each with a time box.", entities: ["aarav"], importance: 8, confidence: 0.8, ageHours: 7, evidenceKeys: ["fb1", "fb2"], recallCount: 4 },

  // ── observation ──
  { key: "ob1", space: "global", type: "observation", statement: "Aarav works late at night and plans in short sprints.", entities: ["aarav"], importance: 6, confidence: 0.7, ageHours: 6, evidenceKeys: ["pr2", "fb3", "p2"] },
  { key: "ob2", space: "project", type: "observation", statement: "Aarav worries more about launch-day stability than about adding features.", entities: ["aarav", "kestrel"], importance: 5, confidence: 0.6, ageHours: 6, evidenceKeys: ["c3", "o2"] },

  // ── pending (sensitive, held for review) ──
  { key: "pd1", space: "global", type: "profile", statement: "Aarav has mild ADHD and finds short task lists easier to follow.", entities: ["aarav"], importance: 7, confidence: 0.75, sensitivity: "sensitive", status: "pending_review", ageHours: 3, from: { conversation: 2, message: 0, quote: "honestly I have mild ADHD, long lists kill me" } },

  // ── expiring + expired ──
  { key: "e1", space: "project", type: "fact", statement: "Aarav is on a call with a Kestrel beta tester for the next few minutes.", entities: ["aarav", "kestrel", "beta tester"], importance: 4, confidence: 0.8, ageHours: 0.2, expiresInMinutes: 10 },
  { key: "e0", space: "project", type: "fact", statement: "Aarav was waiting for the Kestrel iOS build to finish processing.", entities: ["aarav", "kestrel", "app store"], importance: 3, confidence: 0.8, status: "expired", ageHours: 2, expiresInMinutes: -60 },
];

export interface DemoConversation {
  space: DemoSpace;
  title: string;
  ageHours: number;
  messages: Array<{ role: "user" | "assistant"; text: string }>;
}

export const DEMO_CONVERSATIONS: DemoConversation[] = [
  {
    space: "project",
    title: "Kestrel beta plan",
    ageHours: 30,
    messages: [
      { role: "user", text: "Hey, we're building Kestrel, a flight-log app for drone pilots, three of us. Beta ships 9 PM on the 7th." },
      { role: "assistant", text: "Got it. Kestrel, three of you, public beta ships 7 Nov at 9:00 PM IST. What's the stack?" },
      { role: "user", text: "Next.js on Vercel, Atlas in Mumbai, free tier for now. We parse DJI and Betaflight logs on the server." },
      { role: "assistant", text: "Noted: Next.js + Vercel, Atlas (Mumbai) on the free tier, server-side log parsing. I'll keep plans inside those limits." },
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
  "Actually, the beta launch moved to 10 PM.",
];
