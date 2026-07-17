import { describe, it, expect } from "vitest";
import { GAMES, isGameId } from "../../src/lib/games";

describe("games catalog", () => {
  it("lists all 7 game categories in order", () => {
    expect(GAMES.map((g) => g.id)).toEqual([
      "thai-chess", "chess", "go", "checkers", "crossword", "amath", "boardgame",
    ]);
  });
  it("validates game ids", () => {
    expect(isGameId("amath")).toBe(true);
    expect(isGameId("nope")).toBe(false);
  });
});
