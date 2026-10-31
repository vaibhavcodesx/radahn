/** Citation helpers shared by server persistence and tests. Pure. */

export const CITATION_RE = /\[\[(m\d{1,2})\]\]/g;

/**
 * Models don't always follow the [[m2]] format: they write [m2], [[m2], [m4]] or [[m2, m4]].
 * Normalise every variant to back-to-back [[mN]] tokens before parsing or rendering.
 */
export function normalizeCitations(text: string): string {
  return text
    .replace(/\[\[?\s*(m\d{1,2}(?:\s*\]?\s*[,;]\s*\[?\s*m\d{1,2})*)\s*\]\]?/g, (_, inner: string) =>
      inner
        .split(/[,;]/)
        .map((r) => `[[${r.replace(/[\[\]\s]/g, "")}]]`)
        .join(""),
    );
}

/** Memory ids cited in `text`, resolved only through this turn's refs (never arbitrary ids). */
export function citedIds(text: string, refs: Record<string, string>): string[] {
  const out = new Set<string>();
  for (const m of normalizeCitations(text).matchAll(CITATION_RE)) {
    const id = refs[m[1]];
    if (id) out.add(id);
  }
  return [...out];
}

/** Old turns' refs mean nothing to a new turn: strip them from history before re-sending. */
export function stripCitations(text: string): string {
  return normalizeCitations(text).replace(CITATION_RE, "").replace(/[ \t]+\n/g, "\n").replace(/ {2,}/g, " ");
}
