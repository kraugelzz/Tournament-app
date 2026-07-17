import { describe, it, expect } from "vitest";
import { parsePlayers } from "../../src/lib/parsePlayers";

describe("parsePlayers", () => {
  it("splits on newlines and commas, trims, drops blanks", () => {
    const { names } = parsePlayers("Ann\n Bob ,\n\nCia,");
    expect(names).toEqual(["Ann", "Bob", "Cia"]);
  });
  it("reports case-insensitive duplicates once", () => {
    const { names, duplicates } = parsePlayers("Ann\nann\nBob");
    expect(names).toEqual(["Ann", "ann", "Bob"]);
    expect(duplicates).toEqual(["ann"]);
  });
  it("returns empty arrays for blank input", () => {
    expect(parsePlayers("   ")).toEqual({ names: [], duplicates: [] });
  });
});
