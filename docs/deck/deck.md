# Radahn — Deck

A personal AI agent whose memory you can see, steer, and trust.  
UNCHARTED 2026 · MongoDB Student Hackathon · Track 1: Agentic Memory  
Live: https://radahn-ai.vercel.app · Repo: https://github.com/vaibhavcodesx/radahn

---

## Slide 1: Title & Live Product

**Radahn**  
*A personal AI agent whose memory you can see, steer, and trust.*

- **Hackathon:** UNCHARTED 2026 — MongoDB Student Hackathon
- **Track:** Track 1 (Agentic Memory)
- **Live Deployment:** https://radahn-ai.vercel.app
- **Public Repository:** https://github.com/vaibhavcodesx/radahn
- **Guest Access:** Zero sign-up required — click "Enter as guest" → "Load demo memories"

---

## Slide 2: The Problem

**Most assistants forget you between tabs. The rest remember you in secret.**

- **Amnesia by Default:** Standard AI chats start from scratch every conversation. Users repeat their preferences, stack constraints, and project deadlines endlessly.
- **The Black Box of Memory:** When memory is bolted onto agents, it happens invisibly in prompt caches. Users cannot see what was stored, cannot inspect why an answer changed, and cannot remove stale assumptions.
- **The Missing Contract:** Production-grade agentic memory requires transparency: visible inline citations, inspectable recall scores, and total user control (correct, expire, forget).

---

## Slide 3: Radahn in One Line

**An agent with visible, steerable long-term memory built natively on MongoDB Atlas.**

*(Hero screenshot: Chat reply with inline citations and the Memory Lens open, displaying recalled memories and score breakdowns)*

- **Visible:** Every reply cites the exact memories that shaped it. Click any citation to inspect the underlying memory and its multi-channel score breakdown.
- **Steerable:** Review uncertain memories in an inbox, correct stale facts with automatic superseding history, set minute-level TTL expiry, or permanently forget on command.
- **Trustworthy:** Secrets and credentials are intercepted before storage; multi-channel recall and database-enforced single truth prevent hallucinations.

---

## Slide 4: Demo Flow — The Four Beats

**Tested live with Aarav Mehta — a final-year student building Kestrel with two friends.**

1. **Beat 1: Instant Entry & Demo Seeding**  
   Click *Enter as guest* → *Load demo memories*. Seeds 38 typed memories across Kestrel, Personal, and Internships spaces with pre-computed vector embeddings.
2. **Beat 2: Recall & The Ghost Diff**  
   Ask *"What is our launch plan for Kestrel?"* Radahn cites Kestrel's 7 Nov 9:00 PM IST public beta release constraint, Aarav's preference for concise bullet lists over long paragraphs, and his goal of 500 active pilots by January. Click *Without memory* to see the real-time word-level diff.
3. **Beat 3: Hard Cases Live**  
   - *Correction:* "Actually, the beta launch moved to 10 PM." (Old memory becomes *outdated* history; active record updates).
   - *Privacy:* Paste a fake key `sk-test_...` → Redacted instantly ("Not saved — looked like a credential").
   - *Review:* Sensitive memory held in Review queue until approved.
   - *Expiry:* Set memory expiry to "In 2 minutes" and watch TTL deletion.
4. **Beat 4: Atlas Exploration & Realtime Reflection**  
   Time-travel in Memory Atlas ("As of yesterday"), observe live change stream events in Activity, and trigger *Reflect now* to consolidate feedback into learned strategies.

---

## Slide 5: Memory Engine — The Write Path

**Atomic extraction, deterministic privacy gates, and transactional reconciliation.**

```
User Turn Streams ──► Privacy Pre-Scan ──► Gemini 3.5 Flash-Lite Extraction
                             │
                             ├──► Block: Secrets, keys, tokens, cards, passwords
                             └──► Hold: Health, finance, personal data → Review Queue
                                         │
Reconcile Engine (Mem0 + IHMT logic) ◄───┘
     ├── ADD: New atomic statement + 768-d vector embedding
     ├── CONFIRM: Boosts confidence on repeat observation (saturating log curve)
     ├── SUPERSEDE: Points old record to new; preserves history chain
     └── SKIP: Deduplicates exact or semantically identical statements
                 │
MongoDB Atlas Multi-Document Transaction:
     Writes to `memories` collection + Emits event to `memory_events`
```

---

## Slide 6: Recall Engine — 4 Channels, Scoring & Trace

**Fused by rank, re-scored transparently, and budgeted to 8 units.**

- **Four Parallel Recall Channels:**
  1. *Atlas Vector Search:* 768-dimensional cosine vector similarity (`gemini-embedding-2`), pre-filtered by `ownerId`, `spaceKey`, and `status: active`.
  2. *Atlas Search (Lexical):* Full-text Lucene search for exact keywords, acronyms, and codes ("Next.js", "Vercel", "Kestrel").
  3. *Temporal Window:* Recency decay based on memory type half-life and explicit time queries.
  4. *Linked Entities:* Graph-lite entity linking across shared subjects and referenced items.
- **Transparent Scoring Formula:**
  $$\text{final} = 0.55 \cdot \text{relevance (RRF)} + 0.15 \cdot \text{recency} + 0.15 \cdot \text{importance} + 0.10 \cdot \text{confidence} + \text{type boost}$$
- **Budgeting & Trace:**
  Candidate threshold = 0.35; Maximal Marginal Relevance (MMR, $\lambda = 0.7$) avoids duplicate concepts; top 8 memories injected into system prompt. Complete candidate trace with scores stored in database.

---

## Slide 7: Difficult Cases — Handled at the Data Layer

**Enforced with database guarantees rather than prompt suggestions.**

| Challenge | How Radahn Solves It | MongoDB Mechanism |
|---|---|---|
| **Correction** | "Beta launch is 10 PM." Supersedes old belief; old record marked *outdated* with link to replacement. | Partial unique index `{ownerId, spaceKey, slotKey}` where `status: 'active'`. Guaranteed 1 active truth. |
| **Expiry** | "Remind me this weekend." Stops recalling at `expiresAt`; deleted physically shortly after. | TTL index on `purgeAt`. Queries filter `expiresAt > now`; TTL monitor purges documents. |
| **Forget** | "Forget my dietary preferences." Immediate hard delete of statement and vector embedding. | `deleteOne` on `memories` + content-free tombstone logged to `memory_events`. |
| **Contradictions** | Disagreeing statements flagged during ingestion. Review UI lets user pick winner. | Stored contradiction pairs in Review page; resolution transaction supersedes loser. |
| **Private Info** | Redacts API keys, card numbers, OTPs, and passwords before LLM or DB ingestion. | Regex & entropy pre-scan gate; sensitive items routed to human Review queue. |

---

## Slide 8: Learning & Reflection — Feedback → Strategy

**Turning conversation history into learned agent behaviours.**

- **Consolidation Cycle (MemGPT / Generative Agents Lineage):**
  1. *Gather:* Unreflected feedback units, outcomes, and repeated user preferences.
  2. *Cluster:* Topic clustering and frequency analysis.
  3. *Consolidate:* Synthesizes recurring guidance into generalized behavioural rules.
  4. *Write:* Generates high-level observations and actionable strategies in `memories`.
- **Learned Strategy in Production:**
  - *Observed Feedback:* User repeatedly requests "keep it concise", "shorter please", "bullet points".
  - *Learned Strategy:* `"When asked for a plan, give at most 5 time-boxed bullets."`
  - *Visible Impact:* Automatically injected into subsequent turns; shapes the Kestrel launch plan.

---

## Slide 9: MongoDB Atlas Architecture & Features

**Eight native MongoDB Atlas capabilities powering a zero-infrastructure agent backend.**

1. **Document Model & $jsonSchema:** Typed memories, embeddings, confidence scores, and lifecycle states in a strictly validated schema.
2. **Atlas Vector Search:** 768-d vector index with pre-filters on `ownerId`, `spaceKey`, `status`, and `type`.
3. **Atlas Search (Lucene):** Full-text lexical search capturing exact tokens that vector embeddings miss.
4. **TTL Indexes:** Automatic physical expiration on `purgeAt` without custom cron jobs.
5. **Partial Unique Index:** `{ownerId, spaceKey, slotKey}` for active memories guarantees one source of truth under concurrent writers.
6. **Multi-Document Transactions:** Atomic updates across `memories` and `memory_events` ensure zero corrupted state.
7. **Change Streams:** Watches `memory_events` to stream real-time Server-Sent Events (SSE) to browser write chips and Activity feed.
8. **Aggregation Pipelines:** Real-time analytics for memory distribution by type, recall hit rates, and weekly correction counts.

---

## Slide 10: Evaluation & Measured Numbers

**Hosted production verification on MongoDB Atlas M0 + Gemini / Groq.**

*From production eval run (`evals/results.md`), 31 Oct 2026 ~16:40 IST:*

| Metric | Measured Result | Significance |
|---|---|---|
| **Live Test Cases** | **20 / 20 passed (100%)** | Validated across write-add, correction chains, cold-index recall, explicit forget. |
| **Deterministic Checks** | **31 / 31 passed (100%)** | Privacy gate, prompt injection resistance, reconcile ops, TTL grace rules. |
| **Secrets Stored** | **0 leaked / stored** | 100% interception of simulated API keys, credentials, and tokens. |
| **Write-Op Accuracy** | **1.0 (100%)** | Flawless state transitions between active, outdated, pending, and forgotten. |
| **Recall@5** | **1.0 (100%)** | Top 5 retrieved candidates captured all relevant ground-truth units. |
| **Recall Latency (p50 / p95)** | **566 ms / 571 ms** | Cold-path recall including query vector embedding and multi-channel fusion. |
| **First Memory Write (p50)** | **1,962 ms (~2.0 s)** | From completion of chat stream to committed event in change stream. |

---

## Slide 11: Limitations & Scale Story

**Honest evaluation today and clear enterprise architecture tomorrow.**

- **Current Limitations (Free Tier Constraints):**
  - *Quota Boundaries:* Gemini and Groq free tiers have small daily request limits; addressed with resilient multi-model hedging (3.6 Flash → Groq GPT-OSS 120B → 3.5 Flash-Lite).
  - *LLM Extraction Accuracy:* Extraction is probabilistic and may occasionally miss nuance; mitigated because all memories are visible, editable, and reversible.
  - *Guest Lifetime:* Anonymous sessions expire in 7 days unless linked to a Google account.
- **Enterprise Scale Roadmap (Architecture §8):**
  - *Horizontal Sharding:* Shard `memories` on hashed `ownerId`. Because every query is scoped by owner, 100% of queries target a single shard.
  - *Dedicated Search Nodes:* Move Vector Search and Atlas Search off shared M-tier nodes to dedicated Search Nodes for sub-50ms query times.
  - *Vector Quantization:* Apply scalar/int8 quantization to scale from thousands to millions of memories per cluster with 75% memory savings.
  - *Automated Embeddings:* Integrate Voyage AI automated embeddings directly in MongoDB Atlas.

---

## Slide 12: Team & AI-Assisted Architecture

**Built in 24 hours for UNCHARTED 2026 by three humans and three agents.**

- **The Team:**
  - **Vaibhav & Teammates:** Product direction, demo persona design, MongoDB schema architecture, and end-to-end evaluation.
- **Agentic Collaboration Matrix:**
  - **Claude Code (Lead):** System architecture, App Router pages, chat orchestration, Better Auth, and integration merges.
  - **Codex (Engine):** Memory engine, privacy gate, 4-channel recall, scoring algorithm, reflection pipelines, and eval harness.
  - **Antigravity (Experience):** Public landing page, production screenshots showcase, Review / Activity / Settings polish, submission deck, and demo video kit.
- **Submission Links:**
  - Live App: https://radahn-ai.vercel.app
  - Repository: https://github.com/vaibhavcodesx/radahn
  - Documentation: https://radahn-ai.vercel.app/how-it-works
