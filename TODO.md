# TODO — live board

Update when a task starts or finishes. Owners: `[claude]` `[codex]` `[human]`. Feature ids refer to docs/PRD.md §6. Times IST.

## Now
- [ ] [human] Google OAuth client: add origin https://radahn-ai.vercel.app + redirect https://radahn-ai.vercel.app/api/auth/callback/google
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
