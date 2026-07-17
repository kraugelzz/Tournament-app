import type { GameId } from "../types";

export const GAMES: { id: GameId; labelKey: string; icon: string }[] = [
  { id: "thai-chess", labelKey: "game.thai-chess", icon: "♟️" },
  { id: "chess", labelKey: "game.chess", icon: "♞" },
  { id: "go", labelKey: "game.go", icon: "⚫" },
  { id: "checkers", labelKey: "game.checkers", icon: "🔴" },
  { id: "crossword", labelKey: "game.crossword", icon: "🔤" },
  { id: "amath", labelKey: "game.amath", icon: "➕" },
  { id: "boardgame", labelKey: "game.boardgame", icon: "🎲" },
];

const IDS = new Set(GAMES.map((g) => g.id));

export function isGameId(x: string): x is GameId {
  return IDS.has(x as GameId);
}
