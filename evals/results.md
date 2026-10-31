# Memory evaluation

Mode: deterministic; 31/31 pure golden cases passed.

Hosted write accuracy, precision@5, secrets stored, memory-changed rate and recall latency: pending (not measured in this mode).

| Case | Passed |
|---|---|
| new-preference | true |
| new-fact | true |
| goal | true |
| deadline | true |
| decision | true |
| feedback | true |
| sensitive-review | true |
| sensitive-consent | true |
| review-all | true |
| low-confidence | true |
| confidence-boundary | true |
| password | true |
| otp | true |
| pan | true |
| card | true |
| uri | true |
| prompt-injection | true |
| system-tag | true |
| role-injection | true |
| exfiltration | true |
| empty | true |
| tautology | true |
| semantic-confirm | true |
| semantic-ambiguous | true |
| semantic-unrelated | true |
| different-type | true |
| slot-confirm | true |
| slot-update | true |
| historical-update | true |
| short-expiry-grace | true |
| long-expiry-grace | true |

## C14 measured tuning

Controlled cold-index comparison: actual baseline `06c5145` returned 0/3 relevant picks; current `954dd8f` returned 3/3 with identical fixtures and empty search channels (one query, three relevant rows, mocked DB/embeddings). Current deterministic checks: 31/31. Ranking weights and thresholds retained; these samples cannot justify retuning. Hosted metrics remain unmeasured: automatic approval review blocked the authenticated request before execution; no authenticated HTTP status was observed. A later public GET without credentials returned HTTP 404 (parent, approximately 07:00 IST); no hosted job ran.

Persistent methodology, limitations and reproduction: [C14 tuning record](tuning.md). This separate record survives regeneration of this deterministic report.
