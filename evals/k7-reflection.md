# K7 reflection reliability — 31 Oct 2026

Baseline hosted self-test (15:50 IST): HTTP500,17/19 checks passed. Feedback strategy and profile checks failed; disposable-owner cleanup passed. No post-fix hosted success is claimed yet.

A local synthetic probe against the real reflection schema found:

| Provider/model | Mode | Result |
|---|---|---|
| Groq openai/gpt-oss-20b | strict JSON schema | HTTP400; schema rejected |
| Groq openai/gpt-oss-20b | JSON schema, strictJsonSchema=false; SDK validation retained | Valid output in2781ms; bullet strategy with3known feedback sources; profile238chars |
| Gemini gemini-3.5-flash-lite | existing demo strategy present | Valid profile, no new strategy (a legitimate already-covered no-op) |
| Gemini gemini-3.5-flash-lite | existing strategy absent | New bullet strategy with3known feedback sources in7186ms; profile164chars |

The direct SDK success did not qualify the fallback: repeated public registry-wrapper probes returned HTTP400 (about11s including unavailable local quota DB accounting). Groq20B is therefore excluded from the role chains as instructed. Existing Groq chat integration is preserved.

K7 accepts one validated feedback/outcome source or an explicit manual/tool instruction, never zero/unknown/ordinary-fact evidence. Existing scope, sensitivity and transaction checks remain. The operator learning test now removes only its disposable owner’s demo strategy before reflection and still requires a newly generated evidence-backed rule, step completion, counters and history. The actual serving model is recorded in progress metadata and returned by the reflection check.

Hosted acceptance target: three consecutive full self-test runs after deployment, all checks and cleanup passing. K8 remains deferred until that target is met.
