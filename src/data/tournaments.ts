// Data layer backed by the Firestore REST API (plain HTTPS) instead of the
// Firestore JS SDK. The SDK's realtime WebChannel/long-polling transport was
// blocked/unreliable on some networks, leaving writes hung and sync broken.
// The REST endpoints are ordinary HTTPS requests that work anywhere the site
// loads, so writes are reliable; "live" viewing is done by polling every few
// seconds. Public function signatures are unchanged so the UI needs no edits.
import { hashPin } from "../lib/pin";
import { roundRobin } from "../lib/roundRobin";
import { swissPair } from "../lib/swiss";
import { knockoutBracket, advanceKnockout } from "../lib/knockout";
import type {
  GameId, Format, Scoring, Tournament, Player, Match, MatchResult,
} from "../types";

const PROJECT = import.meta.env.VITE_FB_PROJECT_ID ?? "tournament-app-419dc";
const KEY = import.meta.env.VITE_FB_API_KEY ?? "AIzaSyCLu9Cbe0Oc13SMRTT2LDf0zVrLWDPgLNc";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const DOC_PREFIX = `projects/${PROJECT}/databases/(default)/documents`;
const POLL_MS = 4000;

// ---- Firestore REST value encoding/decoding ----

type FsValue = Record<string, unknown>;

function toFs(v: unknown): FsValue {
  if (v === null || v === undefined) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFs) } };
  if (typeof v === "object") return { mapValue: { fields: toFields(v as Record<string, unknown>) } };
  return { nullValue: null };
}

function toFields(obj: Record<string, unknown>): Record<string, FsValue> {
  const f: Record<string, FsValue> = {};
  for (const [k, val] of Object.entries(obj)) {
    if (val === undefined) continue;
    f[k] = toFs(val);
  }
  return f;
}

function fromFs(v: FsValue): unknown {
  if (v == null) return null;
  if ("nullValue" in v) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("timestampValue" in v) return v.timestampValue;
  if ("mapValue" in v) return fromFields((v.mapValue as { fields?: Record<string, FsValue> })?.fields ?? {});
  if ("arrayValue" in v) {
    const vals = (v.arrayValue as { values?: FsValue[] })?.values ?? [];
    return vals.map(fromFs);
  }
  return null;
}

function fromFields(fields: Record<string, FsValue>): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(fields)) o[k] = fromFs(val);
  return o;
}

function idOf(name: string): string {
  return name.split("/").pop() as string;
}

function genId(): string {
  const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 20; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}

// ---- REST helpers ----

async function fsFetch(url: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Firestore ${res.status}: ${await res.text()}`);
  return res.json();
}

async function getOne(path: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${BASE}/${path}?key=${KEY}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore ${res.status}: ${await res.text()}`);
  return res.json();
}

async function listDocs(collPath: string): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  const out: Array<{ id: string; data: Record<string, unknown> }> = [];
  let pageToken = "";
  do {
    const url = `${BASE}/${collPath}?key=${KEY}&pageSize=300` +
      (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "");
    const json = await fsFetch(url);
    const docs = (json.documents as Array<{ name: string; fields?: Record<string, FsValue> }>) ?? [];
    for (const d of docs) out.push({ id: idOf(d.name), data: fromFields(d.fields ?? {}) });
    pageToken = (json.nextPageToken as string) ?? "";
  } while (pageToken);
  return out;
}

function updateWrite(path: string, data: Record<string, unknown>, mask?: string[]): Record<string, unknown> {
  const w: Record<string, unknown> = {
    update: { name: `${DOC_PREFIX}/${path}`, fields: toFields(data) },
  };
  if (mask) w.updateMask = { fieldPaths: mask };
  return w;
}

function deleteWrite(path: string): Record<string, unknown> {
  return { delete: `${DOC_PREFIX}/${path}` };
}

async function commitWrites(writes: Array<Record<string, unknown>>): Promise<void> {
  if (writes.length === 0) return;
  await fsFetch(`${BASE}:commit?key=${KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ writes }),
  });
}

// Poll `fn` immediately and then every POLL_MS. Returns an unsubscribe fn.
function poll(fn: () => Promise<void>): () => void {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout>;
  const tick = () => {
    if (stopped) return;
    fn().catch(() => {}).finally(() => {
      if (!stopped) timer = setTimeout(tick, POLL_MS);
    });
  };
  tick();
  return () => { stopped = true; clearTimeout(timer); };
}

function stripPin<T extends Record<string, unknown>>(data: T): Omit<T, "_pinHash"> {
  const { _pinHash, ...rest } = data;
  void _pinHash;
  return rest;
}

// ---- Public API (unchanged signatures) ----

export async function createTournament(input: {
  name: string; game: GameId; format: Format; scoring: Scoring;
  pin: string; playerNames: string[];
}): Promise<string> {
  const pinHash = await hashPin(input.pin);
  const tid = genId();
  const writes = [
    updateWrite(`tournaments/${tid}`, {
      name: input.name, game: input.game, format: input.format,
      scoring: input.scoring, pinHash, status: "active", createdAt: new Date(),
      // plaintext pin is intentionally never written
    }),
    ...input.playerNames.map((name, i) =>
      updateWrite(`tournaments/${tid}/players/${genId()}`, { name, seed: i + 1, _pinHash: pinHash })
    ),
  ];
  await commitWrites(writes);
  return tid;
}

export function watchTournamentsByGame(game: GameId, cb: (t: Tournament[]) => void) {
  return poll(async () => {
    const docs = await listDocs("tournaments");
    cb(docs
      .map((d) => ({ id: d.id, ...(d.data as Omit<Tournament, "id">) }))
      .filter((t) => (t as Tournament).game === game) as Tournament[]);
  });
}

export async function getActiveCountsByGame(): Promise<Record<string, number>> {
  const docs = await listDocs("tournaments");
  const counts: Record<string, number> = {};
  for (const d of docs) {
    const t = d.data as { game?: string; status?: string };
    if (t.status === "active" && t.game) counts[t.game] = (counts[t.game] ?? 0) + 1;
  }
  return counts;
}

export function watchTournament(id: string, cb: (t: Tournament | null) => void) {
  return poll(async () => {
    const doc = await getOne(`tournaments/${id}`);
    if (!doc || !doc.fields) return cb(null);
    const data = fromFields(doc.fields as Record<string, FsValue>);
    cb({ id, ...(data as Omit<Tournament, "id">) });
  });
}

export function watchPlayers(id: string, cb: (p: Player[]) => void) {
  return poll(async () => {
    const docs = await listDocs(`tournaments/${id}/players`);
    const players = docs
      .map((d) => ({ id: d.id, ...stripPin(d.data) }))
      .sort((a, b) => (a as Player).seed - (b as Player).seed);
    cb(players as unknown as Player[]);
  });
}

export function watchMatches(id: string, cb: (m: Match[]) => void) {
  return poll(async () => {
    const docs = await listDocs(`tournaments/${id}/matches`);
    cb(docs.map((d) => ({ id: d.id, ...stripPin(d.data) })) as unknown as Match[]);
  });
}

export async function setMatchResult(
  tid: string, pinHash: string,
  match: {
    id?: string; round: number; player1Id: string; player2Id: string | null;
    result: MatchResult; rawScore1?: number; rawScore2?: number;
  }
): Promise<void> {
  const payload: Record<string, unknown> = {
    round: match.round, player1Id: match.player1Id, player2Id: match.player2Id,
    result: match.result,
    ...(match.rawScore1 !== undefined ? { rawScore1: match.rawScore1 } : {}),
    ...(match.rawScore2 !== undefined ? { rawScore2: match.rawScore2 } : {}),
    _pinHash: pinHash,
  };
  const id = match.id ?? genId();
  // updateMask = provided keys so a result-only edit preserves existing raw scores.
  await commitWrites([updateWrite(`tournaments/${tid}/matches/${id}`, payload, Object.keys(payload))]);
}

export async function generateRoundRobin(
  tid: string, pinHash: string, players: Player[]
): Promise<void> {
  const writes = roundRobin(players).map((p) =>
    updateWrite(`tournaments/${tid}/matches/${genId()}`, {
      round: p.round, player1Id: p.player1Id, player2Id: p.player2Id,
      result: p.player2Id === null ? "p1win" : "pending", _pinHash: pinHash,
    })
  );
  await commitWrites(writes);
}

export async function generateSwissRound(
  tid: string, pinHash: string, players: Player[], matches: Match[], scoring: Scoring
): Promise<void> {
  const writes = swissPair(players, matches, scoring).map((p) =>
    updateWrite(`tournaments/${tid}/matches/${genId()}`, {
      round: p.round, player1Id: p.player1Id, player2Id: p.player2Id,
      result: p.player2Id === null ? "p1win" : "pending", _pinHash: pinHash,
    })
  );
  await commitWrites(writes);
}

export async function generateKnockout(
  tid: string, pinHash: string, players: Player[]
): Promise<void> {
  const writes = knockoutBracket(players).map((m) =>
    updateWrite(`tournaments/${tid}/matches/${m.bracket}-r${m.round}-s${m.slot}`, {
      round: m.round, slot: m.slot, bracket: m.bracket,
      player1Id: m.player1Id, player2Id: m.player2Id, result: m.result, _pinHash: pinHash,
    })
  );
  await commitWrites(writes);
}

export async function advanceKnockoutRound(
  tid: string, pinHash: string, players: Player[], matches: Match[]
): Promise<void> {
  const next = advanceKnockout(players, matches);
  const writes = next.map((m) =>
    updateWrite(`tournaments/${tid}/matches/${m.bracket}-r${m.round}-s${m.slot}`, {
      round: m.round, slot: m.slot, bracket: m.bracket,
      player1Id: m.player1Id, player2Id: m.player2Id, result: m.result, _pinHash: pinHash,
    })
  );
  await commitWrites(writes);
}

export async function addPlayer(
  tid: string, pinHash: string, name: string, seed: number
): Promise<void> {
  await commitWrites([
    updateWrite(`tournaments/${tid}/players/${genId()}`, { name, seed, _pinHash: pinHash }),
  ]);
}

export async function removePlayer(
  tid: string, pinHash: string, playerId: string
): Promise<void> {
  void pinHash;
  await commitWrites([deleteWrite(`tournaments/${tid}/players/${playerId}`)]);
}

export async function setTournamentStatus(
  tid: string, pinHash: string, status: "active" | "finished"
): Promise<void> {
  await commitWrites([
    updateWrite(`tournaments/${tid}`, { status, _pinHash: pinHash }, ["status", "_pinHash"]),
  ]);
}

export async function deleteTournament(tid: string, pinHash: string): Promise<void> {
  void pinHash;
  const [players, matches] = await Promise.all([
    listDocs(`tournaments/${tid}/players`),
    listDocs(`tournaments/${tid}/matches`),
  ]);
  await commitWrites([
    ...players.map((p) => deleteWrite(`tournaments/${tid}/players/${p.id}`)),
    ...matches.map((m) => deleteWrite(`tournaments/${tid}/matches/${m.id}`)),
    deleteWrite(`tournaments/${tid}`),
  ]);
}
