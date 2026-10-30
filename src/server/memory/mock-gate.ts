/**
 * Minimal pre-scan used by the MOCK engine only (memory-engine.md §4.1 subset).
 * Codex's real gate (C2) replaces this with the full detector set + entropy + Luhn.
 */
import type { PreScanResult, SecretKind } from "./types";

const PATTERNS: Array<[SecretKind, RegExp]> = [
  ["private_key", /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g],
  ["mongodb_uri", /mongodb(?:\+srv)?:\/\/[^:\s/]+:[^@\s]+@\S+/g],
  ["google_api_key", /AIza[0-9A-Za-z_-]{35}/g],
  ["openai_key", /sk-[A-Za-z0-9_-]{20,}/g],
  ["github_token", /gh[pousr]_[A-Za-z0-9]{36,}/g],
  ["aws_key", /AKIA[0-9A-Z]{16}/g],
  ["jwt", /eyJ[\w-]+\.[\w-]+\.[\w-]+/g],
  ["password", /\b(password|passwd|pwd)\s*(?:is|=|:)\s*\S+/gi],
  ["otp", /\b(otp|one[- ]time (?:code|password))\s*(?:is|=|:)?\s*\d{4,8}\b/gi],
  ["pan", /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g],
  ["aadhaar", /\b\d{4}\s?\d{4}\s?\d{4}\b/g],
];

const INJECTION = /ignore (all|previous|prior) instructions|you are now|system prompt|disregard (the|all|previous)/i;

export function mockPreScan(text: string): PreScanResult {
  const kinds = new Set<SecretKind>();
  let redacted = text;
  for (const [kind, re] of PATTERNS) {
    redacted = redacted.replace(re, () => {
      kinds.add(kind);
      return `[redacted:${kind}]`;
    });
  }
  return { redacted, kinds: [...kinds], injection: INJECTION.test(text) };
}
