# Radahn — Build Plan, Work Split & Submission

> Scope and scale guide for the building agents. Times are **IST on 31 Oct 2026**. The build window closes at **21:00**; the submission form runs 21:00–22:00. These docs were finished around 03:15, which leaves **~17.5 hours**. Phase 0 starts whenever the humans begin; shift the early phases if it starts later, but never the 15:00 cut line or the 18:00 freeze.
> The plan is a direction, not a script. If reality disagrees (a library breaks, a phase finishes early), re-plan, write it in `TODO.md` and `CHANGELOG.md`, and keep the checkpoints.

---

## 1. Scale: how big should this be?

This is a **24-hour hackathon build judged on a live URL**, not a startup MVP. Aim for: **one deeply working loop** (talk → remember → recall → visibly different answer → inspect → correct/forget/learn), presented with exceptional polish, plus a few "wow" surfaces (glyph field, ghost diff, live Activity). Depth beats breadth: a P1 feature that half-works costs more than it earns. Quality bar: every P0 path works on production with demo data, from a fresh browser, three times in a row.

## 2. Timeline and checkpoints

| Time (IST) | Phase | Exit criteria |
|---|---|---|
| 04:00–05:30 | **Phase 0: Foundations.** Humans run SETUP.md (Atlas, keys, OAuth, Vercel, GitHub). Claude scaffolds, writes contracts, tokens, atoms, db-setup, CI, and does the first prod deploy. Claude writes `docs/CODEX_TASKS.md`; Codex starts. | Public repo, CI green, a "hello" page live on the Vercel prod URL, indexes created on Atlas, `types.ts` contracts merged |
| 05:30–10:30 | **Phase 1: Core loop (P0).** Codex: engine (gate, embed, recall, reconcile, extract, lifecycle) with tests + demo fixture. Claude: auth (guest+Google), shell, chat route + stream, Streaming Text with citations, Memory lens, SSE realtime, write chips. | **Checkpoint A (10:30):** on prod, a guest can chat; recall shows picks with scores; memories are written after the reply; chips arrive live |
| 10:30–15:00 | **Phase 2: Control & proof (P0).** Codex: ghost endpoint, reflection, review/conflict APIs, insights aggregations, seed API, eval harness. Claude: Atlas table + detail drawer, Review inbox, Activity, Settings (policy/model/data), ghost diff UI, demo seeding UX, landing skeleton. | **Checkpoint B (15:00):** full judge path (PRD §7.1) passes on prod. **Cut line:** P1 items not started by now are dropped, except landing polish and the Atlas Field. |
| 15:00–18:00 | **Phase 3: Signature & polish.** Landing (glyph field, ghost-diff panel, how-it-works rows, footer), Atlas Field view, light theme, P1s in order (F-17 clarify, F-16 slash commands, F-26 core editor, F-41 MCP only if everything else is green). impeccable finish review, gstack `/design-review`, `/qa`, `/cso`. | All P0 + chosen P1 green on prod; reviewers' material findings fixed |
| 18:00 | **Feature freeze.** Bugs, copy, performance only. | |
| 18:00–19:30 | Bug bash (3 fresh-profile judge-path runs), `/benchmark`, record the **demo video** (≤ 7 min, PRD §7.2). | Video uploaded (unlisted YouTube / Drive with link access) |
| 19:30–20:30 | README (setup, architecture, MongoDB features, eval table, test credentials = "Enter as guest"), deck (§8), screenshots, `/document-release`. | |
| 20:30–20:45 | Final production deploy, smoke test, tag `v1.0.0`, `/canary`. | Prod URL works logged-out on a phone and a laptop |
| **21:00** | **Code freeze. No commits after this.** | |
| 21:00–22:00 | Humans fill the submission form (§9). | Every link opened in an incognito window |

Sleep note for humans: the agents can run Phase 1 with light supervision. Stagger rest so one person is always watching CI and answering agent questions.

## 3. Who does what

| Role | Owner | Responsibilities |
|---|---|---|
| **Claude Code** (primary, lead) | Human A drives | Architecture owner, contracts, UI/UX, API routes, auth, streaming, realtime, integration, deployment, merges, final QA. Writes and maintains `docs/CODEX_TASKS.md`. Can call Codex for reviews/second opinions. |
| **Codex** (secondary) | Human B drives | The memory engine and data layer behind Claude's contracts: `src/server/memory/**`, `src/server/llm/**`, `scripts/**`, `evals/**`, engine unit tests. Works from `docs/CODEX_TASKS.md` and `AGENTS.md`. |
| **Human C** | | Accounts/keys (SETUP.md), demo persona content (statements for the seed), video script and recording, deck, README screenshots, manual QA on phones. |

### 3.1 File ownership (prevents two agents editing the same files)

| Path | Owner | Other agent may… |
|---|---|---|
| `src/server/memory/types.ts`, `src/lib/chat-types.ts` (contracts) | Claude writes first; changes by PR with both agreeing | read |
| `src/server/memory/**` (except types.ts), `src/server/llm/**`, `scripts/**`, `evals/**`, `src/server/memory/**/*.test.ts` | **Codex** | read; Claude only fixes integration breakages with a note in CHANGELOG |
| `src/app/**`, `src/components/**`, `src/styles/**`, `src/server/chat/**`, `src/server/auth/**`, `src/server/realtime/**`, `src/server/db/**`, `e2e/**`, `.github/**`, `vercel.json` | **Claude** | read |
| `docs/**`, `CLAUDE.md`, `AGENTS.md`, `README.md` | Claude (Codex appends to `docs/CODEX_TASKS.md` status lines) | — |
| `CHANGELOG.md`, `TODO.md` | both (append-only entries, prefixed `[claude]` / `[codex]`) | — |

### 3.2 Contracts first (Phase 0, Claude)
Before Codex starts, Claude commits:
- `src/server/memory/types.ts`: `MemoryUnit`, `MemoryType`, `MemoryStatus`, `RecallResult`, `RecallTrace`, `CandidateMemory`, `ReconcileOp`, `WriteSummary`, `ReflectionRun`, `MemoryEvent`.
- `src/server/memory/index.ts`: exported function signatures with `throw new Error('not implemented')` bodies:
  `preScan(text)`, `recall({ownerId, spaceId, query, intent?})`, `buildContext(...)`, `extractAndWrite({ownerId, spaceId, conversationId, messageId, turns, recalled})`, `rememberExplicit(...)`, `correctMemory(...)`, `forgetMemory(...)`, `reviewMemory(...)`, `runReflection({ownerId, spaceId, trigger})`, `ghostContext(...)`, `seedDemo(userId)`.
- `src/server/db/collections.ts`: typed collection accessors (Codex uses them).
- `src/server/llm/registry.ts` interface (`generate`, `generateObject`, `embed`, `streamChat` signatures); Codex implements the internals.
- A mock implementation (`src/server/memory/mock.ts`) returning fixture data, so the UI can be built before the engine is real. Swap via `MEMORY_ENGINE=mock|real` env.

### 3.3 Git workflow
- Public GitHub repo `radahn` (owner `vaibhavcodesx` unless the team prefers an org). `main` deploys to prod.
- Claude works on short-lived `feat/*` branches (or directly on `main` for tiny fixes during crunch). **Codex works in its own git worktree**: `git worktree add ../radahn-codex -b codex/engine` so the two agents never share a working directory. Codex opens PRs; Claude merges after CI is green and a quick review.
- Merge at least every 60–90 minutes. Rebase Codex's branch on `main` after each merge.
- Conventional commits (`feat(engine): reconcile slot supersede`). End every commit with the co-author line from the session's attribution instructions.

## 4. Skills: primary toolkits are **superpowers** and **gstack**

Announce each skill when used (user's global rule: one short line like "Using skill: X").

| Moment | Skill(s) |
|---|---|
| Session start | `superpowers:using-superpowers`; read CLAUDE.md + docs. Skip `brainstorming`: product decisions are made in these docs. |
| Turning this plan into steps | `superpowers:writing-plans` → `docs/superpowers/plans/2026-10-31-radahn-build.md`. **Time-box 15 min.** Optional 10-min `/plan-eng-review` (gstack) on TRD only. Do not run `/autoplan` or `/plan-ceo-review` (scope is fixed, time is short). |
| Executing | `superpowers:executing-plans` or `superpowers:subagent-driven-development` (Claude may fan out its own UI subtasks); `superpowers:dispatching-parallel-agents` for independent pages |
| Engine code (Codex) | `superpowers:test-driven-development` for gate, scoring, reconcile, lifecycle |
| Bugs | `superpowers:systematic-debugging`, gstack `/investigate` |
| Before saying "done" | `superpowers:verification-before-completion` (run it, see it, then claim it) |
| Before merging | `superpowers:requesting-code-review` / gstack `/review`; second opinion from Codex via gstack `/codex` (review or challenge mode) or the `codex:rescue` agent |
| UI | `impeccable` (+ `frontend-design`, `ui-ux-pro-max`, `transitions-dev`), see design.md §0 |
| QA | gstack `/qa` on the preview URL, `/design-review`, `/benchmark`, `playwright` |
| Security | gstack `/cso` once in Phase 3; `/careful` or `/guard` when running destructive commands |
| Shipping | gstack `/ship` for PRs, `/land-and-deploy` + `/canary` for the final deploy, `/document-release` for README |
| Context | gstack `/context-save` before long breaks; `/context-restore` after |
| Docs lookup | **Context7 MCP first** for every library question (Next.js, AI SDK, Better Auth, MongoDB driver, Tailwind v4, shadcn, d3-force). MongoDB MCP + `mongodb:*` skills for index/schema/query work (`mongodb-search-and-ai`, `mongodb-schema-design`, `mongodb-query-optimizer`). |

## 5. Hygiene the agents must keep

- **CHANGELOG.md**: append an entry for every merged change (what, why, who). Deviations from these docs go here with the reason.
- **TODO.md**: the live task board (Now / Next / Later / Done / Cut), updated at each phase boundary and whenever a task starts or finishes. Codex's tasks mirror `docs/CODEX_TASKS.md`.
- **Comments**: explain *why* at module tops and around non-obvious logic (scores, thresholds, lifecycle rules, security). Each engine module starts with a short header naming the memory-engine.md section it implements.
- **Commits**: small and frequent (every working step), pushed so Vercel previews and CI run.
- **Never** commit `.env*` (except `.env.example`) or anything in `Inputs/`. Never paste keys into code, docs, screenshots, or the demo video.

## 6. Codex brief (template Claude fills into `docs/CODEX_TASKS.md` in Phase 0)

```md
# Codex tasks — Radahn engine
Read first: AGENTS.md, docs/memory-engine.md, docs/TRD.md §5–§11. Contracts: src/server/memory/types.ts, index.ts.
Worktree: ../radahn-codex on branch codex/engine. PR into main after each task; keep CI green.

## Task C1 — LLM registry & embeddings      [status: todo]
Files: src/server/llm/**   Done when: key pool + fallback chain + embed(768, gemini-embedding-2 with prefixes) have unit tests with mocked fetch.
## Task C2 — Privacy gate (preScan + candidate gate)   …
## Task C3 — Recall (4 channels, RRF, scoring, MMR, trace)   …
## Task C4 — Extraction + reconcile + transactional writes + events   …
## Task C5 — Explicit tools: remember / correct / forget / review   …
## Task C6 — Demo seed + embedding fixture   …
## Task C7 — Ghost context + reflection   …
## Task C8 — Insights aggregations + eval harness (npm run eval)   …
Each task: goal · files · contract functions · acceptance tests · notes. Update the status line when you start/finish.
```
Order matters: C1 → C2 → C3 → C4 unblock Checkpoint A; C5–C6 by 12:00; C7–C8 by 15:00.

## 6.5 Minimum viable submission (protect this above everything)

If the day goes badly, this alone still satisfies every line of the Track 1 brief and the rulebook. Build it first, keep it green on prod, and only then widen:
1. Guest entry → chat with Gemini 3.8 Flash in a space.
2. Write path: extraction + gate + reconcile (slot supersede at least) + `memory_events`.
3. Recall: `$vectorSearch` with owner/space/status filters + scoring + stored recall trace; citations in replies.
4. Memory lens showing recalled units with scores and reasons (beat 3: inspect and explain).
5. Memory detail with history, plus forget, plus expiry (TTL), plus the secret block (beat 4: difficult cases).
6. Ghost answer diff (beat 2: memory visibly changes the result).
7. Demo seed, README, live URL.
Everything else in the PRD (reflection, Atlas Field, Review stack styling, Activity insights, landing signature, MCP) is how we *win*, not how we *qualify*.

## 7. Risk switches (decide fast, don't debate)

- Engine late at 10:30 → Claude ships with `MEMORY_ENGINE=mock` for UI work and pairs on the slowest engine task; drop the temporal channel, then the graph channel, before anything else.
- Gemini quota pain → switch chat default to `gemini-3.6-flash`, extraction to `gemini-3.1-flash-lite`; add teammates' keys to the pool.
- Atlas Search index issues → lexical channel off (vector + graph only), note in README.
- Change streams flaky on Vercel → polling fallback (same client contract).
- Landing late → ship hero + glyph field + ghost panel + footer only.

## 8. Deliverables beyond code

**README.md** (Claude, Phase 3): one-line pitch, live URL, "How judges can test" (Enter as guest → Load demo memories → try the 3 suggested prompts), screenshots/GIF, features mapped to the Track 1 brief, architecture diagram, MongoDB features table, memory engine summary, eval results, tech stack, local setup, env vars, limitations, attribution (saved components' sources and licences, research lineage), team.

**Deck (10–12 slides, Human C with Claude drafting text):** 1 Title + live URL · 2 Problem (agents forget, or remember invisibly) · 3 Radahn in one line + hero screenshot · 4 Demo flow (4 beats of the brief) · 5 Memory engine (write path) · 6 Recall (4 channels, scoring, trace) · 7 Difficult cases (correction, expiry, forget, conflict, private) · 8 Learning (feedback → strategy) · 9 MongoDB architecture & features · 10 Evals & numbers · 11 Limitations & next steps (scale story from architecture.md §8) · 12 Team & contributions. Use the design system (warm black, serif titles, type swatches).

**Demo video:** PRD §7.2, ≤ 7:00, 1080p, voice-over, no secrets on screen (blur `.env`, use the guest flow).

**Team understands the code (rulebook §05 + challenge PDF).** Coding agents are allowed, but "teams remain responsible for understanding and testing their implementation" and must "be ready to explain your architecture, data model, and the choices you made." So: (1) the README has a short **"How we built it"** section stating honestly that Claude Code and Codex wrote most of the code under the team's direction, and what each human did; (2) at ~20:00 Claude gives the three humans a 15-minute walkthrough (architecture.md diagrams, memory-engine.md §4–§5, the MongoDB feature map) and a one-page Q&A cheat sheet at `docs/qa-cheatsheet.md` (likely judge questions: why MongoDB, why these weights, how forgetting really works, what happens at scale, limitations).

## 9. Submission checklist (from the rulebook)

- [ ] Team name + all three members' details
- [ ] Project title, problem, solution summary, main features
- [ ] **Live deployment URL** works logged-out (guest), on mobile and desktop
- [ ] **Public GitHub repo** with a clear README (setup + key technologies)
- [ ] **Demo video ≤ 7 min**, link accessible to anyone
- [ ] **PPT**: problem, solution, implementation, technology choices, impact
- [ ] Access instructions: "Click *Enter as guest*, then *Load demo memories*". No personal passwords.
- [ ] No API keys, passwords, secrets, or private data in repo, deck, or video
- [ ] Pre-existing assets disclosed + attributed (saved components, fonts, logo)
- [ ] Submitted before **22:00**; every link opened in incognito afterwards
- [ ] No commits or deploys after the deadline (code freeze)
