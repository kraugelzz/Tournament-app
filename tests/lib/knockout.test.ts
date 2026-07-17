import { describe, it, expect } from "vitest";
import { knockoutBracket, advanceKnockout } from "../../src/lib/knockout";
import type { Player, Match } from "../../src/types";

const mk = (n: number): Player[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}`, seed: i + 1 }));

describe("knockoutBracket", () => {
  it("returns [] for fewer than 2 players", () => {
    expect(knockoutBracket(mk(1))).toEqual([]);
  });

  it("power-of-two field: round 1 pairs all, seed 1 meets lowest seed", () => {
    const r1 = knockoutBracket(mk(4));
    expect(r1).toHaveLength(2);
    expect(r1.every((m) => m.round === 1 && m.bracket === "main")).toBe(true);
    const slot0 = r1.find((m) => m.slot === 0)!;
    expect(new Set([slot0.player1Id, slot0.player2Id])).toEqual(new Set(["p1", "p4"]));
  });

  it("non-power-of-two: top seeds get byes auto-advanced", () => {
    const r1 = knockoutBracket(mk(6)); // bracket size 8, 2 byes to seeds 1 and 2
    const byes = r1.filter((m) => m.player2Id === null);
    expect(byes).toHaveLength(2);
    expect(byes.every((m) => m.result === "p1win")).toBe(true);
    expect(new Set(byes.map((m) => m.player1Id))).toEqual(new Set(["p1", "p2"]));
  });

  it("advanceKnockout creates the final once both semifinals are decided", () => {
    const players = mk(4);
    const r1 = knockoutBracket(players).map((m, i) => ({
      ...m, id: `r1-${i}`,
    })) as unknown as Match[];
    // decide both semis: slot0 winner p1, slot1 winner p2
    const decided = r1.map((m) =>
      m.slot === 0 ? { ...m, result: "p1win" as const } : { ...m, result: "p1win" as const }
    );
    const next = advanceKnockout(players, decided);
    const final = next.find((m) => m.round === 2 && m.bracket === "main");
    expect(final).toBeTruthy();
    expect(final!.player1Id).not.toBeNull();
    expect(final!.player2Id).not.toBeNull();
  });

  it("advanceKnockout is idempotent (no duplicate next matches)", () => {
    const players = mk(4);
    const r1 = knockoutBracket(players).map((m, i) => ({ ...m, id: `r1-${i}`, result: "p1win" as const })) as unknown as Match[];
    const first = advanceKnockout(players, r1);
    const combined = [...r1, ...first.map((m, i) => ({ ...m, id: `r2-${i}` }))] as Match[];
    expect(advanceKnockout(players, combined)).toHaveLength(0);
  });
});
