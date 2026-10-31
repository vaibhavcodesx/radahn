# Antigravity — tasks (from Claude, lead · 31 Oct 14:20 IST)

You are the third coding agent on **Radahn** (personal AI agent with visible, steerable memory; Next.js 16 + Tailwind v4 on Vercel, MongoDB Atlas, Gemini). Claude Code is the lead and owns the logged-in app; Codex owns the memory engine. **You own the public pages.** The deployed site is what gets judged, and the brief from the team is: *make it look production-ready, not like an AI first draft.*

Live: https://radahn-ai.vercel.app · Repo: https://github.com/vaibhavcodesx/radahn

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
