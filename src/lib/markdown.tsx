"use client";

import { Check, Copy } from "lucide-react";
import { memo, useState, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Assistant reply rendering: GitHub-flavoured markdown (headings, lists, fenced code, tables)
 * via react-markdown, which never renders raw HTML (TRD §14). `[[mN]]` citation tokens become
 * `#cite-mN` links and are resolved by the caller through the turn's recall picks only.
 */
export type CitationRenderer = (ref: string, key: string) => ReactNode;

const toLinks = (text: string) => text.replace(/\[\[(m\d{1,2})\]\]/g, "[$1](#cite-$1)");

function CodeBlock({ lang, code }: { lang?: string; code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="group/code relative my-1 overflow-hidden rounded-control border border-line bg-surface-2">
      <div className="flex h-8 items-center justify-between border-b border-line px-3">
        <span className="font-mono text-[11.5px] text-ink-3">{lang || "text"}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[12px] text-ink-3 hover:bg-hover hover:text-ink"
          aria-label="Copy code"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3 font-mono text-[13px] leading-[1.6] text-ink">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function components(cite: CitationRenderer): Components {
  let n = 0;
  return {
    a: ({ href, children }) => {
      const m = href?.match(/^#cite-(m\d{1,2})$/);
      if (m) return cite(m[1], `c${n++}`);
      return (
        <a href={href} target="_blank" rel="noreferrer noopener" className="text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
          {children}
        </a>
      );
    },
    p: ({ children }) => <p>{children}</p>,
    h1: ({ children }) => <h3 className="mt-2 text-[18px] font-semibold text-ink">{children}</h3>,
    h2: ({ children }) => <h3 className="mt-2 text-[17px] font-semibold text-ink">{children}</h3>,
    h3: ({ children }) => <h4 className="mt-1 text-[16px] font-semibold text-ink">{children}</h4>,
    h4: ({ children }) => <h4 className="text-[15.5px] font-semibold text-ink">{children}</h4>,
    strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
    ul: ({ children }) => <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-ink-3">{children}</ul>,
    ol: ({ children }) => <ol className="flex list-decimal flex-col gap-1.5 pl-5 marker:text-ink-3">{children}</ol>,
    li: ({ children }) => <li className="pl-1">{children}</li>,
    blockquote: ({ children }) => <blockquote className="border-l-2 border-line-strong pl-4 text-ink-2">{children}</blockquote>,
    hr: () => <hr className="border-line" />,
    pre: ({ children }) => <>{children}</>,
    code: ({ className, children }) => {
      const text = String(children ?? "");
      const lang = className?.match(/language-([\w+-]+)/)?.[1];
      // Fenced blocks carry a language class or span lines; everything else is inline code.
      if (lang || text.includes("\n")) return <CodeBlock lang={lang} code={text.replace(/\n$/, "")} />;
      return <code className="rounded-[4px] bg-hover-2 px-1.5 py-0.5 font-mono text-[0.88em] text-ink">{children}</code>;
    },
    table: ({ children }) => (
      <div className="my-1 overflow-x-auto rounded-control border border-line">
        <table className="w-full border-collapse text-left text-[14px]">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-surface-2 text-ink">{children}</thead>,
    th: ({ children }) => <th className="border-b border-line px-3 py-2 font-semibold">{children}</th>,
    td: ({ children }) => <td className="border-b border-line px-3 py-2 align-top">{children}</td>,
  };
}

export const Markdown = memo(function Markdown({ text, cite }: { text: string; cite: CitationRenderer }) {
  return (
    <div className="flex flex-col gap-3 [&_tr:last-child_td]:border-b-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components(cite)} skipHtml>
        {toLinks(text)}
      </ReactMarkdown>
    </div>
  );
});
