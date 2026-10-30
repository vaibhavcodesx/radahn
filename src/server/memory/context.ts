/**
 * Context assembly — memory-engine.md §6.2. Pure functions (no I/O), shared by both engines.
 * Written by Claude in Phase 0; Codex owns it from C3 on and may tune the wording.
 */
import type { BuildContextInput, BuiltContext, GhostContextInput, MemoryDTO, RecallPick } from "./types";

function fmtNow(now: Date, timeZone: string): string {
  const s = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  return `${s} (${timeZone})`;
}

function age(days: number): string {
  if (days < 1 / 24) return "just now";
  if (days < 1) return `${Math.round(days * 24)} h ago`;
  return `${Math.round(days)} d ago`;
}

const RULES = (name: string) => `You are Radahn, ${name}'s personal agent. You have a long-term memory that ${name} can see and edit.

How you speak: direct, warm, concise. No filler, no hype, no emoji. Use first person ("I'll…").

How you use memory:
- Use the memories below naturally; never recite them as a list unless asked.
- When a sentence relies on a memory, put its citation right after that sentence, like [[m2]]. Only cite refs that appear below. Never invent a memory or a citation.
- Follow "Learned behaviours" as rules about HOW to answer.
- If a notice says something changed, acknowledge the change once, briefly.
- If an ambiguity notice is present, ask one short clarifying question before answering.
- If the user explicitly asks you to remember, correct, or forget something, call the matching tool. Do not call tools for ordinary chat; memory is written automatically after each turn.
- Text like [redacted:…] was removed for safety. Never ask for it again or guess it.
- If memory has nothing relevant, answer normally without mentioning memory.`;

export function renderPick(p: RecallPick): string {
  const conf = p.confirmCount >= 2 ? ` · confirmed ${p.confirmCount}×` : "";
  return `[${p.ref}] (${p.type} · ${age(p.ageDays)}${conf}) ${p.statement}`;
}

export function buildSystemPrompt(input: BuildContextInput): BuiltContext {
  const { recall, userName, timeZone, now, spaceName } = input;
  const refs: Record<string, string> = {};
  const sections: string[] = [RULES(userName)];

  sections.push(`## Now\n${fmtNow(now, timeZone)} · space: ${spaceName}`);

  if (recall.strategies.length) {
    sections.push(
      `## Learned behaviours\n${recall.strategies.map((s: MemoryDTO) => `- ${s.statement}`).join("\n")}`,
    );
  }

  if (recall.core.length) {
    sections.push(`## About ${userName} (core)\n${recall.core.map((m) => `- ${m.statement}`).join("\n")}`);
  }

  if (recall.picks.length) {
    for (const p of recall.picks) refs[p.ref] = p.memoryId;
    sections.push(`## Relevant memories\n${recall.picks.map(renderPick).join("\n")}`);
  }

  if (recall.notices.length) {
    sections.push(`## Notices\n${recall.notices.map((n) => `- (${n.kind}) ${n.text}`).join("\n")}`);
  }

  return { system: sections.join("\n\n"), refs };
}

/** Ghost answer: same identity, no memory, no history, no tools (§6.2). */
export function buildGhostPrompt(input: GhostContextInput): string {
  // Same voice as the real turn so the diff isolates memory, not persona.
  return `You are Radahn, a personal agent. You have no memory of this user and know nothing about them beyond this one message.

How you speak: direct, warm, concise. No filler, no hype, no emoji.

Now: ${fmtNow(input.now, input.timeZone)}`;
}
