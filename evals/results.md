# Memory evaluation

Mode: hosted; budgetExceeded=false; Disposable eval owner cleaned in finally.

31/31 deterministic cases passed. Live samples are intentionally small on M0.

| Metric | Measured value |
|---|---|
| extractionAttempts | 3 |
| extractionEventSamples | 3 |
| p50ExtractionFirstEventMs | 1962.4201739999698 |
| p95ExtractionFirstEventMs | 2473.2435750000295 |
| p50ExtractionCompletionMs | 1960.5950999999768 |
| writeOpAccuracy | 1 |
| writeSamples | 5 |
| precisionAt5 | 0.20000000000000004 |
| recallAt5 | 1 |
| recallSamples | 3 |
| secretsStored | 0 |
| memoryChangedRate | 1 |
| abSamples | 1 |
| model | gemini-3.5-flash-lite |
| p50RecallMs | 565.6476280000061 |
| p95RecallMs | 570.9545969999745 |
| errorCount | 0 |

Extraction timing starts at the engine invocation and ends when its committed event is observed by a scoped poll (200ms interval); it excludes chat-finish scheduling and browser SSE delivery.

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
| exact-recall | true |
| temporal-recall | true |
| ambiguous-name-no-delete | true |
| expired-excluded | true |
| explicit-forget | true |
| forget-then-recall-none | true |
| temporal-event-window | true |
| temporal-expiry-and-project-isolation | true |
| temporal-forgotten-event-no-resurrection | true |
| food-cold-index-diet-recalled | true |
| food-semantic-candidate-present | true |
| food-ranked-diet-beats-demo-flood | true |
| extraction-first-event-p50-under-4s | true |

_Hosted run on production, 31 Oct 2026 ~16:40 IST, after K3/K5/K7 and the Groq wiring were deployed (run by Claude via `POST /api/admin/eval`)._
