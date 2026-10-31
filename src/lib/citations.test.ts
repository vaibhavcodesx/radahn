import { describe, expect, it } from "vitest";
import { citedIds, normalizeCitations, stripCitations } from "./citations";

describe("citations", () => {
  it("normalises grouped and single-bracket variants", () => {
    expect(normalizeCitations("a [[m4], [m8]] b")).toBe("a [[m4]][[m8]] b");
    expect(normalizeCitations("a [m2] b")).toBe("a [[m2]] b");
    expect(normalizeCitations("a [[m2, m4]] b")).toBe("a [[m2]][[m4]] b");
    expect(normalizeCitations("a [[m3]] b")).toBe("a [[m3]] b");
  });

  it("resolves only refs from this turn", () => {
    expect(citedIds("x [[m1]] y [[m9]]", { m1: "id1" })).toEqual(["id1"]);
  });

  it("does not touch ordinary brackets", () => {
    expect(normalizeCitations("see [docs] and [m] and [[note]]")).toBe("see [docs] and [m] and [[note]]");
  });

  it("strips citations from history", () => {
    expect(stripCitations("Deadline 9 PM [[m1]].")).toBe("Deadline 9 PM .");
  });
});
