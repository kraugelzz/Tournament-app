import type { Player, Match } from "../types";

interface Seeded {
  round: number;
  slot: number;
  bracket: "main" | "third";
  player1Id: string | null;
  player2Id: string | null;
  result: "pending" | "p1win";
}

// Standard seed order for a bracket of `size` (power of two): returns an array
// of seed indices (1-based) laid out so that adjacent pairs are (best vs worst)
// and the top two seeds are in opposite halves.
function seedOrder(size: number): number[] {
  let rounds = [1, 2];
  while (rounds.length < size) {
    const n = rounds.length * 2;
    const next: number[] = [];
    for (const s of rounds) {
      next.push(s);
      next.push(n + 1 - s);
    }
    rounds = next;
  }
  return rounds;
}

function decided(m: Match): boolean {
  return m.result === "p1win" || m.result === "p2win";
}

function winnerOf(m: Match): string | null {
  if (m.result === "p1win") return m.player1Id;
  if (m.result === "p2win") return m.player2Id;
  return null;
}

export function knockoutBracket(players: Player[]): Seeded[] {
  if (players.length < 2) return [];
  const ordered = [...players].sort((a, b) => a.seed - b.seed);
  let size = 1;
  while (size < ordered.length) size *= 2;

  // seed number -> player id (or null when that seed slot is empty = bye)
  const bySeed: (string | null)[] = [];
  for (let i = 0; i < size; i++) bySeed[i] = i < ordered.length ? ordered[i].id : null;

  const order = seedOrder(size); // length = size, values 1..size
  const out: Seeded[] = [];
  for (let slot = 0; slot < size / 2; slot++) {
    const seedA = order[slot * 2] - 1;
    const seedB = order[slot * 2 + 1] - 1;
    const a = bySeed[seedA];
    const b = bySeed[seedB];
    if (a !== null && b === null) {
      out.push({ round: 1, slot, bracket: "main", player1Id: a, player2Id: null, result: "p1win" });
    } else if (a === null && b !== null) {
      out.push({ round: 1, slot, bracket: "main", player1Id: b, player2Id: null, result: "p1win" });
    } else {
      out.push({ round: 1, slot, bracket: "main", player1Id: a, player2Id: b, result: "pending" });
    }
  }
  return out;
}

export function advanceKnockout(
  _players: Player[],
  matches: Match[]
): { round: number; slot: number; bracket: "main" | "third"; player1Id: string | null; player2Id: string | null; result: "pending" }[] {
  const main = matches.filter((m) => (m.bracket ?? "main") === "main");
  if (main.length === 0) return [];

  const exists = (round: number, slot: number, bracket: "main" | "third") =>
    matches.some((m) => m.round === round && (m.slot ?? 0) === slot && (m.bracket ?? "main") === bracket);

  const maxRound = main.reduce((mx, m) => Math.max(mx, m.round), 1);
  const out: { round: number; slot: number; bracket: "main" | "third"; player1Id: string | null; player2Id: string | null; result: "pending" }[] = [];

  // Advance main bracket round by round.
  for (let r = 1; r <= maxRound; r++) {
    const thisRound = main.filter((m) => m.round === r).sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));
    if (thisRound.length <= 1) break; // final already exists at this round
    if (!thisRound.every(decided)) continue; // wait for round to finish
    const nextRound = r + 1;
    const nextSlots = thisRound.length / 2;
    for (let slot = 0; slot < nextSlots; slot++) {
      if (exists(nextRound, slot, "main")) continue;
      const a = winnerOf(thisRound[slot * 2]);
      const b = winnerOf(thisRound[slot * 2 + 1]);
      out.push({ round: nextRound, slot, bracket: "main", player1Id: a, player2Id: b, result: "pending" });
    }
  }

  // Third-place match: the two losers of the semifinals (the round with exactly 2 matches).
  const semis = main.filter((m) => {
    const sameRound = main.filter((x) => x.round === m.round);
    return sameRound.length === 2;
  });
  if (semis.length === 2 && semis.every(decided) && !exists(semis[0].round + 1, 0, "third")) {
    const loser = (m: Match) => (m.result === "p1win" ? m.player2Id : m.player1Id);
    const l1 = loser(semis[0]);
    const l2 = loser(semis[1]);
    if (l1 && l2) {
      out.push({ round: semis[0].round + 1, slot: 0, bracket: "third", player1Id: l1, player2Id: l2, result: "pending" });
    }
  }

  return out;
}
