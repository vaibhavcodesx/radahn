# SETUP — what the humans do (≈ 45 minutes, do it in parallel with the agents)

Status of this machine (re-checked 2026-10-31 03:55 IST):

| Tool / skill | Status | Action |
|---|---|---|
| Node 22, npm 10, git, Python 3.11, bun | ✅ installed | — |
| `gh` CLI | ✅ logged in as `vaibhavcodesx` | — |
| Vercel CLI 64 | ✅ logged in as `vaibhavcodesx` | — |
| Codex CLI 0.162 | ✅ logged in (ChatGPT) | — |
| Claude Code: superpowers, impeccable, context7, mongodb, playwright, frontend-design, codex plugin, **ui-ux-pro-max** | ✅ enabled | — |
| Claude Code: gstack skills, transitions-dev, web-design-guidelines | ✅ installed | — |
| impeccable | ✅ v4.5.2 (v4.8.0 available) | Optional update between sessions |
| Codex: superpowers, Context7 | ✅ (done by user) | — |
| Codex: gstack | ✅ installed from Git Bash (`gstack-*` skills in `~/.codex/skills`). `/cso` helper did not build on Windows; everything else works. | Use Claude's `/cso` or skip |
| Gemini API keys | ✅ 2 keys in `.env.local`, both verified (HTTP 200 on 3.8 Flash, 3.5 Flash-Lite, Embedding 2) | Optional 3rd key from teammate 3 |
| Google OAuth client | ✅ ID + secret in `.env.local` | Add prod URL to the client after first deploy (step 5.5) |
| `BETTER_AUTH_SECRET`, `CRON_SECRET` | ✅ generated into `.env.local` | — |
| **MongoDB Atlas `MONGODB_URI`** | ❌ **missing from `.env.local`** | **Step 3, then add `MONGODB_URI=` to `.env.local`** |
| GitHub repo / Vercel project | ❌ (agent creates them with your OK) | Step 6 |

Windows note: Windows PowerShell 5 doesn't support `&&`. Run multi-step commands from **Git Bash**, or put `;` between commands in PowerShell. gstack's `setup` is a bash script, so it needs Git Bash either way.

Never paste secret values into an agent chat. Put them in `.env.local` yourself and in Vercel's dashboard.

---

## 1. Claude Code (2 min)
In a terminal:
```bash
claude plugin enable ui-ux-pro-max@ui-ux-pro-max-skill
```
Then in the Claude Code session run `/reload-plugins`. (If the CLI command isn't available in your version, open an interactive `claude` terminal, run `/plugin`, find **ui-ux-pro-max**, and enable it.)

Optional, between sessions only (it rewrites skill files):
```bash
npx impeccable update
```

## 2. Codex (5 min)
1. **Superpowers**: open Codex CLI, run `/plugins`, search `superpowers`, choose **Install Plugin**.
2. **gstack for Codex**:
```bash
cd ~/.claude/skills/gstack && ./setup --host codex
```
3. **Context7 MCP for Codex**: append to `~/.codex/config.toml`:
```toml
[mcp_servers.context7]
command = "npx"
args = ["-y", "@upstash/context7-mcp"]
```
4. Restart Codex and check that `/mcp` lists context7 and that the skills show up.

## 3. MongoDB Atlas M0 (10 min)
1. Sign in at https://cloud.mongodb.com → create a project **Radahn**.
2. **Create cluster → Free (M0)** · provider **AWS** · region **Mumbai (ap-south-1)** · name `radahn`.
3. **Database Access → Add user**: username `radahn-app`, autogenerate a strong password (save it), role **Read and write to any database**.
4. **Network Access → Add IP → Allow access from anywhere (0.0.0.0/0)**. Vercel uses changing IPs, so this is required.
5. **Connect → Drivers → Node.js** → copy the `mongodb+srv://…` string. Insert your password and append the database: `…mongodb.net/radahn?retryWrites=true&w=majority&appName=radahn`.
6. Optional: let Claude Code connect the MongoDB MCP (skill `mongodb:mongodb-mcp-setup`) so it can inspect collections and indexes.

The agent creates collections, validators, and the vector/search indexes with `npm run db:setup`. You don't click anything else in Atlas.

## 4. Gemini API keys (5 min, each teammate)
1. Each of the 3 teammates goes to https://aistudio.google.com/apikey with **their own Google account** and creates a key (free-tier quotas are per project, so three keys ≈ three times the headroom).
2. In AI Studio, open the rate-limit view and note the free-tier RPM/RPD for `gemini-3.8-flash`, `gemini-3.5-flash-lite`, and `gemini-embedding-2`. Tell the lead agent the numbers (numbers only, not keys).
3. Collect the keys into `GEMINI_API_KEYS=key1,key2,key3` in `.env.local` and in Vercel.

## 5. Google OAuth client (10 min)
1. https://console.cloud.google.com → new project **Radahn**.
2. **Google Auth Platform → Branding**: app name *Radahn*, support email, developer email. **Audience**: External, then **Publish app** (set to *In production*) so any Google account can sign in. With only the basic `openid`, `email`, `profile` scopes no verification is needed.
3. **Clients → Create client → Web application**:
   - Authorized JavaScript origins: `http://localhost:3000` and `https://<your-prod-domain>`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google` and `https://<your-prod-domain>/api/auth/callback/google`
4. Copy Client ID and Client secret into `.env.local` and Vercel.
5. You'll only know `<your-prod-domain>` after the first deploy (Phase 0, e.g. `radahn.vercel.app`). Come back and add it. Guest login works without Google, so nothing blocks on this.

## 6. GitHub + Vercel (5 min, mostly the agent)
- The lead agent will ask before creating the **public** repo (`gh repo create radahn --public --source . --push`) and linking Vercel (`vercel link`, Git integration, region **bom1**). Say yes in chat.
- Public repo → unlimited GitHub Actions minutes. `Inputs/` and `.env*` are git-ignored; double-check the first commit doesn't include them (`git status` before pushing).
- In Vercel → Project → Settings → Environment Variables, add every variable from `.env.example` for **Production** and **Preview**. Set `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to the prod URL for Production.

## 7. Secrets you generate
```bash
openssl rand -base64 32
```
Run it twice: once for `BETTER_AUTH_SECRET`, once for `CRON_SECRET`.

## 8. Starting the agents

The exact prompts are in [docs/agent-prompts.md](docs/agent-prompts.md). Start Claude first; start Codex only after Claude tells you `docs/CODEX_TASKS.md` is pushed.

## 9. During the build (Human C)
- Write the Aarav demo persona content with the agent (statements for ~40 memories, 3 short past chats). Keep it realistic and clearly synthetic.
- Draft the deck skeleton from docs/build-plan.md §8 and the video script from docs/PRD.md §7.2.
- From 15:00: test the prod URL on your phone and a fresh browser every hour; report bugs in TODO.md.
