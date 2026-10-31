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
**A1 — Remove "AI-slop" labels everywhere you own.** No hackathon/meta text in the product: delete "Agentic memory · UNCHARTED 2026 · MongoDB Track 1", "BUILT ON MONGODB ATLAS · GEMINI 3.8 FLASH", and any model names (Gemini 3.8 Flash, Flash-Lite…) from public pages. The product talks about what it does for the user, not how it was built. (The README keeps the hackathon framing; the site doesn't.)

**A2 — Nav bar.** Today the wordmark "RADAHN" is tiny, low-contrast mono and the links are small uppercase mono. Make it look like a real product: logo mark + wordmark in a legible weight/size (e.g. 17–18 px, `text-ink`, sans or serif — pick one and be consistent), links in sans 14–15 px sentence case ("How it works", "GitHub", "Sign in"), primary CTA button ("Try it — no sign-up" or similar) that goes to the guest flow it goes to today. Sticky with a subtle backdrop on scroll. Mobile: compact nav (logo + CTA, links in a menu).

**A3 — Landing sections.** Keep the strong parts (hero, glyph field, recall card, proof diff), but:
- Replace the "MongoDB features" grid ($vectorSearch, Atlas Search, TTL …) with user-facing value (e.g. "Remembers what matters / Shows why / You stay in control / Forgets on command") — or move tech detail to /how-it-works.
- **Screenshots section:** use real product screenshots. Capture from production at 1440×900 (guest → "Load demo memories" → ask "Plan my next 4 hours."): (1) chat with Memory lens open, (2) Memory page, (3) Review. Save as optimized PNG/WebP in `public/screens/`, show them in a polished framed showcase (browser-frame or soft shadow, captions in plain language, `next/image` with width/height, lazy). No fake UI mock-ups.
- Body text ≥ 16 px, line-height ~1.6; section headings large and calm. Fewer mono uppercase labels (they read as "generated"); keep mono only for tiny metadata.
- Footer: product name, GitHub, How it works. No stack credits.

**A4 — /how-it-works.** Same cleanup. Keep the honest technical explanation (this is where MongoDB features can be named) but write it for a curious user: short sections, real diagrams/figures if present, readable sizes.

**A5 — /signin.** Clean card, both options clear (Continue as guest / Continue with Google), short honest note that guest memories last 7 days. Works at 375 px.

**A6 — Mobile pass (375 px and 768 px)** for every page you own: no horizontal scroll, 16 px side gutters, tap targets ≥ 44 px, nav works.

## Workflow
- Work on a branch `antigravity/<task>` (one PR per 1–2 tasks), PR into `main`. Before each PR: `npm run lint && npm run typecheck && npm run test && npm run build` all green. CI must be green; Claude merges.
- Small commits, conventional messages (`feat(landing): …`). Add a line to `CHANGELOG.md` prefixed `[antigravity]`.
- **Deadline:** all PRs open by **17:00 IST**. Code freeze 18:00 for features; nothing after 20:45.
- Never commit `.env*` or `Inputs/`. Don't put keys, emails or personal data in screenshots (demo data is synthetic and fine).

## Requests to lead
(append here)
