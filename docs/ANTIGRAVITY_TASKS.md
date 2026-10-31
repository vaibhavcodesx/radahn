# Antigravity — tasks (from Claude, lead · 31 Oct 14:20 IST)

You are the third coding agent on **Radahn** (personal AI agent with visible, steerable memory; Next.js 16 + Tailwind v4 on Vercel, MongoDB Atlas, Gemini). Claude Code is the lead and owns the logged-in app; Codex owns the memory engine. **You own the public pages.** The deployed site is what gets judged, and the brief from the team is: *make it look production-ready, not like an AI first draft.*

Live: https://radahn-ai.vercel.app · Repo: https://github.com/vaibhavcodesx/radahn

## Read first (10 min max)
1. `PRODUCT.md` and `docs/design.md` §1–§5 (direction, tokens, type scale). Tokens only — no raw hex in components; both light and dark themes must work.
2. `src/app/globals.css` (tokens: `--ink`, `--surface`, `--accent`, type colours `--t-*`, fonts `font-serif` Hedvig Letters Serif, sans Hanken Grotesk, `font-mono` Martian Mono).
3. The current pages below, in the browser at 1440 px and 375 px.

## Files you own (edit only these)
- `src/app/page.tsx` (landing) and `src/components/landing/**`
- `src/app/how-it-works/**`
- `src/app/signin/**`
- `src/app/not-found.tsx`
- `public/**` (new images go in `public/screens/`)

**Do not edit:** `src/app/app/**`, `src/components/{chat,memory,shell,activity,settings,atoms,realtime}/**`, `src/server/**`, `src/lib/**`, `src/app/globals.css`, `src/app/layout.tsx`, `package.json`. If you need a token or a dependency, write the request at the bottom of this file under "Requests to lead" and continue.

## Tasks, in order
**A1 — Remove "AI-slop" labels everywhere you own.** [DONE] Removed hackathon and meta labels, model mentions from public landing and explainers.
**A2 — Nav bar.** [DONE] Created `src/components/landing/Nav.tsx` with bold logo mark + wordmark, sentence-case sans links, primary CTA "Try it — no sign-up", sticky with scroll backdrop, and responsive mobile menu.
**A3 — Landing sections.** [DONE] Replaced MongoDB features grid with user-facing values; body text ≥ 16px, line-height 1.6; calmed headings; cleaned footer. (Screenshots deferred per user decision).
**A4 — /how-it-works.** [DONE] Cleaned up slop and model credits in intro, preserved technical depth in feature & lineage tables, unified nav and responsive design.
**A5 — /signin.** [DONE] Clean cards, clear options, responsive 375px design with 16px gutters.
**A6 — Mobile pass (375 px and 768 px)** [DONE] Verified all public pages: no horizontal scroll, 16px gutters, tap targets ≥ 44px, full responsive nav.

## Workflow
- Work on a branch `antigravity/<task>` (one PR per 1–2 tasks), PR into `main`. Before each PR: `npm run lint && npm run typecheck && npm run test && npm run build` all green. CI must be green; Claude merges.
- Small commits, conventional messages (`feat(landing): …`). Add a line to `CHANGELOG.md` prefixed `[antigravity]`.
- **Deadline:** all PRs open by **17:00 IST**. Code freeze 18:00 for features; nothing after 20:45.
- Never commit `.env*` or `Inputs/`. Don't put keys, emails or personal data in screenshots (demo data is synthetic and fine).

## Requests to lead
(append here)
