# Radahn — Submission Deck

A personal AI agent whose memory you can see, steer, and trust.  
*Submitted to UNCHARTED 2026 · Agentic Memory track*  
Live: https://radahn-ai.vercel.app · Repo: https://github.com/vaibhavcodesx/radahn

---

## Slide 1: Radahn — Memory You Can See

**Title:** Radahn — memory you can see  
**Body (≤ 25 words):** An AI agent whose memory you can inspect, steer and trust. · radahn-ai.vercel.app · *Submitted to UNCHARTED 2026 · Agentic Memory track*  
**Visual:** Logo tile + hero screenshot (`docs/deck/shots/shot-1-chat-used.png`)  
**Speaker Note (≈ 20s):** Radahn gives AI assistants long-term memory you can see, steer, and trust. It's live on production right now at radahn-ai.vercel.app with zero sign-up required—you can test it immediately as a guest.

---

## Slide 2: Assistants Remember You. Invisibly.

**Title:** Assistants remember you. **Invisibly.**  
**Body (≤ 25 words):** You can't see what they kept, why it shaped an answer, or fix one wrong fact without starting over.  
**Visual:** Three short pain lines with red constraint squares (`#D8432F`):
- Amnesia by default: standard chats forget you between tabs.
- Black-box memory: cached facts are hidden and uninspectable.
- Zero steerability: you cannot correct a single wrong belief.  
**Speaker Note (≈ 20s):** The problem with current agents isn't just that they forget—it's that when they do remember, it's bolted on as an invisible, steerable black box. If an agent assumes something wrong about you, you can't see it, inspect it, or fix it.

---

## Slide 3: Every Answer Shows Its Receipts

**Title:** Every answer shows its **receipts**  
**Body (≤ 25 words):** Citations per memory · the scores behind each pick · one click to answer again *without* memory.  
**Visual:** Screenshot: reply with citation squares + Without-memory diff (`docs/deck/shots/shot-2-diff.png`)  
**Speaker Note (≈ 20s):** Here is the core contract: every answer cites the exact memories that shaped it. Click any citation to inspect the score breakdown, or click "Without memory" to see a live word-by-word diff proving memory actually changed the answer.

---

## Slide 4: The Four Things It Does

**Title:** The four things it does  
**Body (≤ 25 words):** Remembers · Recalls and explains · Corrects with history · Forgets for real.  
**Visual:** 4 numbered cells (`01`–`04`), each paired with a focused screenshot crop:
- `01 Remembers`: Atomic extraction & typing from stream.
- `02 Recalls & Explains`: Multi-channel fusion + score breakdown.
- `03 Corrects with History`: Supersedes outdated facts automatically.
- `04 Forgets for Real`: Physical deletion with zero lingering traces.  
**Speaker Note (≈ 20s):** Radahn fulfills the entire agentic memory lifecycle: atomic extraction when you talk, transparent multi-channel recall when you ask, transactional correction when facts change, and permanent hard deletion on command.

---

## Slide 5: How a Memory Is Written

**Title:** How a memory is written  
**Body (≤ 25 words):** Privacy pre-scan → extract → policy gate → reconcile (add · confirm · supersede · skip) → transaction → live event.  
**Visual:** Horizontal flow diagram with memory-type squares on candidate items:
`Input Stream ──► Privacy Pre-Scan ──► Gemini Extraction ──► Policy Gate ──► Reconcile ──► Atlas ACID Transaction ──► Change Stream Event`  
**Speaker Note (≈ 20s):** On the write path, secrets never reach the model. Gemini 3.5 Flash-Lite extracts typed candidate statements; sensitive items wait in Review; and our reconcile engine guarantees single active truth via MongoDB Atlas transactions and change streams.

---

## Slide 6: How a Memory Is Found

**Title:** How a memory is found  
**Body (≤ 25 words):** 4 searches (meaning · keywords · time · links) → fused → scored → top 8.  
**Visual:** Scoring formula in mono + Why-tab screenshot (`docs/deck/shots/shot-3-why.png`):
`final = 0.55 · relevance(RRF) + 0.15 · recency + 0.15 · importance + 0.10 · confidence + type_boost`  
**Speaker Note (≈ 20s):** Broad retrieval fires four parallel queries in MongoDB—vector search, lexical Lucene search, temporal decay, and graph links. Reciprocal Rank Fusion combines them, scoring is completely inspectable in the UI, and candidates are capped to eight.

---

## Slide 7: Hard Cases, Handled

**Title:** Hard cases, handled  
**Body (≤ 25 words):** Correction with history · contradictions put to you · expiry · hard forget · secrets blocked.  
**Visual:** Three screenshot crops:
1. `docs/deck/shots/shot-4-corrected.png`: "Corrected" live write chip.
2. `docs/deck/shots/shot-5-review-contradiction.png`: Recommendation contradiction card ("Which is current?").
3. `docs/deck/shots/shot-6-credential-blocked.png`: "Not saved — looked like a credential".  
**Speaker Note (≈ 20s):** These are the difficult cases the judges asked for: when Aarav updates Kestrel's launch from 9 PM to 10 PM, the old belief is archived; contradictions are resolved by the user; credentials are blocked instantly; and expired items cleanly vanish.

---

## Slide 8: It Learns How You Like Answers

**Title:** It learns *how* you like answers  
**Body (≤ 25 words):** Repeated feedback → a strategy with evidence → shorter, time-boxed plans.  
**Visual:** Activity reflection steps + strategy memory card (`docs/deck/shots/shot-7-activity-reflect.png`)  
**Speaker Note (≈ 20s):** Radahn doesn't just store facts—it observes how you collaborate. Background reflection consolidates user feedback into learned strategies, like automatically giving Aarav 5-bullet time-boxed launch plans.

---

## Slide 9: Built on MongoDB Atlas

**Title:** Built on MongoDB Atlas  
**Body (≤ 25 words):** Vector Search with filters · Atlas Search · TTL · transactions · partial unique index · change streams · aggregations.  
**Visual:** 7-feature hairline grid with architecture strip (`Next.js App ──► MongoDB Atlas ──► Gemini / Groq`):
- Vector Search with pre-filters on `ownerId`, `spaceKey`, `status`
- Atlas Search (Lucene) for exact keyword/code retrieval
- TTL Indexes on `purgeAt` for automated physical cleanup
- Partial Unique Index `{ownerId, spaceKey, slotKey}` enforcing single active truth
- Multi-Document ACID Transactions ensuring zero corrupted state
- Change Streams pushing real-time SSE updates to browser
- Aggregation Pipelines calculating live recall & storage metrics  
**Speaker Note (≈ 20s):** One database does everything memory needs. MongoDB Atlas handles vector embeddings, lexical search, transactional supersedes, TTL expiry, and real-time change streams—without maintaining any separate vector stores or sync pipelines.

---

## Slide 10: Measured on Production

**Title:** Measured on production  
**Body (≤ 25 words):** 20/20 live memory tests · 31/31 rule checks · recall@5 1.0 · 0 secrets stored · recall ≈ 0.5 s.  
**Visual:** Big tabular numbers:
- `20 / 20` Live Memory Tests Passed (100%)
- `31 / 31` Rule & Security Checks Passed (100%)
- `1.0` Recall@5 Precision
- `0` Secrets or Credentials Stored
- `0.5 s` Cold-Path Recall Latency (p50: 566 ms)
- `2.0 s` First Memory Saved (p50: 1.96 s)  
**Footer:** Limitations: free tiers, probabilistic extraction mitigated by visible & reversible memory · Next steps: dedicated search nodes, team spaces · Team: Vaibhav & teammates · radahn-ai.vercel.app  
**Speaker Note (≈ 20s):** All metrics were measured directly on our hosted MongoDB Atlas and Gemini production deployment: 20 out of 20 live test cases, zero secrets stored, 100% recall precision, and sub-600ms recall latency. Try it live right now at radahn-ai.vercel.app.
