# Recording guide (OBS) — Radahn demo, final cut ≈ 2:40

You record **11 short silent clips**. Record each one a bit longer than its final length (2 s still at the start and end, natural speed in between); the editor trims and speeds up the waiting parts. Do them **in order**, in one sitting, without reloading the demo in between (later clips depend on earlier ones).

Voice-over lines are in [`voiceover.md`](voiceover.md); the editor matches clip ↔ audio by number using [`manifest.json`](manifest.json).

---

## 1. One-time setup (10 min)

**OBS → Settings**
- Video: Base and Output resolution **1920×1080**, FPS **30**.
- Output → Recording: format **MKV**, encoder **NVIDIA NVENC H.264** (or AMD/Intel hardware; x264 if none), rate control **CQP 18** (x264: CRF 18). After recording: *File → Remux Recordings* → MP4.
- Audio: **mute Desktop Audio and Mic** (silent clips; voice is added later).
- Sources: one **Display Capture** of the screen with the browser.

**Windows**: Focus / Do Not Disturb on, close WhatsApp, Telegram, Slack, mail. Pointer: a normal-size cursor; move it slowly and never shake it.

**Browser (Chrome)**
1. Open a **new Incognito window** (no extensions, no history).
2. Go to `https://radahn-ai.vercel.app`.
3. Press **F11** (full screen, hides tabs and the address bar). Zoom **110 %** (Ctrl + once from 100 %).
4. The site must be in **dark** theme (default). If it opens light, switch your system to dark mode first.

**Make the demo account (off camera)**
1. Click **Get started — free** → **Continue as guest**.
2. In the empty chat, click **Load demo memories**. Wait until the sidebar shows **Kestrel beta plan**.
3. In the prompt bar, open the model picker (bottom left of the composer) and choose **GPT-OSS 120B**: it answers in ~1–2 s, so you wait less on camera.
4. Reload once (F5). You're ready.

**Rules for every clip**
- Start recording → keep still **2 s** → do the actions → keep still **2 s** → stop.
- Slow mouse. When the guide says *hover*, rest the pointer on the thing for ~2 s.
- If you fumble, just stop and record that clip again. Don't restart from clip 1 unless the demo state is broken (then: Settings → **Reload demo**, and restart from clip 03).
- Never show `.env`, the Vercel/Mongo dashboards, emails, or real keys. The key in clip 07b is fake on purpose.

---

## 2. The clips

| Clip file | Record | Final | Starting screen |
|---|---|---|---|
| `01-hook.mp4` | ~20 s | 11 s | Landing page, top |
| `02-persona.mp4` | ~20 s | 11 s | App, empty chat |
| `03-plan.mp4` | ~45 s | 25 s | App, new chat |
| `04-ghost.mp4` | ~30 s | 15 s | Same chat as 03 |
| `05-why.mp4` | ~20 s | 14 s | Same chat as 03 |
| `06a-correct.mp4` | ~30 s | 10 s | Same chat as 03 |
| `06b-history.mp4` | ~30 s | 12 s | Memory page |
| `07a-review.mp4` | ~30 s | 9 s | Review page |
| `07b-secret.mp4` | ~25 s | 6 s | New chat |
| `07c-forget.mp4` | ~20 s | 7 s | Memory page |
| `08-live.mp4` | ~35 s | 15 s | Activity page |
| `09-close.mp4` | ~25 s | 15 s | How it works page |

### 01-hook — landing page (final 11 s)
1. In the same window go to `radahn-ai.vercel.app` (the landing page; you stay signed in as the guest). Scroll to the very top.
2. Record: hold 2 s on the hero ("An agent that remembers…").
3. Scroll down **slowly** with the mouse wheel, ~1 notch per second, past the "Same question. With and without memory." section to the product screenshots. ~12 s of scrolling.
4. Hold 2 s. Stop. (Don't click any button.)

### 02-persona — who Aarav is (final 11 s)
1. Go back to the app: `radahn-ai.vercel.app/app` (you're still the guest). You see the empty chat.
2. Record: hold 2 s.
3. Hover the **Kestrel** space name at the top of the sidebar (2 s).
4. Click **Memory** in the sidebar. The list of ~40 memories appears. Scroll the list down slowly for ~5 s.
5. Hold 2 s. Stop.

### 03-plan — memory changes the answer (final 25 s)
1. Click **New chat** in the sidebar.
2. Record: hold 2 s.
3. Click the suggestion chip **Plan my next 4 hours.** (it fills the prompt box), then press **Enter**.
4. Hands off the mouse while "Remembering…" and the answer stream in.
5. Hover the first coloured **citation square** in the answer (2 s; a card pops up), then a second one (2 s).
6. Move to the right panel; on the **Used** tab, scroll slowly through the memory cards (~5 s).
7. Hold 2 s. Stop.

### 04-ghost — the same answer without memory (final 15 s)
1. Record: hold 2 s.
2. Hover the **ghost icon** under the answer (its label "Without memory" slides out), click it.
3. The right panel switches to **Without memory** and loads (a few seconds). When the diff appears, scroll it slowly (~4 s).
4. Click **Side by side**; scroll slowly (~4 s).
5. Hold 2 s. Stop.

### 05-why — why these memories (final 14 s)
1. Record: hold 2 s.
2. Click the **Why** tab in the right panel.
3. Scroll slowly through the explanation and the score bars (~8 s). Hover one memory's score row (2 s).
4. Hold 2 s. Stop.

### 06a-correct — a plan changes (final 10 s)
1. Record: hold 2 s.
2. Click the prompt box, type **Actually, the beta launch moved to 10 PM.** (normal typing speed), press **Enter**.
3. When the reply appears, hover the **Corrected … 9:00 PM → 10:00 PM** chip above it (3 s).
4. Hold 2 s. Stop.

### 06b-history — old value kept, rewind in time (final 12 s)
1. Click **Memory** in the sidebar (off camera is fine).
2. Record: hold 2 s.
3. Click the beta-launch row that now says **10:00 PM** (e.g. *Kestrel's public beta ships on 7 Nov 2026 at 10:00 PM IST*; the exact wording comes from the model). On its page, scroll to **History**: the 9 PM version is shown as Outdated (hold 3 s).
4. Click **All memories** (back). Open **As of** and choose **1 hour ago**. The table now shows the 9:00 PM version as current. Hover it (2 s).
5. Hold 2 s. Stop. Then set **As of** back to **Now** (off camera).

### 07a-review — consent and contradictions (final 9 s)
1. Click **Review** in the sidebar (off camera).
2. Record: hold 2 s.
3. On the sensitive card ("Aarav has mild ADHD…"), hover "Why held" (2 s), then click **Keep**.
4. Scroll down to **Which is current?** (the 6 PM vs 7 PM launch call). Click **Keep this** on the **7:00 PM** option.
5. Hold 2 s. Stop.

### 07b-secret — secrets are never saved (final 6 s)
1. Click **New chat** (off camera).
2. Record: hold 2 s.
3. Type: **here's my API key for later: sk-test_aaaaaaaaaaaaaaaaaaaaaaaa** and press **Enter**.
4. Hold on the red line **Not saved: that looked like a credential** (3 s). Stop.

### 07c-forget — forget means deleted (final 7 s)
1. Click **Memory** in the sidebar (off camera).
2. Record: hold 2 s.
3. Hover the row **Aarav drinks chai, not coffee, during late-night work.**, click its **bin** icon, then click **Forget**. The row disappears.
4. Hold 2 s. Stop.

### 08-live — it happens live, and it learns (final 15 s)
1. Click **Activity** in the sidebar (off camera).
2. Record: hold 2 s on the stats.
3. Scroll the **Timeline** events panel slowly (~4 s): you'll see your corrections, the review and the forget you just did.
4. Click **Reflect now** (top right). Let the steps tick (Gather → Cluster → Consolidate → Write), hands off.
5. Hold 2 s after it finishes. Stop.

### 09-close — under the hood (final 15 s)
1. Press **Esc**/F11 off, open `radahn-ai.vercel.app/how-it-works`, F11 again, scroll to the top.
2. Record: hold 2 s.
3. Scroll slowly through the architecture / MongoDB features part (~10 s).
4. Hold 2 s. Stop. (The editor adds the end card with the URL.)

---

## 3. Hand-off folder (for the editing agent)

```
radahn-video/
  clips/   01-hook.mp4  02-persona.mp4  03-plan.mp4  04-ghost.mp4  05-why.mp4
           06a-correct.mp4  06b-history.mp4  07a-review.mp4  07b-secret.mp4  07c-forget.mp4
           08-live.mp4  09-close.mp4
  vo/      01-hook.mp3 … 09-close.mp3          (one file per voice-over section, see voiceover.md)
  music/   bed.mp3                             (optional: calm, no lyrics)
  brand/   radahn-mark.png                     (copy from public/brand/)
  manifest.json                                (copy from docs/video/manifest.json)
```

- Names must match exactly (lowercase, hyphens, two-digit numbers). Clips are MP4 (remuxed from MKV), 1920×1080, 30 fps, no audio track needed.
- Keep raw clips untrimmed; the editor trims to the voice-over.
- Put the folder **outside** the repo (videos are large and must not be committed).
