# Radahn

**A personal AI agent whose memory you can see, steer, and trust.**
UNCHARTED 2026 · MongoDB Student Hackathon · **Track 1: Agentic Memory**

**Live:** https://radahn-ai.vercel.app · **How it works:** https://radahn-ai.vercel.app/how-it-works

Radahn remembers what matters (preferences, decisions, constraints, outcomes, feedback), uses it to change its next answer, and shows exactly *which* memory changed *what*, and *why*. Every reply cites the memories it used, the Memory lens shows the real scores behind each pick, and one click re-asks the same question **without memory** and shows the difference.

## How judges can test (no account needed)

1. Open https://radahn-ai.vercel.app → **Enter as guest**.
2. Click **Load demo memories** (a synthetic student, Aarav, racing this hackathon's deadline; labelled DEMO).
3. Ask **“Plan my next 4 hours.”** Watch the Memory lens: recalled memories, their score breakdowns, and the learned behaviour that shapes the format. Click a citation square to open a memory.
4. Click **Without memory** under the reply to see the word-level diff against a memory-free answer.
5. Try the difficult cases:
   - **Correction:** “Actually, the build deadline moved to 10 PM.” The old memory becomes *outdated* and stays in history.
   - **Private info:** paste a fake key like `sk-test_aaaaaaaaaaaaaaaaaaaaaaaa`. It's redacted before the model sees it: “Not saved — looked like a credential”.
   - **Review:** the Review badge holds a sensitive memory until you approve or reject it.
   - **Expiry:** open any memory → **Expire → In 2 minutes**. Recall stops then; MongoDB's TTL monitor deletes it shortly after.
   - **Forget:** **Forget** hard-deletes the statement and its vector, leaving a content-free tombstone event.
6. **Memory** shows the Atlas (filters, history, raw MongoDB document). **Activity** shows live events from a change stream and lets you run **Reflect now**.

## Track 1 brief → Radahn

| Brief | Radahn |
|---|---|
| Persistent memory; decide what to remember, retrieve, update, correct, forget | Typed atomic memory units; extraction + privacy gate + reconcile (add / confirm / supersede / skip); lifecycle states; TTL expiry; hard forget |
| Memory visibly changes the next response | Inline citations, Memory lens, **Without memory** diff, learned strategies that change answer format |
| Inspect memory and explain why it was selected | Stored recall trace with per-channel ranks and score components; plain-language reasons; raw document view |
| One difficult case | All five: correction, conflict, expiry, deletion, private info |
| MongoDB: documents with owner/type/content/source/timestamps/lifecycle | `memories` with `$jsonSchema` validation |
| Vector Search with filters | `$vectorSearch` pre-filtered on owner, space, status, type; fused with Atlas Search |
| TTL index for expiry | `purgeAt` TTL on memories, traces, rate limits |
| Change streams for live updates | `memory_events` change stream → SSE → write chips, Activity, Review badge |

## Architecture

One Next.js 16 app on Vercel (Mumbai), MongoDB Atlas M0 (Mumbai), Gemini via the AI SDK.

```
Browser ── /api/chat ──► pre-scan ─► recall (vector · lexical · temporal · graph → RRF → score → MMR)
   ▲                         │            │
   │                         ▼            ▼
   │                   Gemini 3.8 Flash ◄─ system prompt (strategies · core · recalled · notices)
   │                         │ streams reply with [[m3]] citations + memory tools
   │                         ▼
   │                   after(): extract (Flash-Lite) → gate → reconcile → transaction → memory_events
   └── /api/stream (SSE) ◄── change stream on memory_events
```

**MongoDB features used:** document model + schema validation, Atlas Vector Search with pre-filters, Atlas Search, TTL indexes, a partial unique index (one active value per fact), multi-document transactions, change streams, aggregation pipelines. Details: [docs/architecture.md](docs/architecture.md), [docs/memory-engine.md](docs/memory-engine.md).

**Scoring:** `final = 0.55·relevance(RRF) + 0.15·recency + 0.15·importance + 0.10·confidence + type boost`, threshold 0.35, MMR λ = 0.7, budget 8 units.

**Resilience:** quota-aware model routing across keys (3.8 Flash → 3.6 Flash → 3.5 Flash-Lite) with a first-token deadline, so a quota-limited or hung model never stalls a reply; the UI shows which model answered.

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · AI SDK v7 + `@ai-sdk/google` · Gemini 3.8 Flash / 3.6 Flash / 3.5 Flash-Lite · `gemini-embedding-2` (768-d) · MongoDB Atlas M0 + Node driver v7 · Better Auth (guest + Google) · zod · Vitest · Vercel.

## Local setup

```bash
npm install
cp .env.example .env.local   # fill MONGODB_URI, GEMINI_API_KEYS, BETTER_AUTH_SECRET, CRON_SECRET (+ Google OAuth optional)
npm run db:setup             # collections, validator, indexes, Atlas Search + Vector Search indexes
npm run dev
```

`npm run test` (unit), `npm run typecheck`, `npm run lint`, `npm run build`. `MEMORY_ENGINE=mock|real` switches between a fixture engine and the MongoDB engine.

## How we built it

Built in one day by a team of three with two coding agents: **Claude Code** (lead: architecture, UI, routes, auth, streaming, realtime, deployment) and **Codex** (the memory engine: gate, recall, reconcile, reflection, evals), working in parallel against shared TypeScript contracts. The humans set direction, made product calls, handled accounts and keys, wrote the demo persona, and reviewed and tested the result. The planning docs in [docs/](docs/) record every decision.

## Research lineage

Hindsight (typed units, retain/recall/reflect, multi-channel recall), Hermes Agent (bounded core memory, write approval), IHMT-MEMORY (supersede-not-delete, clarify on ambiguity), Generative Agents (recency × importance × relevance, reflection), Mem0 (reconcile ops), MemGPT/Letta (core vs archival, sleep-time consolidation), Zep/Graphiti (bi-temporal validity). See [/how-it-works](https://radahn-ai.vercel.app/how-it-works).

## Limitations

Free tiers only (Gemini free-tier quotas are small; Google may use free-tier prompts to improve its products, so don't enter real secrets). Extraction is an LLM call and can miss or over-remember; everything it writes is visible and reversible. Guest memories last 7 days.

## Attribution

Logo by the team. Fonts: Hedvig Letters Serif, Hanken Grotesk, Martian Mono (Google Fonts, OFL). Icons: lucide (ISC). Visual references: Griffin, LocalCan, Teak, Stanley Whitney's *How High the Moon* (inspiration only; no assets copied).
