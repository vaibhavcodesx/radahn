import { Fragment, type ReactNode } from "react";

/**
 * Tiny, safe markdown for assistant replies: paragraphs, bullet/numbered lists, **bold**,
 * *italic*, `code`, and [[mN]] citation tokens. No raw HTML is ever rendered (TRD §14).
 * Citations are resolved by the caller through the turn's recall picks only.
 */
export type CitationRenderer = (ref: string, key: string) => ReactNode;

const INLINE = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[\[m\d{1,2}\]\])/g;

export function renderInline(text: string, cite: CitationRenderer, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let i = 0;
  for (const piece of text.split(INLINE)) {
    const key = `${keyPrefix}-${i++}`;
    if (!piece) continue;
    if (piece.startsWith("[[m") && piece.endsWith("]]")) out.push(cite(piece.slice(2, -2), key));
    else if (piece.startsWith("**") && piece.endsWith("**")) out.push(<strong key={key} className="font-semibold text-ink">{piece.slice(2, -2)}</strong>);
    else if (piece.startsWith("`") && piece.endsWith("`")) out.push(<code key={key} className="rounded-[4px] bg-hover-2 px-1 font-mono text-[12px]">{piece.slice(1, -1)}</code>);
    else if (piece.startsWith("*") && piece.endsWith("*") && piece.length > 2) out.push(<em key={key}>{piece.slice(1, -1)}</em>);
    else out.push(<Fragment key={key}>{piece}</Fragment>);
  }
  return out;
}

export function Markdown({ text, cite }: { text: string; cite: CitationRenderer }) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r/g, "").split("\n");
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];
  let n = 0;

  const flushPara = () => {
    if (para.length) {
      const k = `p${n++}`;
      blocks.push(<p key={k}>{renderInline(para.join(" "), cite, k)}</p>);
      para = [];
    }
  };
  const flushList = () => {
    const l = list;
    if (l) {
      const k = `l${n++}`;
      const Tag = l.ordered ? "ol" : "ul";
      blocks.push(
        <Tag key={k} className={l.ordered ? "list-decimal pl-5" : "list-none pl-0"}>
          {l.items.map((it, j) => (
            <li key={j} className={l.ordered ? "pl-1" : "relative pl-4 before:absolute before:left-0 before:top-[0.62em] before:size-1.5 before:rounded-[1px] before:bg-ink-3"}>
              {renderInline(it, cite, `${k}-${j}`)}
            </li>
          ))}
        </Tag>,
      );
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const num = line.match(/^\s*\d+[.)]\s+(.*)$/);
    const heading = line.match(/^#{1,4}\s+(.*)$/);
    if (bullet || num) {
      flushPara();
      const ordered = Boolean(num);
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push((bullet ?? num)![1]);
    } else if (heading) {
      flushPara();
      flushList();
      const k = `h${n++}`;
      blocks.push(<p key={k} className="font-semibold text-ink">{renderInline(heading[1], cite, k)}</p>);
    } else if (!line.trim()) {
      flushPara();
      flushList();
    } else {
      flushList();
      para.push(line.trim());
    }
  }
  flushPara();
  flushList();
  return <div className="flex flex-col gap-3">{blocks}</div>;
}
