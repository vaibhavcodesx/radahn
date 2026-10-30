# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: Next.js (App Router) + TypeScript + Tailwind v4 + shadcn, MongoDB Atlas (native driver), Gemini API via AI SDK, Better Auth, deployed on Vercel. Chosen by the planner for one-language speed and because the user's saved components are React/Tailwind (see docs/TRD.md, docs/decisions.md).

## Users

- Primary: a student builder or knowledge worker who uses a personal AI agent across many sessions and is tired of repeating context. Demo persona: Aarav, 3rd-year CSE student at SVNIT Surat, juggling a hackathon project, internship applications, and coursework.
- Judges at UNCHARTED 2026 (MongoDB Track 1: Agentic Memory): open the live URL cold, on laptops and a projector, with about two minutes of attention; must get in with one click and see memory change an answer.
- Optional: other coding agents (Claude Code, Codex) reading and writing the same memory over MCP (stretch).

## Product Purpose

Radahn is a personal AI agent whose memory you can see, steer, and trust. It remembers what matters (preferences, decisions, constraints, outcomes, feedback), uses it to change its next answer or plan, and shows exactly which memory changed what and why. Success: memory visibly changes behaviour (proven with a with/without-memory diff), every recall is explainable, and the user controls correction, expiry, approval, and forgetting.

## Positioning

The only agent in the room that shows its memory working: inline memory citations, stored score breakdowns for every recall, a one-click answer-without-memory diff, and database-enforced single-truth facts with full history. Memory is the main surface, not a settings page.

## Operating Context

- Built and judged within a 24-hour hackathon (deadline 31 Oct 2026, 21:00 IST); judged on the deployed URL, GitHub repo, a ≤7-minute demo video, and a deck; finals are a 10-minute live presentation plus Q&A.
- Runs on free tiers: Gemini API free tier (rate limits apply; Google may use free-tier prompts to improve products), MongoDB Atlas M0, Vercel Hobby.
- Guests enter with one click; Google sign-in keeps memories.

## Capabilities and Constraints

- Chat agent on Gemini 3.8 Flash with memory tools (remember, recall, correct, forget).
- Memory units typed as profile, preference, fact, goal, constraint, decision, outcome, feedback, strategy, observation; lifecycle active / pending review / superseded / expired / rejected; hard forget with a content-free tombstone.
- Hybrid recall (vector + lexical + temporal + entity links) with explainable scores; reflection that merges, observes, and learns strategies from feedback.
- Live activity via MongoDB change streams.
- Secrets are never stored; sensitive items wait for user approval.
- Non-goals: document RAG, voice, mobile apps, team accounts, billing, web browsing tools.

## Brand Commitments

- Name: Radahn. Logo: `Inputs/Moody RADAHN Rune Logo.png` (silver mark on black, one small red spark). Use the mark as-is; the user said it must not drive the colour palette. No video-game imagery.
- Binding visual references from the user: Griffin (griffin.com) and LocalCan (localcan.com) mixed as primary; Teak (teak.io) secondary; Stanley Whitney "How High the Moon" (Fonts In Use) for type pairing and colour blocks; the user's saved component library in `Inputs/Designs and Components I Like.txt`, to be used as much as fits. Direction details: docs/design.md.
- Voice: plain, warm, exact; first person for the agent; no hype, no emoji in UI.

## Evidence on Hand

- No real users, customers, testimonials, or benchmarks exist. Do not invent any.
- Demo content is a synthetic persona (Aarav) seeded per user and labelled DEMO.
- Real numbers available only from the project's own eval harness (`npm run eval`) and live app telemetry shown in-app.

## Product Principles

1. Show, don't claim: every memory effect is visible and inspectable.
2. Correct, don't erase; forget means truly forget.
3. Consent beats cleverness: secrets never stored, sensitive items need approval.
4. Depth over breadth: one loop that works perfectly on the live URL.
5. Judges are users: one click to enter, populated in five seconds.

## Accessibility & Inclusion

WCAG 2.2 AA target: 4.5:1 text contrast, visible focus, full keyboard path for chat, memory table, review, and drawers; never colour alone for memory types (colour + glyph + label); reduced-motion support; light theme for projectors.
