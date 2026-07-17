import type { Player } from "../types";

interface Pairing {
  round: number;
  player1Id: string;
  player2Id: string | null;
}

export function roundRobin(players: Player[]): Pairing[] {
  if (players.length < 2) return [];

  // Circle method. Add a phantom "bye" slot when the count is odd.
  const ids: (string | null)[] = players.map((p) => p.id);
  if (ids.length % 2 === 1) ids.push(null);

  const n = ids.length;
  const rounds = n - 1;
  const half = n / 2;
  const result: Pairing[] = [];

  // Fixed first element; rotate the rest.
  const arr = [...ids];
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < half; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a === null || b === null) {
        const realId = (a ?? b) as string;
        result.push({ round: r + 1, player1Id: realId, player2Id: null });
      } else {
        result.push({ round: r + 1, player1Id: a, player2Id: b });
      }
    }
    // Rotate: keep index 0 fixed, move last into index 1.
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop()!);
    arr.splice(0, arr.length, fixed, ...rest);
  }
  return result;
}
