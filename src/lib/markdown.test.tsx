import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Markdown } from "./markdown";

const cite = (ref: string, key: string) => <span key={key} data-cite={ref} />;
const html = (t: string) => renderToStaticMarkup(<Markdown text={t} cite={cite} />);

describe("Markdown", () => {
  it("renders bullets with inline citations", () => {
    const out = html("- Ship by 9 PM [[m1]]\n- Keep it short");
    expect(out).toContain("<ul");
    expect(out).toContain('data-cite="m1"');
    expect(out.match(/<li/g)?.length).toBe(2);
  });

  it("never renders raw HTML from the model", () => {
    const out = html('<img src=x onerror="alert(1)"> hi');
    expect(out).not.toContain("<img");
    expect(out).not.toContain("onerror");
  });

  it("renders GFM tables and fenced code blocks", () => {
    const table = html(["| a | b |", "|---|---|", "| 1 | 2 |"].join("\n"));
    expect(table).toContain("<table");
    expect(table.match(/<td/g)?.length).toBe(2);
    const code = html(["```python", "x = [1]", "print(x)", "```"].join("\n"));
    expect(code).toContain("<pre");
    expect(code).toContain("python");
    expect(code).toContain("print(x)");
  });

  it("renders LaTeX in dollar and bracket delimiters", () => {
    const out = html(["Energy is $E = mc^2$ and", "", "\\[ \\int_0^1 x\\,dx = \\tfrac{1}{2} \\]"].join("\n"));
    expect(out).toContain("katex");
    expect(out).not.toContain("$E");
    expect(out).not.toContain("\\[");
  });

  it("handles bold and code", () => {
    expect(html("**Now:** run `npm test`")).toContain("<strong");
    expect(html("**Now:** run `npm test`")).toContain("<code");
  });
});
