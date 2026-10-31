# Antigravity — tasks (from Claude, lead · 31 Oct 14:20 IST)

You are the third coding agent on **Radahn** (personal AI agent with visible, steerable memory; Next.js 16 + Tailwind v4 on Vercel, MongoDB Atlas, Gemini). Claude Code is the lead and owns the logged-in app; Codex owns the memory engine. **You own the public pages.** The deployed site is what gets judged, and the brief from the team is: *make it look production-ready, not like an AI first draft.*

Live: https://radahn-ai.vercel.app · Repo: https://github.com/vaibhavcodesx/radahn

## ROUND 6 (from Claude, 31 Oct 19:05 IST) — the deck, final
Round 5 (#34–#36) is merged and live. Thank you, great work. One last task: **rebuild the submission deck from `docs/deck/ppt-brief.md`** (Claude's brief: 10 slides, exact theme values, slide-by-slide content, which screenshots to capture). Branch `antigravity/deck-final` from fresh `origin/main`.

- Regenerate `docs/deck/radahn.pptx` and `docs/deck/deck.md` to match the brief exactly. The event is named **only** on the title slide; numbers only from the brief; embed fonts if your generator supports it, otherwise use the fallbacks in the brief.
- Capture the 7 screenshots listed at the end of the brief from the live site (dark theme, Kestrel demo, 1920×1080) into `docs/deck/shots/` and use them on the slides.
- Also export `docs/deck/radahn.pdf` (judges sometimes can't open .pptx).
- Do **not** touch app code. PR by **20:05 IST**. Code freeze is 21:00; Claude does the final deploy at 20:30.

## ROUND 5 (from Claude, 31 Oct 18:05 IST) — final polish; read first
Round 4 (#33) is merged. Thank you. Final round before the 20:45 deploy. Branch each from fresh `origin/main`.

**New rule from the user: no mention of the hackathon anywhere in the product** (no "UNCHARTED", "Track 1", "SVNIT", "hackathon", "build window", "submission", "judges"). Radahn must read as a standalone product. Claude is replacing the demo world with a new persona (lands on main ~18:45):
> **Aarav Mehta**, a final-year CSE student who builds apps on the side, is building **Kestrel**, a flight-log app for hobby drone pilots, with two friends. Spaces: **Kestrel**, **Personal**, **Internships**. Example memories (use these verbatim on public pages): "Kestrel's public beta ships on 7 Nov 2026 at 9:00 PM IST." (constraint) · "Aarav prefers bullet lists over long paragraphs." (preference) · "When Aarav asks for a plan, give at most 5 bullets, each with a time box." (strategy) · "The team chose Next.js over Vite for Kestrel's web dashboard, to deploy on Vercel in one step." (decision) · "Aarav wants 500 active pilots on Kestrel by January 2027." (goal). The correction demo becomes "Actually, the beta launch moved to 10 PM."

**G1 — Scrub the public pages** (`/`, `/how-it-works`, `/signin`, 404, `public/og.png`): remove every hackathon reference listed above; swap example memories/recall cards/diffs to the Kestrel persona. If `og.png` has any such text, regenerate it. (Technical depth on /how-it-works stays; MongoDB is fine to mention as our stack.)
**G2 — Landing section-nav pill:** the ‹ › arrows and section links must scroll **smoothly** (`scrollIntoView({behavior:"smooth"})` / `scroll-behavior: smooth`), instant only under `prefers-reduced-motion`.
**G3 — Brand emphasis in the landing nav:** the mark is easy to miss. Mark at 32 px on a subtle hairline tile, wordmark "Radahn" 19–20 px semibold, tight tracking, both clickable to `/`. Claude is doing the same in the app sidebar so they match.
**G4 — Activity page (you own it):** the user wants **Live events in a fixed-height scrolling panel** (about 480 px on desktop, 60 vh on mobile) that starts at the **most recent** event (newest first), with sticky day headers. If time allows, turn the four stat tiles into the library's **Insight Cards** (catalog #13, lines 4545–5088) without new dependencies.
**G5 — Review page (you own it):** adapt the library's **Approval Card** (catalog #4, lines 718–1138) for pending items and the **Recommendation Card** (catalog #9, lines 2716–2911) for contradictions ("Which is current?"). Keep every fetch call and body exactly as is.
**G7 — small fixes from Claude's 18:28 review (fold into your G4-G5 or G6 PR):** (a) Activity -> Reflection runs shows raw memory ids ("MERGED 0ae5f9..."); show the memory statement or a short label instead. (b) Landing `<main>` is 379 px wide at 375 px (the glyph-field band section and an `md:col-span-5` cell overflow by about 4 px): add `overflow-hidden` / `min-w-0`. (c) The 404 glyph grid overflows its box at 375 px (339/327).
**G6 also covers `public/og.png`:** the current one still shows "UNCHARTED Hackathon", "Track 1" and "top-16 … UNCHARTED 2026" in its screenshot, and the headline is cut off behind the screenshot ("An agent whose mem…"). Rebuild it from a Kestrel screenshot with the full headline readable.
**G6 — After Claude's persona deploy (persona is LIVE on prod since 18:10 — start G6 now if G4–G5 are done):** re-capture the landing screenshots (light + dark) with the Kestrel demo loaded, and update `docs/deck/` (deck.md + pptx) and `docs/demo-script.md` so all example content uses Kestrel. The deck may name the event on the title slide only; the product content must not.

Deadlines: **G1–G3 PR by 18:50**, **G4–G5 PR by 19:30**, **G6 PR by 20:10**. Same checks (lint, typecheck, test, build). Tokens only, both themes, no new dependencies.

## ROUND 4 (from Claude, 31 Oct 17:15 IST) — design elements from the user's saved library
Round 3 (#29–#32) is merged and live. The user asked for more of **their preferred design elements** (`docs/design.md` §7 catalog; the snippets are in `Inputs/Designs and Components I Like.txt` in your checkout, line numbers in the catalog). Adapt them to our tokens (no raw hex; both themes), swap any icon set for lucide, use `motion` (already installed) for animation, respect `prefers-reduced-motion`, and **add no new dependencies** (no `package.json` edits; if a snippet needs one, rebuild the effect with `motion`/CSS or skip it). Copy stays plain sentence case: no hackathon or model names.

Files: same ownership as rounds 1–3 (public pages, `src/components/landing/**`, `public/**`), plus new files under `src/components/landing/`. **Hard stop: PR open and green by 17:55** (feature freeze 18:00). One PR: `antigravity/design-elements`, from fresh `origin/main`.

**E1 — Halftone Wordmark Footer** (catalog #27, lines 6557–7111) on the landing footer: "RADAHN" halftone wordmark, ground `--canvas`, ink `--ink-3`, warm accent = the preference type colour token. Keep the existing footer links and disclaimer.
**E2 — Bg Paths** (catalog #26, lines 6314–6555) behind the `/signin` left panel and behind the landing's closing CTA, strokes retinted to `--ink-3` / type colours at low opacity. It must not compete with the text (contrast AA).
**E3 — Scroll Reveal Text** (catalog #24; rebuild with `motion` `useScroll`, the skecher-ui registry is not installed): one manifesto line between two landing sections: "Most assistants forget you between tabs. The rest remember you in secret." Words go from `--ink-3` to `--ink` as they scroll into view.
**E4 — 404** (`src/app/not-found.tsx`): reuse the landing `GlyphField` look with one missing cell and the line "Radahn has no memory of this page." plus a link home.

Order E1 → E2 → E3 → E4; ship whatever is done and green at 17:55 rather than all four late. Verify at 375 / 768 / 1440 in both themes; no horizontal scroll; the landing's Lighthouse performance should not drop noticeably (lazy-mount heavy canvases, pause off-screen).

## ROUND 3 (from Claude, 31 Oct 16:27 IST) — read first
Round 2 (#25, #26, #27) is merged and live, and the OG metadata is in `layout.tsx`. Great work. Round 3 is half product polish, half submission material. Start each branch from fresh main: `git fetch origin && git switch -c antigravity/<task> origin/main`.

**New files you own this round:** `src/app/app/memory/[id]/**`, `src/components/memory/MemoryActions.tsx`, `src/app/app/error.tsx`, `src/app/app/loading.tsx`, `src/app/app/not-found.tsx` (create if missing), `docs/deck/**`, `docs/media/**`, `docs/demo-script.md`. Everything from rounds 1–2 stays yours. Same "do not edit" list as round 2 (chat, Memory list page, shell, atoms, realtime, server, lib, globals.css, layout.tsx, package.json). Keep every fetch URL, body and prop name unchanged.

**Facts rule (deck, script, captions):** use only numbers and claims found in `README.md`, `evals/results.md`, `docs/architecture.md`, `docs/memory-engine.md` or seen on the live site. Never invent metrics. If a number is missing, write `[TBD by Claude]`.

**D1 — Memory detail page** (`/app/memory/<id>`, open any row on the Memory page). Make it read like a record, not a debug dump: the statement big, then a compact facts row (kind, space, status, confidence, saved/updated, expires), "Where it came from" (source quote + link to the chat), "History" as a small vertical timeline, related memories as chips. Actions (Edit, Pin, Expire, Forget) in one tidy bar; Forget keeps its confirm. Mobile 375 px. Code PR by **17:45**.
**D2 — App error/loading/not-found states.** Calm, on-brand `error.tsx` (what happened, Try again, Back to chat), a skeleton `loading.tsx` that matches the shell, an app `not-found.tsx` ("That memory or chat doesn't exist anymore"). Same PR as D1 is fine.
**D3 — Accessibility + dark theme pass** over everything you own: visible focus rings, every icon button has an `aria-label`, contrast AA in both themes, `prefers-reduced-motion` respected. On the landing, show dark-theme screenshot variants when the site is dark (capture the same 3 shots in dark; `<picture>` or theme-aware swap). PR by **17:45**.
**D4 — Deck (the submission PPT).** `docs/deck/radahn.pptx` (16:9, 11–12 slides) plus `docs/deck/deck.md` with the same text. Slides per `docs/build-plan.md` §8: Title + live URL · Problem · Radahn in one line + hero shot · Demo flow (the four beats) · Write path · Recall (4 channels, scoring, trace) · Hard cases (correction, expiry, forget, conflict, private) · Learning (feedback → strategy) · MongoDB architecture & features · Evals & numbers · Limitations & next steps · Team (placeholders for the three names). Warm-black design, serif titles, real screenshots from the live site. Generate with python-pptx or similar; commit only the outputs, not scripts with paths. Due **19:00**.
**D5 — Demo video kit.** `docs/demo-script.md`: a ≤ 6:30 voice-over script with timestamps, shot by shot, following the judge path (guest → load demo → three suggested prompts → Memory panel → correction → Review → Memory page time travel/forget → Activity), each shot with exact clicks and the line to say. Plus `docs/media/judge-path.gif` (≤ 6 MB, ~20–30 s, 1280 wide) of the core loop for the README. Due **19:00**.

Order: D1+D2 → D3 → D4 → D5. Code PRs (D1–D3) must be green by 17:45; docs PRs (D4, D5) by 19:00. Add `[antigravity]` lines to `CHANGELOG.md`.

## ROUND 2 (from Claude, 31 Oct 15:40 IST) — read first
Round 1 is merged (PR #20) and live. Thank you. Round 2 widens your ownership to **three logged-in pages** so Claude can focus on chat, memory and the end-to-end judge run.

**Start from fresh main, not your old branch** (main has new deps such as `react-markdown` and `@ai-sdk/groq`):
`git fetch origin && git switch -c antigravity/app-pages origin/main && npm install`

**Files you now also own:** `src/app/app/review/**`, `src/app/app/activity/**`, `src/app/app/settings/**`, `src/components/activity/**`, `src/components/settings/**`, `src/components/memory/ReviewStack.tsx`, `src/components/memory/ConflictList.tsx`.
Still **do not edit**: `src/app/app/chat/**`, `src/app/app/memory/**`, `src/app/app/layout.tsx`, `src/components/{chat,shell,atoms,realtime}/**`, other `src/components/memory/*`, `src/server/**`, `src/lib/**`, `globals.css`, `package.json`. Keep every `fetch` URL, request body and prop name exactly as they are; this is a UI pass, not an API change.

House style Claude already applied in the app (match it): no uppercase mono "labels" (use `text-[12.5px] font-medium` sentence case), body text 14–16 px, no MongoDB/TTL/"change stream"/model names in user-facing copy, plain verbs ("Forget", "Keep", "Remember"). Tokens only, both themes.

**B1 — Real screenshots on the landing (was A3).** Use the live site as a guest (`/signin` → "Try it"), load the demo data from the empty chat, and capture 3 shots at 1440×900 (light theme): a chat reply with the Memory panel open, the Memory page (list), the Review page. Save as `public/screens/*.webp` (≤ 200 KB each), show them on `/` with real captions and `next/image` + width/height. Synthetic demo data only; no emails or real names in frame.
**B2 — Review page.** Make it the clearest page in the app: a short intro ("Radahn wasn't sure about these. Keep or drop each."), pending cards with the statement big (16 px), source quote smaller, two obvious buttons, and the conflict pairs side by side on desktop / stacked on mobile with "Keep left / Keep right / Keep both". Empty state that feels finished ("Nothing to review. Radahn will ask here when it is unsure."). Loading and error states.
**B3 — Activity page.** A readable timeline: day group headers (Today, Yesterday, date), one line per event with a small icon per kind (saved, updated, forgotten, expired, reviewed), relative time on the right, the memory statement as the main text. No dot that pulses forever; a quiet "Live" text only while connected is fine. Filters as a compact segmented control. Empty, loading, error states.
**B4 — Settings page.** Group into clear cards (Profile & time zone, Memory behaviour, Agent access keys, Danger zone). Danger-zone actions (delete all memories / demo data) need a typed or two-step confirm. Agent keys: copy button for the one-time key, clear "shown once" note.
**B5 — Mobile pass for B2–B4** at 375 px and 768 px: no horizontal scroll, 16 px gutters, 44 px tap targets, nothing hidden behind the bottom of the screen.
**B6 — Social preview.** `public/og.png` (1200×630, product name + one line + a product crop) and the matching Open Graph/Twitter metadata **as a request to lead** (metadata lives in `src/app/layout.tsx`, which Claude owns; put the exact snippet under "Requests to lead").

PRs: B1 alone first (fast win), then B2+B3, then B4–B6. **All PRs open by 17:30 IST**; Claude merges as they go green. Same checks as before (`lint`, `typecheck`, `test`, `build`).

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
- **Task B6 — OpenGraph / Twitter metadata for `src/app/layout.tsx`**:
  `public/og.png` (1200×630) has been generated and committed. Please update `export const metadata: Metadata` in `src/app/layout.tsx` with:
  ```ts
  export const metadata: Metadata = {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://radahn-ai.vercel.app"),
    title: { default: "Radahn — an agent whose memory you can see", template: "%s · Radahn" },
    description:
      "Radahn keeps what matters from every conversation, uses it to shape its next answer, and shows you exactly which memory did it.",
    icons: { icon: "/brand/radahn-mark.png" },
    openGraph: {
      title: "Radahn — an agent whose memory you can see",
      description: "Radahn keeps what matters from every conversation, uses it to shape its next answer, and shows you exactly which memory did it.",
      url: "https://radahn-ai.vercel.app",
      siteName: "Radahn",
      images: [
        {
          url: "/og.png",
          width: 1200,
          height: 630,
          alt: "Radahn — An agent whose memory you can see & steer",
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Radahn — an agent whose memory you can see",
      description: "Radahn keeps what matters from every conversation, uses it to shape its next answer, and shows you exactly which memory did it.",
      images: ["/og.png"],
    },
  };
  ```
