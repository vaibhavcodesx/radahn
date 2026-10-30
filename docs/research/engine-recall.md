# Recall selection decisions (C3)

Baseline: memory-engine.md sections 5.3-5.4 and CODEX_TASKS research decisions R4/R8.

MMR orders by 0.7 * relevance - 0.3 * maximum selected cosine. Ordering alone can still fill a large budget with identical statements. After that ordering, suppress same-type cosine >= 0.95 duplicates. Different values for the same slot remain eligible so the ambiguity notice can ask for clarification. The cutoff is conservative relative to reconciliation's 0.92 confirmation threshold; eval tuning remains C14.

Planning strategies receive priority among eligible strategies after pinned rules, so three broadly similar unrelated rules cannot evict the required planning rule. The cap remains three.

Trace persistence fails open during an outage: retain available recall results and use an empty recallId if persistence fails. This keeps a telemetry failure from aborting the chat. No content or provider error is logged.

Hosted verification uses isolated eval:selftest owners and finally cleanup, per the overnight task update. A second identical query measures warm latency after search readiness succeeds.
