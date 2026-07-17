import type { Player, Match, Scoring } from "../types";

export interface Standing {
  playerId: string;
  name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  rawFor: number;
  rank: number;
}

export function computeStandings(
  players: Player[],
  matches: Match[],
  scoring: Scoring
): Standing[] {
  const table = new Map<string, Standing>();
  for (const p of players) {
    table.set(p.id, {
      playerId: p.id, name: p.name, played: 0,
      wins: 0, draws: 0, losses: 0, points: 0, rawFor: 0, rank: 0,
    });
  }

  const applyRaw = (s: Standing | undefined, raw?: number) => {
    if (s && typeof raw === "number") s.rawFor += raw;
  };

  for (const match of matches) {
    if (match.result === "pending") continue;
    const p1 = table.get(match.player1Id);
    const p2 = match.player2Id ? table.get(match.player2Id) : undefined;
    applyRaw(p1, match.rawScore1);
    applyRaw(p2, match.rawScore2);

    // Bye: opponent is null. Winner gets win points, no "played" increment.
    if (match.player2Id === null) {
      if (p1 && match.result === "p1win") {
        p1.wins += 1;
        p1.points += scoring.win;
      }
      continue;
    }

    if (p1) p1.played += 1;
    if (p2) p2.played += 1;

    if (match.result === "p1win") {
      if (p1) { p1.wins += 1; p1.points += scoring.win; }
      if (p2) { p2.losses += 1; p2.points += scoring.loss; }
    } else if (match.result === "p2win") {
      if (p2) { p2.wins += 1; p2.points += scoring.win; }
      if (p1) { p1.losses += 1; p1.points += scoring.loss; }
    } else if (match.result === "draw") {
      if (p1) { p1.draws += 1; p1.points += scoring.draw; }
      if (p2) { p2.draws += 1; p2.points += scoring.draw; }
    }
  }

  const headToHead = (aId: string, bId: string): number => {
    // Positive => a ranks above b.
    let score = 0;
    for (const match of matches) {
      if (match.result === "pending" || match.player2Id === null) continue;
      const isAB = match.player1Id === aId && match.player2Id === bId;
      const isBA = match.player1Id === bId && match.player2Id === aId;
      if (!isAB && !isBA) continue;
      if (match.result === "draw") continue;
      const aWon = (isAB && match.result === "p1win") || (isBA && match.result === "p2win");
      score += aWon ? 1 : -1;
    }
    return score;
  };

  const list = [...table.values()];

  const cmp = (a: Standing, b: Standing): number => {
    if (b.points !== a.points) return b.points - a.points;
    const h2h = headToHead(a.playerId, b.playerId);
    if (h2h !== 0) return -h2h; // a above b when h2h positive
    if (b.rawFor !== a.rawFor) return b.rawFor - a.rawFor;
    return 0;
  };

  list.sort(cmp);

  // Assign ranks; equal (cmp === 0) players share a rank.
  let rank = 0;
  for (let i = 0; i < list.length; i++) {
    if (i === 0 || cmp(list[i - 1], list[i]) !== 0) rank = i + 1;
    list[i].rank = rank;
  }
  return list;
}
