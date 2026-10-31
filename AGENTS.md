# AGENTS.md — Codex guide for Radahn

You are the **secondary building agent**. Claude Code is the lead; it owns architecture, UI, routes, auth, and merges. You own the **memory engine and data layer**. You work at the same time as Claude, in your own git worktree.

**Deadline: 31 Oct 2026, 21:00 IST. Your engine tasks should be merged by 15:00.** Check the time with `TZ=IST-5:30 date` (Git Bash has no tz database, so `TZ=Asia/Kolkata` silently prints GMT).

## Start here
1. Read `docs/CODEX_TASKS.md` (your task list, written by Claude). If it doesn't exist yet, wait: Claude writes the contracts first.
2. Read `docs/memory-engine.md` in full (your spec), then `docs/TRD.md` §1, §3, §5, §9–§11, and `docs/architecture.md` §2–§3.
3. Read the contracts: `src/server/memory/types.ts`, `src/server/memory/index.ts`, `src/server/db/collections.ts`, `src/server/llm/registry.ts`.
4. Background research (local, git-ignored): `Inputs/track1-memory-references.md` (Hermes, Hindsight, IHMT-MEMORY notes).

## Workspace
- Use a separate worktree so you never share files with Claude: `git worktree add ../radahn-codex -b codex/engine` (or the branch named in CODEX_TASKS.md). Work there.
- Git-ignored files do **not** exist in your worktree. Read `Inputs/` from the main checkout (`../Radahn_AI/Inputs/`), and copy the env file once: `cp ../Radahn_AI/.env.local .env.local` (never commit it). Run `npm install` in the worktree.
- One PR per task (C1, C2, …) into `main`. Keep PRs small. CI must be green (lint, typecheck, tests, build).
- Rebase on `main` after each of Claude's merges.

## Files you own
`src/server/memory/**` (except `types.ts`), `src/server/llm/**`, `scripts/**`, `evals/**`, and their tests.
Read-only for you: everything else. If a contract in `types.ts` must change, propose it in your PR description and in `TODO.md`; don't change UI or routes.

## Skills and tools
- If superpowers is installed for Codex, use it: `test-driven-development` (required for gate, scoring, reconcile, lifecycle), `systematic-debugging`, `verification-before-completion`, `requesting-code-review`. If gstack is installed for Codex (`gstack-*` skills), `gstack-review` and `gstack-investigate` are useful.
- **Context7 MCP** (if configured) for every library question: `mongodb` Node driver (`$vectorSearch`, `$search`, `createSearchIndex`, transactions, change streams), `ai` + `@ai-sdk/google` (`generateObject`, `embed`, provider options), `@google/genai`, `zod`, `chrono-node`. Otherwise read the official docs. Don't guess APIs.
- MongoDB specifics: same embedding model and dimension (gemini-embedding-2, 768) for documents and queries; vector index filters on `ownerId`, `spaceKey`, `status`, `type`, `sensitivity`; TTL on `purgeAt`; partial unique index on `{ownerId, spaceKey, slotKey}` where `status: 'active'`.

## Definition of done (per task)
- Implements the contract exactly; matches the memory-engine.md section named in the task.
- Unit tests for the deterministic logic with mocked LLM/embeddings; `npm run test` passes.
- No secrets, no network calls in unit tests, no `console.log` of user content (ids and counts only).
- Module header comment names the spec section; non-obvious thresholds have a one-line *why*.
- Status line in `docs/CODEX_TASKS.md` updated; `CHANGELOG.md` entry prefixed `[codex]`; `TODO.md` updated.

## Freedom
The spec's numbers (weights, thresholds, half-lives) are starting values. Tune them with the eval harness and record changes in `CHANGELOG.md`. If you find a better algorithm that fits the contract and the time, use it and explain why.

You may research to make the engine better (time-boxed: about 15 minutes before C3/C4, short lookups after). Good targets: how Hermes Agent, Hindsight, Mem0, Letta, and Zep/Graphiti implement extraction, reconcile, recall fusion, and consolidation; MongoDB `$vectorSearch`/`$search` best practices; Gemini structured output. Use Context7 first, then official docs and repos. Save findings that change behaviour to `docs/research/engine-<topic>.md` with links. Contract changes still go through Claude (PR description + `TODO.md`).

## Hard rules
- Never commit `.env*` or `Inputs/`. Never log or store secrets; the privacy gate is part of your job.
- Every query scopes by `ownerId`.
- Evals never touch real users: they run in `radahn` under a disposable `eval:<uuid>` owner deleted in `finally` (M0 allows 3 search indexes per cluster, so no separate eval database; see CODEX_TASKS LEAD NOTES).
- No commits after 21:00 IST.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
