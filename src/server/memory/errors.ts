/** Route-compatible memory errors, memory-engine.md section 3. */
export class PinBudgetError extends Error {readonly code="PIN_BUDGET_EXCEEDED";constructor(){super("Consolidate pinned memories first (1500 character limit)");}}
