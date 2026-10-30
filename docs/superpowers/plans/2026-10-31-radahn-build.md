# Radahn Phase 0 → Checkpoint A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a deployed, CI-green Next.js app with Radahn's contracts, mock engine, auth, and the chat loop so Codex can build the real engine in parallel and Checkpoint A (10:30 IST) passes on prod.

**Architecture:** One Next.js App Router deployable on Vercel (bom1) talking to MongoDB Atlas M0 and Gemini via AI SDK. The memory engine sits behind `src/server/memory/index.ts`; `MEMORY_ENGINE=mock|real` swaps a fixture-backed mock for Codex's implementation, so UI work never waits on the engine.

**Tech Stack:** Next.js (latest, App Router, Turbopack), React 19, TypeScript strict, Tailwind v4, AI SDK (`ai`, `@ai-sdk/google`, `@ai-sdk/react`), `mongodb` driver, Better Auth (anonymous + Google + mongodbAdapter), zod, Vitest, Playwright.

**Spec:** `docs/PRD.md`, `docs/memory-engine.md`, `docs/TRD.md`, `docs/design.md`, `docs/build-plan.md` (§2 timeline, §3 ownership, §6.5 minimum viable submission).

## Global Constraints

- Deadline 21:00 IST; final deploy 20:45; cut line 15:00; freeze 18:00.
- TypeScript strict; zod at every boundary; `src/server/**` never imported by client components (`import 'server-only'`).
- Every DB query scoped by `ownerId` from the session.
- Tokens only in components (no raw hex); both themes work.
- Never commit `.env*` (except `.env.example`) or `Inputs/`; never log message text or memory statements in production.
- Embeddings: `gemini-embedding-2`, 768 dims, same model for documents and queries.
- Codex owns `src/server/memory/**` (except `types.ts`), `src/server/llm/**`, `scripts/**`, `evals/**`.

## Review Focus

- Guest who never loaded demo data sends a first message: recall returns zero candidates; the reply must still stream and the lens must show an empty "No memories yet" state, not an error.
- Gemini 429 on every key: the chat route returns a typed error part and the UI shows the rate-limited card; recall/Atlas still load.
- `MONGODB_URI` unreachable or env missing on a preview: the landing page still renders (it is static) and `/app` shows an error state instead of a 500 page.
- A citation `[[m9]]` that is not in the turn's recall trace renders as plain text, never as a link to an arbitrary id.
- Secrets pasted into chat are redacted before they reach Gemini or MongoDB (mock `preScan` already redacts the TRD §4.1 patterns for Google keys, `sk-`, `gh*_`, JWT, mongodb URIs).

---

### Task 1: Scaffold, repo hygiene, tokens, atoms

**Files:**
- Create: Next app at repo root (temp-folder method, TRD §2), `src/styles/globals.css` (design.md §4 tokens + keyframes + `@theme` mapping), `src/app/layout.tsx` (fonts via `next/font/google`: Hedvig Letters Serif, Hanken Grotesk, Martian Mono), `src/lib/utils.ts` (`cn`), `src/components/atoms/{Button,Kbd,TypeSwatch,EntityChip,ValuePill,ScoreBar,Shimmer}.tsx`, `src/lib/memory-types.ts` (type → colour/glyph/label/text-colour table from design.md §4.1), `public/brand/radahn-logo.png`, `.env.example`, `vitest.config.ts`.
- Test: `src/lib/memory-types.test.ts`

**Interfaces:**
- Produces: `MEMORY_TYPE_META: Record<MemoryType, { label: string; glyph: string; swatch: string; onSwatch: 'light'|'dark' }>`; `Button` props `{ variant: 'accent'|'secondary'|'ghost'|'quiet'|'success'|'danger'; size?: 'xs'|'sm'|'md'; kbd?: string; pill?: boolean }`.

- [ ] Test: every one of the 10 types has a distinct glyph and swatch; `fact.glyph === '#'`, `constraint.swatch === '#D8432F'`.
- [ ] Implement, run `npm run test`, `npm run typecheck`, `npm run build`.
- [ ] `git init`, check `git status` shows no `Inputs/` or `.env.local`, commit.

### Task 2: Env, DB client, contracts, mock engine

**Files:**
- Create: `src/server/env.ts` (zod; `SKIP_ENV_VALIDATION=1` bypass for CI), `src/server/db/client.ts` (globalThis-cached `MongoClient`, `maxPoolSize: 10`), `src/server/db/collections.ts`, `src/server/memory/types.ts`, `src/server/memory/index.ts` (engine facade choosing mock|real), `src/server/memory/mock.ts`, `src/server/memory/fixtures/demo.ts`, `src/server/llm/registry.ts` (interface + Claude's thin working default so chat works before C1), `src/lib/chat-types.ts` (`RadahnUIMessage` with data parts from TRD §7).
- Test: `src/server/memory/mock.test.ts`, `src/server/env.test.ts`

**Interfaces:** Defined in code (`types.ts` is the contract). Engine facade:
`preScan(text) → PreScanResult`, `recall(RecallInput) → RecallResult`, `buildContext(BuildContextInput) → BuiltContext`, `extractAndWrite(ExtractInput) → WriteSummary`, `rememberExplicit`, `correctMemory`, `forgetMemory`, `reviewMemory`, `runReflection`, `ghostContext`, `seedDemo(ownerId)`, plus read APIs `listMemories`, `getMemory`, `getRecallTrace`.

- [ ] Tests: mock `recall` returns picks sorted by `final` desc with `reasons.length ≥ 1`; `preScan('key AIza' + 35 chars)` returns `redacted` containing `[redacted:google_api_key]` and `kinds: ['google_api_key']`; env parse fails without `MONGODB_URI` unless skipped.
- [ ] Implement, run tests, commit.

### Task 3: CODEX_TASKS.md, CI, GitHub, Vercel, first deploy

**Files:** `docs/CODEX_TASKS.md` (build-plan §6 template, filled), `.github/workflows/ci.yml` (TRD §12), `vercel.json` (region bom1, crons), `scripts/db-setup.ts` stub owned by Codex (C0), `src/app/page.tsx` placeholder landing in the design language.

- [ ] `gh repo create vaibhavcodesx/radahn --public --source . --push` (approved).
- [ ] `vercel link` + Git integration + env vars piped from `.env.local` (approved) + `vercel --prod`; confirm prod URL returns 200.
- [ ] Tell the user: contracts + CODEX_TASKS pushed → start Codex.

### Task 4: Auth (guest + Google, link migration)

**Files:** `src/server/auth/auth.ts`, `src/server/auth/session.ts` (`requireUser(): Promise<{ id: string; isAnonymous: boolean; name: string }>`), `src/lib/auth-client.ts`, `src/app/api/auth/[...all]/route.ts`, `src/proxy.ts` (or `middleware.ts`, per installed Next version) guarding `/app/**`, `src/app/signin/page.tsx`.

- [ ] `onLinkAccount` moves `ownerId` across our 8 collections in a transaction.
- [ ] Verify locally: "Enter as guest" lands in `/app` with a session cookie; Google button redirects to accounts.google.com.

### Task 5: App shell + chat route + stream + lens

**Files:** `src/app/app/layout.tsx`, `src/components/shell/*`, `src/app/app/chat/[id]/page.tsx`, `src/components/chat/*`, `src/server/chat/turn.ts`, `src/app/api/chat/route.ts`, `src/app/api/recalls/[messageId]/route.ts`, `src/lib/citations.ts` (+ test).

- [ ] Test `parseCitations('A [[m1]] b [[m9]]', refs={m1})` → m1 becomes a citation token, m9 stays text.
- [ ] Chat route: preScan → recall → `data-recall` → streamText (Gemini via registry) with tools → `after()` persist + extractAndWrite.
- [ ] Verify on prod: guest chats; lens shows picks with scores.

### Task 6: Realtime (change stream → SSE) + write chips

**Files:** `src/server/realtime/stream.ts`, `src/app/api/stream/route.ts`, `src/components/realtime/LiveProvider.tsx`.

- [ ] Change stream on `memory_events` filtered by owner, resume tokens, ~270 s lifetime, polling fallback.
- [ ] Verify: write chips appear under the reply within ~3 s on prod. → **Checkpoint A.**
