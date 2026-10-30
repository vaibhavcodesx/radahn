# C4 write-path findings

- Atlas cosine vectorSearchScore is normalized as (1 + cosine) / 2. Reconciliation converts it back to cosine before applying the spec's 0.80 / 0.92 thresholds. Raw score remains available for recall traces/noise filtering.
- MongoDB Node driver serializes undefined values as null by default. A null slotKey satisfies an exists-based partial unique index; null expiresAt also fails the recall filter for absent/future expiry. New memory inserts omit absent optional fields. Source: https://www.mongodb.com/docs/drivers/node/current/data-formats/bson/undefined-values/
- Normalize Unicode before privacy scanning, including metadata. Otherwise NFKC can introduce a plaintext secret only after the scan has passed.
- Idempotent writes reserve one unique final event per owner/message/candidate hash inside the same transaction as the mutation. The old superseded event has no candidateHash, so both version events coexist. The partial index excludes events without message or candidate hashes.
- Recheck current targets in the transaction. A stale confirm may become an insertion; missing embeddings must be marked needsEmbedding for maintenance. Semantic and hinted supersedes both use the same earlier-validFrom history guard.

These are implementation correctness refinements; the prescribed model, dimensions, thresholds, and public required signatures remain unchanged. Optional contentHash/candidateHash/validFrom fields use the overnight pre-approval.
