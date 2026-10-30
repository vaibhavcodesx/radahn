/**
 * Memory type presentation table (design.md §4.1 "Whitney blocks").
 * Every swatch carries a glyph and a label so type is never conveyed by colour alone.
 * Client-safe: no server imports.
 */
export const MEMORY_TYPE_LIST = [
  "profile",
  "preference",
  "fact",
  "goal",
  "constraint",
  "decision",
  "outcome",
  "feedback",
  "strategy",
  "observation",
] as const;
export type MemoryTypeName = (typeof MEMORY_TYPE_LIST)[number];

export interface MemoryTypeMeta {
  label: string;
  glyph: string;
  /** CSS var holding the swatch colour (tokens only, never raw hex in components). */
  colorVar: string;
  /** Text colour that reads on the swatch. */
  onSwatch: "light" | "dark";
  blurb: string;
}

export const MEMORY_TYPE_META: Record<MemoryTypeName, MemoryTypeMeta> = {
  profile: { label: "Profile", glyph: "@", colorVar: "--t-profile", onSwatch: "dark", blurb: "Who you are" },
  preference: { label: "Preference", glyph: "+", colorVar: "--t-preference", onSwatch: "dark", blurb: "How you like things" },
  fact: { label: "Fact", glyph: "#", colorVar: "--t-fact", onSwatch: "light", blurb: "Things that are true" },
  goal: { label: "Goal", glyph: "^", colorVar: "--t-goal", onSwatch: "dark", blurb: "What you're working toward" },
  constraint: { label: "Constraint", glyph: "!", colorVar: "--t-constraint", onSwatch: "light", blurb: "Hard limits" },
  decision: { label: "Decision", glyph: "=", colorVar: "--t-decision", onSwatch: "light", blurb: "Choices you made" },
  outcome: { label: "Outcome", glyph: "~", colorVar: "--t-outcome", onSwatch: "light", blurb: "How things went" },
  feedback: { label: "Feedback", glyph: "<", colorVar: "--t-feedback", onSwatch: "dark", blurb: "What you told me about me" },
  strategy: { label: "Strategy", glyph: "%", colorVar: "--t-strategy", onSwatch: "light", blurb: "Behaviour I learned" },
  observation: { label: "Observation", glyph: "*", colorVar: "--t-observation", onSwatch: "dark", blurb: "Patterns I noticed" },
};

export function typeColor(type: MemoryTypeName): string {
  return `var(${MEMORY_TYPE_META[type].colorVar})`;
}

export function typeInk(type: MemoryTypeName): string {
  return MEMORY_TYPE_META[type].onSwatch === "dark" ? "var(--t-ink-dark)" : "var(--t-ink-light)";
}

export const STATUS_LABEL: Record<string, string> = {
  active: "ACTIVE",
  pending_review: "NEEDS REVIEW",
  superseded: "OUTDATED",
  expired: "EXPIRED",
  rejected: "REJECTED",
};
