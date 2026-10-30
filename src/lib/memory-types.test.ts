import { describe, expect, it } from "vitest";
import { MEMORY_TYPES } from "@/server/memory/types";
import { MEMORY_TYPE_LIST, MEMORY_TYPE_META } from "./memory-types";

describe("memory type meta", () => {
  it("covers exactly the contract's ten types", () => {
    expect([...MEMORY_TYPE_LIST]).toEqual([...MEMORY_TYPES]);
  });

  it("gives every type a distinct glyph and colour", () => {
    const metas = Object.values(MEMORY_TYPE_META);
    expect(new Set(metas.map((m) => m.glyph)).size).toBe(10);
    expect(new Set(metas.map((m) => m.colorVar)).size).toBe(10);
  });

  it("pins the spec's glyphs", () => {
    expect(MEMORY_TYPE_META.fact.glyph).toBe("#");
    expect(MEMORY_TYPE_META.constraint.glyph).toBe("!");
    expect(MEMORY_TYPE_META.strategy.glyph).toBe("%");
  });
});
