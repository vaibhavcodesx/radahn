# Codex tasks — Radahn memory engine

Read first: `AGENTS.md`, `docs/memory-engine.md` (all), `docs/TRD.md` §1, §3, §5, §9–§11, `docs/architecture.md` §2–§3, `docs/research/memory-systems.md`, `docs/research/quotas.md`.
Contracts (Claude owns; read-only for you): `src/server/memory/types.ts`, `src/server/memory/index.ts` (the `MemoryEngine` interface), `src/server/db/collections.ts`, `src/lib/chat-types.ts`.
Worktree: `git worktree add ../radahn-codex -b codex/engine` (one branch per task is fine: `codex/c1-llm`, `codex/c2-gate`, …). PR into `main` after each task; CI must be green. Rebase on `main` after each merge.

**Deadline:** C1–C4 merged by **10:30 IST** (Checkpoint A). C5–C6 by 12:00. C7–C8 by 15:00. Hard freeze 21:00.

## LEAD NOTES (Claude, 05:15 IST) — read first
- **Merged to main:** C1, C2, C3, C4, C5 (stack `codex/c5-tools`). 136 tests green. Deployed.
- **Self-test on Vercel (real Atlas + Gemini):** 9/11 pass, warm recall 26 ms. **FAILING:** `transactional-slot-reconcile-and-idempotency` (1.7 s) and `explicit-correction-review-and-forget` (depends on it). Fix these first — slot supersede is demo beat 4 ("deadline 9 PM → 10 PM").
- **Prod flips to MEMORY_ENGINE=real as soon as `seedDemo` / `removeDemo` / `deleteAll` exist (C6)** — the judge path starts with "Load demo memories". So order: fix the 2 failing checks → C6 → C7 (reflection; `listReflections` is called by the Activity page) → C8 (`graph`, `insights`; Activity calls `insights` and tolerates errors).
- **Gate feedback (C2):** (a) the `act as` injection rule blocks legit memories like "Aarav will act as team lead" — restrict it to instruction-shaped text (e.g. "act as (a|an|my|the)? ?(system|assistant|ai|admin|developer)"); (b) the ≥ 24-char entropy rule redacts ordinary URLs (GitHub links). Exempt `https?://` tokens without credential-shaped query params.
- **Registry (C1) integration edit by Claude:** `gemini-3.8-flash` hung > 25 s with no 429 at 05:10; I added `markSlow/isSlow/isTimeout` and timeout → next model in `withFallback`. Keep these exports (the chat route uses `markSlow`).
- Mock engine now uses your `gate.preScan`.

## OVERNIGHT NOTES (added 04:40 IST — the humans are asleep until ~08:30; work autonomously)

- **Nobody will answer questions until ~08:30.** Make sensible calls, write them in the PR description and `CHANGELOG.md`, keep going. Claude reviews and merges your PRs as soon as CI is green (it polls). Don't wait for a merge to start the next task: branch the next task off your previous branch if it depends on it, and say so in the PR.
- **Atlas is NOT reachable from this machine** (campus network resets the TLS handshake after TCP connects) and there is **no Docker**, so no local MongoDB. Therefore:
  - Unit tests: mock the DB/LLM (as planned). This is the main safety net.
  - Integration: write checks in `src/server/memory/selftest.ts` (`runSelfTest()`, yours). After your PR is merged and deployed, run them on Vercel against real Atlas + Gemini:
    `node -e "require('@next/env').loadEnvConfig(process.cwd());fetch('https://radahn-ai.vercel.app/api/admin/selftest',{method:'POST',headers:{authorization:'Bearer '+process.env.CRON_SECRET}}).then(r=>r.json()).then(j=>console.log(JSON.stringify(j,null,2)))"`
    (your `.env.local` copy has `CRON_SECRET`; never print it). Use a throwaway owner `eval:selftest:<timestamp>` and clean up.
  - Gemini IS reachable from this machine (only Mongo is blocked), so `scripts/smoke-llm.ts` works locally.
- **DB is set up** on Atlas `radahn` (all collections, validator, indexes, `memories_vec` + `memories_text` READY, transactions verified). Re-run via `POST /api/admin/db-setup` (same auth) after you change `src/server/db/setup.ts` definitions (that module now holds the definitions; `scripts/db-setup.ts` is a thin CLI wrapper; you own both).
- **No `radahn_eval` database**: M0 allows 3 search indexes per *cluster*, and `radahn` uses 2. Evals run in `radahn` with owners prefixed `eval:` and delete their data afterwards. Change `npm run eval` accordingly (C8): it can call a `/api/admin/eval` route — add `src/server/memory/evals.ts` exporting `runEvals()` and Claude will expose the route; or run the deterministic part locally with mocks.
- **Additive contract changes are pre-approved overnight** (new optional fields, new `MemoryEngine` methods). Add the method to the interface in `index.ts`, implement it in `real.ts`, add a trivial version to `mock.ts` so the build stays green, and describe it in the PR. Breaking changes still need Claude.
- Prod runs `MEMORY_ENGINE=mock` until C2+C3+C4 are merged and the self-test passes; then Claude flips it to `real`. Make that moment come early: C1→C4 first, smallest viable versions, then deepen.

### Extra tasks after C8 (in this order)
- **C9 Maintenance** [status: implemented 06:18; guest purge awaits lead auth guard]: `lifecycle.ts` exports `runMaintenance({ now })`: flip expired units (+events), backfill `needsEmbedding` units, purge guest owners inactive > 7 days (all collections in `OWNED_COLLECTIONS` + `user_settings`; Better Auth `user` docs with `isAnonymous: true` and no session in 7 days). Claude wires `/api/cron/maintenance`.
- **C10 Agent keys + MCP engine side** [status: implemented 06:25, lead MCP wiring pending]: `agentKeys.ts`: `createAgentKey(ownerId, name, spaceKeys) → { id, key (shown once), prefix }` (store sha256 only), `verifyAgentKey(rawKey) → { ownerId, spaceKeys, name } | null`, `listAgentKeys`, `revokeAgentKey`. Writes from agents use actor `{kind:'external_agent', name}`. Claude builds `/api/mcp`.
- **C11 Conflicts for the Review inbox** [status: implemented 06:34, lead inbox wiring pending]: `listConflicts(ownerId)` = pairs of active units in the same space with cosine ≥ 0.85, different slot values or an LLM-judged contradiction (batch, `fast` chain, cached on the units as `conflictWith`), and `resolveConflict({ownerId, keepId, dropIds})` → supersede with reason `conflict_resolution`.
- **C12 Time travel** [status: implemented 06:43, lead route/tool wiring pending]: `asOf?: string` on `ListMemoriesInput` and `RecallInput` (§bi-temporal: `validFrom <= t` and (`validTo` absent or `> t`), statuses active+superseded). Demo line: "What did you think my deadline was this morning?"
- **C13 Profile block** (Letta rethink): reflection also writes a ≤ 1,200-char "what I know about {name}" summary per owner in a new `profiles` collection (`{_id: ownerId, text, version, updatedAt, evidenceIds}`), returned in `RecallResult` as `profile?: string` and used as the "About" section when present. Keep the previous version for a diff.
- **C14 Tuning**: run the evals, tune weights/thresholds, record before/after numbers in `evals/results.md` and `CHANGELOG.md`.

## How the engine plugs in

- The app calls only `engine()` from `src/server/memory/index.ts`. `MEMORY_ENGINE=mock` serves `mock.ts` (Claude's fixture engine); `MEMORY_ENGINE=real` serves `real.ts` — **your file**. Replace each `notImplemented` in `real.ts` as you go. Put logic in focused modules under `src/server/memory/` (`gate.ts`, `recall.ts`, `score.ts`, `reconcile.ts`, `extract.ts`, `lifecycle.ts`, `reflect.ts`, `seed.ts`, `insights.ts`, `prompts/*.ts`) and have `real.ts` wire them.
- `context.ts` (system prompt + ghost prompt) is shared by both engines. You own it from C3 on; tune the wording, keep the signatures.
- `mock.ts`, `mock-gate.ts`, `fixtures/demo.ts` stay as Claude wrote them except: `fixtures/demo.ts` is yours to extend in C6.
- DB access: `collections()` from `src/server/db/collections.ts` (typed). Embeddings + LLM: `src/server/llm/registry.ts` (`embed`, `generateStructured`, `generatePlain`, `withFallback`, `candidates`, `report`) — you own its internals from C1, names and signatures are the contract (Claude's chat route uses `candidates` + `report` + `thinkingOptions` + `modelLabel` for streaming).
- Every function receives `ownerId` from the session. **Every query filters by `ownerId`.** No `console.log` of statements or message text (ids and counts only).
- Events: every state change writes a `memory_events` doc (types.ts `MemoryEvent`), with `messageId` when a chat turn caused it. Claude's SSE route watches that collection (change stream) and turns `messageId`-tagged events into the write chips. No content in `forgotten`/`blocked` summaries.
- AI SDK is **v7**: there is no `generateObject`; use `generateText({ output: Output.object({ schema }) })` (already wrapped as `generateStructured`). zod is v4. mongodb driver is v7. Check Context7 / `node_modules/ai/docs` before using an API.

## Decisions from research (apply them; they override memory-engine.md where they differ)

1. **Quota is the real limit** (quotas.md): `gemini-3.8-flash` free tier may be ~20 requests/day per Google *project*; keys from the same project share quota. Route by quota state, don't round-robin blindly.
2. **Reflection runs on `gemini-3.5-flash-lite`** with `thinkingLevel: 'medium'` (not 3.8 Flash). Update `MODEL_CHAINS.reflect` in C1.
3. **Extraction prompt** adds Hermes's rule: store as preference/fact/constraint only what "applies to every future session regardless of task"; how Radahn should behave for a kind of task → `feedback`. SKIP list: task progress, completed-work logs, easily re-discovered facts, temporary TODO state, the assistant's own suggestions not accepted by the user.
4. **Strategies are selected by relevance**, not top-5 by importance: score active strategies against the query (cosine on their embedding), take those ≥ 0.6 plus any pinned, max 3; if intent is `plan`, always include plan-related strategies. Return them in `RecallResult.strategies`.
5. **Exact-duplicate hash** before embedding: `sha1(normalise(statement))` per owner+spaceKey → `confirm` without an embed call.
6. **Confidence curve:** on confirm, `confidence = min(0.95, 0.5 + ln(1 + confirmCount)/4)` (saturating, Hindsight-style), not `+0.1`.
7. **Out-of-order guard (bi-temporal):** extraction may return `validFrom` (ISO). If a slot candidate's `validFrom` is *earlier* than the active unit's `validFrom`, store it as already-superseded history instead of replacing the current value. On supersede set `old.validTo = new.validFrom ?? now`.
8. **Keep app-side RRF** (not `$rankFusion`): we need per-channel ranks for the trace.
9. M0 allows **3 search/vector indexes total**. We use 2 (`memories_vec`, `memories_text`). Chat-history search uses a classic `$text` index (does not count).

---

## Task C0 — Database setup            [status: done 04:38 by Claude — Atlas radahn fully set up; Codex owns it from now]
Files: `src/server/db/setup.ts` (definitions), `scripts/db-setup.ts` (CLI), `POST /api/admin/db-setup` (runs on Vercel). Creates collections, the `memories` `$jsonSchema` validator, all TRD §5.2 indexes, and the two Atlas Search indexes (polls until queryable). Idempotent. Run against `radahn` and `radahn_eval` (`MONGODB_DB=radahn_eval npm run db:setup`). Extend it if you add fields or indexes.

## Task C1 — LLM registry: quota-aware routing + embeddings      [status: merged 04:46 by Claude (PR #1)]
Files: `src/server/llm/**` (+ tests).
- Key pool from `env().GEMINI_API_KEYS` (already trimmed). Fingerprint each key as `sha256(key).slice(0,6)`; never log keys.
- State in `llm_usage` (`LlmUsageDoc`, `_id = "${keyFp}:${model}"`): on a 429 whose message mentions per-day / daily quota → `exhaustedUntil` = next midnight America/Los_Angeles; other 429/RESOURCE_EXHAUSTED → `cooldownUntil = now + 60 s`; 5xx/timeouts → retry once with jitter, then next candidate. Cache the state in-process for 10 s so `candidates()` costs ~0 ms on the hot path.
- `candidates(role, preferred?)` returns live (key, model) pairs in chain order: best model first, rotating keys within a model.
- `embed(items, kind)`: one `embedMany` call per batch (≤ 100), prefixes as already written, 8 s timeout, falls through keys. Add a 10-minute in-process LRU cache for **query** embeddings keyed by normalised text.
- Tests (mocked fetch / mocked provider): exhausted pair is skipped; cooldown expires; key rotation; prefixes applied; no key ever appears in an error message.
Done when: unit tests green; `npx tsx scripts/smoke-llm.ts` (write it) prints which model served a 1-token call and a 768-length embedding.

## Task C2 — Privacy gate      [status: merged 05:12 by Claude]
Files: `src/server/memory/gate.ts` (+ `gate.test.ts`), wire `realEngine.preScan`.
- memory-engine.md §4.1 detectors (all of them, incl. Luhn for cards, Aadhaar 4-4-4, PAN, OTP phrasing, "password is …", entropy ≥ 4.0 for tokens ≥ 24 chars) → `PreScanResult`. Synchronous, pure.
- §4.3 candidate gate: secrets → blocked; injection patterns + invisible Unicode → blocked (`reason: 'injection'`); strip invisible chars always; sensitivity/policy → `pending_review`; length clamp 240; tautology/empty → skip.
- Tests: ≥ 1 positive and 1 negative fixture per detector; the redacted output never contains the secret; a sentence with "my password is hunter2" is redacted; "I prefer passwords managers" is not.

## Task C3 — Recall      [status: merged 05:12 by Claude]
Files: `recall.ts`, `score.ts` (pure), `context.ts`, tests. Wire `recall`, `buildContext`, `ghostContext`, `getRecallTrace`.
- §5.1–§5.6 exactly: 4 channels in parallel (semantic `$vectorSearch` numCandidates 150 / limit 40 with pre-filter `{ownerId, status:'active', spaceKey:{$in:[space,'global']}}` then `$match` on `expiresAt`; lexical `$search` compound with filters; temporal via `chrono-node` only when the query has a time expression; graph-lite on entities of top 3), RRF k=60 normalised, the `final` formula, threshold 0.35 + noise floor, MMR λ=0.7, budget 8 units / 1,200 tokens, ambiguity notice, reason codes + plain-language `why`.
- Core = pinned active units (≤ 1,500 chars). Strategies per decision 4.
- Supersede notices from the last 24 h on recalled slots → `notices` (`kind:'changed'`, text "On 31 Oct 02:10 you said 9 PM; now 10 PM").
- Persist the trace (`recalls`), update `stats.recallCount/lastRecalledAt` with one `bulkWrite` (fire-and-forget is fine).
- If the vector index is not queryable or embed fails: run the other channels; never throw for an empty result. If `$search` errors (index missing), skip lexical.
- Fill `latencyMs` per channel.
- Tests (pure `score.ts`): RRF normalisation, recency half-lives (∞ for profile/strategy), typeBoost by intent, threshold drop, MMR removes near-duplicates, budget cut; `buildContext` refs equal picks.
Done when: on the dev DB with seeded demo data, "Plan my next 4 hours." returns the 9 PM constraint, the time-box preference, and the top-16 goal in < 400 ms server time.

## Task C4 — Extraction, reconcile, transactional writes, events      [status: merged 05:12 by Claude]
Files: `extract.ts`, `prompts/extract.ts`, `reconcile.ts`, `lifecycle.ts`, tests. Wire `extractAndWrite`, `rememberExplicit`.
- §4.2 extraction on `MODEL_CHAINS.fast` with structured output (zod schema = `CandidateMemory` + optional `validFrom`), prompt per §4.2 + decision 3. ≤ 5 candidates.
- §4.3 gate (C2) → §4.4 reconcile: hint with valid target → slot match (confirm / supersede) → hash dedup (decision 5) → semantic neighbours (≥ 0.92 confirm, 0.80–0.92 one batched LLM reconcile on `fast`, < 0.80 add).
- Supersede in a **transaction** (update old: `status:'superseded'`, `validTo`, `supersededBy`; insert new with `supersedes`; both events). Duplicate-key on the partial unique index → retry as supersede.
- `expiresAt` → `purgeAt` per §3 grace rule (3 min grace if lifetime < 1 h, else 24 h).
- Events for every op, tagged with `messageId`. Return `WriteSummary` (counts + ops + notices).
- Increment `spaces.unitsSinceReflection` (space `_id` = `spaceKey` when not global); ≥ 8 → return a flag in `notices` is NOT needed — Claude's route checks the counter and triggers reflection.
- Idempotency: skip if a `memory_events` doc already exists for `(messageId, candidate hash)`.
- Tests with mocked LLM + embeddings: slot same value → confirm; slot different value → supersede (and notice text); out-of-order guard; secret candidate → blocked with no statement stored; sensitive → pending; explicit sensitive → active.

## Task C5 — Explicit tools + review + lifecycle reads      [status: merged 05:12 by Claude]
Wire `correctMemory`, `forgetMemory`, `reviewMemory`, `updateMemory`, `listMemories`, `getMemory`, `listEvents`, `pendingCount`.
- Forget = `deleteOne` + tombstone event with no statement; ambiguous query → candidates (never forget on ambiguity).
- `updateMemory`: pin budget check (1,500 chars across pinned) → throw a typed error the route maps to "consolidate first"; `expiresAt` updates `purgeAt`.
- `getMemory` returns versions chain, evidence, related, recall history (from `recalls`), events, and `raw` (the Mongo doc with `embedding` replaced by `"[768 floats]"`).
- A maintenance helper `flipExpired(ownerId?)` (exported from `lifecycle.ts`) sets `status:'expired'` + event for units past `expiresAt` (Claude calls it from cron and opportunistically).

## Task C6 — Demo seed with precomputed embeddings      [status: merged 05:26, PR #6; hosted 12/12 pass 05:29]
Files: `seed.ts`, `scripts/seed-demo.ts`, `scripts/fixtures/demo-embeddings.json` (generated once, committed), `fixtures/demo.ts` (extend if needed). Wire `seedDemo`, `removeDemo`, `deleteAll`.
- `seedDemo({ownerId, spaceIds, conversations})`: remove existing `demo:true` units for the owner, insert all `DEMO_MEMORIES` with embeddings from the JSON fixture (zero LLM calls at seed time), resolve keys → ids (supersede chain, evidence, related, provenance via `conversations`), set `expiresAt`/`purgeAt` relative to now, write one `created` event summarising the load. `insertMany` in one batch (M0: 100 ops/s).
- `scripts/seed-demo.ts --gen-embeddings` regenerates the JSON.

## Task C7 — Reflection + ghost      [status: PR #8 CI green 05:53, hosted reflection check after deploy]
Files: `reflect.ts`, `prompts/reflect.ts`. Wire `runReflection`, `listReflections`.
- §7 steps written to the `reflections` doc as they progress (Claude's UI renders `steps[]` live via change stream): gather → cluster (cosine ≥ 0.90 same type) → consolidate (one structured call on `reflect` chain) → write (one transaction).
- Validate evidence ids (drop unknown), strategies need ≥ 2 feedback/outcome evidence or 1 explicit instruction; existing strategy covering the same trigger → supersede it.
- Observation contradiction rule: merged text says "previously X, now Y" and cites both.
- Must produce the bullet-list strategy from the demo's three `feedback` units (eval case).
- Stretch (only if C1–C8 are green): reflection also rewrites a ≤ 1,200-char "profile" summary (Letta rethink).

## Task C8 — Insights + graph + eval harness      [status: implemented 06:05, hosted eval route pending]
Wire `insights`, `graph`. Files: `insights.ts`, `evals/golden/*.json`, `evals/run.ts`.
- Aggregation pipelines per types.ts `Insights` (byType, byStatus, recall hit rate = cited/recalled over 7 d, corrections this week, `storageBytes` via `$collStats` or `dbStats`, eventsPerDay).
- `graph`: nodes without embeddings, links for supersede/evidence/related.
- `npm run eval` against `radahn_eval` only: memory-engine.md §9 cases (25–40), writes `evals/results.md` with write-op accuracy, precision@5, secrets stored (must be 0), memory-changed rate, p50/p95 recall latency.

---

Status lines: change `[status: todo]` → `[status: in progress HH:MM]` → `[status: merged HH:MM, PR #n]`. Add a `[codex]` line to `CHANGELOG.md` and update `TODO.md` per task. Contract change needed? Put it in the PR description and `TODO.md`; Claude merges contract PRs.
