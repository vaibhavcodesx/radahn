# Radahn — Product Requirements Document

> **Status:** v1 (planning), written 2026-10-31 ~03:30 IST for UNCHARTED 2026 (NEXUS × SVNIT, MongoDB Track 1: Agentic Memory).
> **Hard deadline:** build window closes **31 Oct 2026, 9:00 PM IST**. Submission form 9–10 PM. After that the code is frozen.
> **Read with:** [TRD.md](TRD.md) · [architecture.md](architecture.md) · [memory-engine.md](memory-engine.md) · [design.md](design.md) · [build-plan.md](build-plan.md) · [decisions.md](decisions.md)
>
> These documents are a strong direction, not a cage. The building agent keeps its judgment: if something here turns out wrong, slow, or impossible, change it, write down why in `CHANGELOG.md`, and keep moving. The hackathon PDFs are the only fixed authority.

---

## 1. One line

**Radahn is a personal AI agent whose memory you can see, steer, and trust.** It remembers what matters (preferences, decisions, constraints, outcomes, feedback), uses it to change its next answer, and shows exactly *which* memory changed *what*, and *why*.

The name: Starscourge Radahn held the stars in place. Radahn holds your context in place while everything else moves. (The name is flavour only. No game imagery, no game UI.)

## 2. Why this wins Track 1

The track brief asks for four things. Each one is a first-class feature here, not an afterthought:

| Brief requirement (PDF) | Radahn feature that proves it |
|---|---|
| Persistent memory across sessions; decide what to remember, how to retrieve, when to update/correct/forget | Memory engine: typed **memory units**, write pipeline with reconcile (add / confirm / supersede / forget), lifecycle states, TTL expiry ([memory-engine.md](memory-engine.md)) |
| Memory must **visibly change** the next response/plan/action | **Ghost answer**: one click re-runs the same prompt *without memory* and shows a word-level diff against the real answer. Inline **memory citations** in every reply. |
| Inspect stored memory and **explain why it was selected** | **Recall trace**: for every turn, the candidates, their score breakdown (relevance, recency, importance, confidence, type boost), and a plain-language reason for each pick |
| One difficult case: correction, expiry, deletion, conflict, private info | We do **all five**: supersede with history + "you changed your mind" notice; TTL expiry you can watch happen; hard forget with content-free tombstone; conflict card when two memories disagree; secrets blocked and sensitive items held for approval |
| MongoDB: memory documents with owner/type/content/source/timestamps/lifecycle | `memories` collection with `$jsonSchema` validation ([TRD.md §5](TRD.md)) |
| Vector Search with filters by user/workspace/type/recency | `$vectorSearch` pre-filtered on `ownerId`, `spaceId`, `status`, `type`, fused with Atlas Search lexical results |
| TTL index for expiry; app logic for flag-based deletion | TTL on `purgeAt`; app logic for forget/supersede/reject |
| Change streams for live updates across users/agents | Live **Activity** feed and memory rail driven by a change stream over `memory_events`; external agents (Claude Code / Codex over MCP) appear live (P1-stretch) |

Judging weights from the rulebook (to confirm with organisers): Innovation 20 · Technical 25 · Functionality & deployment 25 · Relevance 20 · Demo & docs 10. Radahn's design puts its weight on the 25s: a working, deployed, inspectable engine with real depth.

## 3. Users

1. **Primary: a student builder / knowledge worker** using a personal agent across days. Example persona for the demo: *Aarav, 3rd-year CSE at SVNIT*, juggling a hackathon project, internship applications, and coursework. He wants an assistant that stops asking the same questions, respects his constraints, and admits when it's working from stale info.
2. **Judges (critical secondary user).** They open the live URL cold, possibly on a projector, with ~2 minutes of attention. They must be able to (a) get in with one click, (b) see a populated memory immediately, and (c) see memory change an answer. Everything in §7 "Judge path" serves this.
3. **Other agents (P1-stretch).** Claude Code / Codex / any MCP client can read and write the same memory space through an API key. This is the brief's "Shared Context for Teammates' Agents" idea, and the team can demo it with the very agents that built the app.

## 4. Goals, non-goals, anti-goals

**Goals**
- G1. A chat agent (Gemini 3.8 Flash) that measurably behaves differently because of stored memory, with the difference shown, not claimed.
- G2. A memory engine with real algorithms (hybrid recall, scored re-ranking, reconcile, lifecycle, reflection), explainable to judges in 60 seconds with the UI open.
- G3. Full user control over memory: inspect, edit, correct, pin, expire, forget, approve/reject.
- G4. Live, deployed, and fast enough that a judge never waits more than ~2 s for the first token.
- G5. A UI that looks like nothing else in the room (see [design.md](design.md)).

**Non-goals (do not build)**
- File/document RAG over uploaded PDFs (that is Track 2).
- Voice, images, mobile apps, multi-language UI.
- Team/org accounts, billing, roles beyond owner.
- Fine-tuning, self-hosted models, a vector DB other than MongoDB.
- Web browsing tools for the agent (Google Search grounding is not on the free tier).

**Anti-goals (would make it a failure even if it "works")**
- A ChatGPT clone with a "memories" settings page bolted on. Memory must be the main surface.
- Memory that silently changes behaviour with no way to see why.
- Storing secrets or sensitive data without consent.
- A generic dark SaaS dashboard (slate + green + Inter). See [design.md](design.md) for the banned look.
- Demo data presented as real usage or real metrics. Seeded data is labelled "demo".
- Features that half-work in the deployed build. Cut, don't ship broken.

## 5. Core concepts (glossary used across all docs and the UI)

| Term | Meaning |
|---|---|
| **Memory unit** | One document in `memories`: a single atomic, self-contained statement plus type, scope, provenance, scores, and lifecycle. (MongoDB's own course calls these "memory units".) |
| **Type** | One of `profile`, `preference`, `fact`, `goal`, `constraint`, `decision`, `outcome`, `feedback`, `strategy`, `observation`. Each type has a fixed colour (see design.md). |
| **Space** | A workspace that scopes memory (e.g. "Personal", "Hackathon", "Internships"). A memory is either space-scoped or **global** (visible in every space). |
| **Core memory** | A small, bounded set of pinned memories (≈1,500 chars) always placed in the prompt, like Hermes's `USER.md`. Everything else is **archival** and must be recalled. |
| **Recall** | The read path: hybrid search + scoring that picks which memories enter the prompt for this turn. |
| **Recall trace** | The stored, inspectable record of one recall: query, candidates, score breakdown, picks, reasons. |
| **Citation** | Inline marker in a reply (`⟨m3⟩`) linking the sentence to the memory it used. |
| **Ghost answer** | The same prompt answered with memory disabled, shown as a diff. Proof that memory matters. |
| **Reconcile** | The write-path decision for each new candidate memory: `add`, `confirm`, `supersede`, `forget`, or `skip`. |
| **Supersede** | Correction without erasure: the old unit becomes `superseded`, points to its replacement, and stays in history. |
| **Expiry** | A unit with `expiresAt` stops being recalled at that time; the TTL index physically deletes it later. |
| **Forget** | Hard delete of content; only a content-free tombstone event remains. |
| **Review inbox** | Units held as `pending_review` (sensitive or low-confidence) waiting for approve / edit / reject. |
| **Reflection** | A background pass that merges duplicates, writes `observation`s with evidence, and turns repeated feedback into `strategy` units (learned behaviour). |
| **Strategy** | A procedural memory ("When Aarav asks for a plan, give ≤5 bullets with time estimates") injected as learned behaviour. This is how Radahn changes *how it behaves*, not just what it knows. |

## 6. Features and acceptance criteria

Priority key: **P0** = must ship, the demo depends on it. **P1** = ships if P0 is solid by the Phase 2 checkpoint. **P2** = only with spare time. The cut line is enforced in [build-plan.md](build-plan.md).

### 6.1 Access
- **F-01 (P0) Guest entry.** "Enter as guest" creates an anonymous account in one click and lands in the app. AC: from landing to first message ≤ 2 clicks, no form.
- **F-02 (P0) Google sign-in.** Better Auth Google provider. If a guest signs in with Google, their guest memories, chats, and spaces move to the Google account (anonymous → linked). AC: memories survive the upgrade.
- **F-03 (P0) Demo world.** A "Load demo memories" action (empty state + Settings) seeds the Aarav persona: 3 spaces, ~40 memory units across all types and states (some superseded, one expiring soon, one pending review), 3 past conversations. Seeded per user, so judges never collide. AC: a judge sees a full Memory Atlas within 5 s of entering.

### 6.2 Chat (the agent)
- **F-10 (P0) Streaming chat** with Gemini 3.8 Flash, per-space conversations, titles auto-generated, history in sidebar with search.
- **F-11 (P0) Memory-aware replies.** Every turn runs recall and injects core memory, recalled memory, and learned strategies. Replies cite memories inline. AC: hovering/clicking a citation opens that memory unit.
- **F-12 (P0) Recall trace panel.** Right-hand "Memory lens" shows, for the selected reply: recalled units with score bars, why each was picked, and units written by this turn. AC: every score shown is the real number used.
- **F-13 (P0) Live write feedback.** After a reply, chips appear under it: `+2 remembered · 1 updated · 1 needs review · 1 blocked`. AC: chips appear within ~3 s of the reply ending, via the live stream.
- **F-14 (P0) Ghost answer.** Button on any assistant reply: "Answer without memory". Shows a side-by-side or unified word diff. AC: works on demo data; result cached per message.
- **F-15 (P0) Memory tools in chat.** The agent can call `remember`, `recall`, `correct`, `forget` tools when the user asks explicitly ("remember that…", "forget my…", "that's wrong, it's…"). Tool runs render as tool chips.
- **F-16 (P1) Slash commands** in the composer: `/remember`, `/forget`, `/recall <query>`, `/reflect`, `/ghost`, `/space`. `@` mentions a space or a memory to force-include it.
- **F-17 (P1) Clarify on ambiguity.** If two active memories about the same subject conflict or score too close to call, the agent asks one clarifying question instead of guessing (IHMT-style "clue" loop).
- **F-18 (P1) Feedback.** Thumbs up/down plus optional one-line note on replies; stored as `feedback` memory units.
- **F-19 (P2) Selection actions.** Select text in any message → "Remember this", "Correct a memory", "Forget this".

### 6.3 Memory management
- **F-20 (P0) Memory Atlas — table view.** All memory units for the current space (+global), filterable by type, status, space, sensitivity; sortable by importance, recency, recall count; full-text search. AC: 200 units render without jank.
- **F-21 (P0) Memory detail.** Statement, type, scope, importance, confidence, sensitivity, provenance (source quote + link to the message), created/updated/valid-from/expires, recall history (when it was used, with scores), version history (supersede chain), evidence (for observations), raw JSON document view (for judges: "this is the MongoDB document"). Actions: edit, correct (creates a superseding unit), pin to core / unpin, set expiry (incl. "in 2 minutes" for live demos), change scope, forget.
- **F-22 (P0) Lifecycle correctness.** Supersede keeps history; forget hard-deletes and leaves a tombstone; expired units never appear in recall even before the TTL monitor deletes them. AC: covered by unit tests ([TRD.md §11](TRD.md)).
- **F-23 (P0) Review inbox.** Pending units shown one at a time as approval cards: approve / edit then approve / reject. Conflicts appear here too ("Which is current?"). Badge count in nav. AC: approving makes the unit recallable immediately.
- **F-24 (P0) Privacy gate.** Secrets (API keys, passwords, card numbers, OTPs, Aadhaar/PAN-like IDs) are never stored. A `blocked` event is logged *without the secret*, and the chat shows "Not saved — looked like a credential". Sensitive categories (health, finances, precise location, third-party personal info) go to review. Prompt-injection text inside a would-be memory is rejected.
- **F-25 (P1) Memory Atlas — constellation view.** Canvas map of all units: colour = type, size = importance, brightness = recency, links = supersede/evidence. Hover to read, click to open detail. This is the visual signature of the app (design.md §6.4).
- **F-26 (P1) Core memory editor.** Settings page showing the bounded core block, its character budget meter, and what's pinned. Over budget → prompt to consolidate (Hermes-style pressure).
- **F-27 (P2) Time travel.** Slider on the Atlas: "what did Radahn believe on <date>?" using `validFrom`/`validTo`.

### 6.4 Learning over time
- **F-30 (P0) Reflection run.** Triggered manually ("Reflect now"), automatically after every 8 new units in a space, and by a daily cron. It merges near-duplicates, writes observations with evidence links, and converts repeated feedback/outcomes into strategies. Every run is visible as a task-row timeline with what it changed. AC: after the seeded feedback, one reflect run produces at least one strategy that visibly changes the next reply's format.
- **F-31 (P1) Outcomes on decisions.** When the user reports how a decision went, the outcome links to the decision; future recall of the decision brings its outcome along.
- **F-32 (P1) Reinforcement.** Repeating a known fact confirms it (raises confidence, `confirmCount`), not a duplicate.

### 6.5 Live and multi-agent
- **F-40 (P0) Activity feed.** Live stream of memory events (created, confirmed, superseded, approved, rejected, blocked, expired, forgotten, recalled, reflected) driven by a MongoDB change stream over SSE. Insight cards on top: units by type, recall hit rate, corrections this week, storage used.
- **F-41 (P1-stretch) Agent access.** Settings → "Connected agents": create a scoped API key; an MCP endpoint exposes `memory_search`, `memory_save`, `memory_forget`. Writes from external agents show in Activity with the agent's name. Demo: Codex saves "Decided to use Better Auth" and it appears live in the browser.

### 6.6 Settings
- **F-50 (P0)** Profile (name, how to address you), write policy (`auto` / `review sensitive` (default) / `review everything`), default expiry for `fact`/`goal` (none by default), model choice (3.8 Flash default; 3.6 Flash; 3.5 Flash-Lite), theme (dark default / light), spaces management, data: export all as JSON, delete all memory, delete account.
- **F-51 (P0)** A clear privacy note: Radahn runs on the Gemini API free tier, where Google may use prompts to improve products. Do not enter real secrets. (This is true and judges respect honesty.)

### 6.7 Public pages
- **F-60 (P0) Landing page** that explains and *demonstrates* the mechanism (design.md §6.1), with CTAs "Enter as guest" and "Continue with Google".
- **F-61 (P1) How it works / Architecture page** for judges: the memory pipeline, data model, and MongoDB features used, with diagrams. Doubles as presentation material.

## 7. Key flows

### 7.1 Judge path (must work flawlessly on the deployed URL)
1. Landing → "Enter as guest" → app opens with an empty state offering **"Load demo memories"** (one click) or "Start fresh".
2. Demo loaded → a pinned suggestion in the composer: *"Plan my next 4 hours."*
3. Reply streams with citations (deadline, M0 constraint, bullet-list preference). Memory lens shows why each was recalled.
4. "Answer without memory" → diff shows the generic plan vs the personalised one.
5. Review badge shows 1 → approval card for a sensitive item.
6. Atlas → constellation and table; open a superseded unit → history.

### 7.2 Demo video script (≤ 7 minutes; record ~18:00–19:00 IST)
| Time | Beat | Shows |
|---|---|---|
| 0:00–0:40 | Problem: agents forget, or remember invisibly. Radahn in one line. | Landing first viewport |
| 0:40–1:40 | **Create memory.** Fresh guest. Tell it about the hackathon: deadline, stack, "I hate long answers, give bullets". Chips show what was remembered; Activity updates live. | Chat, write chips, live feed |
| 1:40–2:50 | **Later session changes the result.** New chat: "Plan my next 4 hours." Citations; Memory lens with score breakdown; Ghost diff. | Recall trace, ghost diff |
| 2:50–3:40 | **Inspect & explain.** Open a memory: provenance quote, recall history, raw MongoDB document, why it was picked. | Memory detail |
| 3:40–5:00 | **Difficult cases.** (a) "Actually the deadline moved to 10 PM" → supersede + notice + history. (b) Paste a fake API key → blocked. (c) A health detail → review card → approve. (d) Set a memory to expire in 2 min, show it gone. (e) Forget → tombstone. | All lifecycle paths |
| 5:00–5:50 | **Learns how to behave.** Thumbs-down a long reply twice → Reflect → new strategy → next reply is shorter. | Reflection task rows, strategy unit |
| 5:50–6:30 | **Architecture.** MongoDB features: document model, `$vectorSearch` with filters, Atlas Search, TTL, change streams, schema validation, partial unique index. | Architecture page |
| 6:30–7:00 | (Stretch) Codex writes to the same memory over MCP, appears live. Close. | Activity |

### 7.3 Final presentation (10 min + 2 min Q&A)
The same story with live demo, plus: the research lineage (memory-engine.md §10), the numbers from the eval harness, the honest limitations, and the team's contributions. Deck outline lives in build-plan.md §8.

## 8. Success metrics (what we measure and show)

- **Memory-changed rate:** in the eval set, % of prompts where the memory answer differs meaningfully from the ghost answer (target ≥ 80%).
- **Recall precision@5** on the golden set (target ≥ 0.7) and **write accuracy** (correct reconcile op) (target ≥ 0.8). See memory-engine.md §9.
- **Time to first token** p50 < 2 s on the deployed app; recall step < 400 ms.
- **Zero secrets stored** across the privacy test cases.
- Judge path completes with no errors on a fresh browser profile on the production URL.

## 9. Constraints

- Free tiers only: Gemini API free tier (rate limits visible only in AI Studio; plan for 429s), MongoDB Atlas M0 (512 MB, 100 ops/s, ≤ 3 Atlas Search/Vector indexes, no automated embedding), Vercel Hobby (function duration limits, daily crons only).
- Public GitHub repo (unlimited Actions minutes). Never commit secrets; `Inputs/` stays out of git.
- Team of 3 humans + Claude Code (lead) + Codex (secondary). ~17 hours of build time remain at doc-writing time.
- Deployment is compulsory, and the deployed build is what gets judged.

## 10. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Gemini free-tier 429s during judging | Key pool across teammates' keys, model fallback chain, per-user rate limit, cached ghost answers, seeded demo works without new LLM calls for browsing. |
| Vector index not ready / M0 quirks | Create indexes in Phase 0 via script; fall back to exact `$vectorSearch` (`exact: true`) for small collections; lexical-only fallback path. |
| Change streams awkward on serverless | SSE route with bounded lifetime and resume tokens; client reconnects; polling fallback on `memory_events._id`. |
| Scope creep | P0 cut line at the Phase 2 checkpoint (build-plan.md). P1/P2 only after P0 demo passes end-to-end on prod. |
| Two agents editing the same files | Strict file ownership and contracts-first (build-plan.md §4). |
| Design drift into generic | design.md direction contract + impeccable finish review + `/design-review`. |
