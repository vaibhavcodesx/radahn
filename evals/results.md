# Memory evaluation

Mode: hosted; budgetExceeded=false; Disposable eval owner cleaned in finally.

31/31 deterministic cases passed. Live samples are intentionally small on M0.

| Metric | Measured value |
|---|---|
| writeOpAccuracy | 1 |
| writeSamples | 5 |
| precisionAt5 | 0.13333333333333333 |
| recallAt5 | 0.6666666666666666 |
| recallSamples | 3 |
| secretsStored | 0 |
| memoryChangedRate | 1 |
| abSamples | 1 |
| model | gemini-3.5-flash-lite |
| p50RecallMs | 589.7907419999829 |
| p95RecallMs | 633.9719319999858 |
| errorCount | 0 |

Precision@5 uses a fixed denominator of five; recall@5 uses relevant active units. Cold-index query runs immediately. A/B uses identical served model, temperature and token limit; Jaccard < 0.7 is a difference heuristic, not proof of answer quality.

| Case | Passed |
|---|---|
| write-add | true |
| write-confirm | true |
| write-update-history | true |
| write-correction-A-B-C-one-active-history | true |
| write-paraphrase-confirms-no-duplicate | true |
| privacy-no-store | true |
| cold-index-plan | true |
| exact-recall | false |
| temporal-recall | true |
| ambiguous-name-no-delete | true |
| expired-excluded | true |
| explicit-forget | true |
| forget-then-recall-none | true |
| temporal-event-window | true |
| temporal-expiry-and-project-isolation | true |
| temporal-forgotten-event-no-resurrection | true |
