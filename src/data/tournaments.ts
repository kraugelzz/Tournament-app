import {
  collection, doc, addDoc, setDoc, deleteDoc, updateDoc, writeBatch,
  onSnapshot, query, where, serverTimestamp, getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import { hashPin } from "../lib/pin";
import { roundRobin } from "../lib/roundRobin";
import { swissPair } from "../lib/swiss";
import { knockoutBracket, advanceKnockout } from "../lib/knockout";
import type {
  GameId, Format, Scoring, Tournament, Player, Match, MatchResult,
} from "../types";

const col = collection(db, "tournaments");

export async function createTournament(input: {
  name: string; game: GameId; format: Format; scoring: Scoring;
  pin: string; playerNames: string[];
}): Promise<string> {
  const pinHash = await hashPin(input.pin);
  // Pre-generate the doc id locally (no network needed) so we can navigate
  // immediately. Firestore write promises only resolve on server ack, which
  // hangs forever on networks that block the realtime channel — so we do NOT
  // await the commit; with local persistence the data is applied instantly
  // and syncs in the background.
  const tRef = doc(col);
  const batch = writeBatch(db);
  batch.set(tRef, {
    name: input.name, game: input.game, format: input.format,
    scoring: input.scoring, pinHash, status: "active",
    // plaintext pin is intentionally never written
    createdAt: serverTimestamp(),
  });
  input.playerNames.forEach((name, i) => {
    const pRef = doc(collection(db, "tournaments", tRef.id, "players"));
    batch.set(pRef, { name, seed: i + 1, _pinHash: pinHash });
  });
  batch.commit().catch((e) => console.error("createTournament sync failed:", e));
  return tRef.id;
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
      .map((d) => ({ id: d.id, ...stripPin(d.data() as Omit<Player, "id"> & { _pinHash?: string }) }))
      .sort((a, b) => a.seed - b.seed);
    cb(players as Player[]);
  });
}

export function watchMatches(id: string, cb: (m: Match[]) => void) {
  return onSnapshot(collection(db, "tournaments", id, "matches"), (snap) => {
    const matches = snap.docs.map((d) => ({
      id: d.id, ...stripPin(d.data() as Omit<Match, "id"> & { _pinHash?: string }),
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
    const ref = doc(db, "tournaments", tid, "matches", `${m.bracket}-r${m.round}-s${m.slot}`);
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
    const ref = doc(db, "tournaments", tid, "matches", `${m.bracket}-r${m.round}-s${m.slot}`);
    batch.set(ref, {
      round: m.round, slot: m.slot, bracket: m.bracket,
      player1Id: m.player1Id, player2Id: m.player2Id, result: m.result,
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
  await updateDoc(doc(db, "tournaments", tid, "players", playerId), { _pinHash: pinHash });
  await deleteDoc(doc(db, "tournaments", tid, "players", playerId));
}

export async function setTournamentStatus(
  tid: string, pinHash: string, status: "active" | "finished"
): Promise<void> {
  await updateDoc(doc(db, "tournaments", tid), { _pinHash: pinHash, status });
}

export async function deleteTournament(tid: string, pinHash: string): Promise<void> {
  const [playersSnap, matchesSnap] = await Promise.all([
    getDocs(collection(db, "tournaments", tid, "players")),
    getDocs(collection(db, "tournaments", tid, "matches")),
  ]);
  const batch = writeBatch(db);
  playersSnap.docs.forEach((d) => batch.delete(d.ref));
  matchesSnap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();

  await updateDoc(doc(db, "tournaments", tid), { _pinHash: pinHash });
  await deleteDoc(doc(db, "tournaments", tid));
}
