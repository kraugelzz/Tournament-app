import { describe, it, expect } from "vitest";
import { swissPair } from "../../src/lib/swiss";
import type { Player, Match, Scoring } from "../../src/types";

const scoring: Scoring = { win: 1, draw: 0.5, loss: 0 };
const mk = (n: number): Player[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}`, seed: i + 1 }));

describe("swissPair", () => {
  it("returns [] for fewer than 2 players", () => {
    expect(swissPair(mk(1), [], scoring)).toEqual([]);
  });

  it("round 1: pairs everyone, round number is 1, no repeats possible", () => {
    const p = swissPair(mk(4), [], scoring);
    expect(p).toHaveLength(2);
    expect(p.every((m) => m.round === 1)).toBe(true);
    const ids = p.flatMap((m) => [m.player1Id, m.player2Id]);
    expect(new Set(ids).size).toBe(4);
  });

  it("odd count: exactly one bye and round covers the rest", () => {
    const p = swissPair(mk(5), [], scoring);
    const byes = p.filter((m) => m.player2Id === null);
    expect(byes).toHaveLength(1);
    expect(p.filter((m) => m.player2Id !== null)).toHaveLength(2);
  });

  it("never repeats a pairing from prior rounds when an alternative exists", () => {
    const players = mk(4);
    // Round 1 already played: p1-p2, p3-p4
    const r1: Match[] = [
      { id: "a", round: 1, player1Id: "p1", player2Id: "p2", result: "p1win" },
      { id: "b", round: 1, player1Id: "p3", player2Id: "p4", result: "p1win" },
    ];
    const p = swissPair(players, r1, scoring);
    expect(p.every((m) => m.round === 2)).toBe(true);
    const keys = p.map((m) => [m.player1Id, m.player2Id].sort().join("-"));
    expect(keys).not.toContain("p1-p2");
    expect(keys).not.toContain("p3-p4");
  });

  it("does not give a second bye while a bye-free player remains", () => {
    const players = mk(3);
    // Round 1: p3 had a bye
    const r1: Match[] = [
      { id: "a", round: 1, player1Id: "p1", player2Id: "p2", result: "p1win" },
      { id: "b", round: 1, player1Id: "p3", player2Id: null, result: "p1win" },
    ];
    const p = swissPair(players, r1, scoring);
    const byePlayer = p.find((m) => m.player2Id === null)!.player1Id;
    expect(byePlayer).not.toBe("p3");
  });
});
