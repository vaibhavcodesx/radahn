/**
 * Word-level diff for the ghost answer (PRD F-14). LCS over word tokens; good enough for
 * replies of a few hundred words. Citations are stripped first so they don't count as changes.
 */
export type DiffOp = { op: "same" | "add" | "del"; text: string };

const tokenize = (s: string) => s.replace(/\s?\[\[m\d+\]\]/g, "").match(/\s+|[^\s]+/g) ?? [];

export function wordDiff(before: string, after: string): DiffOp[] {
  const a = tokenize(before);
  const b = tokenize(after);
  // Cap work for very long texts (O(n·m) table).
  if (a.length * b.length > 4_000_000) return [{ op: "del", text: before }, { op: "add", text: after }];
  const dp: Uint16Array[] = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: DiffOp[] = [];
  const push = (op: DiffOp["op"], text: string) => {
    const last = out.at(-1);
    if (last && last.op === op) last.text += text;
    else out.push({ op, text });
  };
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      push("same", a[i]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) push("del", a[i++]);
    else push("add", b[j++]);
  }
  while (i < a.length) push("del", a[i++]);
  while (j < b.length) push("add", b[j++]);
  return out;
}

/** Number of non-whitespace words that differ (shown as "23 words differ"). */
export function changedWords(ops: DiffOp[]): number {
  return ops.filter((o) => o.op !== "same").reduce((n, o) => n + (o.text.match(/[^\s]+/g)?.length ?? 0), 0);
}
