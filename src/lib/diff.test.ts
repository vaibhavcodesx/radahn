import { describe, expect, it } from "vitest";
import { changedWords, wordDiff } from "./diff";

describe("wordDiff", () => {
  it("marks added and removed words", () => {
    const ops = wordDiff("ship it by nine", "ship it by ten tonight");
    expect(ops.map((o) => o.op)).toEqual(["same", "del", "add"]);
    expect(ops.filter((o) => o.op === "add").map((o) => o.text.trim()).join(" ")).toBe("ten tonight");
  });

  it("ignores citation markers", () => {
    expect(changedWords(wordDiff("Deadline is 9 PM [[m1]].", "Deadline is 9 PM."))).toBe(0);
  });

  it("identical text has zero changes", () => {
    expect(changedWords(wordDiff("same words here", "same words here"))).toBe(0);
  });
});
