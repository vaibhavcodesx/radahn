# Memory evaluation

Hosted run on production (Vercel bom1 + Atlas M0 + Gemini free tier), 31 Oct 2026 ~09:25 IST, via the operator route `POST /api/admin/eval`.

Mode: hosted; budgetExceeded=false; Disposable eval owner cleaned in finally.

31/31 deterministic cases passed. Live samples are intentionally small on M0.

| Metric | Measured value |
|---|---|
| writeOpAccuracy | 1 |
| writeSamples | 3 |
| precisionAt5 | 0.20 (1 relevant unit per query ÷ fixed 5) |
| recallAt5 | 1 |
| recallSamples | 3 |
| secretsStored | 0 |
| memoryChangedRate | 1 |
| abSamples | 1 |
| model | gemini-3.5-flash-lite |
| p50RecallMs | 507 |
| p95RecallMs | 562 |
| errorCount | 0 |

Precision@5 uses a fixed denominator of five; recall@5 uses relevant active units. Cold-index query runs immediately. A/B uses identical served model, temperature and token limit; Jaccard < 0.7 is a difference heuristic, not proof of answer quality.

| Case | Passed |
|---|---|
| write-add | true |
| write-confirm | true |
| write-update-history | true |
| privacy-no-store | true |
| cold-index-plan | true |
| exact-recall | true |
| temporal-recall | true |
| ambiguous-name-no-delete | true |
| expired-excluded | true |
| explicit-forget | true |
