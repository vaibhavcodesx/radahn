# Radahn — Technical Requirements Document

> How Radahn is built. Product intent: [PRD.md](PRD.md). Brain: [memory-engine.md](memory-engine.md). System view: [architecture.md](architecture.md). Look and feel: [design.md](design.md).
> **Library APIs move fast.** Before using any library API below, check it with **Context7** (`resolve-library-id` → `query-docs`). Versions are "latest stable at build time" unless pinned here. If a doc says otherwise, the docs win: adapt and note it in `CHANGELOG.md`.

---

## 1. Stack (decided; the builder may swap with a written reason)

| Layer | Choice | Why |
|---|---|---|
| Language | **TypeScript** (strict) everywhere | One language for UI, API, engine, tests; both agents are strong at it |
| Framework | **Next.js (App Router, latest stable)** + React 19, Node runtime for all server code | Your saved components are React/Next; Vercel deploy is one command; `after()` for post-response work |
| Styling | **Tailwind CSS v4** + CSS custom-property tokens (design.md §4) + **shadcn/ui** CLI (needed to pull the skecher-ui / 21st components you saved) | Snippets already use Tailwind utility names mapped to tokens |
| Motion | `motion` (Framer Motion), CSS keyframes, `glimm` (prompt-bar sweep) | Snippets depend on them |
| Charts | `liveline` (Insight Cards snippet) | Already used by the snippet |
| Canvas | Plain Canvas 2D + `d3-force` for the constellation | No WebGL dependency on the critical path |
| Icons | `lucide-react` (replace `@central-icons-react/*` in snippets; that set is commercially licensed) | shadcn default, MIT |
| LLM | **Gemini API (Google AI Studio free tier)** via **AI SDK** (`ai`, `@ai-sdk/google`, `@ai-sdk/react`). Fall back to `@google/genai` directly for anything the provider lacks (e.g. `gemini-embedding-2` if unsupported) | AI SDK gives streaming UI messages, tool calls, typed data parts, structured output |
| Models | Chat: `gemini-3.8-flash` → fallback `gemini-3.6-flash` → `gemini-3.5-flash-lite`. Background (extract/reconcile/title): `gemini-3.5-flash-lite` → `gemini-3.1-flash-lite`. Reflection: `gemini-3.8-flash`. Embeddings: `gemini-embedding-2` @ 768 dims | All free on AI Studio as of Oct 2026 (verified on ai.google.dev pricing/models pages, 2026-10-31). 2.5-series is restricted for new projects. |
| Database | **MongoDB Atlas M0** (AWS Mumbai `ap-south-1`), official `mongodb` Node driver (no Mongoose) | Native `$vectorSearch`, `$search`, change streams, transactions without ORM friction |
| Auth | **Better Auth** with `mongodbAdapter`, **anonymous plugin** (guest) + **Google** social provider; `onLinkAccount` migrates guest data | Guest-first for judges, Google for keeps; verified in Better Auth docs |
| Validation | `zod` (API inputs, LLM structured outputs, env) | |
| Time parsing | `chrono-node` | Temporal recall channel |
| MCP (P1-stretch) | `mcp-handler` (Vercel's MCP adapter for Next.js) | Agent access endpoint |
| Tests | **Vitest** (unit), **Playwright** (e2e smoke) | |
| Package manager | **npm** (pnpm is not installed on the dev machine; npm avoids setup friction) | |
| Hosting | **Vercel** (Hobby), region `bom1` (Mumbai) to sit next to Atlas | Git-integrated previews, `after()`, cron |
| CI | **GitHub Actions** on a **public** repo (unlimited minutes) | |

## 2. Repository layout

```
radahn/
├─ CLAUDE.md  AGENTS.md  PRODUCT.md  SETUP.md  README.md  CHANGELOG.md  TODO.md
├─ docs/                      # these planning docs (+ CODEX_TASKS.md written by Claude in Phase 0)
├─ public/brand/              # radahn-logo.png (copied from Inputs/, resized), og image
├─ scripts/
│  ├─ db-setup.ts             # create collections, validators, indexes, search indexes (idempotent)
│  ├─ seed-demo.ts            # Aarav persona (also callable from the app per user)
│  └─ check-env.ts
├─ evals/                     # golden cases + runner + results.md
├─ e2e/                       # Playwright specs
├─ src/
│  ├─ app/
│  │  ├─ (marketing)/page.tsx            # landing  /
│  │  ├─ (marketing)/how-it-works/page.tsx
│  │  ├─ signin/page.tsx
│  │  ├─ app/layout.tsx                  # authed shell (sidebar, live stream provider)
│  │  ├─ app/page.tsx                    # → redirects to latest chat or empty state
│  │  ├─ app/chat/[id]/page.tsx
│  │  ├─ app/memory/page.tsx             # Atlas (table | constellation)
│  │  ├─ app/memory/[id]/page.tsx        # detail (also rendered as drawer via intercepting route, optional)
│  │  ├─ app/review/page.tsx
│  │  ├─ app/activity/page.tsx
│  │  ├─ app/settings/[[...section]]/page.tsx
│  │  └─ api/ (see §6)
│  ├─ components/
│  │  ├─ atoms/               # Button, Kbd, EntityChip, ValuePill, Shimmer, StreamText, TypeSwatch …
│  │  ├─ primitives/          # GlideMenu, Popover, Drawer …
│  │  ├─ blocks/              # adapted saved snippets (Thinking, ToolChips, ApprovalCard, PromptBar …)
│  │  ├─ ui/                  # shadcn + skecher-ui/21st installs (text-morphing, ai-orb, background-paths …)
│  │  ├─ chat/  memory/  activity/  landing/  shell/
│  ├─ lib/                    # client utils, cn(), formatters, citation parser, diff
│  ├─ server/
│  │  ├─ db/                  # client singleton, collections, typed accessors
│  │  ├─ auth/                # better-auth config, session helpers
│  │  ├─ llm/                 # model registry, key pool, fallback, embed()
│  │  ├─ memory/              # THE ENGINE (types, gate, extract, reconcile, recall, score, reflect, prompts/)
│  │  ├─ chat/                # turn orchestration (context assembly, tools, ghost)
│  │  ├─ realtime/            # change stream → SSE
│  │  └─ ratelimit.ts
│  └─ styles/globals.css      # tokens, keyframes, @theme mapping
├─ .github/workflows/ci.yml
├─ vercel.json
└─ .env.example
```

**Scaffolding note:** the repo root already contains docs and `Inputs/`, so `create-next-app` will refuse to run in place. Scaffold into a temp folder (`npx create-next-app@latest .scaffold --ts --tailwind --app --src-dir --eslint --use-npm --import-alias "@/*"`), move its contents up, delete `.scaffold`. Keep `Inputs/` git-ignored; copy only the logo into `public/brand/`.

## 3. Environment variables (`.env.example` committed, `.env.local` never)

```
MONGODB_URI=                     # mongodb+srv://...  (Atlas M0)
MONGODB_DB=radahn                # radahn_eval for evals
GEMINI_API_KEYS=                 # comma-separated; one per teammate; rotated on 429
GEMINI_CHAT_MODEL=gemini-3.8-flash
GEMINI_FAST_MODEL=gemini-3.5-flash-lite
GEMINI_EMBED_MODEL=gemini-embedding-2
EMBED_DIM=768
BETTER_AUTH_SECRET=              # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000   # prod: https://<project>.vercel.app
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
CRON_SECRET=                     # Vercel cron auth header
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
`src/server/env.ts` validates with zod at boot; `scripts/check-env.ts` prints what's missing.

## 4. Auth

- Better Auth server config in `src/server/auth/auth.ts`: `mongodbAdapter(db, { client })`, `socialProviders.google`, `plugins: [anonymous({ onLinkAccount })]`, `nextCookies()`.
- `onLinkAccount({ anonymousUser, newUser })` → in one transaction `updateMany({ownerId: anon}, {$set: {ownerId: new}})` across `spaces`, `conversations`, `messages`, `memories`, `memory_events`, `recalls`, `reflections`, `agent_keys`.
- Middleware/`proxy` protects `/app/**` (redirect to `/signin`); API routes call `requireUser()`.
- Guest banner: "You're a guest. Memories stay for 7 days. Sign in with Google to keep them." A daily cron deletes guest users inactive > 7 days and their data (P1).
- Google OAuth redirect URIs: `http://localhost:3000/api/auth/callback/google` and `https://<prod-domain>/api/auth/callback/google` (+ preview domains are optional; previews can use guest only).

## 5. Data model (MongoDB)

Database `radahn`. Better Auth owns `user`, `session`, `account`, `verification` (names per its adapter). Our collections:

| Collection | Purpose | Key fields |
|---|---|---|
| `spaces` | Workspaces | `ownerId, name, color, isDefault, unitsSinceReflection, lastReflectionAt, createdAt` |
| `conversations` | Chats | `ownerId, spaceId, title, summary, lastMessageAt, createdAt` |
| `messages` | Short-term memory + provenance | `conversationId, ownerId, role, parts (AI SDK UIMessage parts), text (plain, redacted), recallId?, citedMemoryIds[], writeSummary {added,confirmed,superseded,pending,blocked}, feedback {rating,note,at}?, ghost {text, model, at}?, model, createdAt` |
| `memories` | Long-term memory units | memory-engine.md §2 |
| `memory_events` | Append-only audit + realtime source | `ownerId, spaceKey, memoryId, kind, actor, summary (no content for forgotten/blocked), diff?, at` |
| `recalls` | Recall traces | memory-engine.md §5.6 |
| `reflections` | Reflection runs | `ownerId, spaceId, trigger, status, steps[{name,status,detail,at}], outputs{merged[],observations[],strategies[]}, startedAt, finishedAt, error?` |
| `agent_keys` (P1-stretch) | External agent access | `ownerId, name, keyHash, prefix, spaceKeys[], lastUsedAt, createdAt` |
| `rate_limits` | Fixed-window counters | `key, windowStart, count` (TTL 1 h) |

### 5.1 Validator on `memories` (excerpt; full in `scripts/db-setup.ts`)
```js
{ $jsonSchema: {
  bsonType: 'object',
  required: ['ownerId','spaceKey','type','statement','importance','confidence','sensitivity','status','source','entities','validFrom','createdAt','updatedAt','embedding'],
  properties: {
    type:   { enum: ['profile','preference','fact','goal','constraint','decision','outcome','feedback','strategy','observation'] },
    status: { enum: ['active','pending_review','superseded','expired','rejected'] },
    sensitivity: { enum: ['none','personal','sensitive'] },
    statement: { bsonType: 'string', minLength: 3, maxLength: 240 },
    importance: { bsonType: ['int','double'], minimum: 1, maximum: 10 },
    confidence: { bsonType: ['double','int'], minimum: 0, maximum: 1 },
    embedding: { bsonType: 'array', minItems: 768, maxItems: 768 }
  } },
  validationLevel: 'strict', validationAction: 'error' }
```

### 5.2 Indexes (all created by `scripts/db-setup.ts`, idempotent)
```js
// memories
{ ownerId: 1, spaceKey: 1, status: 1, type: 1, updatedAt: -1 }                 // Atlas table, filters
{ ownerId: 1, spaceKey: 1, slotKey: 1 }  partialFilterExpression: { status: 'active', slotKey: { $exists: true } }, unique: true
{ ownerId: 1, pinned: 1, status: 1 }
{ ownerId: 1, entities: 1, status: 1 }                                          // graph-lite channel
{ purgeAt: 1 }  expireAfterSeconds: 0                                            // TTL physical deletion
// memory_events
{ ownerId: 1, at: -1 }
// recalls
{ messageId: 1 }   { createdAt: 1 } expireAfterSeconds: 1209600                    // 14 d TTL
// messages
{ conversationId: 1, createdAt: 1 }   { ownerId: 1, text: 'text' } (classic $text index for chat-history search)
// conversations
{ ownerId: 1, spaceId: 1, lastMessageAt: -1 }
// rate_limits
{ key: 1, windowStart: 1 } unique   { windowStart: 1 } expireAfterSeconds: 3600
```

### 5.3 Atlas Search indexes (M0 allows 3; we use 2)
Vector index `memories_vec` on `memories`:
```json
{ "fields": [
  { "type": "vector", "path": "embedding", "numDimensions": 768, "similarity": "cosine" },
  { "type": "filter", "path": "ownerId" },
  { "type": "filter", "path": "spaceKey" },
  { "type": "filter", "path": "status" },
  { "type": "filter", "path": "type" },
  { "type": "filter", "path": "sensitivity" } ] }
```
Lexical index `memories_text` on `memories`:
```json
{ "mappings": { "dynamic": false, "fields": {
  "statement": { "type": "string", "analyzer": "lucene.english" },
  "entities":  { "type": "string" },
  "tags":      { "type": "string" },
  "ownerId":   { "type": "token" },
  "spaceKey":  { "type": "token" },
  "status":    { "type": "token" } } } }
```
Create them with the driver's `collection.createSearchIndex({ name, type: 'vectorSearch'|'search', definition })` (verify the call with Context7) and poll until `queryable: true`. Index builds take ~1 min on M0; the setup script waits and reports.

## 6. API (Route Handlers, Node runtime)

All routes: `requireUser()`, zod-validated input, JSON errors `{error:{code,message}}`, per-user rate limits (§9).

| Method & path | Purpose |
|---|---|
| `POST /api/chat` | One turn. Body: AI SDK UI messages + `conversationId`, `spaceId`, `model?`. Streams a UI message stream with custom data parts (§7). Runs privacy pre-scan → recall → stream reply (with tools) → `after()`: persist, extract/reconcile, events, maybe reflection. `maxDuration = 60`. |
| `POST /api/chat/ghost` | `{ messageId }` → generates the no-memory answer for that turn (non-streamed is fine), caches it on the message, returns `{ text, diff }`. |
| `POST /api/chat/feedback` | `{ messageId, rating: 1|-1, note? }` → stores on message + creates `feedback` unit. |
| `GET /api/conversations?spaceId=` · `POST` · `PATCH /:id` · `DELETE /:id` | Chat list/CRUD; `GET /api/conversations/search?q=` uses `$text` on messages. |
| `GET /api/memories` | Query params: `spaceKey, type[], status[], q, sort, cursor`. |
| `GET /api/memories/:id` | Unit + versions chain + recall history (from `recalls`) + events. |
| `POST /api/memories` | Manual create (passes the gate). |
| `PATCH /api/memories/:id` | Edit fields; editing `statement` = supersede (reason `correction`); `pinned`, `expiresAt`, `scope`, `importance` are in-place updates with events. |
| `DELETE /api/memories/:id` | Forget (hard delete + tombstone). |
| `POST /api/memories/:id/review` | `{ decision: 'approve'|'reject', edits? }` |
| `GET /api/memories/graph` | Lightweight nodes/links for the constellation (no embeddings in payload). |
| `GET /api/recalls/:messageId` | Recall trace for the Memory lens. |
| `POST /api/reflect` | `{ spaceId }` → starts a reflection, returns `reflectionId`; progress via SSE. |
| `GET /api/reflections` | Recent runs. |
| `GET /api/stream` | SSE: change stream over `memory_events` (+ `reflections`) filtered by `ownerId`. §8. |
| `GET /api/insights?spaceKey=` | Aggregation pipelines for Insight Cards (counts by type over time, recall hit rate, corrections). |
| `POST /api/demo/seed` · `DELETE /api/demo` | Seed/remove demo world for the current user (marks `demo: true`). |
| `GET /api/export` · `DELETE /api/account/data` | Export JSON / delete all memory. |
| `GET /api/cron/reflect` · `GET /api/cron/maintenance` | Vercel cron (checks `Authorization: Bearer ${CRON_SECRET}`): reflections for recently active users; flip expired statuses; purge stale guests. |
| `POST /api/agent-keys` · `DELETE /api/agent-keys/:id` · `/api/mcp/[transport]` | P1-stretch external agents. |
| `/api/auth/[...all]` | Better Auth handler. |

## 7. Chat stream protocol

Use AI SDK `createUIMessageStream` and merge the model stream. Custom data parts (typed in `src/lib/chat-types.ts` as the `RadahnUIMessage` generic):

| Part type | When | Payload |
|---|---|---|
| `data-recall` | Before first token (status `running` → `done`, same `id`) | `{ recallId, intent, channels: string[], picked: {ref, memoryId, type, statement, final, reasons[]}[], notices: string[], latencyMs }` |
| `data-notice` | If a supersede/ambiguity notice applies | `{ kind: 'changed'|'ambiguous', text }` |
| `data-memory-op` | Tool calls `remember/correct/forget` | `{ op, memoryId?, statement?, status, before?, after? }` |
| `data-writes` | After `after()` work finishes, delivered via the SSE stream (not the chat stream, because the chat stream has closed) | `{ messageId, added, confirmed, superseded, pending, blocked }` |
| `data-redaction` | Pre-scan found secrets | `{ kinds: string[] }` (never values) |

Citations stay inline in text as `[[m3]]`; the client maps refs → memory ids using `data-recall`.

## 8. Realtime (change streams → SSE)

- `GET /api/stream` (Node runtime, `dynamic = 'force-dynamic'`, `maxDuration` as high as the plan allows, e.g. 300): opens `db.collection('memory_events').watch([{ $match: { 'fullDocument.ownerId': userId } }], { fullDocument: 'updateLookup' })` plus `reflections` updates; writes SSE events `id: <resumeToken>`. Closes itself at ~270 s.
- Client `EventSource` reconnects automatically and sends `Last-Event-ID`; the server resumes with `resumeAfter`. A single provider in `app/layout.tsx` fans events out to the chat chips, Activity, Review badge, and Atlas via a small store (Zustand or React context).
- Fallback if change streams misbehave on M0 or serverless: same endpoint switches to polling `memory_events` by `_id > lastSeen` every 2 s. Keep the client contract identical.

## 9. LLM layer, quotas, resilience

- `src/server/llm/registry.ts`: model chains per role (`chat`, `fast`, `reflect`, `embed`). `callWithFallback(role, fn)` tries key pool × model chain on 429/503/timeouts with jittered backoff (max 2 retries per model), logs which model served the request (shown subtly in the UI as "3.8 Flash" / "fell back to 3.6 Flash").
- **Key pool**: `GEMINI_API_KEYS` round-robin; split on commas and **trim whitespace** (the current `.env.local` has a space after the comma); keys are a newer 53-char format, so don't validate on the old `AIza` prefix. A key that returns 429 is cooled for 60 s. (Verified 2026-10-31 03:55: both keys return HTTP 200 for `gemini-3.8-flash`, `gemini-3.5-flash-lite`, `gemini-embedding-2`.)
- Optional `VOYAGE_API_KEY` for the stage-2 reranker (memory-engine.md §5.3); absent = heuristic re-rank only.
- Timeouts: chat first token 15 s, background calls 20 s, embeddings 8 s.
- Gemini 3 options: `thinkingLevel: 'low'` for chat (latency), `'medium'` for reflection; structured output via `responseSchema`/`generateObject`.
- **Rate limits** (Mongo fixed window): guests 20 chat turns / 10 min, 5 ghost answers / 10 min, 3 reflections / 10 min; signed-in ×2.
- Budget per chat turn: 1 chat call (+ tool loop, max 3 steps) + 1 query embedding; after response: 1 Flash-Lite extraction, 0–1 reconcile call, 1 batch embedding call. Title generation once per conversation (Flash-Lite).
- Degraded mode: if every chat model fails, return a clear error card with retry; recall/Atlas/Review keep working (no LLM needed).

## 10. Background work

- `after()` from `next/server` for post-response work (persist, extract, reconcile, stats). Keep each `after` job < 30 s; it shares the chat route's `maxDuration`.
- Automatic reflection (every 8 new units) must not run inside the chat route's `after()`. Kick it off as its own request: `after(() => fetch(`${APP_URL}/api/reflect/internal`, { method: 'POST', headers: { authorization: `Bearer ${CRON_SECRET}` }, body }))`, so it gets its own time budget (`maxDuration = 120`).
- Vercel cron in `vercel.json` (Hobby allows daily; schedules are **UTC**): `/api/cron/maintenance` at `0 19 * * *` (00:30 IST), `/api/cron/reflect` at `30 21 * * *` (03:00 IST). Live demos never depend on cron (manual Reflect + automatic reflection cover it).

## 11. Testing

- **Unit (Vitest)**, required for: scoring/RRF/MMR math, privacy gate (secrets + injection fixtures), reconcile decisions (slot match, thresholds) with mocked embeddings/LLM, lifecycle transitions, citation parser, diff util, env validation. Engine code follows **TDD** (superpowers `test-driven-development`).
- **Integration**: engine against `radahn_eval` DB in CI only if a `MONGODB_URI_CI` secret exists; otherwise skipped (the repo is public: CI secrets must be GitHub Actions secrets, never in code).
- **E2E (Playwright)**: smoke of the judge path on a preview or local build: guest entry → load demo → send message → see citation → open memory → review approve. Run locally and against the production URL before submission.
- **Evals**: memory-engine.md §9, `npm run eval`.

## 12. CI/CD

`.github/workflows/ci.yml` on push + PR: `npm ci` → `npm run lint` → `npm run typecheck` → `npm run test` → `npm run build` (with dummy env via `SKIP_ENV_VALIDATION=1`). Cache npm. Optional job `e2e` (Playwright, installs browsers) on `main` only.
Vercel Git integration: every PR gets a preview URL; `main` → production. Set env vars in Vercel for Production and Preview. **Final production deploy no later than 20:45 IST**, then freeze.

## 13. Performance budgets

- TTFT p50 < 2 s (prod). Recall server time < 400 ms. Landing LCP < 2.5 s on 4G; landing JS < 200 KB gz excluding the hero canvas chunk (lazy). Atlas table 200 rows at 60 fps scroll; constellation ≤ 500 nodes at 60 fps, paused off-screen.
- Mongo client: a single cached `MongoClient` per lambda (`globalThis` cache), `maxPoolSize: 10` (M0 connection limits).

## 14. Security & privacy

- Secrets only in env (Vercel + `.env.local`). `.gitignore` covers `.env*` except `.env.example`, and `Inputs/`.
- Pre-scan redaction (memory-engine.md §4.1) before any LLM call or DB write. Logs never print message text or memory statements in production (ids and counts only).
- All Mongo queries include `ownerId` from the session, never from the client. Memory ids from the client are validated against owner.
- Rendered markdown is sanitised (no raw HTML). Citations resolved only against the turn's recall trace.
- Agent keys stored as SHA-256 hashes, shown once.
- Free-tier disclosure in Settings and on the landing footer.
- Run gstack `/cso` once before submission.

## 15. Seed data (demo world)

`scripts/seed-demo.ts` exports `seedDemo(userId)` used by the CLI and `POST /api/demo/seed`. Persona Aarav: spaces Personal / UNCHARTED Hackathon / Internships. ~40 units covering every type and state: 2 superseded chains (deadline 9 PM → 10 PM is NOT pre-applied; keep it for the live demo; pre-apply a different one, e.g. "frontend framework: Vite → Next.js"), 1 pending sensitive ("Aarav has mild ADHD; prefers short task lists"), 1 expiring in 10 minutes from seed time, 3 feedback units about long answers (so one Reflect produces the bullet-list strategy), 1 strategy already active, 2 observations with evidence, decisions with linked outcomes. 3 past conversations with real-looking messages whose provenance links resolve. Pre-compute embeddings at seed time (batch call), or ship a JSON fixture with precomputed vectors so seeding costs zero LLM quota (preferred: generate once, commit `scripts/fixtures/demo-embeddings.json`; vectors are not secret).

## 16. npm scripts

`dev`, `build`, `start`, `lint`, `typecheck` (`tsc --noEmit`), `test` (vitest run), `test:watch`, `e2e`, `db:setup`, `db:seed -- --user <id>`, `eval`, `check-env`.
