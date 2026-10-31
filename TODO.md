# TODO — live board

Update when a task starts or finishes. Owners: `[claude]` `[codex]` `[human]`. Feature ids refer to docs/PRD.md §6. Times IST.

## Now
- [ ] [claude] Mobile QA · design review · /qa · /cso · docs/qa-cheatsheet.md · deck text · README polish
- [ ] [claude] Seed one demo contradiction so Review → Contradictions has something to show (needs a precomputed embedding → ask Codex)
- [ ] [codex] Profile reflection is model-dependent (~1 in 2 hosted self-tests): consider filtering cited ids to eligible ones instead of discarding the whole profile
- [ ] [human] Try the MCP endpoint: Settings → Connected agents → Create key → run the shown `claude mcp add` command
- [ ] [human, optional] GitHub → Settings → Applications → Vercel → grant access to `radahn` (PR previews)
- [ ] [human] AI Studio → Rate limits: read real RPM/RPD for each key's project, put numbers in docs/research/quotas.md (numbers only)
- [ ] [human] Optional: a 3rd Gemini key from a *different Google project* (same-project keys share quota)
- [ ] [codex] C3 recall · C4 extract + reconcile + writes (then Claude flips prod to MEMORY_ENGINE=real)
- [ ] [claude] Phase 2: Memory Atlas table + detail · Review inbox · Activity · Settings

## Next
- [ ] [claude] Flip prod to real engine after C3+C4 + self-test pass

## Later (Phase 2, until Checkpoint B 15:00)
- [ ] [codex] C5 explicit tools · C6 demo seed + embedding fixture · C7 ghost + reflection · C8 insights + evals
- [ ] [claude] Atlas table + detail drawer · Review inbox · Activity · Settings · ghost diff UI · demo seeding UX · landing skeleton

## Phase 3 (15:00–18:00)
- [ ] Landing signature (glyph field, ghost panel, how-it-works, footer) · Atlas Field view · light theme · P1s in order · finish review · /design-review · /qa · /cso · e2e

## Ship (18:00–21:00)
- [ ] Bug bash ×3 fresh profiles · demo video · README · deck · final deploy 20:45 · tag v1.0.0 · freeze 21:00 · submit form by 22:00

## Done
- [x] [claude] Merged Codex #7–#16, reflection/profile/citation/notice integration fixes, time travel UI, contradictions UI, migration hardening, maintenance cron, MCP endpoint + Connected agents, hosted eval route + results (09:07)
- [x] [human] Google OAuth origin + redirect added (08:30)
- [x] [claude] Phase 0: repo, CI, Vercel prod (radahn-ai.vercel.app), Atlas setup (04:38)
- [x] [codex/claude] C1 quota routing, C2 privacy gate merged (04:55)
- [x] [claude] Phase 1 core loop on prod with mock engine: auth, shell, chat, lens, citations, chips, ghost diff, demo seed (05:10) — Checkpoint A met early on mock
- [x] [claude/planner] Planning docs (03:15)
- [x] [claude] Research pass → docs/research/ (04:15)
- [x] [claude] Scaffold, tokens, atoms, env, contracts, mock engine, db-setup script, CI, CODEX_TASKS.md (04:22)

## Cut
- (nothing yet)

- [x] [codex] C1 merged by Claude, PR #1; all checks and smoke passed.
- [x] [codex] C2 implemented 04:39; 47 privacy tests, 60 total tests, lint, typecheck and build passed. PR #2 awaiting lead merge.

- [x] [codex] C3 implemented 04:48; 91 tests, lint, typecheck, build passed. Hosted Atlas planning/latency probe queued after deployment.

- [x] [codex] C4 implemented 04:59; 115 tests, lint, typecheck, build passed. Stacked on C3. After merge: run operator db-setup for idempotency index, then hosted selftest. Optional contentHash/candidateHash/validFrom fields added under overnight approval.

- [x] [codex] C5 implemented 05:07; explicit tools, owner reads, typed pin budget and expiry transitions; 127 tests plus lint/typecheck/build pass. Optional user_settings.memoryRevision serializes owner mutations. Hosted checks added; cleanup includes synthetic settings.

- [x] [codex] Hosted C3-C5 verification 05:13: db setup passed (4 event indexes; vector/text READY; transactions valid); all 11 real Atlas/Gemini selftest checks passed, warm recall 20 ms; disposable owner and settings cleaned up. Claude may switch mock to real after current rollout readiness review.
- [x] [codex] C6 implemented 05:17: 38x768 real synthetic fixture; runtime zero LLM; owner-locked atomic replacement and pending-review conflict handling. Independent spec/quality review passed. Hosted demo seed/removal check added.

- [x] [codex] Lead gate feedback implemented 05:25: ordinary URLs preserved; URL query/fragment/userinfo secrets still redacted; descriptive act-as roles accepted, agent-directed roles blocked. Failing-first regressions cover Markdown and OAuth edge cases.

- [x] [codex] Hosted C6 verification 05:29: production health real/bom1/DB ok; all 12 Atlas/Gemini checks passed, including real seed/remove (462ms) and isolated slot/correction/history. Warm recall 39ms. Owner/settings cleanup passed.

- [x] [codex] C7 implemented 05:39; evidence-backed reflection, strategy refinement, steps/history, atomic outputs/events, preserved concurrent write counter. Hosted bullet-strategy/history check added.

- [x] [codex] C8 implemented 06:05: owner-scoped insights/graph and measured eval harness; Claude to expose runEvals() via authenticated /api/admin/eval. PR #8 C7 CI green, hosted reflection check pending deploy. PR #7 gate follow-up also CI green.

- [x] [codex] C9 engine implemented 06:18: bounded expiry/backfill and conservative guest maintenance; single-owner mode for hosted backfill verification. Claude owns cron scheduling/execution. C8 PR #9 submitted; lead operator eval route pending.

- [ ] [codex] C9 lead integration: cron can call runMaintenance({now}) directly once merged; remove its redundant initial flipExpired() call. Keep broad guest purge as cron/operator execution; Codex hosted probe uses only a disposable ownerId.

- [ ] [codex] C9 blocking lead integration: wire engine noteOwnerActivity(ownerId) before every auth session creation/update and account-link activity, reject session creation if owner was erased; only after hooks are deployed enable runMaintenance({now,guestActivityGuardReady:true}) in cron. Guest purge defaults deferred until that protocol is in place. Engine task includes helper; auth stays lead-owned.

- [x] [codex] C10 engine implemented 06:25: agent key CRUD/authentication, owner-validated space scopes and one-time secret display; MCP transport/routes remain Claude-owned.

- [ ] [codex] C10 lead MCP handoff: verify key first; derive ownerId, allowed spaceKeys and actor {kind:'external_agent',name:verified.name} from verified access, never client fields. Enforce the chosen space against the verified allowlist before any memory call. Raw keys are creation-only; metadata omits hashes/secrets.

- [x] [codex] C11 engine implemented 06:34: owner-scoped cached conflict pairs and transactional resolution; additive conflict cache fields and two facade methods pre-approved overnight. Claude owns Review inbox routing/UI.

- [ ] [codex] C11 lead UI handoff: listConflicts(ownerId) returns pairs and resolveConflict({ownerId,keepId,dropIds,actor?}) writes superseded history. Review is explicitly bounded to the most recent60 live units, top40 cosine pairs, at most12 model judgments; pagination/exhaustive review remains future work.

- [x] [codex] C12 engine implemented 06:43: historical asOf list/recall filters, validity boundaries, historical prompt labeling and mock parity. TTL-deleted/forgotten history remains unavailable.

- [ ] [codex] C12 lead handoff: pass optional validated absolute ISO asOf from GET /api/memories into listMemories; add asOf to src/server/chat/tools.ts recall_memory schema/execution and include snapshot time in historical tool results. Natural-language past-state questions need that explicit tool argument. Historical content follows validFrom/validTo, not a full transaction-time metadata audit.

- [x] [codex] C13 engine implemented 06:54: reflection profile summary, bounded previous version, validated global evidence, profile TTL/erasure and historical exclusion; profiles key by owner _id and require a separate migration invalidation helper in lead auth.

- [ ] [codex] C13 lead integration: call migrateProfile(fromOwnerId,toOwnerId,session) inside the account migration transaction under both owner locks; it invalidates both owner-keyed summaries. Do not add profiles to generic ownerId-only migration because _id also keys the owner. Run authenticated /api/admin/db-setup after deploying C13 for ttl_profile_purge.

- [x] [codex] C14 controlled measurement completed: exact baseline06c5145 vs current954dd8f, identical cold-index fixture 0/3 ->3/3; deterministic31/31. Retain weights due insufficient representative data. Hosted eval remains blocked: authenticated call rejected by automatic approval review before execution, later public GET returned404; endpoint deployment and user authorization are pending.

- [x] [codex] Final engine review patch: add server-trusted allowedSpaceKeys to scoped recall/list/writes and transactional ID mutations; global profile only when global is allowed. Lead MCP must pass verified scopes and must not expose unrestricted detail/trace methods. Add owner reflectionRevision checkpoint before gather/commit so overlapping runs cannot consume counters twice or regress checkpoints.

- [ ] [codex] Final scoped-key handoff: MCP passes verified allowedSpaceKeys on every supported recall/list/remember/correct/forget/update/review call; validate effective global saves too. Do not expose owner-only detail/raw/history/trace/events/conflicts/admin functions through scoped keys until they have equivalent restrictions. The client cannot choose this trusted allowlist.

- [ ] [codex] Lead auth migration audit: src/server/auth/migrate.ts currently deletes source settings after moving owner rows. Acquire both owner locks and retire/redirect the old owner identity so a delayed chat after() write cannot upsert orphan old-owner data after migration; wire profile invalidation in that same transaction. This auth orchestration remains lead-owned.

- [x] [codex] Final CLI guard: unsupported eval flags now fail before env loading/network; --help is usage-only, --deterministic stays offline, default hosted mode remains intentional. The accidental --no-report invocation may have transmitted CRON_SECRET; no hosted result is established, and no more CLI retries were made.

- [x] [codex] K1 engine implemented 14:31 IST: shared eight-second extraction inference budget including quota reads/reports; low thinking and batched embeddings. Independent review passed.
- [ ] [codex/lead] K1 acceptance: deploy, measure finish-to-first-event p50 (<4s target), and stop zero-candidate UI waiting from existing empty assistant writeSummary or a dedicated completion signal. Engine emits no fake write event.


- [x] [codex] K2 implemented 14:33 IST: strong relevance and real slot changes only; atomic announcement claim, monotonic stats, per-pick history, historical/read-only exclusion. Independent review passed; hosted acceptance follows deployment.
