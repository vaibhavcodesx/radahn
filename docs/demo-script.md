# Radahn — demo video script (≈ 2:45)

Short on purpose: judges see the four things that matter and nothing else. ~340 words of voice-over at a calm pace (≈ 130 wpm) leaves room for the UI to breathe. Generate the voice-over in ElevenLabs from the **Voice-over** column only (one paragraph per shot so each clip can be re-timed). Replaces the earlier 6-minute script.

**No event names in the video** (the product stands on its own). The persona is synthetic and labelled Demo.

## Before recording

- Fresh private window → https://radahn-ai.vercel.app → **Try it — no sign-up** → **Continue as guest** → **Load demo memories**. Wait for the Kestrel chat list to appear.
- Dark theme, browser at 1920×1080, zoom 110 %, bookmarks bar hidden, no other tabs, notifications off.
- Model picker: leave the default. If a reply is slow on the day, switch to **GPT-OSS 120B** (fastest).
- OBS: 1920×1080, 30 fps, one clip per shot (names below), so a fumble costs one shot, not the take.
- Never show `.env`, keys, emails or the Vercel dashboard. The fake key in shot 7 is a test string.

## Shots

| # | Time | Clip | On screen (exact clicks) | Voice-over |
|---|---|---|---|---|
| 1 | 0:00–0:12 | `01-hook` | Landing page, slow scroll from the hero to the screenshots. | Every AI assistant now says it remembers you. None of them show you *what* they remember, or *why* it changed the answer. Radahn does. |
| 2 | 0:12–0:24 | `02-persona` | Click **Kestrel beta plan** in the sidebar, then **New chat**. Hover the Kestrel space chip. | Meet Aarav. He's a week away from launching Kestrel, a flight-log app for drone pilots. Radahn already holds forty small memories about him: his deadlines, his decisions, how he likes his answers. |
| 3 | 0:24–0:52 | `03-plan` | Click **Plan my next 4 hours.**, press Enter. Let the loader run, the answer stream, then hover two coloured citation squares. The Memory panel shows **Used**. | Watch it remember first, then answer. Every line cites the memory behind it. The beta ships on the seventh at nine, so the plan works back from that. Five short bullets with time boxes, because Aarav once said long plans overwhelm him, and Radahn turned that into a rule. |
| 4 | 0:52–1:10 | `04-ghost` | Click the ghost icon under the reply. Memory panel → **Without memory**: show **Diff**, then **Side by side**. | Same question, memory switched off. Generic advice. The highlighted words are exactly what memory changed. |
| 5 | 1:10–1:25 | `05-why` | Memory panel → **Why** tab; scroll the score bars slowly. | And here's why it picked those memories: four searches, by meaning, keywords, time and linked topics, then a score for relevance, recency, importance and confidence. Every number is stored, so every answer can be explained. |
| 6 | 1:25–1:50 | `06-correct` | Type **Actually, the beta launch moved to 10 PM.** → Enter. Point at the **Corrected 9:00 PM → 10:00 PM** chip. Sidebar → **Memory** → open the beta-launch memory → scroll to **History**. Back on the Memory page set **As of → 1 hour ago**. | Plans change. Radahn doesn't overwrite. The old fact becomes history, the new one becomes current, and you can rewind to what it believed an hour ago. |
| 7 | 1:50–2:12 | `07-trust` | **Review**: show the sensitive item, click **Keep**; show the 6 PM vs 7 PM contradiction, pick 7 PM. New chat: paste `sk-test_aaaaaaaaaaaaaaaaaaaaaaaa` → show *Not saved — looked like a credential*. Memory page: click a bin → **Forget**. | You stay in control. Sensitive details wait for your approval. Contradictions are put to you, not guessed. Secrets never reach the model. And forget means deleted, not hidden. |
| 8 | 2:12–2:28 | `08-live` | **Activity**: the live events panel; click **Reflect now** and let the steps tick. | Everything happens live: every save, correction and reflection. Repeated feedback becomes a learned habit. And other agents, like Claude Code, can share this memory through a scoped key. |
| 9 | 2:28–2:45 | `09-close` | `/how-it-works` architecture section, then back to the landing hero with the URL visible. | Under the hood: MongoDB Atlas. Vector and keyword search, automatic expiry, transactions and change streams, in one database. On production it passes all twenty of our live memory tests, with zero secrets stored. Radahn. Memory you can see. |

Total ≈ 2:45. If you need to cut to 2:15, drop shot 5 and shorten shot 8 to the live feed only.

## Editing notes (for the HyperFrames / Remotion pass)

- Voice-over drives timing: place each VO paragraph at its shot start; trim the clip to the VO length + 0.4 s.
- Lower-third captions, max 5 words, in the app's label style: *Cites every memory* (3) · *Memory off → generic* (4) · *Scores you can read* (5) · *Corrected, with history* (6) · *Consent, not guesses* (7) · *Live, and learning* (8).
- Zoom-ins (1.15–1.3×, 400 ms ease-out) on: the citation squares (3), the diff highlights (4), the Corrected chip (6), the "Not saved" line (7).
- Music: soft, low, no lyrics; duck −12 dB under voice.
- End card (2 s): logo + "Radahn — memory you can see" + https://radahn-ai.vercel.app.
