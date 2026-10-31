# Radahn — PPT brief (contents + theme)

The source of truth for the submission deck. `deck.md` / `radahn.pptx` are rebuilt from this. **10 slides, 16:9.** Judges skim decks: one idea per slide, a real screenshot on most slides, numbers only from `evals/results.md`.

## Rules

- **Event name appears once**, as a small line on the title slide ("Submitted to UNCHARTED 2026 · Agentic Memory track"). Everywhere else Radahn is a standalone product; the demo persona is Aarav building **Kestrel**.
- **No invented numbers.** Use exactly: 20/20 live memory tests · 31/31 rule checks · recall@5 = 1.0 · 0 secrets stored · recall ≈ 0.5–0.6 s (incl. embedding) · first memory saved ≈ 2 s after a reply.
- Max ~25 words of body text per slide; the speaker says the rest.
- Every screenshot is from the live site with the Kestrel demo loaded (dark theme). No keys, emails, `.env`, dashboards.

## Theme (match the product exactly)

| Element | Value |
|---|---|
| Background | warm black `#0E0D0B`; panels `#161512`; hairlines `rgba(237,230,214,0.10)` |
| Text | bone `#EDE6D6`; secondary `#B8B1A2`; muted `#8A8477` |
| Memory panel accent | grove green `#0F1C13` (use behind "memory" visuals only) |
| Memory-type colours (small squares only, never big fills) | profile `#E7DCC3` · preference `#F2C12E` · fact `#3A63D8` · goal `#F08A24` · constraint `#D8432F` · decision `#B23A7A` · outcome `#2E9E6B` · feedback `#74B8E0` · strategy `#6B4BC2` · observation `#A7A23C` |
| Titles | Hedvig Letters Serif, 40–54 pt, tight leading |
| Body | Hanken Grotesk, 18–22 pt |
| Small labels / numbers | Martian Mono, 11–13 pt, uppercase, letter-spaced |
| Signature motif | a row of the ten type-colour squares (the "memory strip") under each title |
| Font fallback | Embed the fonts in the .pptx (File → Options → Save → Embed fonts) or the presenting laptop will substitute; if embedding isn't possible use Georgia (titles) / Segoe UI or Arial (body) / Consolas (labels). |
| Banned | gradients, glassmorphism, stock AI imagery, emoji, centred-everything layouts |

## Slides

| # | Title (on slide) | Body (≤ 25 words) | Visual | Speaker note (≈ 20 s each) |
|---|---|---|---|---|
| 1 | **Radahn** — memory you can see | An AI agent whose memory you can inspect, steer and trust. · radahn-ai.vercel.app · *Submitted to UNCHARTED 2026 · Agentic Memory track* | Logo tile + hero screenshot (chat with Memory panel) | One line: what it is, that it's live, try it as a guest. |
| 2 | Assistants remember you. **Invisibly.** | You can't see what they kept, why it shaped an answer, or fix one wrong fact without starting over. | Three short pain lines with red constraint squares | The problem isn't forgetting, it's invisible, unsteerable memory. |
| 3 | Every answer shows its **receipts** | Citations per memory · the scores behind each pick · one click to answer again *without* memory | Screenshot: reply with citation squares + Without-memory diff | This is the core idea: memory visibly changes the next answer. |
| 4 | The four things it does | Remembers · Recalls and explains · Corrects with history · Forgets for real | 4 numbered cells (mono 01–04), each with a tiny screenshot crop | Maps directly to the agentic-memory brief. |
| 5 | How a memory is written | Privacy pre-scan → extract → policy gate → reconcile (add · confirm · supersede · skip) → transaction → live event | Horizontal flow diagram, type squares on candidates | Secrets never reach the model; sensitive items wait for consent; one current value per fact is a database guarantee. |
| 6 | How a memory is found | 4 searches (meaning · keywords · time · links) → fused → scored → top 8 | Formula line in mono: `0.55·relevance + 0.15·recency + 0.15·importance + 0.10·confidence` + Why-tab screenshot | Two-stage: broad retrieval, focused re-rank; every number is stored and shown. |
| 7 | Hard cases, handled | Correction with history · contradictions put to you · expiry · hard forget · secrets blocked | Screenshots: Corrected chip, Review contradiction card, "Not saved — looked like a credential" | These are the "difficult cases" judges asked for; all five work on production. |
| 8 | It learns *how* you like answers | Repeated feedback → a strategy with evidence → shorter, time-boxed plans | Before/after crop of a plan + the strategy memory card | Behaviour change over time, visible as "1 learned rule". |
| 9 | Built on MongoDB Atlas | Vector Search with filters · Atlas Search · TTL · transactions · partial unique index · change streams · aggregations | Hairline grid of the 7 features; small architecture strip (Next.js → Atlas → Gemini / Groq) | One database does everything memory needs; no second store to sync. |
| 10 | Measured on production | 20/20 live memory tests · 31/31 rule checks · recall@5 1.0 · 0 secrets stored · recall ≈ 0.5 s | Big mono numbers; footer: limitations (free tiers, LLM extraction can err → everything visible and reversible) + next steps (reranker, team memory) + team names | Close with the URL and "try it as a guest". |

Optional 11th slide if the rules require it: **Team & how we built it**: three names, roles; "built with Claude Code, Codex and Antigravity as coding agents under our direction" (honest AI-use disclosure).

## Screenshots to capture (dark, 1920×1080, Kestrel demo)

1. Chat: "Plan my next 4 hours." reply with citations + Memory panel **Used** (slides 1, 3).
2. Memory panel **Without memory → Diff** (slide 3).
3. Memory panel **Why** tab (slide 6).
4. Reply after "Actually, the beta launch moved to 10 PM." showing the **Corrected** chip (slide 7).
5. Review page with the contradiction card (slide 7).
6. "Not saved — looked like a credential" line (slide 7).
7. Activity with Reflect steps + the strategy memory (slide 8).
