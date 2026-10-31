# Radahn — Demo Video Script

**Target Duration:** ≤ 6:30 (actual script timed at 6:15)  
**Track:** UNCHARTED 2026 · MongoDB Student Hackathon · Track 1: Agentic Memory  
**Live Site:** https://radahn-ai.vercel.app  
**Persona:** Aarav (synthetic SVNIT college student racing the 9:00 PM hackathon deadline; labelled DEMO throughout).  
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
  Start on the Radahn landing page (`https://radahn-ai.vercel.app`). Mouse hovers over the headline: *"An agent that remembers..."* Scroll smoothly down past the ghost diff proof section to show the contrast between answers with and without memory.
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
  3. Land on `/app`. Point mouse to the empty chat state and click **Load demo memories**.
  4. Watch the brief 2-second seed indicator transition as 38 memories and vector embeddings load.
* **Voice-Over (Spoken):**  
  *"To make evaluating effortless for judges, Radahn requires zero sign-up. One click on 'Enter as guest' provisions an anonymous session secured by Better Auth.  
  On the empty chat screen, we click 'Load demo memories'. Behind the scenes, MongoDB Atlas seeds the world of Aarav—a synthetic student hacker with 38 typed memory units spanning project constraints, personal preferences, and internship goals, all embedded with 768-dimensional vectors using gemini-embedding-2."*
* **Technical Note:**  
  `MongoDB Atlas document model + gemini-embedding-2 (768-d) + anonymous auth session`

---

### Act 3: Beat 2 — The Core Loop: Recall, Citations, Scores & Ghost Diff
**Timestamp: [01:25 – 02:40] (75s)**

* **On Screen / Action:**  
  1. In the suggested prompt chips, click **"Plan my next 4 hours."**
  2. The message sends. The assistant reply streams in rapidly with bullet points and inline citation squares like `[1]`, `[2]`, `[3]`.
  3. Click on the memory badge (or citation square) to slide open the **Memory Lens** side drawer.
  4. In the Memory Lens, switch from **Used** to the **Why** tab to show the score breakdown bar and plain-language explanation.
  5. Close drawer. Click the **Without memory** button right beneath the assistant's response.
  6. Show the real-time word-level ghost diff with green additions and red deletions.
* **Voice-Over (Spoken):**  
  *"Let's test Aarav's world. We click the suggested prompt: 'Plan my next 4 hours.'  
  Watch what happens. Before generating a single token, Radahn fires four parallel recall channels in MongoDB: Vector Search, full-text Atlas Search, temporal window filters, and linked entity graphs. These are fused via Reciprocal Rank Fusion, scored for recency, importance, and confidence, and capped to the top eight units.  
  The response immediately respects Aarav's 9:00 PM build deadline, his preference for 30-minute timeboxes, and his goal of a top-16 finish. Every fact is cited inline.  
  Opening the Memory Lens, we don't just see what was recalled—we see the exact math: relevance, recency decay, and type boost.  
  And to prove memory actually altered the output, clicking 'Without memory' runs the identical prompt through the model with memory stripped, displaying a live word-by-word diff."*
* **Technical Note:**  
  `$vectorSearch + Atlas Search + Reciprocal Rank Fusion (RRF) + MMR Re-ranking`

---

### Act 4: Beat 3 — Steerability: Live Correction & History Chains
**Timestamp: [02:40 – 03:35] (55s)**

* **On Screen / Action:**  
  1. In the composer, type: *"Actually, the build deadline moved to 10 PM tonight."* and hit Enter.
  2. The assistant responds confirming the update.
  3. Notice the green write chip appear live in the top corner: `1 UPDATED`.
  4. Navigate to the **Memory** page from the sidebar.
  5. Search for `deadline`. Click on the updated memory row to open its archival record (`/app/memory/<id>`).
  6. Highlight the prominent 32px serif statement, the compact facts row, and the vertical history timeline showing the old 9:00 PM belief struck through as *outdated*.
* **Voice-Over (Spoken):**  
  *"Now let's test how Radahn handles corrections. In the chat, we tell it: 'Actually, the build deadline moved to 10 PM tonight.'  
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
  6. Click **Keep this** on the left card; watch the right card automatically supersede with a clean animation.
* **Voice-Over (Spoken):**  
  *"Privacy isn't an afterthought in Radahn. If a user accidentally pastes a sensitive API key or token, our deterministic pre-scan gate catches it with entropy detection before the model or database ever sees it. Zero secrets are ever stored.  
  For sensitive facts—like medical details or personal finances—memories are held in a human Review inbox. You decide whether to Keep, Edit, or Drop each item.  
  And when two active memories contradict each other, Radahn surfaces them as contradiction pairs. One click on 'Keep this' promotes the winner and archives the loser into history."*
* **Technical Note:**  
  `Zero-leakage privacy pre-scan + human-in-the-loop review + contradiction reconciliation`

---

### Act 6: Beat 5 — Memory Atlas: Time Travel, TTL Expiry & Hard Forget
**Timestamp: [04:30 – 05:20] (50s)**

* **On Screen / Action:**  
  1. Navigate to **Memory** in the sidebar.
  2. Click the **As of** dropdown in the toolbar and select **Yesterday**.
  3. Show the table re-rendering past beliefs before today's corrections took place (Time Travel).
  4. Switch back to current time. Click on a demo memory (e.g. snack reminder). Click **Expire → In 2 minutes**.
  5. Point to the countdown badge.
  6. Now click the trash bin icon on another memory row. A confirmation dialog appears: *"Forget this memory forever?"* Click **Forget**.
* **Voice-Over (Spoken):**  
  *"In the Memory Atlas, we can time-travel. Using the 'As of' selector, we can view the agent's exact state of belief yesterday, before our deadline correction occurred.  
  Temporary facts shouldn't clutter memory forever. With our TTL integration, we can set any memory to expire in two minutes. The query engine stops recalling it immediately, and MongoDB's background TTL monitor purges the document.  
  And when you want something forgotten, clicking Forget triggers a true physical delete: the statement text and its vector are permanently purged, leaving only a content-free tombstone event."*
* **Technical Note:**  
  `Bi-temporal validity + TTL index on purgeAt + physical deletion with tombstone logging`

---

### Act 7: Beat 6 — Real-Time Activity Feed & Sleep-Time Reflection
**Timestamp: [05:20 – 06:00] (40s)**

* **On Screen / Action:**  
  1. Navigate to **Activity** in the sidebar. Show the green **Live** badge.
  2. Point to the segmented filters (`All`, `Saved`, `Updated`, `Reviewed`, `Forgotten`).
  3. Click the **Reflect now** button in the header.
  4. Watch the reflection steps animate: *gather → cluster → consolidate → write*.
  5. Highlight the newly minted learned strategy card: *"When asked for a plan, give at most 5 time-boxed bullets."*
* **Voice-Over (Spoken):**  
  *"The Activity feed listens to MongoDB change streams over Server-Sent Events, streaming memory events across all your tabs in real time.  
  In the background, Radahn runs sleep-time reflection. When we click 'Reflect now', it gathers unreflected feedback memories, clusters recurring critiques, and consolidates them into learned strategies.  
  Notice how repeated user requests for brevity produced an active strategy: 'When asked for a plan, give at most 5 time-boxed bullets.' Radahn now automatically applies this format in future turns."*
* **Technical Note:**  
  `MongoDB change streams via SSE + background reflection pipeline (MemGPT lineage)`

---

### Act 8: Beat 7 — Connected Agents (MCP) & Closing
**Timestamp: [06:00 – 06:15] (15s)**

* **On Screen / Action:**  
  1. Jump to **Settings → Connected agents**.
  2. Show the scoped key generation form and the one-time `claude mcp add` setup command.
  3. Switch to terminal: run `claude mcp list` showing Radahn connected with `memory_search` and `memory_save` tools.
  4. Return to browser, showing the GitHub repository and live URL.
* **Voice-Over (Spoken):**  
  *"Finally, Radahn exposes a Model Context Protocol endpoint, allowing external agents like Claude Code or Cursor to read and write memories with scoped permissions.  
  Radahn: persistent, visible, steerable memory—built natively on MongoDB Atlas.  
  Try it live right now at radahn-ai.vercel.app. Thank you."*
* **Technical Note:**  
  `Stateless HTTP MCP endpoint + SHA-256 scoped agent keys`

---

## Technical Summary Cheat Sheet for Judges

| Evaluation Pillar | Implementation in Radahn |
|---|---|
| **Core Memory Contract** | 10 Typed atomic units (`preference`, `constraint`, `fact`, `goal`, `decision`, etc.) |
| **Visible Proof** | Inline citations, Memory Lens with real RRF scores, live word-level Ghost Diff |
| **Hard Cases** | Reconcile engine, bi-temporal history, TTL expiry, hard delete, privacy pre-scan |
| **MongoDB Native Stack** | Document model, Vector Search, Atlas Search, TTL indexes, Partial unique index, Transactions, Change streams, Aggregation pipelines |
| **Measured Verification** | 20/20 live test cases, 31/31 deterministic checks, 0 secrets stored, 566ms p50 recall |
