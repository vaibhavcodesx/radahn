# Voice-over — Radahn demo (≈ 2:40, ~330 words)

Written to be **spoken**, not read: contractions, short sentences, small asides, the odd "right?". Paste each section into ElevenLabs **separately** and save it with the file name shown. Don't paste the headings.

## Which voice

- **Pick:** a warm, relaxed **young-adult voice (25–35)** that sounds like a founder showing a friend their product, not an announcer or a movie trailer. Mid pitch, unhurried, a little smile in it.
- **Accent:** an **Indian-English** voice fits the team and sounds authentic to the judges; a neutral American/British one is also fine. Avoid strong "narrator" or "deep trailer" voices.
- **How to choose (5 min):** ElevenLabs → Voice Library → filter *Use case: Conversational* (or *Social media*), *Age: Young / Middle-aged*. Shortlist three, paste section **03** into each, and keep the one you'd believe if a friend said it. Use **the same voice for every section.**

## Settings

- Model: **Eleven v3** (most natural). If v3 isn't available, use **Multilingual v2**.
  - v3: Stability **Natural**.
  - v2: Stability **40–50 %**, Similarity **75 %**, Style **15–25 %**, Speaker boost **on**.
- Speed: **1.0** (0.95 if it sounds rushed). Don't add music or effects in ElevenLabs.
- Generate **2–3 takes per section** and keep the most natural. If one sentence sounds off, regenerate just that sentence and the editor splices it.
- Download as **MP3 44.1 kHz, 192 kbps** (or WAV if your plan offers it). Same format for all files.

## Pronunciation

- **Radahn** → "ruh-DAHN" (stress on the second syllable). If it's wrong, respell it as *Ruh-dahn* in the text for that take.
- **Kestrel** → "KESS-trel". **MongoDB** → "Mongo D-B". **Atlas** as usual.

---

### `vo/01-hook.mp3` (≈ 11 s)
Every AI assistant says it remembers you now. But ask it *what* it remembers… or why that changed its answer, and you get nothing. That's the part we wanted to fix.

### `vo/02-persona.mp3` (≈ 11 s)
So this is Radahn. Say you're Aarav. You're a week away from launching Kestrel, a little flight-log app for drone pilots. And Radahn's already picked up about forty things about you.

### `vo/03-plan.mp3` (≈ 25 s)
Let's ask it to plan the next four hours. First it pulls up what it knows, then it answers. See these little coloured squares? Each one points to the memory behind that line. It knows the beta goes out on the seventh at nine, so the plan works back from that. And it keeps it short, with time boxes, because Aarav once said long plans were overwhelming. It turned that into a rule.

### `vo/04-ghost.mp3` (≈ 15 s)
Now, my favourite part. Same question, but with memory switched off. Pretty generic, right? Everything highlighted here is what memory actually changed.

### `vo/05-why.mp3` (≈ 14 s)
And if you're wondering why it picked those memories, it's all right here. What matched, how recent it is, how important, how sure it was. Nothing's hidden.

### `vo/06-correct.mp3` (≈ 22 s) — plays over clips 06a + 06b
Plans change, though. So: "actually, the launch moved to ten." It doesn't just overwrite the old one. Nine PM goes into the history, ten becomes the current one… and I can even rewind and see what it believed an hour ago.

### `vo/07-trust.mp3` (≈ 22 s) — plays over clips 07a + 07b + 07c
You're in control the whole time. Anything sensitive waits for your okay. If two memories disagree, it asks you instead of guessing. Paste a password or an API key, and it's never saved. And when you tell it to forget something, it's actually gone.

### `vo/08-live.mp3` (≈ 15 s)
All of this happens live. And when the same feedback keeps coming up, Radahn learns from it, on its own. Other tools, like Claude Code, can even plug into the same memory.

### `vo/09-close.mp3` (≈ 15 s)
Under the hood, it's all MongoDB Atlas: search, expiry, transactions, live updates, in one database. It passes all twenty of our live memory tests, with zero secrets stored. That's Radahn. Memory you can actually see.
