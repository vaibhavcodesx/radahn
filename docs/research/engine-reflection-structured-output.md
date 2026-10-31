# Reflection structured output compatibility

31 Oct2026 K7: the actual reflection schema contains optional profile/target fields. A synthetic Groq20B probe rejected strict JSON-schema mode with HTTP400. The documented `strictJsonSchema:false` mode retained `structuredOutputs:true` and AI SDK/Zod validation, and produced a valid evidence-backed strategy and profile in2781ms. However, repeated actual registry-wrapper probes returned HTTP400. The direct SDK sample was insufficient to qualify a reliable fallback, so Groq20B is excluded from fast/reflect as the lead requested; existing Groq chat routing is preserved.

AI SDK structured validation failures (`NoObjectGeneratedError`/`NoOutputGeneratedError`) now advance to another model without logging generated text. Ordinary non-retryable provider failures remain sanitized. Prompt/evidence validation permits one complete behavioral source as explicitly authorized by K7, never empty or unsupported evidence.

The demo already contains the expected bullet strategy. A reflection that retains it can correctly emit no new strategy. The hosted learning check therefore removes only the synthetic demo strategy before invoking reflection, then requires a newly generated output; it does not count the retained fixture as success. See `evals/k7-reflection.md` for measured probes and acceptance.

Sources: [Groq provider structured-output options](https://ai-sdk.dev/providers/ai-sdk-providers/groq), [AI SDK structured-output errors](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data). APIs also checked against installed `@ai-sdk/groq` and `ai` source; no secret or user content was logged.
