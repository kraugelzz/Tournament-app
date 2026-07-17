import { describe, it, expect } from "vitest";
import { roundRobin } from "../../src/lib/roundRobin";
import type { Player } from "../../src/types";

const mk = (n: number): Player[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}`, seed: i + 1 }));

describe("roundRobin", () => {
  it("returns no matches for fewer than 2 players", () => {
    expect(roundRobin(mk(1))).toEqual([]);
    expect(roundRobin(mk(0))).toEqual([]);
  });

  it("even count: every pair meets exactly once", () => {
    const matches = roundRobin(mk(4));
    // C(4,2) = 6 pairings, no byes
    expect(matches).toHaveLength(6);
    expect(matches.some((m) => m.player2Id === null)).toBe(false);
    const pairKeys = matches.map((m) => [m.player1Id, m.player2Id].sort().join("-"));
    expect(new Set(pairKeys).size).toBe(6);
    // 4 players -> 3 rounds
    expect(new Set(matches.map((m) => m.round)).size).toBe(3);
  });

  it("odd count: each round has exactly one bye, every real pair meets once", () => {
    const matches = roundRobin(mk(3));
    const byes = matches.filter((m) => m.player2Id === null);
    // 3 players -> 3 rounds, one bye per round
    expect(new Set(matches.map((m) => m.round)).size).toBe(3);
    expect(byes).toHaveLength(3);
    const real = matches.filter((m) => m.player2Id !== null);
    const pairKeys = real.map((m) => [m.player1Id, m.player2Id].sort().join("-"));
    expect(new Set(pairKeys).size).toBe(3); // C(3,2)
  });
});
