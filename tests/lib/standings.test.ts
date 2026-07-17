import { describe, it, expect } from "vitest";
import { computeStandings } from "../../src/lib/standings";
import type { Player, Match, Scoring } from "../../src/types";

const scoring: Scoring = { win: 1, draw: 0.5, loss: 0 };
const players: Player[] = [
  { id: "a", name: "A", seed: 1 },
  { id: "b", name: "B", seed: 2 },
  { id: "c", name: "C", seed: 3 },
];

function m(p: Partial<Match>): Match {
  return { id: "x", round: 1, player1Id: "a", player2Id: "b", result: "pending", ...p };
}

describe("computeStandings", () => {
  it("counts wins, draws, losses and points", () => {
    const matches: Match[] = [
      m({ id: "1", player1Id: "a", player2Id: "b", result: "p1win" }),
      m({ id: "2", player1Id: "a", player2Id: "c", result: "draw" }),
    ];
    const s = computeStandings(players, matches, scoring);
    const a = s.find((x) => x.playerId === "a")!;
    expect(a).toMatchObject({ played: 2, wins: 1, draws: 1, losses: 0, points: 1.5 });
    expect(a.rank).toBe(1);
  });

  it("ignores pending matches", () => {
    const s = computeStandings(players, [m({ result: "pending" })], scoring);
    expect(s.every((x) => x.played === 0 && x.points === 0)).toBe(true);
  });

  it("counts a bye as a win worth win-points but not a played game", () => {
    const matches: Match[] = [m({ id: "1", player1Id: "a", player2Id: null, result: "p1win" })];
    const a = computeStandings(players, matches, scoring).find((x) => x.playerId === "a")!;
    expect(a).toMatchObject({ played: 0, wins: 1, points: 1 });
  });

  it("breaks a two-way tie by head-to-head", () => {
    // A and B both 1 point; A beat B directly -> A ranked above B.
    const matches: Match[] = [
      m({ id: "1", player1Id: "a", player2Id: "b", result: "p1win" }),
      m({ id: "2", player1Id: "b", player2Id: "c", result: "p1win" }),
      m({ id: "3", player1Id: "a", player2Id: "c", result: "p2win" }),
    ];
    const s = computeStandings(players, matches, scoring);
    const a = s.find((x) => x.playerId === "a")!;
    const b = s.find((x) => x.playerId === "b")!;
    expect(a.points).toBe(b.points);
    expect(a.rank).toBeLessThan(b.rank);
  });

  it("assigns equal rank when fully tied", () => {
    const s = computeStandings(players, [], scoring);
    expect(s.every((x) => x.rank === 1)).toBe(true);
  });
});
