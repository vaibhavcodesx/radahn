# TODO — live board

Update when a task starts or finishes. Owners: `[claude]` `[codex]` `[human]`. Feature ids refer to docs/PRD.md §6. Times IST.

## Now
- [ ] [human] Atlas → Network Access → allow 0.0.0.0/0 (TLS handshake from the dev machine is reset; Vercel needs it too)
- [ ] [human] AI Studio → Rate limits: read real RPM/RPD for each key's project, put numbers in docs/research/quotas.md (numbers only)
- [ ] [human] Optional: a 3rd Gemini key from a *different Google project* (same-project keys share quota)
- [ ] [claude] Phase 0 tail: GitHub repo → Vercel project + env → first prod deploy → db:setup on Atlas
- [ ] [codex] C1 LLM registry (quota-aware) · C2 privacy gate · C3 recall · C4 extract + reconcile + writes

## Next (Phase 1, until Checkpoint A 10:30)
- [ ] [claude] Auth (guest + Google, link migration) · app shell · chat route + stream protocol · Streaming Text + citations · Memory lens · SSE realtime · write chips

## Later (Phase 2, until Checkpoint B 15:00)
- [ ] [codex] C5 explicit tools · C6 demo seed + embedding fixture · C7 ghost + reflection · C8 insights + evals
- [ ] [claude] Atlas table + detail drawer · Review inbox · Activity · Settings · ghost diff UI · demo seeding UX · landing skeleton

## Phase 3 (15:00–18:00)
- [ ] Landing signature (glyph field, ghost panel, how-it-works, footer) · Atlas Field view · light theme · P1s in order · finish review · /design-review · /qa · /cso · e2e

## Ship (18:00–21:00)
- [ ] Bug bash ×3 fresh profiles · demo video · README · deck · final deploy 20:45 · tag v1.0.0 · freeze 21:00 · submit form by 22:00

## Done
- [x] [claude/planner] Planning docs (03:15)
- [x] [claude] Research pass → docs/research/ (04:15)
- [x] [claude] Scaffold, tokens, atoms, env, contracts, mock engine, db-setup script, CI, CODEX_TASKS.md (04:22)

## Cut
- (nothing yet)

- [x] [codex] C1 merged by Claude, PR #1; all checks and smoke passed.
- [x] [codex] C2 implemented 04:39; 47 privacy tests, 60 total tests, lint, typecheck and build passed. Await lead merge.
