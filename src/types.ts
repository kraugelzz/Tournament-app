export type GameId =
  | "thai-chess" | "chess" | "go" | "checkers" | "crossword" | "amath" | "boardgame";

export type Format = "free" | "round-robin" | "swiss" | "knockout";

export type MatchResult = "p1win" | "draw" | "p2win" | "pending";

export interface Scoring {
  win: number;
  draw: number;
  loss: number;
}

export interface Player {
  id: string;
  name: string;
  seed: number;
}

export interface Match {
  id: string;
  round: number;
  player1Id: string;
  player2Id: string | null; // null = bye
  result: MatchResult;
  rawScore1?: number;
  rawScore2?: number;
}

export interface Tournament {
  id: string;
  name: string;
  game: GameId;
  format: Format;
  scoring: Scoring;
  status: "active" | "finished";
}

export const DEFAULT_SCORING: Scoring = { win: 1, draw: 0.5, loss: 0 };
