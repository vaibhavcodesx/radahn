# Decisions log

The planner's calls (2026-10-31, ~03:00–04:00 IST). The user delegated product and technical choices ("you are the commander") and answered four questions directly. Anything marked **planner's call** can be overturned by the user or by the building agent with a written reason in `CHANGELOG.md`.

## User's answers (fixed)
| # | Decision | Source |
|---|---|---|
| U1 | Track 1: Agentic Memory | User + hackathon PDF |
| U2 | Gemini via Google AI Studio free tier; "Gemini 3.8 Flash" | User (model ID `gemini-3.8-flash` verified on ai.google.dev) |
| U3 | Auth = guest + Google | User answer |
| U4 | No MongoDB Atlas cluster yet → SETUP.md creates a free M0 | User answer |
| U5 | No uiarc Arc Pro → AI Chat / Customer Galaxy blocks used as inspiration only | User answer |
| U6 | No extra organiser rules (no mandatory n8n) | User answer |
| U7 | Visual references: Griffin + LocalCan (mixed, primary), Teak (secondary); saved component library; Whitney type reference; logo used but must not drive colours | User |
| U8 | Primary agent Claude Code, secondary Codex working in parallel; superpowers + gstack are the primary skills; Context7 for lookups | User |
| U9 | Public GitHub repo (free CI minutes) | User |

## Planner's calls
| # | Call | Why | Alternatives considered |
|---|---|---|---|
| P1 | Product = a personal agent with a visible, controllable memory, not a domain-specific bot | Hermes-like generality (user's reference) while the demo persona gives a concrete workflow | Incident-response agent; team decision log; coding-agent memory only |
| P2 | Ghost answer (memory on/off diff) as the headline proof | The brief's core test is "memory visibly changes the next response" | Before/after screenshots only |
| P3 | 10 memory types incl. `strategy` and `observation` | Covers every type the brief names, plus learning | Fewer types (weaker), free-form tags (no structure) |
| P4 | Next.js + TypeScript single deployable on Vercel; native `mongodb` driver; AI SDK + `@ai-sdk/google` | One language, the saved components are React, fastest deploy, typed streaming | Python FastAPI backend (two deploys), Mongoose (friction with `$vectorSearch`) |
| P5 | Better Auth (anonymous + Google + MongoDB adapter) | Guest → Google account linking built in; verified in docs | Auth.js (guest needs custom credentials hack), Clerk (external, no Mongo storage) |
| P6 | `gemini-embedding-2` at 768 dims, own embeddings | Free; M0 lacks automated embedding (M10+) | 3072 dims (bigger index, slower), Voyage (extra account) |
| P7 | Hybrid recall: vector + Atlas Search + temporal + graph-lite, RRF fusion in app | Hindsight-grade recall on MongoDB; M0 allows 3 search indexes, we use 2 | `$rankFusion` (version/tier uncertainty on M0) |
| P8 | Partial unique index per `slotKey` for single-truth facts | DB-enforced correctness, multi-writer safe; strong talking point | App-only checks |
| P9 | Change streams → SSE with polling fallback | Brief names change streams; serverless needs a resilient pattern | WebSockets via a separate server (more infra) |
| P10 | Post-response work in `after()`, daily Vercel cron | No queue infra; user never waits | Separate worker on Render/Railway |
| P11 | Dark default with full light theme | Late-night use + projector safety | Dark only |
| P12 | Fonts: Hedvig Letters Serif / Hanken Grotesk / Martian Mono | Free stand-ins for Victor Serif / Mallory + Griffin/LocalCan mono voice; avoids impeccable's banned defaults | Spectral / Albert Sans / Geist Mono as fallbacks |
| P13 | lucide-react replaces Central icons | Central Icons is a commercially licensed set | Phosphor |
| P14 | npm, not pnpm | pnpm not installed on the machine | pnpm via corepack |
| P15 | Codex owns the engine in its own git worktree; Claude owns UI/integration; contracts first | Parallel work without file collisions | Feature-sliced split (more overlap) |
| P16 | MCP endpoint for external agents is **P1-stretch** | High wow, but only after the core loop is solid | P0 (too risky), cut entirely |
| P17 | Repo layout: Next app at repo root, `Inputs/` git-ignored, logo copied into `public/brand/` | Public repo must not redistribute hackathon PDFs or personal notes | Separate `web/` folder |
| P18 | Name stays **Radahn**; no game imagery | User's logo + name; avoid IP issues | — |

## Builder's calls (Claude Code, Phase 0, 2026-10-31 ~04:20 IST)
| # | Call | Why | Source |
|---|---|---|---|
| B1 | Next.js `cacheComponents` off | Session reads outside `<Suspense>` are build errors with it on; every app route is session-driven | Next 16.4 docs in `node_modules/next/dist/docs` |
| B2 | AI SDK v7 / zod v4 / mongodb v7 / Better Auth 1.7 | Latest stable at build time | npm |
| R1 | Quota-aware routing, state in `llm_usage` | 3.8 Flash free tier ≈ 20 RPD per project (unverified); keys in one project share quota | research/quotas.md |
| R2 | Reflection on 3.5 Flash-Lite (`thinkingLevel: medium`) | Save scarce 3.8 Flash requests for chat | research/quotas.md |
| R3 | Extraction uses Hermes's "every session" rule + skip list | Fewer junk memories | research/memory-systems.md §1 |
| R4 | Strategies selected by relevance (≤ 3), not top-5 by importance | Hermes skills load only when relevant | research §1 |
| R5 | Content-hash dedup before embedding | Saves quota + latency (Mem0) | research §3 |
| R6 | Confidence `min(0.95, 0.5 + ln(1+n)/4)` on confirm | Saturating proof curve (Hindsight) | research §2 |
| R7 | Bi-temporal out-of-order guard | A past statement must not replace the current value (Graphiti) | research §5 |
| R8 | Keep app-side RRF, not `$rankFusion` | Per-channel ranks are needed for the recall trace; `$rankFusion` on M0 uncertain | research §7 |
| R9 | Mem0's newer ADD-only extraction rejected | Demo needs a visible supersede (9 PM → 10 PM) with history | research §3 |
