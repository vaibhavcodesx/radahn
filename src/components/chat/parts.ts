import type { RadahnDataParts, RadahnUIMessage } from "@/lib/chat-types";

/** Typed accessors over a message's data parts (last write wins for a given part id). */
export function dataPart<K extends keyof RadahnDataParts>(m: RadahnUIMessage, name: K): RadahnDataParts[K] | undefined {
  let out: RadahnDataParts[K] | undefined;
  for (const p of m.parts) if (p.type === `data-${name}`) out = (p as unknown as { data: RadahnDataParts[K] }).data;
  return out;
}

export function dataParts<K extends keyof RadahnDataParts>(m: RadahnUIMessage, name: K): RadahnDataParts[K][] {
  return m.parts.filter((p) => p.type === `data-${name}`).map((p) => (p as unknown as { data: RadahnDataParts[K] }).data);
}

export function messageText(m: RadahnUIMessage): string {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}
