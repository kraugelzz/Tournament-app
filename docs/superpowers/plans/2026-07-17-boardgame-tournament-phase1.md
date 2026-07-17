# Boardgame Tournament — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working web app to run board-game tournaments across 7 game categories, with free-form and round-robin pairing, live standings, PIN-protected referee editing, and Thai/English UI.

**Architecture:** React (Vite + TypeScript) single-page app talking directly to Cloud Firestore. All pairing and standings logic lives in pure functions under `src/lib/` (unit-tested with Vitest). UI reads Firestore via realtime `onSnapshot` listeners; writes go through a thin data layer that attaches the referee PIN hash. Standings are computed on the client from match records — never stored.

**Tech Stack:** React 18, Vite 5, TypeScript 5, React Router 6, Firebase JS SDK 10 (Firestore), react-i18next, Vitest.

## Global Constraints

- Game categories (exact `game` id → label): `thai-chess` หมากรุกไทย, `chess` หมากรุกสากล, `go` หมากล้อม, `checkers` หมากฮอส, `crossword` ครอสเวิร์ด, `amath` เอแมท, `boardgame` บอร์ดเกม.
- Players per tournament: **1–50** (validate on create).
- Default scoring: win `1`, draw `0.5`, loss `0` — editable per tournament.
- Match result values: `"p1win" | "draw" | "p2win" | "pending"`. `player2Id` may be `null` (bye).
- Standings are **computed on the client**, never persisted.
- PIN stored only as SHA-256 hash (`pinHash`); referee state kept in `sessionStorage`.
- All user-facing strings go through i18n (`th` / `en`); Thai is the default language.
- Phase 1 implements `format` values `"free"` and `"round-robin"` only. The `"swiss"` and `"knockout"` values exist in types but their pairing UI is Phase 2.
- Standings tiebreak order: (1) total points, (2) head-to-head when exactly two players tie and have met, (3) total raw score (unfilled matches count 0), (4) tied rank.

---

## File Structure

```
boardgame-tournament/
  index.html
  package.json, tsconfig.json, vite.config.ts, vitest.config.ts
  .env.local                         # Firebase config (gitignored)
  firestore.rules
  src/
    main.tsx                         # app entry + router
    App.tsx                          # layout shell (lang toggle, nav)
    firebase.ts                      # Firestore init
    types.ts                         # shared domain types
    lib/
      games.ts                       # GAME list + helpers
      pin.ts                         # sha256 hash + verify
      roundRobin.ts                  # circle-method pairing
      standings.ts                   # computeStandings
      parsePlayers.ts                # split pasted names
    data/
      tournaments.ts                 # Firestore CRUD + listeners
    i18n/
      index.ts                       # react-i18next setup
      th.json, en.json
    hooks/
      useRefereeMode.ts              # PIN session state
    components/
      LangToggle.tsx
      StandingsTable.tsx
      MatchList.tsx
      RefereeGate.tsx
    pages/
      Home.tsx
      GameList.tsx
      NewTournament.tsx
      Tournament.tsx
  tests/
    lib/roundRobin.test.ts
    lib/standings.test.ts
    lib/parsePlayers.test.ts
    lib/pin.test.ts
```

---

### Task 1: Project scaffold + tooling

**Files:**
- Create: `package.json`, `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `.gitignore`

**Interfaces:**
- Produces: a runnable Vite dev server and a passing `npm test` command.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "boardgame-tournament",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "firebase": "^10.12.0",
    "i18next": "^23.11.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-i18next": "^14.1.0",
    "react-router-dom": "^6.23.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.4.0",
    "vite": "^5.2.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules
dist
.env.local
*.log
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "types": ["vitest/globals"]
  },
  "include": ["src", "tests"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 4: Create `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 5: Create `vite.config.ts`**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({ plugins: [react()] });
```

- [ ] **Step 6: Create `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { globals: true, environment: "node" },
});
```

- [ ] **Step 7: Create `index.html`**

```html
<!doctype html>
<html lang="th">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Boardgame Tournament</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Create minimal `src/App.tsx`**

```tsx
export default function App() {
  return <div>Boardgame Tournament</div>;
}
```

- [ ] **Step 9: Create `src/main.tsx`**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 10: Install and verify**

Run: `npm install && npm test`
Expected: install succeeds; `vitest run` reports "No test files found" (exit 0) — acceptable at this stage.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold vite + react + typescript + vitest"
```

---

### Task 2: Domain types + game catalog

**Files:**
- Create: `src/types.ts`, `src/lib/games.ts`
- Test: `tests/lib/games.test.ts`

**Interfaces:**
- Produces:
  - `type GameId = "thai-chess" | "chess" | "go" | "checkers" | "crossword" | "amath" | "boardgame"`
  - `type Format = "free" | "round-robin" | "swiss" | "knockout"`
  - `type MatchResult = "p1win" | "draw" | "p2win" | "pending"`
  - `interface Scoring { win: number; draw: number; loss: number }`
  - `interface Player { id: string; name: string; seed: number }`
  - `interface Match { id: string; round: number; player1Id: string; player2Id: string | null; result: MatchResult; rawScore1?: number; rawScore2?: number }`
  - `interface Tournament { id: string; name: string; game: GameId; format: Format; scoring: Scoring; status: "active" | "finished" }`
  - `GAMES: { id: GameId; labelKey: string; icon: string }[]` and `isGameId(x: string): x is GameId`

- [ ] **Step 1: Write the failing test**

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/games.test.ts`
Expected: FAIL — cannot find module `games`.

- [ ] **Step 3: Create `src/types.ts`**

```typescript
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
```

- [ ] **Step 4: Create `src/lib/games.ts`**

```typescript
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/lib/games.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/lib/games.ts tests/lib/games.test.ts
git commit -m "feat: domain types and game catalog"
```

---

### Task 3: Player-list parsing

**Files:**
- Create: `src/lib/parsePlayers.ts`
- Test: `tests/lib/parsePlayers.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `parsePlayers(raw: string): { names: string[]; duplicates: string[] }` — splits on newlines/commas, trims, drops empties, preserves order, reports case-insensitive duplicates (original casing kept).

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { parsePlayers } from "../../src/lib/parsePlayers";

describe("parsePlayers", () => {
  it("splits on newlines and commas, trims, drops blanks", () => {
    const { names } = parsePlayers("Ann\n Bob ,\n\nCia,");
    expect(names).toEqual(["Ann", "Bob", "Cia"]);
  });
  it("reports case-insensitive duplicates once", () => {
    const { names, duplicates } = parsePlayers("Ann\nann\nBob");
    expect(names).toEqual(["Ann", "ann", "Bob"]);
    expect(duplicates).toEqual(["ann"]);
  });
  it("returns empty arrays for blank input", () => {
    expect(parsePlayers("   ")).toEqual({ names: [], duplicates: [] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/parsePlayers.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Create `src/lib/parsePlayers.ts`**

```typescript
export function parsePlayers(raw: string): { names: string[]; duplicates: string[] } {
  const names = raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const name of names) {
    const key = name.toLowerCase();
    if (seen.has(key)) duplicates.push(name);
    else seen.add(key);
  }
  return { names, duplicates };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/parsePlayers.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/parsePlayers.ts tests/lib/parsePlayers.test.ts
git commit -m "feat: parse pasted player lists"
```

---

### Task 4: PIN hashing

**Files:**
- Create: `src/lib/pin.ts`
- Test: `tests/lib/pin.test.ts`

**Interfaces:**
- Consumes: Web Crypto (`crypto.subtle`), available in browsers and Node 18+.
- Produces:
  - `hashPin(pin: string): Promise<string>` — lowercase hex SHA-256.
  - `verifyPin(pin: string, pinHash: string): Promise<boolean>`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { hashPin, verifyPin } from "../../src/lib/pin";

describe("pin", () => {
  it("hashes deterministically to sha-256 hex", async () => {
    // Known SHA-256 of "1234"
    expect(await hashPin("1234")).toBe(
      "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4"
    );
  });
  it("verifies correct and rejects wrong pin", async () => {
    const h = await hashPin("secret");
    expect(await verifyPin("secret", h)).toBe(true);
    expect(await verifyPin("nope", h)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/pin.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Create `src/lib/pin.ts`**

```typescript
export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyPin(pin: string, pinHash: string): Promise<boolean> {
  return (await hashPin(pin)) === pinHash;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/pin.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/pin.ts tests/lib/pin.test.ts
git commit -m "feat: sha-256 pin hashing"
```

---

### Task 5: Round-robin pairing

**Files:**
- Create: `src/lib/roundRobin.ts`
- Test: `tests/lib/roundRobin.test.ts`

**Interfaces:**
- Consumes: `Player` from `../types`.
- Produces: `roundRobin(players: Player[]): { round: number; player1Id: string; player2Id: string | null }[]` — every pair meets once via the circle method; with an odd count, one player per round gets a bye (`player2Id: null`). `round` is 1-indexed. Returns `[]` for fewer than 2 players.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { roundRobin } from "../../src/lib/roundRobin";
import type { Player } from "../../src/types";

const mk = (n: number): Player[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}`, seed: i + 1 }));

describe("roundRobin", () => {
  it("returns no matches for fewer than 2 players", () => {
    expect(roundRobin(mk(1))).toEqual([]);
    expect(roundRobin(mk(0))).toEqual([]);
  });

  it("even count: every pair meets exactly once", () => {
    const matches = roundRobin(mk(4));
    // C(4,2) = 6 pairings, no byes
    expect(matches).toHaveLength(6);
    expect(matches.some((m) => m.player2Id === null)).toBe(false);
    const pairKeys = matches.map((m) => [m.player1Id, m.player2Id].sort().join("-"));
    expect(new Set(pairKeys).size).toBe(6);
    // 4 players -> 3 rounds
    expect(new Set(matches.map((m) => m.round)).size).toBe(3);
  });

  it("odd count: each round has exactly one bye, every real pair meets once", () => {
    const matches = roundRobin(mk(3));
    const byes = matches.filter((m) => m.player2Id === null);
    // 3 players -> 3 rounds, one bye per round
    expect(new Set(matches.map((m) => m.round)).size).toBe(3);
    expect(byes).toHaveLength(3);
    const real = matches.filter((m) => m.player2Id !== null);
    const pairKeys = real.map((m) => [m.player1Id, m.player2Id].sort().join("-"));
    expect(new Set(pairKeys).size).toBe(3); // C(3,2)
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/roundRobin.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Create `src/lib/roundRobin.ts`**

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/roundRobin.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/roundRobin.ts tests/lib/roundRobin.test.ts
git commit -m "feat: round-robin pairing via circle method"
```

---

### Task 6: Standings computation

**Files:**
- Create: `src/lib/standings.ts`
- Test: `tests/lib/standings.test.ts`

**Interfaces:**
- Consumes: `Player`, `Match`, `Scoring` from `../types`.
- Produces:
  - `interface Standing { playerId: string; name: string; played: number; wins: number; draws: number; losses: number; points: number; rawFor: number; rank: number }`
  - `computeStandings(players: Player[], matches: Match[], scoring: Scoring): Standing[]` — sorted best-first. Byes (`player2Id === null`) with `result: "p1win"` count as a win worth `scoring.win` but do **not** increment `played`. `pending` matches are ignored. Tiebreak order per Global Constraints. Equal players after all tiebreaks share the same `rank`.

- [ ] **Step 1: Write the failing test**

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/standings.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Create `src/lib/standings.ts`**

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/standings.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS — all lib tests green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/standings.ts tests/lib/standings.test.ts
git commit -m "feat: compute standings with tiebreakers"
```

---

### Task 7: Firebase init + Firestore rules

**Files:**
- Create: `src/firebase.ts`, `.env.local` (values filled by user), `.env.example`, `firestore.rules`

**Interfaces:**
- Produces: `db` (Firestore instance with offline persistence) exported from `src/firebase.ts`.

- [ ] **Step 1: Create `.env.example`**

```
VITE_FB_API_KEY=
VITE_FB_AUTH_DOMAIN=
VITE_FB_PROJECT_ID=
VITE_FB_STORAGE_BUCKET=
VITE_FB_MESSAGING_SENDER_ID=
VITE_FB_APP_ID=
```

- [ ] **Step 2: Create `src/firebase.ts`**

```typescript
import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const app = initializeApp({
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
});

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
```

- [ ] **Step 3: Create `firestore.rules`**

Writes to a tournament's subcollections require the request payload to carry `_pinHash` matching the parent tournament's stored `pinHash`. Creating a tournament is open (anyone can start one); editing/deleting requires the PIN.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function parentPin(tid) {
      return get(/databases/$(database)/documents/tournaments/$(tid)).data.pinHash;
    }
    function hasPin(tid) {
      return request.resource.data._pinHash == parentPin(tid);
    }

    match /tournaments/{tid} {
      allow read: if true;
      allow create: if request.resource.data.pinHash is string;
      allow update, delete: if request.resource.data._pinHash == resource.data.pinHash
                             || request.resource.data.get('_pinHash', '') == resource.data.pinHash;

      match /players/{pid} {
        allow read: if true;
        allow write: if hasPin(tid);
      }
      match /matches/{mid} {
        allow read: if true;
        allow write: if hasPin(tid);
      }
    }
  }
}
```

> Note: `_pinHash` is stripped from documents before they are used by the UI; it exists only to satisfy the rule check. Standings/reads never rely on it.

- [ ] **Step 4: Create a local `.env.local`**

Copy `.env.example` to `.env.local`. Leave a note for the user to paste their Firebase web config. Tests do not import `firebase.ts`, so an empty config does not break `npm test`.

- [ ] **Step 5: Commit**

```bash
git add src/firebase.ts .env.example firestore.rules
git commit -m "feat: firestore init and security rules"
```

---

### Task 8: Data layer (CRUD + realtime listeners)

**Files:**
- Create: `src/data/tournaments.ts`

**Interfaces:**
- Consumes: `db`, domain types, `hashPin`.
- Produces:
  - `createTournament(input: { name: string; game: GameId; format: Format; scoring: Scoring; pin: string; playerNames: string[] }): Promise<string>` — returns new tournament id; writes players in a batch.
  - `watchTournamentsByGame(game: GameId, cb: (t: Tournament[]) => void): () => void`
  - `watchTournament(id: string, cb: (t: Tournament | null) => void): () => void`
  - `watchPlayers(id: string, cb: (p: Player[]) => void): () => void`
  - `watchMatches(id: string, cb: (m: Match[]) => void): () => void`
  - `setMatchResult(tid: string, pinHash: string, match: { round: number; player1Id: string; player2Id: string | null; result: MatchResult; rawScore1?: number; rawScore2?: number; id?: string }): Promise<void>`
  - `generateRoundRobin(tid: string, pinHash: string, players: Player[]): Promise<void>`
  - `addPlayer(tid: string, pinHash: string, name: string, seed: number): Promise<void>`
  - `removePlayer(tid: string, pinHash: string, playerId: string): Promise<void>`
  - `setTournamentStatus(tid: string, pinHash: string, status: "active" | "finished"): Promise<void>`
  - `deleteTournament(tid: string, pinHash: string): Promise<void>`

- [ ] **Step 1: Create `src/data/tournaments.ts`**

```typescript
import {
  collection, doc, addDoc, setDoc, deleteDoc, updateDoc, writeBatch,
  onSnapshot, query, where, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { hashPin } from "../lib/pin";
import { roundRobin } from "../lib/roundRobin";
import type {
  GameId, Format, Scoring, Tournament, Player, Match, MatchResult,
} from "../types";

const col = collection(db, "tournaments");

export async function createTournament(input: {
  name: string; game: GameId; format: Format; scoring: Scoring;
  pin: string; playerNames: string[];
}): Promise<string> {
  const pinHash = await hashPin(input.pin);
  const ref = await addDoc(col, {
    name: input.name, game: input.game, format: input.format,
    scoring: input.scoring, pinHash, status: "active",
    pin: undefined, // never store plaintext
    createdAt: serverTimestamp(),
  });
  const batch = writeBatch(db);
  input.playerNames.forEach((name, i) => {
    const pRef = doc(collection(db, "tournaments", ref.id, "players"));
    batch.set(pRef, { name, seed: i + 1, _pinHash: pinHash });
  });
  await batch.commit();
  return ref.id;
}

function stripPin<T extends { _pinHash?: string }>(data: T): Omit<T, "_pinHash"> {
  const { _pinHash, ...rest } = data;
  return rest;
}

export function watchTournamentsByGame(game: GameId, cb: (t: Tournament[]) => void) {
  const q = query(col, where("game", "==", game));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Tournament, "id">) })));
  });
}

export function watchTournament(id: string, cb: (t: Tournament | null) => void) {
  return onSnapshot(doc(db, "tournaments", id), (d) => {
    cb(d.exists() ? ({ id: d.id, ...(d.data() as Omit<Tournament, "id">) }) : null);
  });
}

export function watchPlayers(id: string, cb: (p: Player[]) => void) {
  return onSnapshot(collection(db, "tournaments", id, "players"), (snap) => {
    const players = snap.docs
      .map((d) => ({ id: d.id, ...stripPin(d.data() as Player & { _pinHash?: string }) }))
      .sort((a, b) => a.seed - b.seed);
    cb(players as Player[]);
  });
}

export function watchMatches(id: string, cb: (m: Match[]) => void) {
  return onSnapshot(collection(db, "tournaments", id, "matches"), (snap) => {
    const matches = snap.docs.map((d) => ({
      id: d.id, ...stripPin(d.data() as Match & { _pinHash?: string }),
    }));
    cb(matches as Match[]);
  });
}

export async function setMatchResult(
  tid: string, pinHash: string,
  match: {
    id?: string; round: number; player1Id: string; player2Id: string | null;
    result: MatchResult; rawScore1?: number; rawScore2?: number;
  }
): Promise<void> {
  const payload = {
    round: match.round, player1Id: match.player1Id, player2Id: match.player2Id,
    result: match.result,
    ...(match.rawScore1 !== undefined ? { rawScore1: match.rawScore1 } : {}),
    ...(match.rawScore2 !== undefined ? { rawScore2: match.rawScore2 } : {}),
    _pinHash: pinHash,
  };
  const ref = match.id
    ? doc(db, "tournaments", tid, "matches", match.id)
    : doc(collection(db, "tournaments", tid, "matches"));
  await setDoc(ref, payload, { merge: true });
}

export async function generateRoundRobin(
  tid: string, pinHash: string, players: Player[]
): Promise<void> {
  const pairings = roundRobin(players);
  const batch = writeBatch(db);
  for (const p of pairings) {
    const ref = doc(collection(db, "tournaments", tid, "matches"));
    batch.set(ref, {
      round: p.round, player1Id: p.player1Id, player2Id: p.player2Id,
      result: p.player2Id === null ? "p1win" : "pending",
      _pinHash: pinHash,
    });
  }
  await batch.commit();
}

export async function addPlayer(
  tid: string, pinHash: string, name: string, seed: number
): Promise<void> {
  await addDoc(collection(db, "tournaments", tid, "players"), {
    name, seed, _pinHash: pinHash,
  });
}

export async function removePlayer(
  tid: string, pinHash: string, playerId: string
): Promise<void> {
  // _pinHash must be attached to satisfy rules on delete via a marker write is not
  // possible for delete; rules allow delete when the doc already carries the pin.
  // We instead update then delete to keep it simple.
  await updateDoc(doc(db, "tournaments", tid, "players", playerId), { _pinHash: pinHash });
  await deleteDoc(doc(db, "tournaments", tid, "players", playerId));
}

export async function setTournamentStatus(
  tid: string, pinHash: string, status: "active" | "finished"
): Promise<void> {
  await updateDoc(doc(db, "tournaments", tid), { _pinHash: pinHash, status });
}

export async function deleteTournament(tid: string, pinHash: string): Promise<void> {
  await updateDoc(doc(db, "tournaments", tid), { _pinHash: pinHash });
  await deleteDoc(doc(db, "tournaments", tid));
}
```

> The subcollection delete rules use the parent tournament's `pinHash` via `hasPin`, so `removePlayer` only needs the correct hash in-session; the marker `updateDoc` documents intent and keeps the write path uniform.

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/data/tournaments.ts
git commit -m "feat: firestore data layer with realtime listeners"
```

---

### Task 9: i18n setup + strings

**Files:**
- Create: `src/i18n/index.ts`, `src/i18n/th.json`, `src/i18n/en.json`

**Interfaces:**
- Produces: an initialized i18next instance (imported for side effect in `main.tsx`); `useTranslation()` available app-wide. Persisted language key: `localStorage["lang"]`, default `"th"`.

- [ ] **Step 1: Create `src/i18n/th.json`**

```json
{
  "app.title": "จัดการแข่งหมากกระดาน",
  "nav.home": "หน้าแรก",
  "lang.toggle": "EN",
  "game.thai-chess": "หมากรุกไทย",
  "game.chess": "หมากรุกสากล",
  "game.go": "หมากล้อม",
  "game.checkers": "หมากฮอส",
  "game.crossword": "ครอสเวิร์ด",
  "game.amath": "เอแมท",
  "game.boardgame": "บอร์ดเกม",
  "home.subtitle": "เลือกประเภทเกมเพื่อจัดการแข่งขัน",
  "home.activeCount": "กำลังแข่ง {{count}} รายการ",
  "list.active": "กำลังแข่ง",
  "list.finished": "จบแล้ว",
  "list.empty": "ยังไม่มีรายการแข่งขัน",
  "list.new": "สร้างทัวร์นาเมนต์ใหม่",
  "new.title": "สร้างทัวร์นาเมนต์",
  "new.name": "ชื่อรายการ",
  "new.format": "ระบบจับคู่",
  "new.format.free": "บันทึกอิสระ",
  "new.format.round-robin": "พบกันหมด",
  "new.format.swiss": "สวิส (เร็ว ๆ นี้)",
  "new.format.knockout": "น็อกเอาต์ (เร็ว ๆ นี้)",
  "new.scoring": "คะแนน (ชนะ / เสมอ / แพ้)",
  "new.pin": "รหัสกรรมการ (PIN)",
  "new.players": "รายชื่อผู้เข้าแข่ง (พิมพ์ทีละบรรทัด หรือวางทั้งชุด)",
  "new.playerCount": "จำนวน {{count}} คน",
  "new.submit": "สร้าง",
  "new.error.name": "กรุณาใส่ชื่อรายการ",
  "new.error.pin": "กรุณาตั้ง PIN",
  "new.error.range": "จำนวนผู้แข่งต้องอยู่ระหว่าง 1 ถึง 50 คน",
  "new.error.duplicate": "มีชื่อซ้ำ: {{names}} — ยืนยันเพื่อสร้างต่อ",
  "tab.standings": "ตารางคะแนน",
  "tab.matches": "ผลการแข่ง",
  "tab.players": "ผู้เข้าแข่ง",
  "standings.rank": "อันดับ",
  "standings.name": "ชื่อ",
  "standings.played": "แข่ง",
  "standings.win": "ชนะ",
  "standings.draw": "เสมอ",
  "standings.loss": "แพ้",
  "standings.points": "คะแนน",
  "standings.raw": "แต้มดิบ",
  "standings.empty": "ยังไม่มีผลการแข่ง",
  "matches.round": "รอบที่ {{round}}",
  "matches.bye": "บาย (ผ่าน)",
  "matches.vs": "พบ",
  "matches.pending": "ยังไม่แข่ง",
  "matches.p1win": "ชนะ",
  "matches.p2win": "ชนะ",
  "matches.draw": "เสมอ",
  "matches.setResult": "บันทึกผล",
  "matches.rawScore": "แต้มดิบ",
  "matches.generate": "สร้างตารางแข่ง",
  "matches.addMatch": "เพิ่มแมตช์",
  "matches.empty": "ยังไม่มีแมตช์",
  "players.add": "เพิ่มผู้เข้าแข่ง",
  "players.remove": "ลบ",
  "players.removeBlocked": "ลบไม่ได้ เพราะมีแมตช์แล้ว",
  "referee.enter": "เข้าสู่โหมดกรรมการ",
  "referee.exit": "ออกจากโหมดกรรมการ",
  "referee.on": "โหมดกรรมการ: เปิด",
  "referee.prompt": "ใส่ PIN",
  "referee.wrong": "PIN ไม่ถูกต้อง",
  "tournament.finish": "ปิดการแข่งขัน",
  "tournament.reopen": "เปิดการแข่งขันอีกครั้ง",
  "tournament.delete": "ลบทัวร์นาเมนต์",
  "tournament.deleteConfirm": "พิมพ์ชื่อรายการเพื่อยืนยันการลบ",
  "common.cancel": "ยกเลิก",
  "common.save": "บันทึก",
  "common.confirm": "ยืนยัน"
}
```

- [ ] **Step 2: Create `src/i18n/en.json`**

```json
{
  "app.title": "Board Game Tournaments",
  "nav.home": "Home",
  "lang.toggle": "ไทย",
  "game.thai-chess": "Thai Chess",
  "game.chess": "Chess",
  "game.go": "Go",
  "game.checkers": "Checkers",
  "game.crossword": "Crossword",
  "game.amath": "A-Math",
  "game.boardgame": "Board Game",
  "home.subtitle": "Pick a game category to run a tournament",
  "home.activeCount": "{{count}} active",
  "list.active": "Active",
  "list.finished": "Finished",
  "list.empty": "No tournaments yet",
  "list.new": "New tournament",
  "new.title": "New Tournament",
  "new.name": "Tournament name",
  "new.format": "Pairing format",
  "new.format.free": "Free entry",
  "new.format.round-robin": "Round robin",
  "new.format.swiss": "Swiss (coming soon)",
  "new.format.knockout": "Knockout (coming soon)",
  "new.scoring": "Points (win / draw / loss)",
  "new.pin": "Referee PIN",
  "new.players": "Player names (one per line, or paste a list)",
  "new.playerCount": "{{count}} players",
  "new.submit": "Create",
  "new.error.name": "Please enter a name",
  "new.error.pin": "Please set a PIN",
  "new.error.range": "Players must be between 1 and 50",
  "new.error.duplicate": "Duplicate names: {{names}} — confirm to continue",
  "tab.standings": "Standings",
  "tab.matches": "Matches",
  "tab.players": "Players",
  "standings.rank": "Rank",
  "standings.name": "Name",
  "standings.played": "P",
  "standings.win": "W",
  "standings.draw": "D",
  "standings.loss": "L",
  "standings.points": "Pts",
  "standings.raw": "Raw",
  "standings.empty": "No results yet",
  "matches.round": "Round {{round}}",
  "matches.bye": "Bye",
  "matches.vs": "vs",
  "matches.pending": "Not played",
  "matches.p1win": "Win",
  "matches.p2win": "Win",
  "matches.draw": "Draw",
  "matches.setResult": "Set result",
  "matches.rawScore": "Raw score",
  "matches.generate": "Generate schedule",
  "matches.addMatch": "Add match",
  "matches.empty": "No matches yet",
  "players.add": "Add player",
  "players.remove": "Remove",
  "players.removeBlocked": "Can't remove — already has matches",
  "referee.enter": "Enter referee mode",
  "referee.exit": "Exit referee mode",
  "referee.on": "Referee mode: on",
  "referee.prompt": "Enter PIN",
  "referee.wrong": "Wrong PIN",
  "tournament.finish": "Finish tournament",
  "tournament.reopen": "Reopen tournament",
  "tournament.delete": "Delete tournament",
  "tournament.deleteConfirm": "Type the tournament name to confirm deletion",
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.confirm": "Confirm"
}
```

- [ ] **Step 3: Create `src/i18n/index.ts`**

```typescript
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import th from "./th.json";
import en from "./en.json";

const saved = typeof localStorage !== "undefined" ? localStorage.getItem("lang") : null;

i18n.use(initReactI18next).init({
  resources: { th: { translation: th }, en: { translation: en } },
  lng: saved ?? "th",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export function setLanguage(lng: "th" | "en") {
  i18n.changeLanguage(lng);
  localStorage.setItem("lang", lng);
}

export default i18n;
```

- [ ] **Step 4: Commit**

```bash
git add src/i18n
git commit -m "feat: i18n setup with th/en strings"
```

---

### Task 10: Referee-mode hook + LangToggle + RefereeGate

**Files:**
- Create: `src/hooks/useRefereeMode.ts`, `src/components/LangToggle.tsx`, `src/components/RefereeGate.tsx`

**Interfaces:**
- Consumes: `verifyPin`, i18n `setLanguage`.
- Produces:
  - `useRefereeMode(tid: string, pinHash: string | undefined): { isReferee: boolean; pinHash?: string; enter(pin: string): Promise<boolean>; exit(): void }` — persists to `sessionStorage["ref:" + tid]`.
  - `<LangToggle />` — button switching th/en.
  - `<RefereeGate tid pinHash onEnter />` — shows enter/exit button + PIN prompt.

- [ ] **Step 1: Create `src/hooks/useRefereeMode.ts`**

```typescript
import { useCallback, useEffect, useState } from "react";
import { verifyPin } from "../lib/pin";

export function useRefereeMode(tid: string, pinHash: string | undefined) {
  const key = `ref:${tid}`;
  const [isReferee, setIsReferee] = useState(false);

  useEffect(() => {
    setIsReferee(sessionStorage.getItem(key) === "1");
  }, [key]);

  const enter = useCallback(
    async (pin: string): Promise<boolean> => {
      if (!pinHash) return false;
      const ok = await verifyPin(pin, pinHash);
      if (ok) {
        sessionStorage.setItem(key, "1");
        setIsReferee(true);
      }
      return ok;
    },
    [key, pinHash]
  );

  const exit = useCallback(() => {
    sessionStorage.removeItem(key);
    setIsReferee(false);
  }, [key]);

  return { isReferee, pinHash, enter, exit };
}
```

- [ ] **Step 2: Create `src/components/LangToggle.tsx`**

```tsx
import { useTranslation } from "react-i18next";
import { setLanguage } from "../i18n";

export function LangToggle() {
  const { i18n } = useTranslation();
  const next = i18n.language === "th" ? "en" : "th";
  return (
    <button onClick={() => setLanguage(next)} aria-label="language">
      {next === "en" ? "EN" : "ไทย"}
    </button>
  );
}
```

- [ ] **Step 3: Create `src/components/RefereeGate.tsx`**

```tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function RefereeGate(props: {
  isReferee: boolean;
  onEnter: (pin: string) => Promise<boolean>;
  onExit: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  if (props.isReferee) {
    return (
      <div>
        <span>{t("referee.on")}</span>{" "}
        <button onClick={props.onExit}>{t("referee.exit")}</button>
      </div>
    );
  }

  if (!open) {
    return <button onClick={() => setOpen(true)}>{t("referee.enter")}</button>;
  }

  return (
    <div>
      <input
        type="password"
        placeholder={t("referee.prompt")}
        value={pin}
        onChange={(e) => setPin(e.target.value)}
      />
      <button
        onClick={async () => {
          const ok = await props.onEnter(pin);
          if (!ok) setError(true);
          else setOpen(false);
        }}
      >
        {t("common.confirm")}
      </button>
      <button onClick={() => setOpen(false)}>{t("common.cancel")}</button>
      {error && <span>{t("referee.wrong")}</span>}
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useRefereeMode.ts src/components/LangToggle.tsx src/components/RefereeGate.tsx
git commit -m "feat: referee mode hook and gate component"
```

---

### Task 11: App shell + router + Home page

**Files:**
- Modify: `src/App.tsx`, `src/main.tsx`
- Create: `src/pages/Home.tsx`

**Interfaces:**
- Consumes: `GAMES`, `watchTournamentsByGame`, `LangToggle`.
- Produces: routes `/`, `/:game`, `/:game/new`, `/:game/:tournamentId` wired to page components (list/new/tournament stubbed until their tasks).

- [ ] **Step 1: Rewrite `src/main.tsx`**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./i18n";
import App from "./App";
import { Home } from "./pages/Home";
import { GameList } from "./pages/GameList";
import { NewTournament } from "./pages/NewTournament";
import { Tournament } from "./pages/Tournament";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: ":game", element: <GameList /> },
      { path: ":game/new", element: <NewTournament /> },
      { path: ":game/:tournamentId", element: <Tournament /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
```

- [ ] **Step 2: Rewrite `src/App.tsx`**

```tsx
import { Link, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LangToggle } from "./components/LangToggle";

export default function App() {
  const { t } = useTranslation();
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link to="/" style={{ textDecoration: "none", fontWeight: 700, fontSize: 20 }}>
          {t("app.title")}
        </Link>
        <LangToggle />
      </header>
      <main style={{ marginTop: 16 }}>
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/pages/Home.tsx`**

```tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GAMES } from "../lib/games";
import { watchTournamentsByGame } from "../data/tournaments";
import type { GameId } from "../types";

export function Home() {
  const { t } = useTranslation();
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const unsubs = GAMES.map((g) =>
      watchTournamentsByGame(g.id as GameId, (list) =>
        setCounts((c) => ({ ...c, [g.id]: list.filter((x) => x.status === "active").length }))
      )
    );
    return () => unsubs.forEach((u) => u());
  }, []);

  return (
    <div>
      <p>{t("home.subtitle")}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
        {GAMES.map((g) => (
          <Link
            key={g.id}
            to={`/${g.id}`}
            style={{
              display: "block", padding: 16, borderRadius: 12, border: "1px solid #ddd",
              textDecoration: "none", color: "inherit", textAlign: "center",
            }}
          >
            <div style={{ fontSize: 32 }}>{g.icon}</div>
            <div style={{ fontWeight: 600, marginTop: 8 }}>{t(g.labelKey)}</div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
              {t("home.activeCount", { count: counts[g.id] ?? 0 })}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create placeholder page files so the router compiles**

Create `src/pages/GameList.tsx`, `src/pages/NewTournament.tsx`, `src/pages/Tournament.tsx`, each exporting a named stub for now:

```tsx
// GameList.tsx
export function GameList() { return <div>GameList</div>; }
```
```tsx
// NewTournament.tsx
export function NewTournament() { return <div>NewTournament</div>; }
```
```tsx
// Tournament.tsx
export function Tournament() { return <div>Tournament</div>; }
```

- [ ] **Step 5: Verify dev server renders home**

Use the browser preview tool: start dev server (create `.claude/launch.json` with `npm run dev`, port 5173), open `/`, read_page. Expected: 7 game cards render with Thai labels; LangToggle switches to English.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: app shell, router, and home page"
```

---

### Task 12: GameList page

**Files:**
- Modify: `src/pages/GameList.tsx`

**Interfaces:**
- Consumes: `watchTournamentsByGame`, `isGameId`, `GAMES`.
- Produces: list split into active/finished, "new tournament" link.

- [ ] **Step 1: Implement `src/pages/GameList.tsx`**

```tsx
import { useEffect, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { isGameId } from "../lib/games";
import { watchTournamentsByGame } from "../data/tournaments";
import type { GameId, Tournament } from "../types";

export function GameList() {
  const { t } = useTranslation();
  const { game } = useParams();
  const [list, setList] = useState<Tournament[]>([]);

  useEffect(() => {
    if (!game || !isGameId(game)) return;
    return watchTournamentsByGame(game as GameId, setList);
  }, [game]);

  if (!game || !isGameId(game)) return <Navigate to="/" replace />;

  const active = list.filter((x) => x.status === "active");
  const finished = list.filter((x) => x.status === "finished");

  const Section = ({ title, items }: { title: string; items: Tournament[] }) => (
    <section style={{ marginTop: 16 }}>
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p style={{ color: "#666" }}>{t("list.empty")}</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {items.map((x) => (
            <li key={x.id} style={{ padding: 8, borderBottom: "1px solid #eee" }}>
              <Link to={`/${game}/${x.id}`}>{x.name}</Link>{" "}
              <small style={{ color: "#888" }}>({t(`new.format.${x.format}`)})</small>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <div>
      <h2>{t(`game.${game}`)}</h2>
      <Link to={`/${game}/new`}>
        <button>{t("list.new")}</button>
      </Link>
      <Section title={t("list.active")} items={active} />
      <Section title={t("list.finished")} items={finished} />
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Browser preview: navigate to `/amath`. Expected: heading "เอแมท", "new" button, two empty sections.

- [ ] **Step 3: Commit**

```bash
git add src/pages/GameList.tsx
git commit -m "feat: game tournament list page"
```

---

### Task 13: NewTournament page

**Files:**
- Modify: `src/pages/NewTournament.tsx`

**Interfaces:**
- Consumes: `createTournament`, `parsePlayers`, `isGameId`, `DEFAULT_SCORING`.
- Produces: validated create form; on success navigates to `/:game/:id`.

- [ ] **Step 1: Implement `src/pages/NewTournament.tsx`**

```tsx
import { useMemo, useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { isGameId } from "../lib/games";
import { parsePlayers } from "../lib/parsePlayers";
import { createTournament } from "../data/tournaments";
import { DEFAULT_SCORING } from "../types";
import type { GameId, Format } from "../types";

export function NewTournament() {
  const { t } = useTranslation();
  const { game } = useParams();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [format, setFormat] = useState<Format>("free");
  const [win, setWin] = useState(DEFAULT_SCORING.win);
  const [draw, setDraw] = useState(DEFAULT_SCORING.draw);
  const [loss, setLoss] = useState(DEFAULT_SCORING.loss);
  const [pin, setPin] = useState("");
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dupConfirmed, setDupConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);

  const parsed = useMemo(() => parsePlayers(raw), [raw]);

  if (!game || !isGameId(game)) return <Navigate to="/" replace />;

  const submit = async () => {
    setError(null);
    if (!name.trim()) return setError(t("new.error.name"));
    if (!pin.trim()) return setError(t("new.error.pin"));
    if (parsed.names.length < 1 || parsed.names.length > 50)
      return setError(t("new.error.range"));
    if (parsed.duplicates.length > 0 && !dupConfirmed) {
      setDupConfirmed(true);
      return setError(t("new.error.duplicate", { names: parsed.duplicates.join(", ") }));
    }
    setBusy(true);
    try {
      const id = await createTournament({
        name: name.trim(), game: game as GameId, format,
        scoring: { win, draw, loss }, pin, playerNames: parsed.names,
      });
      navigate(`/${game}/${id}`);
    } finally {
      setBusy(false);
    }
  };

  const num = (v: number, set: (n: number) => void) => (
    <input type="number" step="0.5" value={v}
      style={{ width: 60 }}
      onChange={(e) => set(parseFloat(e.target.value) || 0)} />
  );

  return (
    <div>
      <h2>{t("new.title")} — {t(`game.${game}`)}</h2>

      <label style={{ display: "block", marginTop: 12 }}>{t("new.name")}
        <input value={name} onChange={(e) => setName(e.target.value)} style={{ display: "block", width: "100%" }} />
      </label>

      <label style={{ display: "block", marginTop: 12 }}>{t("new.format")}
        <select value={format} onChange={(e) => setFormat(e.target.value as Format)} style={{ display: "block" }}>
          <option value="free">{t("new.format.free")}</option>
          <option value="round-robin">{t("new.format.round-robin")}</option>
          <option value="swiss" disabled>{t("new.format.swiss")}</option>
          <option value="knockout" disabled>{t("new.format.knockout")}</option>
        </select>
      </label>

      <div style={{ marginTop: 12 }}>{t("new.scoring")}:{" "}
        {num(win, setWin)} / {num(draw, setDraw)} / {num(loss, setLoss)}
      </div>

      <label style={{ display: "block", marginTop: 12 }}>{t("new.pin")}
        <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} style={{ display: "block" }} />
      </label>

      <label style={{ display: "block", marginTop: 12 }}>{t("new.players")}
        <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={8} style={{ display: "block", width: "100%" }} />
      </label>
      <div style={{ color: "#666" }}>{t("new.playerCount", { count: parsed.names.length })}</div>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <button disabled={busy} onClick={submit} style={{ marginTop: 12 }}>
        {t("new.submit")}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify (requires a real Firebase project configured in `.env.local`)**

Browser preview: fill the form with 4 names, format round-robin, PIN 1234, submit. Expected: navigates to the new tournament page. If `.env.local` is not yet configured, confirm validation errors trigger correctly (empty name, 0 players, 51 players) without submitting.

- [ ] **Step 3: Commit**

```bash
git add src/pages/NewTournament.tsx
git commit -m "feat: new tournament form with validation"
```

---

### Task 14: StandingsTable + MatchList components

**Files:**
- Create: `src/components/StandingsTable.tsx`, `src/components/MatchList.tsx`

**Interfaces:**
- Consumes: `Standing`, `computeStandings`, `Player`, `Match`, `setMatchResult`.
- Produces:
  - `<StandingsTable players matches scoring />`
  - `<MatchList players matches isReferee tid pinHash onGenerate onAddMatch />`

- [ ] **Step 1: Create `src/components/StandingsTable.tsx`**

```tsx
import { useTranslation } from "react-i18next";
import { computeStandings } from "../lib/standings";
import type { Player, Match, Scoring } from "../types";

export function StandingsTable(props: { players: Player[]; matches: Match[]; scoring: Scoring }) {
  const { t } = useTranslation();
  const rows = computeStandings(props.players, props.matches, props.scoring);
  const anyRaw = rows.some((r) => r.rawFor !== 0);

  if (rows.length === 0) return <p style={{ color: "#666" }}>{t("standings.empty")}</p>;

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th>{t("standings.rank")}</th>
          <th style={{ textAlign: "left" }}>{t("standings.name")}</th>
          <th>{t("standings.played")}</th>
          <th>{t("standings.win")}</th>
          <th>{t("standings.draw")}</th>
          <th>{t("standings.loss")}</th>
          <th>{t("standings.points")}</th>
          {anyRaw && <th>{t("standings.raw")}</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.playerId} style={{ borderTop: "1px solid #eee" }}>
            <td style={{ textAlign: "center" }}>{r.rank}</td>
            <td>{r.name}</td>
            <td style={{ textAlign: "center" }}>{r.played}</td>
            <td style={{ textAlign: "center" }}>{r.wins}</td>
            <td style={{ textAlign: "center" }}>{r.draws}</td>
            <td style={{ textAlign: "center" }}>{r.losses}</td>
            <td style={{ textAlign: "center", fontWeight: 700 }}>{r.points}</td>
            {anyRaw && <td style={{ textAlign: "center" }}>{r.rawFor}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 2: Create `src/components/MatchList.tsx`**

```tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { setMatchResult } from "../data/tournaments";
import type { Player, Match, MatchResult } from "../types";

function nameOf(players: Player[], id: string | null, byeLabel: string): string {
  if (id === null) return byeLabel;
  return players.find((p) => p.id === id)?.name ?? "?";
}

export function MatchList(props: {
  tid: string;
  players: Player[];
  matches: Match[];
  isReferee: boolean;
  pinHash?: string;
}) {
  const { t } = useTranslation();
  const rounds = [...new Set(props.matches.map((m) => m.round))].sort((a, b) => a - b);

  const update = async (m: Match, result: MatchResult) => {
    if (!props.isReferee || !props.pinHash) return;
    await setMatchResult(props.tid, props.pinHash, {
      id: m.id, round: m.round, player1Id: m.player1Id, player2Id: m.player2Id, result,
    });
  };

  const updateRaw = async (m: Match, which: 1 | 2, value: number) => {
    if (!props.isReferee || !props.pinHash) return;
    await setMatchResult(props.tid, props.pinHash, {
      id: m.id, round: m.round, player1Id: m.player1Id, player2Id: m.player2Id,
      result: m.result,
      rawScore1: which === 1 ? value : m.rawScore1,
      rawScore2: which === 2 ? value : m.rawScore2,
    });
  };

  if (props.matches.length === 0) return <p style={{ color: "#666" }}>{t("matches.empty")}</p>;

  return (
    <div>
      {rounds.map((r) => (
        <section key={r} style={{ marginTop: 12 }}>
          <h4>{t("matches.round", { round: r })}</h4>
          {props.matches.filter((m) => m.round === r).map((m) => (
            <div key={m.id} style={{ padding: 8, borderBottom: "1px solid #eee" }}>
              <div>
                {nameOf(props.players, m.player1Id, t("matches.bye"))} {t("matches.vs")}{" "}
                {nameOf(props.players, m.player2Id, t("matches.bye"))}
              </div>
              {m.player2Id !== null && (
                <div style={{ marginTop: 4 }}>
                  {props.isReferee ? (
                    <span>
                      <button onClick={() => update(m, "p1win")}
                        style={{ fontWeight: m.result === "p1win" ? 700 : 400 }}>◀ {t("matches.p1win")}</button>{" "}
                      <button onClick={() => update(m, "draw")}
                        style={{ fontWeight: m.result === "draw" ? 700 : 400 }}>{t("matches.draw")}</button>{" "}
                      <button onClick={() => update(m, "p2win")}
                        style={{ fontWeight: m.result === "p2win" ? 700 : 400 }}>{t("matches.p2win")} ▶</button>
                      {" | "}{t("matches.rawScore")}:{" "}
                      <input type="number" style={{ width: 60 }} defaultValue={m.rawScore1 ?? ""}
                        onBlur={(e) => updateRaw(m, 1, parseFloat(e.target.value) || 0)} />
                      {" - "}
                      <input type="number" style={{ width: 60 }} defaultValue={m.rawScore2 ?? ""}
                        onBlur={(e) => updateRaw(m, 2, parseFloat(e.target.value) || 0)} />
                    </span>
                  ) : (
                    <span style={{ color: "#555" }}>
                      {m.result === "pending" ? t("matches.pending")
                        : m.result === "draw" ? t("matches.draw")
                        : m.result === "p1win" ? `◀ ${nameOf(props.players, m.player1Id, "")}`
                        : `${nameOf(props.players, m.player2Id, "")} ▶`}
                      {typeof m.rawScore1 === "number" && ` (${m.rawScore1} - ${m.rawScore2 ?? 0})`}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/StandingsTable.tsx src/components/MatchList.tsx
git commit -m "feat: standings table and match list components"
```

---

### Task 15: Tournament page (tabs, referee actions, generate/add/free-entry)

**Files:**
- Modify: `src/pages/Tournament.tsx`

**Interfaces:**
- Consumes: `watchTournament`, `watchPlayers`, `watchMatches`, `useRefereeMode`, `RefereeGate`, `StandingsTable`, `MatchList`, `generateRoundRobin`, `setMatchResult`, `addPlayer`, `removePlayer`, `setTournamentStatus`, `deleteTournament`.
- Produces: the full tournament screen with three tabs and referee-only controls.

- [ ] **Step 1: Implement `src/pages/Tournament.tsx`**

```tsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  watchTournament, watchPlayers, watchMatches,
  generateRoundRobin, setMatchResult, addPlayer, removePlayer,
  setTournamentStatus, deleteTournament,
} from "../data/tournaments";
import { useRefereeMode } from "../hooks/useRefereeMode";
import { RefereeGate } from "../components/RefereeGate";
import { StandingsTable } from "../components/StandingsTable";
import { MatchList } from "../components/MatchList";
import type { Tournament as T, Player, Match } from "../types";

type Tab = "standings" | "matches" | "players";

export function Tournament() {
  const { t } = useTranslation();
  const { game, tournamentId } = useParams();
  const navigate = useNavigate();

  const [tour, setTour] = useState<T | null | undefined>(undefined);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [tab, setTab] = useState<Tab>("standings");

  useEffect(() => {
    if (!tournamentId) return;
    const u1 = watchTournament(tournamentId, setTour);
    const u2 = watchPlayers(tournamentId, setPlayers);
    const u3 = watchMatches(tournamentId, setMatches);
    return () => { u1(); u2(); u3(); };
  }, [tournamentId]);

  const ref = useRefereeMode(tournamentId ?? "", tour?.pinHash);

  const hasMatchFor = useMemo(() => {
    const ids = new Set<string>();
    matches.forEach((m) => { ids.add(m.player1Id); if (m.player2Id) ids.add(m.player2Id); });
    return ids;
  }, [matches]);

  if (tour === undefined) return <p>…</p>;
  if (tour === null || !game) return <Navigate to="/" replace />;

  const pinHash = ref.pinHash;

  const generate = async () => {
    if (!ref.isReferee || !pinHash) return;
    await generateRoundRobin(tour.id, pinHash, players);
    setTab("matches");
  };

  const addFreeMatch = async (p1: string, p2: string) => {
    if (!ref.isReferee || !pinHash || !p1 || !p2 || p1 === p2) return;
    await setMatchResult(tour.id, pinHash, {
      round: 0, player1Id: p1, player2Id: p2, result: "pending",
    });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>{tour.name}</h2>
        <RefereeGate isReferee={ref.isReferee} onEnter={ref.enter} onExit={ref.exit} />
      </div>

      <nav style={{ display: "flex", gap: 8, marginTop: 8 }}>
        {(["standings", "matches", "players"] as Tab[]).map((tb) => (
          <button key={tb} onClick={() => setTab(tb)} style={{ fontWeight: tab === tb ? 700 : 400 }}>
            {t(`tab.${tb}`)}
          </button>
        ))}
      </nav>

      <div style={{ marginTop: 16 }}>
        {tab === "standings" && (
          <StandingsTable players={players} matches={matches} scoring={tour.scoring} />
        )}

        {tab === "matches" && (
          <div>
            {ref.isReferee && (
              <div style={{ marginBottom: 12 }}>
                {tour.format === "round-robin" && matches.length === 0 && (
                  <button onClick={generate}>{t("matches.generate")}</button>
                )}
                {tour.format === "free" && (
                  <FreeMatchAdder players={players} onAdd={addFreeMatch} />
                )}
              </div>
            )}
            <MatchList tid={tour.id} players={players} matches={matches}
              isReferee={ref.isReferee} pinHash={pinHash} />
          </div>
        )}

        {tab === "players" && (
          <PlayersTab
            tour={tour} players={players} pinHash={pinHash}
            isReferee={ref.isReferee} hasMatchFor={hasMatchFor}
          />
        )}
      </div>

      {ref.isReferee && (
        <footer style={{ marginTop: 24, paddingTop: 12, borderTop: "1px solid #eee" }}>
          {tour.status === "active" ? (
            <button onClick={() => pinHash && setTournamentStatus(tour.id, pinHash, "finished")}>
              {t("tournament.finish")}
            </button>
          ) : (
            <button onClick={() => pinHash && setTournamentStatus(tour.id, pinHash, "active")}>
              {t("tournament.reopen")}
            </button>
          )}{" "}
          <DeleteButton tourName={tour.name}
            onDelete={() => pinHash && deleteTournament(tour.id, pinHash).then(() => navigate(`/${game}`))} />
        </footer>
      )}
    </div>
  );
}

function FreeMatchAdder(props: { players: Player[]; onAdd: (p1: string, p2: string) => void }) {
  const { t } = useTranslation();
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  return (
    <span>
      <select value={p1} onChange={(e) => setP1(e.target.value)}>
        <option value="">—</option>
        {props.players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>{" "}
      <select value={p2} onChange={(e) => setP2(e.target.value)}>
        <option value="">—</option>
        {props.players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>{" "}
      <button onClick={() => { props.onAdd(p1, p2); setP1(""); setP2(""); }}>
        {t("matches.addMatch")}
      </button>
    </span>
  );
}

function PlayersTab(props: {
  tour: T; players: Player[]; pinHash?: string; isReferee: boolean; hasMatchFor: Set<string>;
}) {
  const { t } = useTranslation();
  const [newName, setNewName] = useState("");
  const nextSeed = (props.players.at(-1)?.seed ?? 0) + 1;

  return (
    <div>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {props.players.map((p) => (
          <li key={p.id} style={{ padding: 6, borderBottom: "1px solid #eee" }}>
            {p.name}
            {props.isReferee && (
              props.hasMatchFor.has(p.id)
                ? <small style={{ color: "#999" }}> — {t("players.removeBlocked")}</small>
                : <button style={{ marginLeft: 8 }}
                    onClick={() => props.pinHash && removePlayer(props.tour.id, props.pinHash, p.id)}>
                    {t("players.remove")}
                  </button>
            )}
          </li>
        ))}
      </ul>
      {props.isReferee && props.players.length < 50 && (
        <div style={{ marginTop: 8 }}>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button onClick={() => {
            if (props.pinHash && newName.trim()) {
              addPlayer(props.tour.id, props.pinHash, newName.trim(), nextSeed);
              setNewName("");
            }
          }}>{t("players.add")}</button>
        </div>
      )}
    </div>
  );
}

function DeleteButton(props: { tourName: string; onDelete: () => void }) {
  const { t } = useTranslation();
  const [confirm, setConfirm] = useState("");
  const [open, setOpen] = useState(false);
  if (!open) return <button onClick={() => setOpen(true)}>{t("tournament.delete")}</button>;
  return (
    <span>
      <input placeholder={t("tournament.deleteConfirm")} value={confirm}
        onChange={(e) => setConfirm(e.target.value)} />
      <button disabled={confirm !== props.tourName} onClick={props.onDelete}>
        {t("common.confirm")}
      </button>
    </span>
  );
}
```

- [ ] **Step 2: Add `pinHash` to the `Tournament` type read path**

The `Tournament` interface in `types.ts` does not include `pinHash`. Add it as optional so `tour.pinHash` typechecks:

```typescript
// in src/types.ts, add to interface Tournament:
  pinHash?: string;
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 4: Full end-to-end verification (requires configured `.env.local`)**

Browser preview flow:
1. Create a round-robin tournament with 4 players, PIN `1234`.
2. Enter referee mode with `1234` → controls appear; wrong PIN shows error.
3. Matches tab → "generate schedule" → 6 matches across 3 rounds appear.
4. Set results; standings tab updates live; ranks and points correct.
5. Open the same URL in a second browser tab (non-referee) → sees standings update in real time, no edit buttons.
6. Switch language → all labels change; player names stay as entered.
7. Finish tournament → appears under "finished" on the game list.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Tournament.tsx src/types.ts
git commit -m "feat: tournament page with tabs and referee actions"
```

---

### Task 16: Deploy config + README

**Files:**
- Create: `firebase.json`, `.firebaserc` (project id placeholder), `README.md`

**Interfaces:**
- Produces: `npm run build` output deployable via `firebase deploy`.

- [ ] **Step 1: Create `firebase.json`**

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  },
  "firestore": { "rules": "firestore.rules" }
}
```

- [ ] **Step 2: Create `README.md`**

```markdown
# Boardgame Tournament

เว็บจัดการแข่งขันหมากกระดาน 7 หมวด (หมากรุกไทย, หมากรุกสากล, หมากล้อม, หมากฮอส, ครอสเวิร์ด, เอแมท, บอร์ดเกม).

## Setup
1. `npm install`
2. Create a Firebase project, enable Firestore.
3. Copy `.env.example` to `.env.local` and paste your Firebase web config.
4. `npm run dev`

## Test
`npm test`

## Deploy
1. `npm run build`
2. `firebase deploy` (deploys hosting + firestore rules)

## Phase 2 (not yet built)
Swiss and knockout pairing formats.
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: `dist/` produced with no type errors.

- [ ] **Step 4: Commit**

```bash
git add firebase.json .firebaserc README.md
git commit -m "chore: firebase hosting config and readme"
```

---

## Self-Review

**Spec coverage check:**
- 7 game categories incl. boardgame → Task 2 (`GAMES`), Task 11 (Home). ✓
- Separate page per game → Task 12 (GameList). ✓
- 1–50 players, names, paste list → Task 3, Task 13. ✓
- Multiple tournaments per game + history (active/finished) → Task 12, Task 15 (finish/reopen). ✓
- Win/draw/loss + configurable scoring → Task 6, Task 13, Task 14. ✓
- Raw in-game scores (optional) → Task 6 (rawFor), Task 14 (MatchList inputs). ✓
- Free + round-robin pairing (Phase 1) → Task 5, Task 15. ✓
- Live standings across devices → Task 8 (onSnapshot), Task 14. ✓
- PIN referee mode → Task 4, Task 7 (rules), Task 10, Task 15. ✓
- Thai/English toggle, persisted → Task 9, Task 10. ✓
- Tiebreakers (points → h2h → raw → tied) → Task 6. ✓
- Delete requires name confirmation → Task 15 (DeleteButton). ✓
- Swiss/knockout deferred to Phase 2 → noted in header + README. ✓

**Placeholder scan:** No TBD/TODO. Stub page files in Task 11 are intentional scaffolding, each replaced by its own task (12/13/15).

**Type consistency:** `setMatchResult`, `generateRoundRobin`, `computeStandings`, `Standing`, `roundRobin` signatures match across data layer, components, and pages. `Tournament.pinHash` added in Task 15 Step 2 to support the read path.
