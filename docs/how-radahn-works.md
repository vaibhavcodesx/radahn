# How Radahn works — a plain-language guide for the team

Read this once before the demo. It explains what happens behind every message, in order, without assuming you've read the code. The short judge answers are in [`qa-cheatsheet.md`](qa-cheatsheet.md); the deep design is in [`memory-engine.md`](memory-engine.md) and [`architecture.md`](architecture.md).

## 1. The idea in one paragraph

Most AI assistants either forget you when the chat ends, or remember you in a way you can't see. Radahn keeps small, separate **memories** (one fact or preference each), uses them to shape its next answer, and **shows its work**: which memories it used, why it picked them, what it saved, and what the answer would have been without them. You can correct, expire or delete any memory, and it learns *how* you like answers, not just *what* you've said.

## 2. What a "memory" is

A memory is one short sentence plus some labels, stored as one document in MongoDB:

| Field | Example | Why it exists |
|---|---|---|
| statement | "Kestrel's public beta ships on 7 Nov 2026 at 9:00 PM IST." | The fact itself, in plain words |
| type | constraint | One of 10 kinds: profile, preference, fact, goal, constraint, decision, outcome, feedback, strategy, observation. Each has its own colour in the UI. |
| space | Kestrel | Which project it belongs to (or "global" for things about you) |
| status | active / needs review / outdated / expired | Its lifecycle state |
| importance, confidence | 10, 0.95 | How much it matters, how sure Radahn is |
| source | the chat message it came from | So you can always see *where* it came from |
| embedding | 768 numbers | A "meaning fingerprint" used to find related memories |
| subject + attribute | kestrel · beta_launch | Lets Radahn notice when a new value replaces an old one |

Memories are **atomic**: "prefers bullet lists" and "beta ships at 9 PM" are two memories, not one long profile. That's what makes it possible to cite, correct or delete exactly one thing.

## 3. What happens when you send a message

```
you type ─► 1 privacy pre-scan ─► 2 recall ─► 3 answer (streams) ─► 4 save new memories (in the background)
                                     │              │                        │
                                     ▼              ▼                        ▼
                             Memory panel     citations [■]          "Saving to memory" chips,
                             (Used, Why)      in the reply           Saved tab, Activity feed
```

**1. Privacy pre-scan (before any AI sees your message).** Pattern checks catch API keys, passwords, card numbers, OTPs. They're replaced with `[redacted]` and never stored. You see "Not saved — looked like a credential".

**2. Recall: finding the memories that matter for this message.** Four searches run at the same time:
- **Meaning** (vector search): finds memories that *mean* something similar, even with different words ("when do we launch?" finds "beta ships on 7 Nov").
- **Keywords** (Atlas Search): finds exact names and codes the meaning search can blur ("DJI", "Razorpay").
- **Time** : only when you ask about the past ("what did I do last night?"), it looks at what happened in that window.
- **Links** : memories that share people or things with the top hits (a decision brings its outcome along).

The results are merged and each memory gets a score:
`0.55 × relevance + 0.15 × recency + 0.15 × importance + 0.10 × confidence (+ a small boost for plan-relevant types)`.
Weak matches (below 0.35) are dropped, near-duplicates are removed, and at most 8 memories are kept. The full breakdown is saved and shown in the **Why** tab.

**3. The answer.** The chat model (Gemini 3.6 Flash by default; GPT-OSS or Qwen on Groq if you pick them) gets your message plus a short context: your pinned core facts, any learned rules ("plans: at most 5 bullets"), and the recalled memories, each with a tag like `[[m3]]`. When it uses one, it writes the tag, which becomes the little coloured **citation square** in the reply. The model can also call tools itself: *remember*, *correct*, *forget*, *recall more*. If the first model is slow for 3.5 s, a second one starts and the faster answer wins.

**4. Saving new memories (after the reply, so it never slows you down).** A small, fast model reads the last few messages and proposes candidate memories. Each candidate goes through:
- **Policy gate** (plain code, no AI): secrets dropped; prompt-injection text dropped; sensitive things (health, money, location, other people) go to **Review** instead of being saved; things Radahn isn't sure about are asked about above the prompt box ("Remember this? Remember / Don't").
- **Reconcile**: compare with what's already stored.
  - Same fact again → **confirm** (it becomes more confident).
  - Same subject, new value → **supersede**: the old one becomes *outdated* (kept as history), the new one becomes current. This happens inside a database transaction, and a unique index guarantees only one current value per fact.
  - Unclear → a small AI call decides.
  - Otherwise → **add**.
- Every change writes an **event**. A MongoDB change stream pushes events to your browser live, which is how the chips, the Saved tab, the Review badge and the Activity feed update without refreshing.

## 4. Forgetting, three ways

| How | What happens |
|---|---|
| **Forget** (bin icon) | The memory and its embedding are deleted immediately. Only a "something was forgotten" event remains, with no content. |
| **Expire** (e.g. in 2 minutes) | Recall stops using it at that moment; MongoDB's TTL index deletes it automatically a little later. |
| **Reject** in Review | It's never used, and it's purged after 24 hours. |

Guest accounts keep memories for 7 days; signing in with Google keeps them and moves your guest memories over.

## 5. Learning *how* you like answers (reflection)

When feedback repeats ("too long", "just the bullets"), the **Reflect** step (Activity → Reflect now, or automatically after enough new memories) turns it into a **strategy**: "When Aarav asks for a plan, give at most 5 bullets, each with a time box." The strategy cites the feedback memories as evidence. From then on it's included with every relevant request, so the answer *format* changes, and the "Without memory" comparison shows the difference. Reflection also merges duplicates and writes higher-level observations ("works late, plans in short sprints").

## 6. Where to point during the demo

| You want to show… | Click |
|---|---|
| Memory changes the answer | A reply's coloured squares, then the ghost icon (**Without memory**) |
| Why these memories | Memory panel → **Why** |
| What it saved | Memory panel → **Saved**, or the green chips under the reply |
| Correction with history | "Actually, the beta launch moved to 10 PM." → the reply shows *Corrected 9 PM → 10 PM*; Memory page → that memory → History; **As of** 1 hour ago shows the old value |
| Consent | Review page (sensitive item, the 6 PM vs 7 PM contradiction) |
| Forgetting | Bin on a Memory row; Expire → in 2 minutes |
| It's live | Activity feed while you chat |

## 7. Questions people will ask

**ChatGPT and Claude already have memory. How is Radahn different?**
They do, and they're good at it. But as products, their memory is mostly a background feature: a list of saved notes or summaries of past chats that you can view and delete. Radahn makes memory the *visible, steerable* part of the product:
- **Per-answer receipts.** Every reply shows *which* memories it used, with citations you can click, and the exact scores behind each pick. General assistants don't show you, per answer, which remembered facts shaped it.
- **"Without memory" proof.** One click re-asks the same question with memory off and highlights the words that changed. You can see the value of memory instead of taking it on trust.
- **Corrections with history, not overwrites.** A changed fact becomes *outdated* and stays inspectable; you can view what Radahn believed at an earlier time (**As of**). Contradictions are surfaced for you to resolve.
- **Consent and lifecycle per memory.** Sensitive items wait for approval; uncertain ones are asked about; any memory can be set to expire; secrets are blocked before the model sees them.
- **Learned behaviour you can see.** Feedback becomes an explicit strategy with evidence, shown as "1 learned rule", rather than a hidden preference.
- **Open to your other agents.** Other tools (Claude Code, Cursor, any MCP client) can read and write the same memory with a scoped key, and every write shows up in Activity under that agent's name.

Say it simply: *"ChatGPT remembers you. Radahn shows you what it remembers, why it used it, and lets you change it."*

**Isn't this just RAG (retrieval-augmented generation)?**
Recall is retrieval, but RAG usually searches fixed documents. Radahn's memory is *written by the conversation itself*, changes over time (confirm, supersede, expire, forget), has consent rules, and learns behaviour. The hard part is deciding what to write, update and forget — that's most of the engine.

**Why not just put the whole chat history in the prompt?**
It gets long, slow and expensive quickly; old and new facts contradict each other with no way to tell which is current; and you can't delete one fact without deleting a conversation. Small atomic memories are cheap to search, easy to correct, and each can be cited.

**Why MongoDB?**
One database does everything memory needs: documents with flexible fields, vector search *filtered by user and project*, keyword search, automatic expiry (TTL), transactions for corrections, a unique index for "one current value", and change streams for the live UI. No second database to keep in sync.

**How does it know a new fact replaces an old one?**
When it saves a fact it also records *what it's about* (subject + attribute, e.g. kestrel · beta_launch). A new value for the same thing supersedes the old one. If that isn't clear, it compares meaning with nearby memories and, in the unclear middle band, asks a small model. The chat model can also correct directly with its *correct* tool when you say "actually…".

**Can it remember wrong things?**
Yes. Extraction is done by an AI and can miss things or over-remember. That's why everything is visible and reversible: you see each save as it happens, sensitive items wait for you, and any memory can be corrected or forgotten in one click.

**What happens to my data?**
Each user's memories are only ever queried with their own user id. Secrets are never stored. Forget really deletes. Guest data expires after 7 days. The free model tier may use prompts to improve the provider's models, so the app says not to enter real secrets.

**How fast is it?**
Measured on production: recall about 570 ms including the embedding call; the first memory is saved about 2 seconds after the reply. Replies start in 1–2 s on Groq and a few seconds on Gemini.

**What did you measure, and does it work?**
A hosted evaluation on production: 20/20 live cases (add, confirm, update with history, A→B→C corrections, privacy, exact and time-based recall, expiry, forget) and 31/31 rule checks, recall@5 = 1.0, 0 secrets stored. Details in `evals/results.md`.

**What would you build next?**
A reranking model for recall (Voyage AI), shared memory between teammates, importing existing notes, better mobile layout for the Memory map, and scaling steps in `architecture.md` §8 (sharding by user, dedicated search nodes, vector quantization).

## 8. The parts of the code, in one table

| Area | Folder | What it does |
|---|---|---|
| Pages and UI | `src/app/**`, `src/components/**` | Landing, chat, Memory, Review, Activity, Settings |
| Chat turn | `src/server/chat/turn.ts` | Pre-scan → recall → stream the answer → save memories afterwards |
| Memory engine | `src/server/memory/**` | Gate, recall, scoring, reconcile, reflection, forgetting, evals |
| Models | `src/server/llm/registry.ts` | Picks a model, rotates keys, falls back on rate limits, Groq + Gemini |
| Database | `src/server/db/**`, `scripts/db-setup.ts` | Collections, indexes, search indexes |
| Live updates | `src/app/api/stream`, `src/components/realtime` | Change stream → browser |
| Other agents | `src/app/api/mcp` | MCP endpoint with scoped keys |
