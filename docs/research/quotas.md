# Quota facts: Gemini free tier and Atlas M0

Date checked: 2026-10-31. "UNVERIFIED" = not confirmed from an official primary page.

## Gemini API (free tier)

| Fact | Value | Status | Source |
|---|---|---|---|
| Free-tier models (token price "Free of charge") | gemini-3.8-flash, gemini-3.6-flash, gemini-3.5-flash-lite, gemini-3.1-flash-lite, gemini-embedding-2 | Verified | https://ai.google.dev/gemini-api/docs/pricing |
| gemini-4-argon | Paid only | Verified | same |
| Per-model RPM / TPM / RPD | Not printed in docs; shown per project in AI Studio (login) | Verified (absence) | https://ai.google.dev/gemini-api/docs/rate-limits ; https://aistudio.google.com/rate-limit |
| Limits scope | Per project, NOT per API key; RPD resets midnight Pacific | Verified | rate-limits page |
| gemini-3.8-flash free RPD | about 20 (user reports Sep 2 and Oct 16 2026) | UNVERIFIED | https://discuss.ai.google.dev/t/gemini-3-8-flash-free-tier-20-rpd-is-too-limited-for-practical-evaluation/180609 ; https://discuss.ai.google.dev/t/gemni-3-8-rpd-problem/190021 |
| Flash-Lite free RPD | about 500 (same forum post, does not say which Flash-Lite) | UNVERIFIED | same |
| gemini-3.6-flash, 3.1-flash-lite, embedding-2 RPM/RPD | unknown | UNVERIFIED | check AI Studio |
| gemini-embedding-2 dimensions | outputDimensionality 128-3072; recommended 768 / 1536 / 3072; truncated dims auto-normalised; max input 8,192 tokens | Verified | https://ai.google.dev/gemini-api/docs/embeddings |
| Asymmetric embeddings | No `task_type` param on embedding-2; use text prefixes: query `task: search result \| query: {x}`; document `title: {title} \| text: {x}` (`title: none` if absent) | Verified | same |
| thinkingLevel, gemini-3.8-flash | low, medium, high (default medium; no minimal) | Verified | https://ai.google.dev/gemini-api/docs/thinking |
| thinkingLevel, gemini-3.6-flash | minimal, low, medium, high (default medium) | Verified | same |
| thinkingLevel, gemini-3.5-flash-lite | minimal, low, medium, high (default minimal) | Verified | same |
| thinkingBudget still supported / thinking can be disabled | not stated on the page | UNVERIFIED | same |
| Free-tier data use | Prompts/outputs may be used to improve Google products (paid: no) | Verified | pricing page, per-model rows |
| Unrestricted API keys | Rejected from 2026-06-19; AI Studio keys are Gemini-restricted by default | Verified (Google notice on forum) | discuss.ai.google.dev thread above |

Contradictions with our docs:
- TRD section 1 says all models are free "as of Oct 2026". Price: yes. Throughput: 3.8 Flash may allow only about 20 requests/day/project, which breaks the chat default. See memory-systems.md section 6.
- TRD section 9 key pool "round-robin" only helps if keys belong to different Google Cloud projects.
- `thinkingLevel: 'low'` (chat) and `'medium'` (reflection) are valid on 3.8 Flash; `'minimal'` is not.
- memory-engine 6.1 prefixes are correct; for documents without a meaningful title, Google's form is `title: none | text: ...`. Using the memory type as the title is acceptable.

## MongoDB Atlas M0 (Free)

| Fact | Value | Status | Source |
|---|---|---|---|
| MongoDB version | 8.0 (cannot upgrade) | Verified | https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/ |
| Search + Vector Search indexes | Max 3 total of any type on Free (Flex 10). We plan 2 | Verified | https://www.mongodb.com/docs/vector-search/indexes/vector-search-type/ |
| Storage / connections / throughput | 0.5 GB / 500 connections / 100 ops per second | Verified | free-shared-limitations |
| Data transfer | 10 GB in + 10 GB out per rolling 7 days | Verified | same |
| Other | 32 MB in-memory sort; no `$where`/map-reduce; namespace <= 95 bytes; db name <= 38 bytes; auto-pause after 30 idle days; no Performance Advisor; no log download | Verified | same |
| Change streams | Supported; namespace filter limits (regex must begin with `^`, no `$in` on db ns) | Verified | same |
| Multi-document transactions | Expected (3-node replica set), not stated on the page | UNVERIFIED | test in `db:setup` |
| `$rankFusion` | Needs MongoDB 8.0+; serial sub-pipelines, no `$project`, no pagination; one secondary source says 8.0.x may need a support case | UNVERIFIED on M0 | https://www.mongodb.com/docs/vector-search/hybrid-search/hybrid-search-overview/ ; https://www.pinecone.io/compare/mongodb-atlas/ |
| `$scoreFusion`, `$rerank` | Need 8.3+; not available on M0's 8.0 | Verified (version rule) | hybrid-search-overview |
| Automated embedding (`autoEmbed`, Voyage) | Available on Free clusters; query limit 3 RPM / 2,000 TPM | Verified | https://www.mongodb.com/docs/vector-search/crud-embeddings/automated-embedding/models/ |
