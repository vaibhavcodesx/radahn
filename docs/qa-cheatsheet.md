# Radahn — judge Q&A cheat sheet

One page to read before the demo. Answers are short on purpose; the linked docs have the detail. Numbers here are the ones measured on production on 31 Oct 2026 (see `evals/results.md`); don't quote anything that isn't on this page or in those files.

## The 20-second pitch
Radahn is a personal AI agent whose memory you can **see, steer and trust**. It saves small, typed memories from conversations (preferences, decisions, constraints, outcomes, feedback), uses them to change its next answer, and shows exactly which memory changed what and why: citations in the reply, a Memory panel with real scores, and a one-click "Without memory" comparison.

## The four beats of the Track 1 brief (where to point in the demo)
| Brief | Show this |
|---|---|
| Remembers / retrieves / updates / corrects / forgets | Chat → "Saving to memory" chips → Memory page (history, Forget bin) |
| Memory visibly changes the next response | Citation squares in the reply · Memory panel "Used" tab · **Without memory** diff |
| Inspect memory and explain why it was picked | Memory panel → **Why** tab (score formula + per-memory breakdown) |
| A difficult case | Correction ("the beta launch moved to 10 PM"), Review (sensitive / contradictions), Expire in 2 min, Forget, pasted fake API key |

## Likely questions

**Why MongoDB and not a vector database?**
Memory isn't just vectors. Each memory is a document with owner, type, source, timestamps, lifecycle state and an embedding. One database gives us vector search *with pre-filters on owner/space/status*, lexical search (Atlas Search) for exact names and codes, TTL for expiry, a partial unique index for "one current truth per fact", transactions for corrections, and change streams for the live UI. No second datastore to keep in sync.

**Which MongoDB features, exactly?** Document model + `$jsonSchema` validation · Atlas Vector Search with pre-filters · Atlas Search · TTL indexes (`purgeAt`) · partial unique index `{ownerId, spaceKey, slotKey}` where active · multi-document transactions · change streams on `memory_events` · aggregation pipelines (Activity stats). Map: `docs/architecture.md` §5.

**How does it decide what to remember?**
After each reply (in the background, so it never slows the answer): extract candidate statements with a small model → deterministic privacy gate (secrets dropped, injection patterns dropped, sensitive items wait in Review) → reconcile against what's already stored: **add**, **confirm** (same fact again), **supersede** (value changed), or **skip**. Uncertain items are asked about above the prompt box ("Remember this?").

**How does recall work? Why these weights?**
Two stages. Broad retrieval from four channels in parallel (vector, lexical, time window, linked entities), fused with Reciprocal Rank Fusion; then a focused re-rank:
`final = 0.55·relevance + 0.15·recency + 0.15·importance + 0.10·confidence + type boost`, drop below 0.35, MMR (λ = 0.7) to avoid near-duplicates, budget 8 memories. Relevance dominates on purpose; recency uses a per-type half-life (a launch date goes stale in days, a profile fact never does). The weights follow Generative Agents (recency × importance × relevance) and were tuned on our eval cases (`evals/tuning.md`). Every pick's numbers are stored in a recall trace and shown in the Why tab.

**How does a correction work?**
"Actually, the beta launch moved to 10 PM" → same subject + attribute ("slot") with a new value → in one transaction the old memory becomes *outdated* (kept as history with `validTo`), the new one becomes active. The partial unique index guarantees only one active value per slot, even with two writers racing. The Memory page **As of** control shows what Radahn believed before the change (time travel).

**How does forgetting really work?**
Three ways. **Forget** = the document and its vector are deleted immediately; only a content-free tombstone event remains. **Expire** = recall stops at `expiresAt` (query-time filter) and MongoDB's TTL monitor deletes it shortly after (it runs about every 60 s). **Reject** in Review = purged by TTL after 24 h. Guest data is kept 7 days.

**What about private data?**
Secrets (API keys, passwords, card numbers) are caught by a pre-scan *before the model sees the message* and are never stored. Health, finance, location and other people's details are saved only after you approve them in Review. A pasted fake key shows "Not saved — looked like a credential".

**Does it learn behaviour, not just facts?**
Yes: reflection. Repeated feedback ("too long", twice) becomes a **strategy** ("keep plans to ≤ 5 bullets"), backed by the feedback memories as evidence. Strategies go into the system prompt, so the next answer changes format; the Without memory diff shows the difference. Run it from Activity → **Reflect now**.

**Which models?**
Chat defaults to Gemini 3.6 Flash, with GPT-OSS 120B and Qwen 3.8 on Groq selectable in the prompt bar. If a model is slow or rate-limited, a second model starts after 3.5 s and the first to answer wins (quota-aware routing across keys). Extraction and reflection use small, fast models; embeddings are `gemini-embedding-2` (768-d).

**Can other agents use the memory?**
Yes, over MCP. Settings → Connected agents → create a scoped key; `/api/mcp` exposes search / list / save / forget. The owner and allowed spaces come from the verified key, never from tool arguments; only a SHA-256 of the key is stored. Saves from an agent show up live in Activity under its name.

**What did you measure?**
Hosted run on production, 31 Oct ~16:40: **20/20** live cases and **31/31** deterministic checks; write-op accuracy 1.0; recall@5 1.0; **0** secrets stored; recall p50/p95 566/571 ms (including the embedding call); first memory write 2.0 s after the reply (p50). Samples are small on purpose (free tier). Engine self-test: 19/19 in two of three runs (the miss is the model-dependent profile step).

**What happens at scale?**
Shard `memories` on hashed `ownerId` (every query is owner-scoped → single shard) · dedicated Search Nodes · vector quantization · Atlas automated embeddings with Voyage AI · RBAC, encryption, auditing; `memory_events` is already an app-level audit trail. (`docs/architecture.md` §8)

**What are the limitations?**
Free tiers: small model quotas, and Google may use free-tier prompts, so don't enter real secrets. Extraction is an LLM and can miss or over-remember; everything it writes is visible and reversible. The reflection profile step is model-dependent (passes most but not all self-test runs). No model reranker (Voyage was planned, not built). Guest memories last 7 days.

**Who built what?** (be honest — rulebook §05)
Claude Code (lead: architecture, app UI, routes, auth, streaming, deploy), Codex (memory engine: gate, recall, reconcile, reflection, evals), Antigravity (public pages, Review/Activity/Settings polish, deck). The three of us set direction, made the product calls, handled accounts and keys, wrote the demo persona, and tested. Be ready to walk through `docs/architecture.md` §2 (a chat turn end to end) yourselves.

## If something breaks live
- Reply slow → switch the model in the prompt bar (GPT-OSS on Groq is fastest).
- Demo memories missing → empty chat → **Load demo memories** (or Settings → Reload demo).
- Google sign-in fails → use guest; it's the judged path anyway.
