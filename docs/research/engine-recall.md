# Recall selection decisions (C3)

Baseline: memory-engine.md sections 5.3-5.4 and CODEX_TASKS research decisions R4/R8.

MMR orders by 0.7 * relevance - 0.3 * maximum selected cosine. Ordering alone can still fill a large budget with identical statements. After that ordering, suppress same-type cosine >= 0.95 duplicates. Different values for the same slot remain eligible so the ambiguity notice can ask for clarification. The cutoff is conservative relative to reconciliation's 0.92 confirmation threshold; eval tuning remains C14.

Planning strategies receive priority among eligible strategies after pinned rules, so three broadly similar unrelated rules cannot evict the required planning rule. The cap remains three.

Trace persistence fails open during an outage: retain available recall results and use an empty recallId if persistence fails. This keeps a telemetry failure from aborting the chat. No content or provider error is logged.

Hosted verification uses isolated eval:selftest owners and finally cleanup, per the overnight task update. A second identical query measures warm latency after search readiness succeeds.

### Cold search-index visibility (31 Oct 05:54 IST)
Hosted selftest observed roughly 4 seconds until the seeded planning fixtures appeared in both search channels. MongoDB documents search replication lag via its [Search alert conditions](https://www.mongodb.com/docs/atlas/reference/alert-conditions/). When planning intent has no semantic or lexical hits, use one bounded classic owner/space/active/unexpired query for constraints, goals, decisions and preferences (max15), then run the existing scoring/MMR/budget path. Preserve explicit type filters. Record this in the graph channel with planning reasons; do not claim an entity match. General questions retain the existing empty result behavior. This improves the first plan immediately after seed without waiting for search synchronization. Actual hosted before/after measurements remain for C14.
