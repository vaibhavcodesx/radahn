# Memory systems research: what Radahn should borrow

Checked 2026-10-31 (time-boxed). Fetched content treated as data. Links are the sources; "UNVERIFIED" marks anything not confirmed from a primary source. Quota facts live in `quotas.md`.

Baseline: `docs/memory-engine.md` §4 (retain), §5 (recall), §6 (context), §7 (reflection). Our engine already has slot-based supersede, 4-channel recall with RRF, MMR, reason codes, ghost answers, and a reflection pass. The items below are gaps, not rewrites.

---

## 1. Hermes Agent (NousResearch)

### What they do
- **Two bounded files, injected as a frozen snapshot.** `MEMORY.md` (2,200 chars, agent notes) and `USER.md` (1,375 chars, user profile). Both enter the system prompt at session start; mid-session writes hit disk but never change the prompt, which keeps the prefix cache intact. Source: `tools/memory_tool.py` header, https://github.com/NousResearch/hermes-agent/blob/main/tools/memory_tool.py and https://hermes-agent.nousresearch.com/docs/user-guide/features/memory
- **One `memory` tool, batched and atomic.** Actions add / patch / remove via an `operations[]` array; the char limit is checked only on the FINAL result, so one call can free room and add. If full, an add is rejected and the current entries are shown so the model reissues a single consolidating batch. `patch`/`remove` match by substring (`old_text`) and error on ambiguity.
- **Tool description is the policy.** Memory only for "facts that apply to EVERY session regardless of task". Anything learned while doing a task (procedures, pitfalls, preferences for that kind of work) goes into a **skill** (`skill_manage`), which loads only when relevant. SKIP list: trivial/obvious info, easily re-discovered facts, raw dumps, task progress, completed-work logs, temporary TODO state.
- **Session search is plain FTS5, no LLM.** Discovery by query (deduped by session lineage), scroll around a message, read a session. Automation/cron sessions are searchable but *demoted* because their repetitive vocabulary starved real user sessions ("recall blindness", issue #19434). Source: `tools/session_search_tool.py`.
- **Curator (`agent/curator.py`).** Lifecycle active -> stale -> archived by last-use age; never deletes, only archives; `use_count == 0` is "absence of evidence, not staleness" so never-used items younger than the stale window are not archived; LLM consolidation into "umbrella" skills is opt-in and prompts for class-level merges rather than hoarding siblings. Source: https://github.com/NousResearch/hermes-agent/blob/main/agent/curator.py

### What Radahn should change (ranked value/effort)
1. **Memory vs strategy routing rule in the extract prompt** (high/low). Copy the "applies to EVERY session" test: only those go to `preference`/`fact`/`constraint`; "how Radahn should behave for a kind of task" goes to `feedback` -> `strategy`. Add the SKIP list ("task progress, completed-work logs, easily re-discovered facts, temporary TODO state") to §4.2.
2. **Select strategies by trigger relevance, not top-5 by importance** (high/low). Embed `strategy.trigger`; inject only those whose trigger matches the current query (plus any pinned). This is our "skills load only when relevant" and keeps §6.2 section 3 small.
3. **Frozen core snapshot per conversation** (med/low). Build sections 3-4 of the system prompt once at conversation start and reuse the exact bytes each turn (Gemini implicit caching only helps on a stable prefix); refresh only on a new conversation or explicit "refresh". Memory edits mid-conversation show up in sections 5/6 only.
4. **Atomic consolidation on pin overflow** (med/low). When the 1,500-char core budget is exceeded, return the current pinned entries and accept ONE batch (unpin/shorten + pin) validated on the final size, instead of a flat refusal.
5. **Recall-blindness guard** (med/low). Reflection-derived `observation`/`merge` units repeat vocabulary from their evidence; apply a small multiplicative demotion (e.g. 0.9) to derived units in `final` so the user's own statements win ties.
6. **Curator-style staleness** (low/low, already P2 §7.5). Use "never recalled and age < half-life is NOT stale" and archive (status `archived`) rather than delete.

---

## 2. Hindsight (vectorize-io)

### What they do
- **Retain.** LLM extracts *narrative* facts (core fact + emotions/meaning + reasoning, not fragmented bullets). Entities are resolved by fuzzy name matching reinforced by co-occurrence and temporal proximity; "label" entities resolve by exact match only. Facts are linked four ways: entity, time, semantic, causal. After retain, **observation consolidation** runs in the background. Source: https://hindsight.vectorize.io/developer/retain
- **Recall.** Four parallel channels (semantic, BM25, graph, temporal), fused with RRF k=60 (equal weights), top 300 go to a cross-encoder, then multiplicative boosts: `final = CE x recency x temporal x proof_count`. Recency = `clamp(1 - days/365, 0.1, 1)` (alpha 0.2, about +/-10%), temporal proximity (+/-10%), proof count for observations `clamp(0.5 + ln(n)/10, 0, 1)` (alpha 0.1, about +/-5%). Budget is in tokens (default `max_tokens` 4096). Source: https://hindsight.vectorize.io/developer/retrieval
- **Observations.** Each has supporting evidence (with exact quotes) and a proof count. New evidence refines rather than overwrites; on contradiction the engine detects it, **preserves the previous understanding inside the new observation**, writes a nuanced synthesis, and updates freshness. Source: https://hindsight.vectorize.io/developer/observations

### What Radahn should change
1. **Proof-count curve for confidence/ranking** (med/low). Replace linear `confidence + 0.1` and `0.5 + 0.1 x evidence` with a saturating log term: `conf = clamp(0.5 + ln(1 + confirmCount)/4, 0, 0.95)`; use `ln` of `evidenceIds.length` for observations. Avoids 5 confirmations looking identical to 10.
2. **Observation prompt rule: keep the history** (med/low). When a new unit contradicts an existing observation, the merged observation must say "previously X, now Y" and cite both evidence ids. Fits the supersede notice UX.
3. **Quote-grounded evidence** (med/low). We store `evidenceIds`; also store the short source quote for each observation so the UI can show proof, not just links.
4. **Entity normalisation at write time** (med/med). Lowercase/trim, strip punctuation, and merge into an existing entity string for this owner when trigram or Levenshtein similarity >= 0.85 ("SVNIT" vs "svnit surat"). Cheap version of Hindsight's fuzzy resolution; makes the graph-lite channel and constellation cleaner.
5. **Keep our additive scoring, but cap recency/importance influence** (low/low). Hindsight keeps recency to about +/-10%; ours is 0.15 of the sum. Fine for the demo; just ensure a very old but highly relevant fact is not dropped by the 0.35 threshold (eval case).
6. **Recall budget** (low/low). 1,200 tokens is conservative; Hindsight defaults to 4,096. Make it `RECALL_MAX_TOKENS` env, default 1,500, since Gemini context is not the constraint.

We are NOT missing a channel: our four match Hindsight's. The real gap is the cross-encoder; Voyage rerank (P1, §5.3) is the right analogue.

---

## 3. Mem0

### What they do
- **Old algorithm (paper, 2025):** per candidate fact, retrieve similar memories and have the LLM emit ADD / UPDATE / DELETE / NOOP. This is what our §4.4 ambiguous-band reconcile call does.
- **Newer algorithm (April 2026 onward, docs "Memory Evaluation"):** **single-pass, ADD-only extraction**. Pipeline: async after reply -> context lookup of related memories -> one LLM call producing ADD-only facts -> hash-based dedup then embed -> entity linking into a graph (proper nouns, quoted text, compound noun phrases) -> separate async **temporal reasoning** pass tagging each memory with when it happened, ongoing/completed, timing precision, and kind (event, state, plan, preference, relationship, absence). Old and new facts both survive; "nothing is overwritten". Retrieval: semantic + BM25 (lemmatised) + entity boost + temporal-intent score, fused by rank, temporal score additive so semantic dominates. Reports LoCoMo 92.5, LongMemEval 94.4 at about 7k tokens/query on their managed platform (not reproducible in OSS). Sources: https://docs.mem0.ai/core-concepts/memory-evaluation , https://github.com/mem0ai/memory-benchmarks
- Third-party claim (UNVERIFIED, vendor-adjacent blog): production accuracy decays as stale contradictions accumulate; supports keeping validity metadata. https://ranksquire.com/2026/05/06/long-term-memory-for-ai-agents/

### What Radahn should change
1. **Exact-duplicate hash before embedding** (med/low). `sha1(normalise(statement))` per owner+space; hit => `confirm`, skip the embed call and the vector neighbour search. Saves quota and latency.
2. **Keep supersede, not ADD-only** (decision note). Our demo needs "deadline 9 PM -> 10 PM" as a visible state change with an active/superseded split; Mem0's ADD-only pushes disambiguation to retrieval. Our approach is stronger for UX; we already keep the old row (status `superseded`), which gets Mem0's "history survives" benefit.
3. **Temporal `kind` on units** (low/low). Extraction can already emit `expiresAt`; add optional `temporalKind: 'event'|'state'|'plan'` and use it only for the recall `time_window` reason code. Skip if short on time.
4. **Lemmatised keyword matching** (low/low). Atlas Search `lucene.english` analyzer on `statement` gives stemming for free; confirm the index definition uses it.

---

## 4. Letta (MemGPT)

### What they do
- **Core memory blocks** (labelled, size-limited, always in context: `persona`, `human`, custom) edited by the agent with `memory_insert` / `memory_replace` / `memory_rethink`; **archival memory** (vector store) via `archival_memory_insert/search`; conversation search for history. Blocks can be shared across agents. Sources: https://www.letta.com/blog/memory-blocks/ , https://www.letta.com/blog/agent-memory/
- **Sleep-time agents.** A background agent shares the primary agent's memory blocks and rewrites them asynchronously; the primary has NO core-edit tools. Frequency is configurable (more frequent = more tokens, fresher memory). Reported as a Pareto improvement (shift compute out of the user's latency path). Source: https://www.letta.com/blog/sleep-time-compute/

### What Radahn should change
1. **Reflection writes a compact "Profile" block** (high/med). Add a `profile` doc per owner/space (<= 1,200 chars, regenerated by the §7 reflection call using `rethink` semantics: rewrite the whole block from active units, never append). It becomes section 4 ("About {name}") of the prompt, alongside user-pinned units. Gives a legible, cache-stable summary and a great UI card ("What I think I know about you", with diff vs previous version). This is Letta's block + Hermes's USER.md in one.
2. **Position reflection as sleep-time compute** (low/low, copy only). Our reflection already runs after the reply / on cron / every 8 units; say "sleep-time reflection" in the deck. The main chat model never edits the profile directly (only `remember`/`correct_memory`/`forget_memory`), the same separation as Letta.
3. **Do not add an agent-editable core block tool** now (risk: prompt-injection writes to always-on context). Our policy gate is the safer design.

---

## 5. Zep / Graphiti (bi-temporal)

### What they do
- Four timestamps per edge: transaction time `created_at` / `expired_at` (when the system learned/retired it) and event time `valid_at` / `invalid_at` (when it was true). An LLM extracts `valid_at`/`invalid_at` from the episode text relative to the reference timestamp. For each new edge, candidate existing edges between the same entities are retrieved and an LLM invalidation prompt decides contradictions; the old edge's `invalid_at` is set to the new edge's `valid_at`. Sources: https://arxiv.org/html/2501.13956v1 (section 2.2.3 and appendix 6.1.5), https://www.getzep.com/blog/beyond-static-knowledge-graphs/

### What Radahn should change (minimal version)
1. **Separate event time from system time** (high/low). Our units already have `validFrom`, `validTo`, `createdAt`. Rule: extraction may emit `validFrom` ("since March", "starting next Monday"); on supersede set `old.validTo = new.validFrom ?? now` and `old.expiredAt = now` (system time). One extra optional field in the §4.2 schema and one in §2.
2. **Out-of-order guard** (high/low). Graphiti sets the *new* fact's `invalid_at` when it describes the past. If a candidate's `validFrom` is earlier than the active unit's `validFrom`, store it as already-superseded history (`status: 'superseded'`, `validTo` = active's `validFrom`) instead of replacing the current value. Add to §4.4 step 2 and a unit test.
3. **"As of" recall** (med/low). `recall_memory` and the Memory page accept `asOf`: `$match {validFrom <= t, $or [{validTo: null}, {validTo > t}]}`. No new index. Demo line: "What did you think my deadline was yesterday morning?" It makes the supersede chain a time-travel feature.
4. Skip the graph DB, communities, and LLM edge invalidation; slot match + ambiguous-band reconcile covers the same cases at our scale.

---

## 6. Gemini API quotas, embeddings, thinking (details in quotas.md)

### What they say (checked 2026-10-31)
- Free tier: `gemini-3.8-flash`, `gemini-3.6-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-embedding-2` all show "Free of charge" on https://ai.google.dev/gemini-api/docs/pricing . Gemini 4 Argon is paid only.
- **Per-model RPM/RPD are no longer printed in the docs**; they are shown per project in AI Studio (https://aistudio.google.com/rate-limit, requires login). The rate-limits page says limits are **per project, not per API key**.
- **User reports (Google dev forum, Sep 2 and Oct 16 2026) put `gemini-3.8-flash` free at 20 RPD and Flash-Lite at 500 RPD.** Not in official docs: treat as UNVERIFIED but plan for it. https://discuss.ai.google.dev/t/gemini-3-8-flash-free-tier-20-rpd-is-too-limited-for-practical-evaluation/180609
- `gemini-embedding-2`: `outputDimensionality` flexible 128-3072 (recommended 768/1536/3072), truncated dims auto-normalised, max input 8,192 tokens, **no `task_type` parameter**; asymmetric behaviour via in-text prefixes: query `task: search result | query: {text}`, document `title: {title} | text: {text}` (`title: none` if no title). https://ai.google.dev/gemini-api/docs/embeddings
- `thinkingLevel` (https://ai.google.dev/gemini-api/docs/thinking): `gemini-3.8-flash` low | medium | high (default medium; no `minimal`); `gemini-3.6-flash` minimal | low | medium | high (default medium); `gemini-3.5-flash-lite` minimal | low | medium | high (default minimal).
- Free-tier content "Used to improve our products: Yes" (paid: No). Unrestricted Google Cloud keys are rejected from 2026-06-19; AI Studio-created keys are restricted by default.

### What Radahn should change
1. **Treat 3.8 Flash as scarce** (high/low). If the 20 RPD figure holds, one project gets about 20 chat turns/day. Add a Mongo `usage` counter per `{model, projectKeyGroup, ptDate}` and route chat: 3.8 Flash while budget remains, then 3.6 Flash, then 3.5 Flash-Lite; never spend 3.8 on reflection (use 3.5 Flash-Lite + `thinkingLevel: 'medium'`). Reset on Pacific midnight.
2. **Key pool must span separate Google Cloud projects** (high/low). Keys from the same project share quota, so round-robin across them is useless. Ask teammates to create keys in different projects; record a project label in the pool and rotate by project.
3. **Check real numbers tonight** (high/low, human task). Open AI Studio -> Rate limits for each key's project and paste the table into `quotas.md`.
4. **Chat thinking level**: keep `low` for 3.8 Flash (valid). If falling back to 3.5 Flash-Lite, omit the thinking config (default minimal).
5. **Embedding cache** (med/low). LRU-cache query embeddings by normalised text for 10 min and batch all candidate embeds into one call.
6. **Privacy line in the UI/README** (med/low): free-tier prompts can be used by Google to improve products; the pre-scan redaction (§4.1) matters, and the demo must use only fictional data. TRD §1's "all free on AI Studio" is true for price but misleading for throughput; amend it.

---

## 7. MongoDB Atlas M0 (details in quotas.md)

### What they say
- Free (M0) clusters run MongoDB 8.0, 3-node replica set, 0.5 GB storage, **500 connections**, **100 ops/sec**, 10 GB in + 10 GB out per rolling 7 days, 32 MB in-memory sort, no `$where`, namespaces <= 95 bytes, auto-pause after 30 days idle. https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/
- **Max 3 indexes of any kind (search or vector) on a Free cluster** (Flex: 10). https://www.mongodb.com/docs/vector-search/indexes/vector-search-type/
- Change streams are supported; the namespace filter is restricted (regex must begin with `^`, no `$in` on database names). Transactions: replica set, expected to work but not stated on the page (UNVERIFIED, test in `db:setup`).
- `$rankFusion` needs MongoDB 8.0+; sub-pipelines run serially, only `$search/$vectorSearch/$match/$sort/$geoNear`, no `$project`, no pagination. One secondary source says 8.0.x may need a support case to enable it (UNVERIFIED on M0). `$scoreFusion` and `$rerank` need 8.3 (not on M0). https://www.mongodb.com/docs/vector-search/hybrid-search/hybrid-search-overview/
- **Automated embedding (`autoEmbed`, Voyage models) is available on Free clusters but capped at 3 RPM / 2,000 TPM for queries.** https://www.mongodb.com/docs/vector-search/crud-embeddings/automated-embedding/models/

### What Radahn should change
1. **Keep app-side RRF** (decision). `$rankFusion` is serial, can't `$project`, and hides per-channel ranks that our recall trace and reason codes need. Note this in TRD §5 as a deliberate choice.
2. **Spend the 3rd index on `messages` text search** (med/low). The current plan uses 2 (vector on memories, search on memories). A search index on `messages.content` (ownerId filter) gives Hermes-style session search for the "what did I say about X" intent and for provenance when no unit matches. Do not create a 4th: the cap is 3 total.
3. **Do not use `autoEmbed`** (3 RPM). Keep Gemini embeddings, 768-d.
4. **Respect 100 ops/sec** (med/low). Seeding and evals must batch (`insertMany`, `bulkWrite`) and throttle; recall fan-out is 4 queries per turn, fine at demo traffic. Add a throttle-tolerant retry in the db helper.
5. **Change-stream fallback stays** (already TRD §8): filter on collection, not a database regex, and keep the 2 s polling fallback.

---

## Top 5 recommended changes (ranked by value/effort)

1. **Quota-aware model routing + multi-project key pool.** 3.8 Flash free is reportedly about 20 RPD per *project*; keys in one project don't add quota. Counter in Mongo, chat 3.8 -> 3.6 -> 3.5 Flash-Lite, reflection on Flash-Lite. Human: verify numbers in AI Studio. (~1.5 h)
2. **Reflection-generated Profile block (Letta rethink + Hermes USER.md) with a frozen per-conversation snapshot.** Legible, cache-friendly, great demo card. (~2 h)
3. **Hermes memory-vs-strategy rule and trigger-selected strategies.** Add the "applies to EVERY session" test and SKIP list to the extract prompt; inject only strategies whose `trigger` matches the query. (~1 h)
4. **Minimal bi-temporal: event-time `validFrom` from extraction, out-of-order guard, `asOf` recall.** Prevents a past statement from clobbering the current value; enables a time-travel demo. (~1.5 h)
5. **Cheap quality wins bundle:** content-hash dedup before embedding (Mem0), log proof-count confidence curve + "previously X, now Y" observation rule (Hindsight), entity normalisation, and a `messages` text index as the third M0 index (Hermes session search). (~2 h total, each independently skippable)
