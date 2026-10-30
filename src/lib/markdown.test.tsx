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
    expect(out).toContain("&lt;img");
  });

  it("handles bold and code", () => {
    expect(html("**Now:** run `npm test`")).toContain("<strong");
    expect(html("**Now:** run `npm test`")).toContain("<code");
  });
});
