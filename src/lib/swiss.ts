import type { Player, Match, Scoring } from "../types";
import { computeStandings } from "./standings";

interface Pairing {
  round: number;
  player1Id: string;
  player2Id: string | null;
}

function metKey(a: string, b: string): string {
  return [a, b].sort().join("|");
}

export function swissPair(
  players: Player[],
  matches: Match[],
  scoring: Scoring
): Pairing[] {
  if (players.length < 2) return [];

  const nextRound = matches.reduce((mx, m) => Math.max(mx, m.round), 0) + 1;

  // Who has already played whom.
  const met = new Set<string>();
  const hadBye = new Set<string>();
  for (const m of matches) {
    if (m.player2Id === null) {
      hadBye.add(m.player1Id);
    } else {
      met.add(metKey(m.player1Id, m.player2Id));
    }
  }

  // Order players by current standings (best first).
  const standingOrder = computeStandings(players, matches, scoring).map((s) => s.playerId);
  let pool = standingOrder.slice();

  // Assign a bye to the lowest-standing bye-free player (or lowest overall).
  const pairings: Pairing[] = [];
  if (pool.length % 2 === 1) {
    let byeId = [...pool].reverse().find((id) => !hadBye.has(id)) ?? pool[pool.length - 1];
    pool = pool.filter((id) => id !== byeId);
    pairings.push({ round: nextRound, player1Id: byeId, player2Id: null });
  }

  // Greedy top-down pairing with single-slot backtracking to avoid repeats.
  const used = new Set<string>();
  const order = pool.slice();
  const pairUp = (): boolean => {
    const firstFree = order.find((id) => !used.has(id));
    if (firstFree === undefined) return true; // all paired
    for (let j = 0; j < order.length; j++) {
      const cand = order[j];
      if (cand === firstFree || used.has(cand)) continue;
      if (met.has(metKey(firstFree, cand))) continue;
      used.add(firstFree);
      used.add(cand);
      pairings.push({ round: nextRound, player1Id: firstFree, player2Id: cand });
      if (pairUp()) return true;
      // backtrack
      pairings.pop();
      used.delete(firstFree);
      used.delete(cand);
    }
    return false;
  };

  if (!pairUp()) {
    // Fallback: allow repeats if a perfect no-repeat matching is impossible.
    used.clear();
    while (pairings.length && pairings[pairings.length - 1].round === nextRound
           && pairings[pairings.length - 1].player2Id !== null) {
      pairings.pop();
    }
    const rest = order.slice();
    for (let i = 0; i + 1 < rest.length; i += 2) {
      pairings.push({ round: nextRound, player1Id: rest[i], player2Id: rest[i + 1] });
    }
  }

  return pairings;
}
