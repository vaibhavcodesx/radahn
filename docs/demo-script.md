# Radahn — Demo Video Script

**Target Duration:** ≤ 6:30 (actual script timed at 6:15)  
**Track:** UNCHARTED 2026 · MongoDB Student Hackathon · Track 1: Agentic Memory  
**Live Site:** https://radahn-ai.vercel.app  
**Persona:** Aarav Mehta (final-year CSE student building Kestrel, a flight-log app for hobby drone pilots, with two friends; labelled DEMO throughout).  
**Setup Checklist Before Recording:**
- Clear cookies or use fresh incognito window.
- Screen resolution set to 1920×1080 (16:9), browser zoomed to 100%.
- Ensure microphone audio is clean, quiet, and uncompressed.
- Open tabs: Tab 1 = `https://radahn-ai.vercel.app`, Tab 2 = Terminal with Claude Code CLI ready.

---

## Shot-by-Shot Director's Script

### Act 1: The Hook & The Problem
**Timestamp: [00:00 – 00:40] (40s)**

* **On Screen / Action:**  
  Start on the Radahn landing page (`https://radahn-ai.vercel.app`). Mouse hovers over the headline: *"An agent whose memory you can inspect, steer, and trust."* Scroll smoothly down past the ghost diff proof section to show the contrast between answers with and without memory.
* **Voice-Over (Spoken):**  
  *"Most AI assistants suffer from chronic amnesia. Every time you open a new chat, you start from zero—re-explaining your stack constraints, your deadlines, and how you like your answers formatted.  
  And when agents do try to remember, memory is bolted on as an invisible black box. You have no idea what was stored, why an answer changed, or how to fix it when it gets things wrong.  
  This is Radahn—a personal AI agent whose long-term memory is visible, steerable, and built natively on MongoDB Atlas."*
* **On-Screen Subtitle / Banner:**  
  `Track 1: Agentic Memory · Visible · Steerable · Trustworthy`

---

### Act 2: Beat 1 — Zero-Auth Guest Entry & Demo Seeding
**Timestamp: [00:40 – 01:25] (45s)**

* **On Screen / Action:**  
  1. Click **Try it — no sign-up** in the top navigation.
  2. Land on `/signin`. Click **Enter as guest** (or press keyboard key `G`).
  3. Land on `/app`. Point mouse to the empty chat screen and click **Load demo memories**.
  4. Watch the brief 2-second seed indicator transition as 38 memories and vector embeddings load.
* **Voice-Over (Spoken):**  
  *"To make evaluating effortless for judges, Radahn requires zero sign-up. One click on 'Enter as guest' provisions an anonymous session secured by Better Auth.  
  On the empty chat screen, we click 'Load demo memories'. Behind the scenes, MongoDB Atlas seeds the world of Aarav Mehta—a student developer building Kestrel, a flight-log app for hobby drone pilots, with 38 typed memory units spanning project constraints, personal preferences, and internship goals, all embedded with 768-dimensional vectors using gemini-embedding-2."*
* **Technical Note:**  
  `MongoDB Atlas document model + gemini-embedding-2 (768-d) + anonymous auth session`

---

### Act 3: Beat 2 — The Core Loop: Recall, Citations, Scores & Ghost Diff
**Timestamp: [01:25 – 02:40] (75s)**

* **On Screen / Action:**  
  1. In the suggested prompt chips, click **"What is our launch plan for Kestrel?"**
  2. The message sends. The assistant reply streams in rapidly with bullet points and inline citation squares like `[1]`, `[2]`, `[3]`.
  3. Click on the memory badge (or citation square) to slide open the **Memory Lens** side drawer.
  4. In the Memory Lens, switch from **Used** to the **Why** tab to show the score breakdown bar and plain-language explanation.
  5. Close drawer. Click the **Without memory** button right beneath the assistant's response.
  6. Show the real-time word-level ghost diff with green additions and red deletions.
* **Voice-Over (Spoken):**  
  *"Let's test Aarav's world. We click the suggested prompt: 'What is our launch plan for Kestrel?'  
  Watch what happens. Before generating a single token, Radahn fires four parallel recall channels in MongoDB: Vector Search, full-text Atlas Search, temporal window filters, and linked entity graphs. These are fused via Reciprocal Rank Fusion, scored for recency, importance, and confidence, and capped to the top eight units.  
  The response immediately respects Kestrel's 7 Nov 9:00 PM IST public beta release constraint, Aarav's preference for concise bullet lists over long paragraphs, and his goal of 500 active pilots by January. Every fact is cited inline.  
  Opening the Memory Lens, we don't just see what was recalled—we see the exact math: relevance, recency decay, and type boost.  
  And to prove memory actually altered the output, clicking 'Without memory' runs the identical prompt through the model with memory stripped, displaying a live word-by-word diff."*
* **Technical Note:**  
  `$vectorSearch + Atlas Search + Reciprocal Rank Fusion (RRF) + MMR Re-ranking`

---

### Act 4: Beat 3 — Steerability: Live Correction & History Chains
**Timestamp: [02:40 – 03:35] (55s)**

* **On Screen / Action:**  
  1. In the composer, type: *"Actually, the beta launch moved to 10 PM tonight."* and hit Enter.
  2. The assistant responds confirming the update.
  3. Notice the green write chip appear live in the top corner: `1 UPDATED`.
  4. Navigate to the **Memory** page from the sidebar.
  5. Search for `launch`. Click on the updated memory row to open its archival record (`/app/memory/<id>`).
  6. Highlight the prominent 32px serif statement, the compact facts row, and the vertical history timeline showing the old 9:00 PM launch belief struck through as *outdated*.
* **Voice-Over (Spoken):**  
  *"Now let's test how Radahn handles corrections. In the chat, we tell it: 'Actually, the beta launch moved to 10 PM tonight.'  
  In traditional chat bots, the model gets confused by conflicting context. Radahn treats memory as a single source of truth.  
  Its reconcile engine supersedes the old belief. In MongoDB, a partial unique index on ownerId, spaceKey, and slotKey guarantees that only one value can ever be active.  
  When we open the memory's detail page, we see an archival record: the new statement is active, while the original 9:00 PM deadline is preserved in a vertical history timeline with full provenance."*
* **Technical Note:**  
  `Partial unique index {ownerId, spaceKey, slotKey} + multi-document transaction supersede`

---

### Act 5: Beat 4 — Privacy Gate, Review Queue & Contradictions
**Timestamp: [03:35 – 04:30] (55s)**

* **On Screen / Action:**  
  1. Navigate back to chat. Paste: *"Here is my API key: sk-test_994828194829184928491829"* and press Enter.
  2. The reply immediately shows: *"Not saved — looked like a credential."*
  3. Now click the **Review** item in the sidebar (showing a badge count).
  4. Point to the pending sensitive memory card (e.g., medical or financial item). Click **Keep**.
  5. Scroll down to **Contradictions** showing two conflicting memory cards side-by-side.
  6. Click **Keep this as current** on the chosen card; watch the other card automatically supersede with a clean animation.
* **Voice-Over (Spoken):**  
  *"Privacy isn't an afterthought in Radahn. If a user accidentally pastes a sensitive API key or token, our deterministic pre-scan gate catches it with entropy detection before the model or database ever sees it. Zero secrets are ever stored.  
  For sensitive facts—like medical details or personal finances—memories are held in a human Review inbox. You decide whether to Keep, Edit, or Drop each item.  
  And when memories contradict, our Recommendation Card presents them side by side, letting you pick which statement is current while maintaining the database audit log."*
* **Technical Note:**  
  `Deterministic entropy + pattern pre-scan + human-in-the-loop approval & contradiction resolution`

---

### Act 6: Beat 5 — Time-Travel, Realtime Activity & Reflection
**Timestamp: [04:30 – 05:30] (60s)**

* **On Screen / Action:**  
  1. Click **Memory** in the sidebar. Demonstrate the **As of** dropdown ("As of yesterday") to watch outdated memories resurrect as they were historically.
  2. Click **Activity** in the sidebar. Show the live fixed-height event stream and the 4 Insight Cards.
  3. Click **Reflect now** in the top right. Watch the background job execute its multi-stage pipeline: gathering unreflected observations, topic clustering, and synthesizing new learned strategies.
  4. Show the new strategy card generated in real time.
* **Voice-Over (Spoken):**  
  *"Because Radahn maintains a complete append-only history of memory state transitions, you can time-travel. Selecting 'As of yesterday' rebuilds the memory table exactly as it existed 24 hours ago.  
  On the Activity page, MongoDB change streams power a live event feed of every memory created, updated, or purged.  
  Best of all is Reflection. When we click 'Reflect now', Radahn consolidates repeated user corrections and feedback into high-level strategies—like learning that Aarav wants concise 5-bullet plans. The agent actually learns from experience."*
* **Technical Note:**  
  `Temporal point-in-time reconstruct + MongoDB Change Streams + background consolidation pipeline`

---

### Act 7: The Close & Live Evaluation Results
**Timestamp: [05:30 – 06:15] (45s)**

* **On Screen / Action:**  
  1. Open the project README or `evals/results.md` on screen.
  2. Point to the verified benchmark numbers: 20/20 live test cases passed, 31/31 deterministic checks, 0 secrets leaked, 566ms recall latency, 100% recall@5.
  3. Switch to terminal: run `npm test` showing all 386 unit tests passing.
  4. End on the clean, warm landing page with the URL clearly visible: `https://radahn-ai.vercel.app`.
* **Voice-Over (Spoken):**  
  *"Radahn isn't a mockup or a prompt trick. It is a fully deployed, production-grade memory engine running on MongoDB Atlas and Gemini.  
  In our hosted evaluation suite, Radahn achieved 20 out of 20 live test cases, 100% recall precision, zero secrets leaked, and a median recall latency of just 566 milliseconds.  
  Try it yourself right now at radahn-ai.vercel.app with zero sign-up required.  
  Thank you."*
* **On-Screen Final Title Card:**  
  `Radahn · Visible, Steerable Memory · Live at radahn-ai.vercel.app`
