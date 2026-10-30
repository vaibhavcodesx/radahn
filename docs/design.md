# Radahn — Design Direction & System Brief

> Planning-stage design brief for the builder. Decided with: the user's pinned references (Griffin ≈ LocalCan > Teak, Stanley Whitney / Fonts In Use), the user's saved component library (`Inputs/Designs and Components I Like.txt`), the **impeccable** skill (direction contract, modes, bans), and **UI/UX Pro Max** (UX rules, pre-delivery checklist; its generic slate-and-green palette was rejected because the brief pins the look).
> **Two design files, two jobs:** this file is the *intent* (written before the build). The token-bearing `DESIGN.md` at repo root plus `.impeccable/design.json` is written **after** the build by impeccable's documenter from what actually shipped (impeccable new-work §5/§7). Don't hand-write root `DESIGN.md` first.
> The builder has creative freedom inside this direction: improve it, don't dilute it. Log deviations in `CHANGELOG.md`.

---

## 0. Skills to use while designing/building UI

| When | Skill | How |
|---|---|---|
| Before any UI work | `impeccable` | Run its `context` once; PRODUCT.md exists at root. The direction is **brief-pinned** (this doc), so skip the concept-seed roll; record §1 as the surface brief's `## Direction contract` via `impeccable surface-brief write`. Read `reference/craft-floor.md` before UI edits. |
| Per page | `frontend-design`, `ui-ux-pro-max` | Pro Max is installed but **disabled**: enable it (SETUP.md), or call its script directly: `python "<plugin>/.claude/skills/ui-ux-pro-max/scripts/search.py" "<query>" --domain ux` / `--stack nextjs` / `--stack shadcn`. Use it for UX rules, not palette. |
| Motion | `transitions-dev`, `transitions-polish` | "Shimmer text" and "Card resize" are in your list; install via `npx transitions-dev add shimmer-text` / `card-resize`. |
| Review | `web-design-guidelines`, gstack `/design-review`, impeccable `audit` + `polish`, impeccable finish reviewer | Once per page group, not per tweak (impeccable: two inspection rounds max). |
| After the build | impeccable documenter | Writes root `DESIGN.md` + `.impeccable/design.json`. |

## 1. Direction contract (impeccable format; record as the surface brief)

- **THESIS.** Memory is the product surface, not a settings page. Every screen shows the agent's memory as a held, inspectable field of colour blocks, so a stranger can see *what* it knows and *why* it answered. It refuses the category default: a chat column with a "Memories" modal, slate-blue dark mode, a neon accent.
- **OWN-WORLD.** Warm ledger-black ground (Griffin) with bone ink; light, sharp display serif against a quiet grotesk and an uppercase mono for labels and buttons; hairline bento grids (LocalCan); one deep **grove-green** inset "memory room" where recalled memory lives (LocalCan's inset panel); memory types as ten flat **Whitney colour blocks**, the only saturated colour in the system, never gradients; a monospaced **glyph field** (Griffin's £/$ band, reborn) where memories sit as coloured cells among quiet characters; Teak's small colour squares as type markers and nav dots.
- **STORY.** The visitor understands in one viewport that Radahn remembers and shows its work. They believe it when the glyph field lights the exact memories an answer used and the ghost diff shows what the answer would have been without them. They act: "Enter as guest", load the demo world, ask "Plan my next 4 hours."
- **FIRST VIEWPORT (landing).** Left 7/12: two-line light serif headline at ~84px, line two a morphing verb phrase; 2-line grotesk sub; two mono pill buttons (bone "ENTER AS GUEST ↵", outline "CONTINUE WITH GOOGLE"). Right 5/12: a floating recall card (Teak's floating UI card) showing 3 recalled memories with score bars. Bottom 30% of the viewport: the full-bleed glyph field band with the section nav pill floating inside it (Griffin). Logo top-left, mono links top-right.
- **FORM.** Brief-pinned mix: Griffin (primary: ground, type voices, pills, glyph band, logo grid) + LocalCan (hairline grid cells, grove inset panel, kbd hints in buttons, numbered mono sections, terminal-transcript section) + Teak (colour-square markers, floating product cards, highlighter mark on one word). Seed key: `pinned:user-brief-2026-10-31` (no roll; impeccable new-work: a user-pinned direction beats the roll).
- **FINISH.** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## 2. References: what to take, what to leave

| Source | Take | Leave |
|---|---|---|
| **Griffin** (griffin.com; primary) | Warm near-black `#0F0E0C`-ish ground, bone text, light high-contrast serif headlines with tight leading, grotesk body where the second sentence drops to muted ink, **uppercase mono pill buttons** (bone filled + outline), character-matrix band, floating nav pill inside the band, logo grid with hairline cells, centered serif closing CTA, generous quiet space | Banking content, £/$ glyphs (ours are memory glyphs), photography of water |
| **LocalCan** (localcan.com) | **Inset forest-green panel** with thin pale-green hairline grid cells; mono display for numbered section headers (`03 Send the link…`); **kbd hint inside buttons** (`Start building [S]`); pixel squares over imagery; the agent-transcript section ("Everything above, agents can do"); product UI shown at real size | Their exact green values, the photo of a face |
| **Teak** (teak.io; secondary) | Small **colour squares** as category markers in nav and legends; one **highlighter** word in a headline; floating product card next to the hero; mono stats row | Light-only ground, chunky rounded display face, yellow CTA |
| **Stanley Whitney: How High the Moon** (Fonts In Use) | Colour blocks in loose stacked rows as the memory-type palette and the "quilt" field; the type pairing *idea*: a sharp contemporary serif (Victor Serif) with a characterful humanist sans (Mallory) | The paid faces themselves (substitutes in §4.2) |
| **RADAHN logo** (`Inputs/Moody RADAHN Rune Logo.png`) | Use the mark as-is (silver on black) in nav, favicon, OG image. On light theme use it on a small black tile. | Do **not** derive the palette from it (user instruction). The red spark is not our accent. |

Surface modes (impeccable): Landing = **Persuade**. App (chat, memory, review, activity, settings) = **Operate**. How it works = **Read**.

## 3. Physical scene (decides dark vs light)

A student at 3 AM in a hostel room; then judges on laptops in a lit room and a projector at the finals. → **Dark is default** (warm, not blue-black, so it survives projectors without crushing), with a full **light "paper" theme** for projectors that wash out dark UIs (toggle in Settings and the sidebar; also respect `prefers-color-scheme` on first visit). The saved snippets already assume both themes.

## 4. Tokens (starting values; the documenter records the shipped truth)

All snippet class names (`text-ink`, `bg-surface`, `border-line`, `shadow-overlay`, `rounded-control`, …) must resolve. Define CSS variables in `globals.css` and map them in Tailwind v4 `@theme`.

### 4.1 Colour

| Token | Dark (default) | Light ("paper") | Use |
|---|---|---|---|
| `--canvas` | `#0E0D0B` | `#F2F0E8` | Page ground |
| `--surface` | `#161512` | `#FAF9F4` | Panels, cards |
| `--surface-2` | `#1E1C18` | `#FFFFFF` | Raised / popovers |
| `--hover` | `rgba(237,230,214,.05)` | `rgba(21,19,15,.04)` | Row hover |
| `--hover-2` | `rgba(237,230,214,.09)` | `rgba(21,19,15,.07)` | Pressed / selected |
| `--line` | `rgba(237,230,214,.10)` | `rgba(21,19,15,.10)` | Hairlines |
| `--line-strong` | `rgba(237,230,214,.18)` | `rgba(21,19,15,.18)` | Inputs, focus-adjacent |
| `--ink` | `#EDE6D6` (bone) | `#15130F` | Primary text |
| `--ink-2` | `#B8B1A2` | `#4A463E` | Secondary text |
| `--ink-3` | `#7E786C` | `#807A6E` | Tertiary, captions (≥ 4.5:1 only at ≥ 14px; check) |
| `--accent` | `#EDE6D6` | `#15130F` | Primary pill (Griffin bone pill / ink pill) |
| `--accent-ink` | `#0E0D0B` | `#F2F0E8` | Text on accent |
| `--accent-tint` | `rgba(237,230,214,.08)` | `rgba(21,19,15,.06)` | Selected chips |
| `--accent-foreground` | = `--accent-ink` | | shadcn compat |
| `--grove` | `#0F1C13` | `#E3ECDD` | The memory room: Memory lens, Atlas field, ghost diff panel |
| `--grove-line` | `rgba(176,214,164,.14)` | `rgba(30,70,40,.14)` | Grid cells inside grove |
| `--grove-ink` | `#CFE3C6` | `#1D3A24` | Labels inside grove |
| `--focus` | `#F2C12E` | `#8A5A00` | Focus ring (2px + 2px offset) |
| `--green` / `--red` / `--orange` | `#4FB37E` / `#E2553A` / `#F08A24` | `#1F7A4C` / `#B83A22` / `#B5600F` | Success / danger / warning |
| `--tooltip-bg` / `-fg` / `-muted` | `#EDE6D6` / `#0E0D0B` / `#5B564D` | `#15130F` / `#F2F0E8` / `#A9A397` | Tooltips, the Loading "Surfer" card |

**Memory type palette ("Whitney blocks")**, identical in both themes; every swatch also carries a glyph and a label (never colour alone):

| Type | Swatch | Text on swatch | Glyph |
|---|---|---|---|
| profile | `#E7DCC3` bone | dark | `@` |
| preference | `#F2C12E` cadmium | dark | `+` |
| fact | `#3A63D8` cobalt | light | `#` |
| goal | `#F08A24` orange | dark | `^` |
| constraint | `#D8432F` vermilion | light | `!` |
| decision | `#B23A7A` magenta | light | `=` |
| outcome | `#2E9E6B` viridian | light | `~` |
| feedback | `#74B8E0` sky | dark | `<` |
| strategy | `#6B4BC2` violet | light | `%` |
| observation | `#A7A23C` olive | dark | `*` |

Status treatments: `active` = solid swatch; `pending_review` = swatch with 45° hatch; `superseded` = 1px outline swatch + strikethrough statement in `--ink-3` + "OUTDATED" mono tag; `expired` = 30% opacity + "EXPIRED"; `rejected` not shown outside Review.

Colour strategy: **Restrained chrome, full palette for data.** Saturated colour appears only as memory blocks, citation squares, and charts. Never tint whole panels with type colours. Never gradients on UI (the only gradients allowed: the shimmer text sweep and the glimm send sweep, which uses the ten type colours in order).

### 4.2 Typography

| Role | Face (Google Fonts via `next/font`) | Fallback | Use |
|---|---|---|---|
| Display serif | **Hedvig Letters Serif** (sharp, contemporary; the free cousin of Victor Serif's cut terminals) | Spectral 300 | Landing headlines, page H1, memory statements in detail views and approval cards (memories read like inscriptions) |
| UI sans | **Hanken Grotesk** 400/500/600 (humanist-leaning grotesk, stands in for Mallory) | system-ui | Everything else in the app, body copy |
| Mono | **Martian Mono** (variable; use `wdth` ≈ 87.5, wght 400/500) | Geist Mono, ui-monospace | Uppercase button labels (Griffin), kbd, numbered section headers (LocalCan), ids, scores, timestamps, glyph field |

Verify each family exists on Google Fonts at build time; if one is missing use its fallback and note it. Banned per impeccable for this brief: Fraunces, Playfair, Cormorant, Newsreader, Instrument Sans/Serif, Space Grotesk/Mono, IBM Plex, DM Sans/Serif, Syne, Outfit, Plus Jakarta, Inter-as-display.

Scale. App (dense, matches snippets): 11 / 11.5 / 12 / 12.5 / 13 (base UI) / 14 / 16 / 20 / 28 (serif H1). Marketing: 15/16/18 body, 28/40/56 section serif, hero `clamp(48px, 7vw, 92px)` with `letter-spacing: -0.02em`, `line-height: 1.02`. Mono labels: 11–12px, `letter-spacing: .06em`, uppercase. Tabular figures for all numbers (`font-variant-numeric: tabular-nums`).

### 4.3 Space, radius, elevation

- Spacing base 4px; app rhythm 8/12/16/24; marketing sections 96–160px vertical.
- Radius: `--radius-chip: 6px`, `--radius-control: 8px`, `--radius-card: 12px`, pills `999px` (marketing buttons and status pills only). Map to `rounded-chip|control|card`.
- `shadow-card`: `0 0 0 1px var(--line), 0 1px 2px rgba(0,0,0,.35)` (dark) / `0 0 0 1px var(--line), 0 1px 2px rgba(21,19,15,.06)` (light).
- `shadow-overlay`: `0 0 0 1px var(--line-strong), 0 16px 40px -12px rgba(0,0,0,.6)` (dark) / `… rgba(21,19,15,.18)` (light).
- Grid: hairline bento cells (`border: 1px solid var(--line)`, no gaps, cells share borders) for landing proof strips, settings forms, and metadata blocks.

### 4.4 Motion

Tokens: `--ease-out: cubic-bezier(.16,1,.3,1)` (used by snippets), `--ease-inout: cubic-bezier(.65,0,.35,1)`; durations 120 (hover), 200 (pop), 320 (panels), 600 (field transitions). Required keyframes (snippets reference them; define globally): `pop-in` (scale .96→1, opacity 0→1), `fade-in`, `fade-up` (y 6px→0), `spin`, `shimmer-text` (background-position 200%→-200%), `pixel-on` (opacity .15→1→.15), `eq-bounce` (scaleY .3→1→.3). `prefers-reduced-motion`: freeze fields, keep state changes as instant opacity swaps, keep timers ticking (the Loading State snippet already does this).

## 5. The signature: the glyph field ("held sky")

One idea carried through landing, chat, and Atlas.
- **What it is:** a canvas grid of mono characters (`· : ; / \ |` in `--ink-3` at 12–20% opacity) where each memory unit is a cell rendered as its type glyph on its Whitney swatch. Quiet by default; it **lights up** when memory is used.
- **Landing (Persuade):** full-bleed band under the hero (~28vh). Autoplay loop (pauses on hover/off-screen): a sentence types into a ghost input → characters fall into the field and settle as 3 coloured cells (*retain*) → a query appears → 3 cells brighten and thin lines draw up into a floating answer card with citation squares (*recall*) → one cell turns to outline and a new one appears beside it (*supersede*) → one fades out (*forget*). Labels in mono at each beat. Nav pill floats inside the band (Griffin).
- **Chat:** a slim 40px field strip at the top of the Memory lens; cells for this turn's recalled units brighten while recall runs (with the Loading State pixel loader beside it).
- **Atlas "Field" view:** the full-size version (§6.5).
- Tech: Canvas 2D, DPR-aware, IntersectionObserver pause, `requestAnimationFrame`, ≤ 2,500 glyph cells, no WebGL. Reduced motion: static frame of the final state.

## 6. Pages

Navigation map:
```
/                     Landing (public)
/how-it-works         Architecture & research explainer (public, P1)
/signin               Guest or Google
/app                  → last chat, or empty state
/app/chat/[id]        Chat + Memory lens
/app/memory           Memory Atlas: Table | Field
/app/memory/[id]      Memory detail (drawer over Atlas; full page on direct visit)
/app/review           Review inbox (badge)
/app/activity         Live events, reflections, insights
/app/settings/...     profile · core · policy · model · spaces · agents · data · appearance · account
```
Keyboard: `⌘K` command palette (P1: jump to chat/memory/space, run /commands), `N` new chat, `G M` memory, `G R` review, `G A` activity, `⌘.` toggle Memory lens, `T`/`F` table/field in Atlas, `?` shortcuts sheet. Show kbd hints in buttons, LocalCan style.

### 6.1 Landing `/` (Persuade)
1. **Nav**: logo + "RADAHN" mono wordmark left; right: `HOW IT WORKS`, `GITHUB`, `SIGN IN` (mono, ink-2), bone pill `ENTER AS GUEST ↵`.
2. **Hero** (FIRST VIEWPORT in §1). Headline draft: "An agent that remembers / *what you decided.*" with line two cycling via **Text Morphing**: what you decided → what you prefer → what changed → when to forget. One word gets Teak's highlighter in a type colour (e.g. "remembers" with a cadmium mark at 85% height). Sub: "Radahn keeps what matters from every conversation, uses it to shape its next answer, and shows you exactly which memory did it."
3. **Glyph field band** with floating section-nav pill (§5).
4. **Built on MongoDB Atlas** proof strip: hairline logo-grid analogue (Griffin) of feature cells: `$vectorSearch`, `ATLAS SEARCH`, `TTL INDEXES`, `CHANGE STREAMS`, `TRANSACTIONS`, `SCHEMA VALIDATION`, centred label `BUILT ON MONGODB ATLAS · GEMINI 3.8 FLASH`.
5. **"Same question. With and without memory."** Grove inset panel (LocalCan hero box) holding the ghost diff (Code Block diff variant) of a real recorded demo turn, labelled `EXAMPLE`. Citation squares on the left answer link to swatches.
6. **How it works**, four LocalCan-style numbered rows `01 Retain` `02 Recall` `03 Reflect` `04 Forget`, each a split: copy left, live mini-component right (write chips, recall card with score bars, task rows of a reflection, a supersede timeline).
7. **Scroll Reveal Text** manifesto line between sections: "Most assistants forget you between tabs. The rest remember you in secret."
8. **"You hold the pen"**: trust grid: Review inbox card (Approval Card), "Not saved — looked like a credential" chip, Forget with tombstone, free-tier disclosure.
9. *(Only if F-41 ships)* **"Your other agents share it too"**: LocalCan's terminal transcript of Codex calling `memory_save` over MCP. If it doesn't ship, omit the section. Don't claim it.
10. **Closing CTA**: centred serif (Griffin), bone pill, subtle **Bg Paths** behind.
11. **Halftone Wordmark Footer** with "RADAHN", link columns (Product, Docs, GitHub, Team), free-tier note, © 2026.

### 6.2 Sign-in `/signin`
Split screen: left: serif line "Pick up where you left off." over **Bg Paths** (palette-tinted ink lines, low contrast); right: card with bone pill `ENTER AS GUEST` (kbd G), outline `CONTINUE WITH GOOGLE`, small print: "Guest memories last 7 days. Sign in with Google any time to keep them. Your guest memories come with you."

### 6.3 App shell (Operate)
Adapt **Sidebar Nav** (snippet): workspace switcher becomes the **Space switcher** (colour square + name, create space); nav items New chat (N), Chat, Memory, Review (count badge, live), Activity (pulse dot when events arrive), Settings; "Chats" list with the snippet's search storyboard; footer: avatar or "Guest" chip + "Save with Google" pill, theme toggle. Collapses to icons, preserving alignment (snippet behaviour). Replace Central icons with lucide equivalents. Mobile: sidebar becomes a sheet; Memory lens becomes a bottom sheet.

### 6.4 Chat `/app/chat/[id]`
Columns: sidebar 248 | conversation (max 720, centred) | **Memory lens** 360 in `--grove` (toggle `⌘.`).
- **Header:** conversation title (editable), space chip, model pill ("3.8 Flash"; shows "fell back to 3.6 Flash" when it happens).
- **Before each reply:** collapsible **Thinking (Steps)** labelled "Recalling…" with the **Loading State** pixel loader + elapsed timer → settles to "Recalled 6 memories · 312 ms".
- **Reply:** **Streaming Text** (words resolve from blur). Citations `[[m3]]` render as 12px **colour squares** in the unit's type colour with the index (Teak's nav squares); hover = card with statement, type, score; click = open memory drawer. Notices ("Updated since last time: deadline 9 PM → 10 PM") render as a slim mono line above the reply.
- **Under the reply:** action row (copy, 👍/👎 as lucide thumbs, **Without memory**, retry) and write chips in **Tool Chips** style (`+2 REMEMBERED`, `1 UPDATED`, `1 NEEDS REVIEW`, `1 BLOCKED`), expanding to show each op. Pending items show an inline compact **Approval Card**.
- **Tool calls** (remember/correct/forget) render as **Tool Chips** rows.
- **Composer:** **Prompt Bar** (Rounded variant): `@` spaces/memories, `/` commands (`/remember /forget /recall /reflect /ghost /space`), model picker, send. On send, the **glimm** sweep in the ten type colours (not the snippet's rainbow).
- **Memory lens tabs:** *Recalled* (**Context Cards**: swatch, serif statement, segmented score bar relevance/recency/importance/confidence/boost with the final number, reason chips), *Written* (ops from the selected turn), *Trace* (**Thinking: Search** variant listing channels with counts and ms). A 40px glyph-field strip at the top lights the recalled cells.
- **Ghost answer:** opens in the lens (or a wide drawer): toggle *Side by side* | *Diff* (**Code Block** Diff variant, word-level highlights), header "23 words differ · 4 memories made the difference" with those citation squares.
- **Empty state:** **AI orb** (idle breathing, recolour to bone/grove) + serif "Ask anything. I'll remember what matters." + 3 suggestion chips + (if no memories) a card "Load demo memories" with what it adds.
- **Selection Actions** (P2): select text in any message → Remember this / Correct a memory / Forget this.

### 6.5 Memory Atlas `/app/memory`
- **Header:** serif H1 "Memory", count line in mono, and a **Whitney strip**: one horizontal bar of type blocks proportional to counts (a painted row; hover a block = filter to that type).
- **Toolbar:** view toggle `TABLE [T] | FIELD [F]`, type chips (colour squares), status, space, sensitivity, search, "Reflect now".
- **Table:** adapt **Records Table**: columns Statement · Type · Space · Importance (ValuePill) · Confidence · Recalled · Updated · Expires · Status. Column header popovers become sort/filter. (P2: an "AI property" column such as *Still true?* that asks the model per row, reusing the snippet's property-run behaviour.)
- **Field:** full-bleed `--grove` canvas. Units are **squares** (pixel/Whitney grammar, not circles) sized by importance, brightness by recency, hatched when pending, outlined when superseded with a thin line to the successor, dotted lines for evidence. "Arrange by: TYPE | SPACE | TIME" re-lays the field with a 600 ms spring (the *Customer Galaxy* behaviour you liked, rebuilt in our grammar since that block is Arc Pro). TYPE = loose Whitney columns; TIME = rows by week, newest top; SPACE = clusters. Hover = tooltip card; click = detail drawer. `d3-force` with x/y anchor forces + collide.
- **Detail drawer** (**Card resize** transition): §6.6.

### 6.6 Memory detail
Type swatch + label + status pill; **statement in serif 28px**; hairline metadata grid (importance, confidence, sensitivity, scope, created, valid from, expires, recalled N×, confirmed N×, source actor); **Provenance**: quote block + "Open in chat"; **History**: vertical supersede chain with OUTDATED tags and dates ("On 02:10 you said 9 PM; at 14:30 you changed it to 10 PM"); **Recall history**: list of turns that used it with their final scores (tiny sparkline); **Evidence / related** chips; **Raw document** in **Code Block** (JSON, embedding shown as `[768 floats]`) labelled "MongoDB document"; actions: Edit, Correct, Pin/Unpin, Expire ▾ (in 2 min · 1 h · tomorrow · custom), Scope ▾, **Forget** (danger; confirm explains it's a hard delete and only a content-free tombstone remains).

### 6.7 Review `/app/review`
Centre column: **Approval Card** stack, one at a time (odometer counter, Skip / Approve ⏎). Each: "Save this to memory?", editable serif statement, why held ("Looks like health information"), source quote, scope. Conflicts use **Recommendation Card**: "Which is current?" primary = newest, "Alternatives" drawer lists the others; picking promotes it and supersedes the rest. Below: "Blocked" log (kind + time only, never content).

### 6.8 Activity `/app/activity`
Top: **Insight Cards** carousel (`liveline`): units by type over time, recall hit rate (cited/recalled), corrections this week, storage used of 512 MB. Middle: Reflection runs as **Task Rows** (gather → cluster → consolidate → write) with the ring progress; "Reflect now" button (optionally the **Glass AI Button** if it can be recoloured; see catalog). Right/below: live event feed (mono timestamp, type square, actor badge `YOU`/`RADAHN`/`REFLECTION`/`CODEX`, one-line summary) entering with `fade-up`.

### 6.9 Settings `/app/settings/*`
Left section list, right hairline-grid forms: Profile (name, how to address you, time zone) · Core memory (pinned units + budget meter, Hermes-style) · Memory policy (write mode radio, default expiries, "never remember" categories) · Model (3.8 Flash / 3.6 Flash / 3.5 Flash-Lite with one-line notes, modelled on uiarc's model-picker description) · Spaces · Connected agents (P1-stretch: keys + MCP config snippet in **Code Block**) · Data & privacy (export JSON, delete all memory, free-tier disclosure) · Appearance (dark/light/system) · Account (Google link for guests, delete account).

### 6.10 How it works `/how-it-works` (Read)
Long-form, serif headings, max-width 68ch, diagrams from architecture.md rendered to SVG, MongoDB feature table, research lineage table, eval results table, limitations. Doubles as deck source.

### 6.11 States
Every list/panel has designed empty, loading (Loading State pixel grid, never a bare spinner), error (mono error code + plain sentence + retry), and rate-limited ("Gemini free tier is busy, retrying with 3.6 Flash…") states. 404 page: glyph field with one missing cell, "Radahn has no memory of this page."

## 7. Component catalog (your saved library → where it goes)

Source file: `Inputs/Designs and Components I Like.txt` (git-ignored; read it locally). Line numbers are 1-based. All snippets assume tokens from §4 and shared atoms from §8; adapt colours to tokens, swap Central icons for lucide, replace demo data (ice-cream shop, restock orders) with Radahn content. Keep their reduced-motion handling.

| # | Component | Source | Use in Radahn | Priority | Notes |
|---|---|---|---|---|---|
| 1 | **Loading State** (Drive / Dots / Orbit / Surfer) | lines 3–157 | Recall in progress, reflection running, seeding demo | P0 | Use Drive for recall, Orbit for reflection. Skip "Surfer" (remote meme video) or keep only as an easter egg for >10 s waits. |
| 2 | **Thinking** (Steps / Reasoning / Search / Coding) | 159–461 | Steps → "Recalling…" pre-reply trace; Search → Memory lens *Trace* tab (channels as "sources read"); Coding → memory ops trace | P0 | |
| 3 | **Streaming Text** | 463–716 | All assistant replies; inline citations become memory squares; follow-up chips | P0 | Feed it AI SDK text deltas instead of the scripted text. |
| 4 | **Approval Card** | 718–1138 | Review inbox stack; inline "needs review" in chat; also "Save this to memory?" when the agent is unsure (your note) | P0 | Needs atoms `Button`, `GlideMenu`. |
| 5 | **Tool Chips** | 1140–1477 | Memory tool calls + write summary chips; "file-diff chips" become memory-diff chips (+added / ~updated) | P0 | |
| 6 | **Task Rows** | 1479–1754 | Reflection run steps; demo seeding progress | P1 | Drive from real `reflections.steps[]`, not the scripted timeline. |
| 7 | **Chat** (panel with tabs, replies, composer) | 1756–1999 | Structural reference for the conversation column and lens tabs | P0 | Merge with Prompt Bar; don't ship two composers. |
| 8 | **Prompt Bar** (`@`, `/`, model picker, dictation) | 2001–2714 | The composer | P0 | `glimm` sweep recoloured to the ten type colours; dictation is P2. |
| 9 | **Recommendation Card** | 2716–2911 | Conflict resolution ("Which is current?"); plan suggestions | P1 | Needs `Button` variants, `EntityChip`, `ValuePill`. |
| 10 | **Context Cards** | 2913–3035 | Memory lens *Recalled* tab | P0 | Add the segmented score bar. |
| 11 | **Records Table** | 3037–4091 | Memory Atlas table | P0 | Big snippet; strip the AI-property demo first, add back as P2. |
| 12 | **Sidebar Nav** (+ chat search storyboard) | 4093–4543 | App shell | P0 | Central icons → lucide. |
| 13 | **Insight Cards** (`liveline`) | 4545–5088 | Activity insights | P1 | |
| 14 | **Code Block** (Code / Diff) | 5090–5325 | Ghost diff; raw MongoDB document; MCP config snippet | P0 | Diff variant at word level for prose. |
| 15 | **Selection Actions** | 5327–5882 | Select text → remember / correct / forget | P2 | |
| 16 | **Shimmer text** (transitions.dev) | 5884–5898 · https://transitions.dev/detail.html?t=shimmer-text | "Recalling…", "Reflecting…" labels | P0 | `npx transitions-dev add shimmer-text` (the `transitions-dev` skill is installed) |
| 17 | **Card resize** (transitions.dev) | 5900–5913 · https://transitions.dev/detail.html?t=card-resize | Memory drawer open/expand, lens tab height changes | P1 | `npx transitions-dev add card-resize` |
| 18 | **Glass AI Button** (ThreeUI, MIT) | 5915–5960 · https://threeui.com/source-code/glass-ai-button.json · `@designcodeio/threeui` | Optional: the "Reflect now" button on Activity | P2 | Three.js + GLSL; its deep-blue orb and "GPT 6 Sol" lettering must be recoloured/relabelled to fit, lazy-loaded. Skip if it fights the palette. |
| 19 | Customer galaxy (uiarc, **Arc Pro, no access**) | 5962–6102 · https://uiarc.dev/components/blocks/customer-galaxy | Inspiration only for the Atlas Field (§6.5) | — | Do not install; rebuild the behaviour ourselves. |
| 20 | AI chat (uiarc, **Arc Pro, no access**) | 6104–6291 · https://uiarc.dev/components/blocks/ai-chat | Inspiration: its event model (reasoning, tool, sources, text) and "send sources before the text that cites them" rule match our stream protocol | — | Do not install. Free uiarc pieces may exist (see https://uiarc.dev/llms.txt); check before assuming Pro. |
| 21 | **Text Morphing** (skecher-ui) | 6294–6295 · `npx shadcn@latest add CoDesign-Spa27/skecher-ui/text-morphing` | Landing headline line two | P0 | If the shorthand fails, find the registry URL in the CoDesign-Spa27/skecher-ui repo. |
| 22 | Liquid Morphology slideshow (skecher-ui) | 6298–6299 · `…/liquid-morphology-slideshow` | Optional: How-it-works step visuals | P2 | Only if it can be made to fit the palette. |
| 23 | **AI orb** (skecher-ui) | 6302–6303 · `…/ai-orb` | Agent presence in chat empty state + header (idle / recalling / writing) | P1 | Recolour to bone/grove. |
| 24 | **Scroll Reveal Text** (skecher-ui) | 6305–6309 · `…/scroll-reveal-text` | Landing manifesto line | P1 | |
| 25 | Interactive Grid Hero (skecher-ui) | 6311–6312 · `…/interactive-grid-hero` | Optional underlay for the hero (LocalCan hairline grid) | P2 | Don't stack it on the glyph field; one signature only. |
| 26 | **Bg Paths** (`background-paths`) | 6314–6555 | Sign-in left panel; closing CTA backdrop | P1 | Retint strokes to `--ink-3`/type colours at low opacity. |
| 27 | **Halftone Wordmark Footer** | 6557–7111 | Landing footer, wordmark "RADAHN" | P1 | Palette prop: background `--canvas`, ink `--ink-3`, warm `#F2C12E`. |
| 28 | Fonts In Use: Stanley Whitney | line 1 · https://fontsinuse.com/uses/79531/stanley-whitney-how-high-the-moon-exhibition- | Type pairing + colour-block palette (§2, §4) | — | |

Godly references: https://godly.design/website/griffin/ · https://godly.design/website/localcan/ · https://godly.design/website/teak/ (live: griffin.com, localcan.com, teak.io).

## 8. Atoms the snippets import but you don't have (create first, Phase 0)

The snippets import from a design system that isn't in the file. Build these in `src/components/atoms` and `src/components/primitives` before adapting any block:

- `Button` (`@/components/atoms/Button`): variants `accent` (bone pill / ink pill in app = 8px radius), `secondary` (outline), `ghost`, `quiet` (text-only), `success`, `danger`; sizes `xs`, `sm`, `md`; optional `kbd` prop rendering a `Kbd` at the right (LocalCan). Export `type ButtonVariant`. Marketing variant: uppercase Martian Mono, pill.
- `GlideMenu` (`@/components/primitives/GlideMenu`): a menu container whose hover/selection highlight glides between items (absolute highlight element positioned to the hovered child; props `className`, `highlightClassName`, children). Keyboard ↑↓ moves the highlight.
- `EntityChip` (small chip with leading colour square + label), `ValuePill` (number in a tinted pill, tabular figures), `Shimmer` (shimmer-text wrapper), `StreamText` (word-by-word blur reveal used by Streaming Text), `Kbd`, `TypeSwatch` (swatch + glyph + optional label, with status treatments from §4.1), `ScoreBar` (segmented score bar).
- Utility `cn()` (`@/lib/utils`, shadcn standard).

## 9. Voice and copy

Plain, warm, exact. Short sentences. No hype words ("revolutionary", "supercharge"), no emoji in UI. Mono labels are uppercase nouns (`RECALLED`, `OUTDATED`, `NEEDS REVIEW`). Errors say what happened and what to do. The agent speaks in first person ("I'll remember that you prefer bullets."). Use real numbers where the UI has them ("Recalled 6 · 312 ms"). Demo content is labelled `DEMO`.

## 10. Accessibility and responsive (UI/UX Pro Max priorities 1–9)

- Contrast ≥ 4.5:1 for text (check `--ink-3` on `--surface` and type swatches with their text colour); visible 2px focus ring in `--focus`; full keyboard path for chat, Atlas table, Review, drawer (focus trap + Esc); `aria-live="polite"` for write chips and Activity feed; citations are buttons with accessible names ("Memory 3: Submission closes 10 PM"); canvas views have a list/table alternative and `aria-hidden` canvases.
- Hit targets ≥ 40px in app chrome; no hover-only affordances (citations also open on focus/click).
- Breakpoints 375 / 768 / 1024 / 1440. ≤ 1024: lens becomes a toggleable overlay; ≤ 768: sidebar sheet, lens bottom sheet, Atlas defaults to table. No horizontal page scroll.
- `prefers-reduced-motion` respected everywhere (§4.4).

## 11. Banned in this project

Slate/navy dark mode; neon-on-black; purple-blue AI gradients; glassmorphism panels (the optional Glass AI Button is the only glass, and only if recoloured); emoji as icons; generic icon tiles in feature grids; stock "AI brain" imagery; centred-everything SaaS hero with a screenshot in a browser frame; more than one signature effect per viewport; type colours used as panel backgrounds; cream paper + italic serif + terracotta (impeccable's flagged default); fake logos/testimonials/metrics.

## 12. Pre-delivery checklist (merge of impeccable floor + UI/UX Pro Max)

- [ ] Tokens resolve in both themes; snippet class names all map.
- [ ] First viewport of `/` matches §1 FIRST VIEWPORT; glyph field plays and pauses off-screen.
- [ ] Every memory type shows colour + glyph + label; statuses distinguishable without colour.
- [ ] Chat: recall trace, citations, write chips, ghost diff, approval inline all work on prod.
- [ ] Empty / loading / error / rate-limited states exist for every surface.
- [ ] 375 / 768 / 1024 / 1440 screenshots clean; no horizontal scroll.
- [ ] Keyboard-only run of the judge path; focus visible; reduced motion verified.
- [ ] `impeccable detect --json` run once on changed UI, mechanical findings fixed; finish reviewer verdict recorded; root `DESIGN.md` + `.impeccable/design.json` written by the documenter.
