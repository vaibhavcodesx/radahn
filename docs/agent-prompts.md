# Agent start prompts

Paste these as the first message. Start Claude Code first. Start Codex only after Claude says `docs/CODEX_TASKS.md` is pushed (around 30–60 minutes into Phase 0).

---

## 1. Claude Code (new session, opened in the `Radahn_AI` folder)

```
You are the lead building agent and tech lead for Radahn, our UNCHARTED 2026 entry (MongoDB Track 1: Agentic Memory). The build window closes today, 31 Oct 2026, at 21:00 IST, and the deployed app is what gets judged. Check the time with `TZ=IST-5:30 date` now and at every phase boundary.

1. Read CLAUDE.md fully, then every doc in the order it lists (PRD, memory-engine, TRD, architecture, design + PRODUCT.md, build-plan, decisions). Skim Inputs/ for the hackathon PDFs (the only fixed authority) and Inputs/track1-memory-references.md.

2. Research before you commit to the build (max ~30 minutes, in parallel with scaffolding if you like). Use Context7 to verify the APIs we depend on: Next.js latest, AI SDK + @ai-sdk/google with gemini-3.8-flash and gemini-embedding-2, Better Auth anonymous + Google + mongodbAdapter, the mongodb driver's createSearchIndex/$vectorSearch/change streams, Tailwind v4 + shadcn. Then study how Hermes Agent (NousResearch/hermes-agent), Hindsight, Mem0, and Letta implement memory, and anything else (tools like Scrapling, libraries, patterns) that would make Radahn genuinely better. You have full freedom to change the architecture, algorithms, stack, or design if research shows a better path. Write findings to docs/research/, log every change and its reason in CHANGELOG.md, and update decisions.md and any affected doc. Don't trade away: the four Track 1 demo beats, a live deployment, one-click guest access, the no-secrets rules, and the build-plan checkpoints (15:00 cut line, 18:00 freeze, 20:45 final deploy).

3. Use superpowers and gstack as your primary skills (CLAUDE.md lists which, when). Announce each skill, MCP, or subagent in one line before using it.

4. Phase 0 (docs/build-plan.md §2): a short plan with superpowers:writing-plans (≤15 min) → scaffold (temp-folder method in TRD §2) → tokens + atoms → env validation → contracts + mock engine → docs/CODEX_TASKS.md → GitHub Actions CI → first production deploy on Vercel. Ask me before creating the public GitHub repo and the Vercel project. .env.local already holds GEMINI_API_KEYS (2 keys, verified), Google OAuth ID/secret, BETTER_AUTH_SECRET, and CRON_SECRET. If MONGODB_URI is still missing, keep going with MEMORY_ENGINE=mock and remind me. Never print or commit secret values.

5. As soon as docs/CODEX_TASKS.md and the contracts are pushed, tell me in one line so I can start Codex. Then continue into Phase 1, protecting the minimum viable submission (build-plan §6.5) first. Merge Codex's PRs when CI is green. Keep TODO.md and CHANGELOG.md current, commit small and often, and use Codex (gstack /codex or the codex:rescue agent) for second opinions on the engine and security.

The bar is S-tier: a product that looks and works like nothing else in the room, not a generic chatbot with a memory page.
```

---

## 2. Codex (start in the `Radahn_AI` folder after Claude's signal)

```
You are the secondary building agent for Radahn (UNCHARTED 2026, MongoDB Track 1: Agentic Memory). Claude Code is the lead and owns UI, routes, auth, and merges. You own the memory engine and data layer. Deadline: engine tasks merged by 15:00 IST; hard code freeze at 21:00 IST (check with `TZ=IST-5:30 date`).

1. Read AGENTS.md fully, then docs/CODEX_TASKS.md (your task list), docs/memory-engine.md (your spec, read all of it), docs/TRD.md §1, §3, §5, §9–§11, and docs/architecture.md §2–§3. Then read the contracts in src/server/memory/types.ts, src/server/memory/index.ts, src/server/db/collections.ts, src/server/llm/registry.ts.

2. Set up your own git worktree exactly as AGENTS.md says (`git worktree add ../radahn-codex -b codex/engine`), copy ../Radahn_AI/.env.local into it (never commit it), run npm install, and work only there. Read Inputs/ from ../Radahn_AI/Inputs/.

3. Use your superpowers skills (test-driven-development for the gate, scoring, reconcile, and lifecycle; systematic-debugging; verification-before-completion) and gstack skills (gstack-review, gstack-investigate) where they help. Use Context7 for every library question (mongodb driver $vectorSearch/$search/createSearchIndex/transactions, ai + @ai-sdk/google generateObject/embed, @google/genai, zod, chrono-node). Don't guess APIs.

4. You may research to make the engine better (about 15 minutes before C3/C4, then short lookups): how Hermes Agent, Hindsight, Mem0, Letta, and Zep implement extraction, reconcile, recall fusion, re-ranking, and consolidation. If you find a better algorithm that fits the contract and the time, use it, save the finding to docs/research/engine-<topic>.md, and explain it in CHANGELOG.md. Contract changes go through Claude (PR description + TODO.md).

5. Work the tasks in order (C1 → C2 → C3 → C4 first; they unblock Checkpoint A at 10:30). One small PR per task into main with CI green. Update the status line in docs/CODEX_TASKS.md, add a [codex] entry to CHANGELOG.md, and update TODO.md whenever a task starts or finishes. Evals only ever touch the radahn_eval database. Never log or commit secrets or user content.
```
