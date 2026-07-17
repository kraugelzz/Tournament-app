# Boardgame Tournament — Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add Swiss and knockout pairing formats (with bracket view), and restyle the whole app into a modern, clean, warm-toned UI with light/dark mode.

**Architecture:** New pure functions `swissPair` and `knockoutBracket` + `advanceKnockout` in `src/lib/`, unit-tested. Data-layer helpers generate rounds/brackets and auto-advance knockout winners. A shared design-token stylesheet (CSS variables, warm palette, dark mode) replaces the current inline styles; components adopt small reusable UI primitives.

**Tech Stack:** unchanged (React 18, Vite, TS, Firestore, react-i18next, Vitest).

## Global Constraints

- Phase 1 remains fully working; do not regress free / round-robin / standings / PIN / i18n.
- Match model unchanged: `{ round, player1Id, player2Id|null, result: "p1win"|"draw"|"p2win"|"pending", rawScore1?, rawScore2? }`. Knockout adds two optional fields on matches: `bracket?: "main" | "third"` and `slot?: number` (position within its round, 0-indexed). These are optional and ignored by Phase 1 formats.
- Swiss: the referee generates each round on demand (a "create next round" button); the system never auto-decides the round count. A bye is worth `scoring.win` points and does not increment `played` (same as round-robin byes). No player receives a bye twice while any bye-free player remains. No pair repeats while an alternative exists.
- Knockout: bracket size = next power of two ≥ player count; seeding order is standard (1 plays lowest, bracket halves separate the top two seeds); byes go to the top seeds in round 1 and auto-advance. A drawn knockout match stays unresolved until the referee picks a winner (result stored as `p1win`/`p2win`; there is no "draw advances" rule). A third-place match is played between the two semifinal losers.
- Standings tab still shows for Swiss (points table). Knockout shows the bracket view instead of a points table on its main tab.
- Language: all new strings go through i18n in both `th` and `en`. Thai is default.
- Visual system: warm-neutral palette, rounded cards (border-radius ~12–16px), soft shadows, generous spacing, readable Thai/Latin type; must support light and dark via `prefers-color-scheme` and a manual toggle; existing LangToggle stays.
- Typecheck with `npx tsc --noEmit` (NOT `tsc -b --noEmit`, which errors TS6310). `npm run build` (`tsc -b && vite build`) must succeed. node/npm may be under `/c/Program Files/nodejs/`.

---

## File Structure

```
src/
  lib/
    swiss.ts            # swissPair()  (new)
    knockout.ts         # knockoutBracket(), advanceKnockout()  (new)
  data/tournaments.ts   # + generateSwissRound, generateKnockout (modify)
  types.ts              # + bracket?, slot? on Match; Standing unchanged (modify)
  styles/
    theme.css           # design tokens + base element styles (new)
  components/
    ui.tsx              # Button, Card, Tabs, Badge primitives (new)
    Bracket.tsx         # knockout bracket view (new)
    StandingsTable.tsx  # restyle (modify)
    MatchList.tsx       # restyle (modify)
    LangToggle.tsx      # + theme toggle sibling or ThemeToggle (modify/new)
  pages/*.tsx           # adopt primitives + enable swiss/knockout (modify)
tests/lib/
  swiss.test.ts         # (new)
  knockout.test.ts      # (new)
```

---

### Task 1: Swiss pairing logic

**Files:** Create `src/lib/swiss.ts`; Test `tests/lib/swiss.test.ts`.

**Interfaces:**
- Consumes `Player`, `Match` from `../types`; `computeStandings` from `./standings`.
- Produces `swissPair(players: Player[], matches: Match[], scoring: Scoring): { round: number; player1Id: string; player2Id: string | null }[]` — returns the pairings for the NEXT round (one round's worth). `round` = (max existing round) + 1, or 1 if none. Players are ordered by current standings (points desc, then existing standings tiebreakers via computeStandings order); paired greedily top-down, skipping an opponent a player has already faced, backtracking one slot when the greedy choice would force a repeat. Odd player count → the lowest-standing player who has not yet had a bye gets the bye (`player2Id: null`); if everyone has had a bye, the lowest-standing player gets it. Returns `[]` if fewer than 2 players.

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect } from "vitest";
import { swissPair } from "../../src/lib/swiss";
import type { Player, Match, Scoring } from "../../src/types";

const scoring: Scoring = { win: 1, draw: 0.5, loss: 0 };
const mk = (n: number): Player[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}`, seed: i + 1 }));

describe("swissPair", () => {
  it("returns [] for fewer than 2 players", () => {
    expect(swissPair(mk(1), [], scoring)).toEqual([]);
  });

  it("round 1: pairs everyone, round number is 1, no repeats possible", () => {
    const p = swissPair(mk(4), [], scoring);
    expect(p).toHaveLength(2);
    expect(p.every((m) => m.round === 1)).toBe(true);
    const ids = p.flatMap((m) => [m.player1Id, m.player2Id]);
    expect(new Set(ids).size).toBe(4);
  });

  it("odd count: exactly one bye and round covers the rest", () => {
    const p = swissPair(mk(5), [], scoring);
    const byes = p.filter((m) => m.player2Id === null);
    expect(byes).toHaveLength(1);
    expect(p.filter((m) => m.player2Id !== null)).toHaveLength(2);
  });

  it("never repeats a pairing from prior rounds when an alternative exists", () => {
    const players = mk(4);
    // Round 1 already played: p1-p2, p3-p4
    const r1: Match[] = [
      { id: "a", round: 1, player1Id: "p1", player2Id: "p2", result: "p1win" },
      { id: "b", round: 1, player1Id: "p3", player2Id: "p4", result: "p1win" },
    ];
    const p = swissPair(players, r1, scoring);
    expect(p.every((m) => m.round === 2)).toBe(true);
    const keys = p.map((m) => [m.player1Id, m.player2Id].sort().join("-"));
    expect(keys).not.toContain("p1-p2");
    expect(keys).not.toContain("p3-p4");
  });

  it("does not give a second bye while a bye-free player remains", () => {
    const players = mk(3);
    // Round 1: p3 had a bye
    const r1: Match[] = [
      { id: "a", round: 1, player1Id: "p1", player2Id: "p2", result: "p1win" },
      { id: "b", round: 1, player1Id: "p3", player2Id: null, result: "p1win" },
    ];
    const p = swissPair(players, r1, scoring);
    const byePlayer = p.find((m) => m.player2Id === null)!.player1Id;
    expect(byePlayer).not.toBe("p3");
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run tests/lib/swiss.test.ts` — FAIL (module missing).

- [ ] **Step 3: Implement `src/lib/swiss.ts`**

```typescript
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
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/lib/swiss.test.ts` — PASS (5). Then `npx vitest run` — full suite green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/swiss.ts tests/lib/swiss.test.ts
git commit -m "feat: swiss pairing logic"
```

---

### Task 2: Knockout bracket logic

**Files:** Create `src/lib/knockout.ts`; Test `tests/lib/knockout.test.ts`.

**Interfaces:**
- Consumes `Player`, `Match`.
- Produces:
  - `knockoutBracket(players: Player[]): { round: number; slot: number; bracket: "main"; player1Id: string | null; player2Id: string | null; result: "pending" | "p1win" }[]` — round-1 matches only, seeded into a bracket of size = next power of two ≥ n. Standard seeding (seed 1 vs lowest, halves separate seeds 1 and 2). Missing slots (n < bracketSize) are byes: a top seed paired with `player2Id: null`, `result: "p1win"` (auto-advanced). `slot` is the 0-indexed position within round 1. Players are ordered by their `seed` field ascending. Returns `[]` for fewer than 2 players.
  - `advanceKnockout(players: Player[], matches: Match[]): { round: number; slot: number; bracket: "main" | "third"; player1Id: string | null; player2Id: string | null; result: "pending" }[]` — given all existing knockout matches, returns any NEW next-round matches (main-bracket advancement and, when both semifinals are decided, the third-place match) that are now determined but not yet present. Idempotent: returns only matches that don't already exist (matched by round+slot+bracket). A match is "decided" when its result is `p1win` or `p2win`.

- [ ] **Step 1: Write failing tests**

```typescript
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
```

- [ ] **Step 2: Run to verify fail** — `npx vitest run tests/lib/knockout.test.ts` FAIL.

- [ ] **Step 3: Implement `src/lib/knockout.ts`**

```typescript
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
  players: Player[],
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
```

- [ ] **Step 4: Run to verify pass** — `npx vitest run tests/lib/knockout.test.ts` PASS (5); then `npx vitest run` full green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/knockout.ts tests/lib/knockout.test.ts
git commit -m "feat: knockout bracket seeding and advancement logic"
```

---

### Task 3: Types + data-layer generation for swiss & knockout

**Files:** Modify `src/types.ts`, `src/data/tournaments.ts`.

**Interfaces:**
- `Match` gains `bracket?: "main" | "third"` and `slot?: number`.
- Produces in the data layer:
  - `generateSwissRound(tid: string, pinHash: string, players: Player[], matches: Match[], scoring: Scoring): Promise<void>` — computes `swissPair` for the next round and batch-writes the new match docs (bye → `result:"p1win"`, else `pending`), each stamped with `_pinHash`.
  - `generateKnockout(tid: string, pinHash: string, players: Player[]): Promise<void>` — writes round-1 `knockoutBracket` matches (with `bracket`, `slot`), each stamped with `_pinHash`.
  - `advanceKnockoutRound(tid: string, pinHash: string, players: Player[], matches: Match[]): Promise<void>` — writes any matches returned by `advanceKnockout` not already present.

- [ ] **Step 1: Add fields to `Match` in `src/types.ts`**

```typescript
export interface Match {
  id: string;
  round: number;
  player1Id: string;
  player2Id: string | null;
  result: MatchResult;
  rawScore1?: number;
  rawScore2?: number;
  bracket?: "main" | "third"; // knockout only
  slot?: number;              // knockout: position within round
}
```

- [ ] **Step 2: Add generators to `src/data/tournaments.ts`**

Import `swissPair` from `../lib/swiss` and `knockoutBracket, advanceKnockout` from `../lib/knockout`, plus `Scoring`. Append:

```typescript
export async function generateSwissRound(
  tid: string, pinHash: string, players: Player[], matches: Match[], scoring: Scoring
): Promise<void> {
  const pairings = swissPair(players, matches, scoring);
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

export async function generateKnockout(
  tid: string, pinHash: string, players: Player[]
): Promise<void> {
  const r1 = knockoutBracket(players);
  const batch = writeBatch(db);
  for (const m of r1) {
    const ref = doc(collection(db, "tournaments", tid, "matches"));
    batch.set(ref, {
      round: m.round, slot: m.slot, bracket: m.bracket,
      player1Id: m.player1Id, player2Id: m.player2Id, result: m.result,
      _pinHash: pinHash,
    });
  }
  await batch.commit();
}

export async function advanceKnockoutRound(
  tid: string, pinHash: string, players: Player[], matches: Match[]
): Promise<void> {
  const next = advanceKnockout(players, matches);
  if (next.length === 0) return;
  const batch = writeBatch(db);
  for (const m of next) {
    const ref = doc(collection(db, "tournaments", tid, "matches"));
    batch.set(ref, {
      round: m.round, slot: m.slot, bracket: m.bracket,
      player1Id: m.player1Id, player2Id: m.player2Id, result: m.result,
      _pinHash: pinHash,
    });
  }
  await batch.commit();
}
```

- [ ] **Step 3: Verify** — `npx tsc --noEmit` clean; `npx vitest run` 16+ tests still green; `npm run build` succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/types.ts src/data/tournaments.ts
git commit -m "feat: data-layer generation for swiss and knockout"
```

---

### Task 4: Design system — theme tokens + UI primitives

**Files:** Create `src/styles/theme.css`, `src/components/ui.tsx`; Modify `src/main.tsx` (import the css), add a `ThemeToggle`.

**Design tokens (warm, modern, clean; light + dark):**

- [ ] **Step 1: Create `src/styles/theme.css`**

```css
:root {
  --bg: #faf7f2;            /* warm off-white */
  --surface: #ffffff;
  --surface-2: #f3ede4;
  --text: #2a2622;
  --text-muted: #7a7167;
  --border: #e7ded2;
  --primary: #c2571f;      /* warm terracotta */
  --primary-contrast: #ffffff;
  --success: #3f7d54;
  --danger: #b23b3b;
  --radius: 14px;
  --radius-sm: 9px;
  --shadow: 0 1px 2px rgba(60,40,20,.05), 0 6px 20px rgba(60,40,20,.06);
  --font: "Sarabun", system-ui, -apple-system, "Segoe UI", sans-serif;
}
:root[data-theme="dark"] {
  --bg: #1c1917;
  --surface: #262220;
  --surface-2: #302b28;
  --text: #f2ece4;
  --text-muted: #a89e92;
  --border: #3a342f;
  --primary: #e2733a;
  --primary-contrast: #1c1917;
  --success: #5aa373;
  --danger: #d66;
  --shadow: 0 1px 2px rgba(0,0,0,.3), 0 8px 24px rgba(0,0,0,.35);
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--bg); color: var(--text);
  font-family: var(--font); line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
a { color: var(--primary); text-decoration: none; }
h1,h2,h3,h4 { font-weight: 700; letter-spacing: -.01em; }
table { border-collapse: collapse; width: 100%; }
input, select, textarea, button { font: inherit; }
```

- [ ] **Step 2: Create `src/components/ui.tsx`** — small reusable primitives used everywhere:

```tsx
import type { ReactNode, ButtonHTMLAttributes } from "react";

export function Card({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: "var(--radius)", boxShadow: "var(--shadow)", padding: 16, ...style,
    }}>{children}</div>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
};
export function Button({ variant = "ghost", style, ...rest }: BtnProps) {
  const base: React.CSSProperties = {
    borderRadius: "var(--radius-sm)", padding: "8px 14px", cursor: "pointer",
    border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)",
    transition: "filter .15s, background .15s", fontWeight: 600,
  };
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: "var(--primary)", color: "var(--primary-contrast)", border: "1px solid transparent" },
    ghost: {},
    danger: { background: "var(--danger)", color: "#fff", border: "1px solid transparent" },
  };
  return <button {...rest} style={{ ...base, ...variants[variant], ...style }} />;
}

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "success" | "muted" }) {
  const tones: Record<string, React.CSSProperties> = {
    default: { background: "var(--surface-2)", color: "var(--text)" },
    success: { background: "var(--success)", color: "#fff" },
    muted: { background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)" },
  };
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 999,
      fontSize: 12, fontWeight: 600, ...tones[tone],
    }}>{children}</span>
  );
}
```

- [ ] **Step 3: Add `ThemeToggle` (in `src/components/LangToggle.tsx` file, export a second component) and wire css import in `main.tsx`.**

```tsx
// append to LangToggle.tsx
import { useEffect, useState } from "react";
export function ThemeToggle() {
  const [dark, setDark] = useState(
    () => (typeof localStorage !== "undefined" && localStorage.getItem("theme") === "dark")
  );
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);
  return (
    <button onClick={() => setDark((d) => !d)} aria-label="theme"
      style={{ borderRadius: "var(--radius-sm)", padding: "6px 10px", cursor: "pointer",
        border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)" }}>
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
```

In `src/main.tsx`, add `import "./styles/theme.css";` near the top (after `import "./i18n"`).

- [ ] **Step 4: Verify** — `npm run build` succeeds; `npx tsc --noEmit` clean.

- [ ] **Step 5: Commit**

```bash
git add src/styles/theme.css src/components/ui.tsx src/components/LangToggle.tsx src/main.tsx
git commit -m "feat: design system tokens, ui primitives, theme toggle"
```

---

### Task 5: Restyle App shell, Home, GameList, NewTournament, standings & match components

**Files:** Modify `src/App.tsx`, `src/pages/Home.tsx`, `src/pages/GameList.tsx`, `src/pages/NewTournament.tsx`, `src/components/StandingsTable.tsx`, `src/components/MatchList.tsx`.

**Goal:** Replace ad-hoc inline styles with the design tokens and `Card`/`Button`/`Badge` primitives; keep all existing behavior, i18n keys, refs, and props identical. This is a visual pass only — no logic changes.

Guidance (apply consistently, do not change component contracts):
- App shell: header with the title, `ThemeToggle` + `LangToggle` grouped at right; center content max-width ~960px; use `var(--bg)`/`var(--text)`.
- Home: game cards become `Card`s in a responsive grid (`repeat(auto-fill,minmax(150px,1fr))`), icon large, active count as a `Badge` (tone success when >0, muted when 0), hover lift (`transform: translateY(-2px)` via inline `onMouseEnter/Leave` or a CSS class in theme.css).
- GameList: sections as cards; each tournament a row with a format `Badge`; primary "new" `Button`.
- NewTournament: wrap the form in a `Card`; inputs styled (full-width, padded, `var(--border)`, radius-sm); submit is `Button variant="primary"`; errors in `var(--danger)`.
- StandingsTable: zebra rows via `var(--surface-2)` on even rows, sticky header, rank 1 emphasized (bold, small medal ⭐/🥇 optional), numbers tabular.
- MatchList: each match a compact card row; result buttons use `Button` (active result → `variant="primary"`); raw-score inputs styled; bye shown as a `Badge tone="muted"`.

- [ ] **Step 1: Restyle each file** (transcribe structure, swap styles to tokens/primitives; keep JSX logic, refs, keys, i18n calls unchanged). Add any hover class to theme.css (e.g. `.lift{transition:transform .15s}.lift:hover{transform:translateY(-2px)}`).

- [ ] **Step 2: Verify build + no behavior change** — `npx tsc --noEmit` clean; `npm run build` succeeds; `npx vitest run` unchanged green.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "style: adopt design system across shell, home, list, form, tables"
```

---

### Task 6: Bracket view + wire swiss/knockout into the Tournament page + enable formats

**Files:** Create `src/components/Bracket.tsx`; Modify `src/pages/Tournament.tsx`, `src/pages/NewTournament.tsx`, i18n `th.json`/`en.json`.

**Interfaces:**
- `<Bracket players matches />` — renders knockout `main` rounds left→right as columns of match cards (each showing the two names and the winner highlighted), with the `third` place match shown below, labeled. Read-only display; result editing still happens via the matches tab / MatchList.

- [ ] **Step 1: Enable swiss & knockout options in `NewTournament.tsx`** — remove the `disabled` attribute from the swiss and knockout `<option>`s; update i18n `new.format.swiss` → "สวิส" / "Swiss" and `new.format.knockout` → "น็อกเอาต์" / "Knockout" (drop the "coming soon" suffix). Add keys: `matches.generateSwiss` ("สร้างรอบถัดไป" / "Create next round"), `matches.generateKnockout` ("สร้างสายแข่ง" / "Generate bracket"), `tab.bracket` ("สายแข่ง" / "Bracket"), `bracket.third` ("ชิงที่ 3" / "Third place"), `bracket.round` ("รอบ {{n}}" / "Round {{n}}"), `bracket.champion` ("ผู้ชนะเลิศ" / "Champion").

- [ ] **Step 2: Create `src/components/Bracket.tsx`**

```tsx
import { useTranslation } from "react-i18next";
import { Card, Badge } from "./ui";
import type { Player, Match } from "../types";

function nameOf(players: Player[], id: string | null): string {
  if (id === null) return "—";
  return players.find((p) => p.id === id)?.name ?? "?";
}

export function Bracket(props: { players: Player[]; matches: Match[] }) {
  const { t } = useTranslation();
  const main = props.matches.filter((m) => (m.bracket ?? "main") === "main");
  const third = props.matches.filter((m) => m.bracket === "third");
  const rounds = [...new Set(main.map((m) => m.round))].sort((a, b) => a - b);

  const cell = (m: Match) => {
    const w = m.result === "p1win" ? m.player1Id : m.result === "p2win" ? m.player2Id : null;
    const line = (id: string | null) => (
      <div style={{ fontWeight: w && id === w ? 700 : 400, color: w && id === w ? "var(--primary)" : "var(--text)" }}>
        {nameOf(props.players, id)}
      </div>
    );
    return (
      <Card key={`${m.round}-${m.slot}`} style={{ padding: 10, minWidth: 150 }}>
        {line(m.player1Id)}
        <div style={{ height: 1, background: "var(--border)", margin: "6px 0" }} />
        {m.player2Id === null ? <Badge tone="muted">{t("matches.bye")}</Badge> : line(m.player2Id)}
      </Card>
    );
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 24, overflowX: "auto", paddingBottom: 8 }}>
        {rounds.map((r) => (
          <div key={r} style={{ display: "flex", flexDirection: "column", gap: 16, justifyContent: "space-around" }}>
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>{t("bracket.round", { n: r })}</div>
            {main.filter((m) => m.round === r).sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0)).map(cell)}
          </div>
        ))}
      </div>
      {third.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 8 }}>{t("bracket.third")}</div>
          {third.map(cell)}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Wire into `Tournament.tsx`:**
  - Import `generateSwissRound`, `generateKnockout`, `advanceKnockoutRound` from the data layer, and `Bracket`.
  - Add a `"bracket"` tab shown only when `tour.format === "knockout"`; it renders `<Bracket players={players} matches={matches} />`. For knockout, this tab replaces the standings tab as the default.
  - In the matches tab referee controls: when `format === "swiss"`, show a `Button variant="primary"` labeled `matches.generateSwiss` that calls `generateSwissRound(tour.id, pinHash, players, matches, tour.scoring)` (always enabled — each press makes the next round). When `format === "knockout"` and `matches.length === 0`, show `matches.generateKnockout` calling `generateKnockout(tour.id, pinHash, players)`.
  - Add an effect: when `format === "knockout"` and the referee is active, after matches change, call `advanceKnockoutRound(tour.id, pinHash, players, matches)` so decided rounds spawn the next round / third-place match. Guard so it only runs in referee mode and is safe to call repeatedly (advanceKnockout is idempotent).

Concrete additions (insert into the existing structure; do not remove Phase 1 branches):

```tsx
// tab type becomes:
type Tab = "standings" | "matches" | "players" | "bracket";

// after the existing effects, add knockout auto-advance:
useEffect(() => {
  if (!tour || tour.format !== "knockout" || !ref.isReferee || !ref.pinHash) return;
  if (matches.length === 0) return;
  advanceKnockoutRound(tour.id, ref.pinHash, players, matches).catch(() => {});
}, [tour, ref.isReferee, ref.pinHash, players, matches]);

// default tab for knockout:
// when tour loads, if format === "knockout" set tab to "bracket" once.
```

For the default-tab behavior use a one-shot effect keyed on tour.id:
```tsx
useEffect(() => {
  if (tour?.format === "knockout") setTab("bracket");
}, [tour?.id, tour?.format]);
```

Matches-tab referee control block (add alongside the existing round-robin/free branches):
```tsx
{tour.format === "swiss" && (
  <Button variant="primary" onClick={() =>
    ref.pinHash && generateSwissRound(tour.id, ref.pinHash, players, matches, tour.scoring)}>
    {t("matches.generateSwiss")}
  </Button>
)}
{tour.format === "knockout" && matches.length === 0 && (
  <Button variant="primary" onClick={() =>
    ref.pinHash && generateKnockout(tour.id, ref.pinHash, players)}>
    {t("matches.generateKnockout")}
  </Button>
)}
```

Tab nav: include `"bracket"` only for knockout:
```tsx
{(tour.format === "knockout"
  ? (["bracket", "matches", "players"] as Tab[])
  : (["standings", "matches", "players"] as Tab[])
).map((tb) => ( /* existing button render, label t(`tab.${tb}`) */ ))}
```

And render the bracket panel:
```tsx
{tab === "bracket" && <Bracket players={players} matches={matches} />}
```

- [ ] **Step 4: Verify** — `npx tsc --noEmit` clean; `npm run build` succeeds; `npx vitest run` green. Controller does browser verification of a full swiss round and a knockout bracket after this task.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: bracket view, swiss/knockout generation wired into tournament page"
```

---

## Self-Review

**Spec coverage:**
- Swiss, referee-generated rounds, no repeat/no double bye → Task 1, Task 3, Task 6. ✓
- Knockout: power-of-two field, seeding, byes to top seeds, auto-advance, third place, draw→referee decides (no draw-advances rule; result must be p1win/p2win) → Task 2, Task 3, Task 6. ✓
- Bracket view; knockout default tab → Task 6. ✓
- Enable format options, i18n both languages → Task 6. ✓
- Modern warm UI, light/dark, primitives → Task 4, Task 5. ✓
- Phase 1 untouched behavior; typecheck via `tsc --noEmit`; build via `tsc -b` → Global Constraints, every task's verify step. ✓

**Placeholder scan:** none. Task 5 is a visual pass with concrete per-file guidance; Task 6 gives concrete code for the new wiring.

**Type consistency:** `swissPair(players, matches, scoring)`, `knockoutBracket(players)`, `advanceKnockout(players, matches)`, and the data-layer generators use consistent signatures across tasks; `Match.bracket/slot` added in Task 3 before first use.
