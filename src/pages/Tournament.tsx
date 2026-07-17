import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  watchTournament, watchPlayers, watchMatches,
  generateRoundRobin, setMatchResult, addPlayer, removePlayer,
  setTournamentStatus, deleteTournament,
  generateSwissRound, generateKnockout, advanceKnockoutRound,
} from "../data/tournaments";
import { useRefereeMode } from "../hooks/useRefereeMode";
import { RefereeGate } from "../components/RefereeGate";
import { StandingsTable } from "../components/StandingsTable";
import { MatchList } from "../components/MatchList";
import { Bracket } from "../components/Bracket";
import { Button } from "../components/ui";
import type { Tournament as T, Player, Match } from "../types";

type Tab = "standings" | "matches" | "players" | "bracket";

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

  useEffect(() => {
    if (tour?.format === "knockout") setTab("bracket");
  }, [tour?.id, tour?.format]);

  useEffect(() => {
    if (!tour || tour.format !== "knockout" || !ref.isReferee || !ref.pinHash) return;
    if (matches.length === 0) return;
    advanceKnockoutRound(tour.id, ref.pinHash, players, matches).catch(() => {});
  }, [tour, ref.isReferee, ref.pinHash, players, matches]);

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
        {(tour.format === "knockout"
          ? (["bracket", "matches", "players"] as Tab[])
          : (["standings", "matches", "players"] as Tab[])
        ).map((tb) => (
          <button key={tb} onClick={() => setTab(tb)} style={{ fontWeight: tab === tb ? 700 : 400 }}>
            {t(`tab.${tb}`)}
          </button>
        ))}
      </nav>

      <div style={{ marginTop: 16 }}>
        {tab === "standings" && (
          <StandingsTable players={players} matches={matches} scoring={tour.scoring} />
        )}

        {tab === "bracket" && <Bracket players={players} matches={matches} />}

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
              </div>
            )}
            <MatchList tid={tour.id} players={players} matches={matches}
              isReferee={ref.isReferee} pinHash={pinHash} allowDraw={tour.format !== "knockout"} />
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
  const nextSeed = (props.players[props.players.length - 1]?.seed ?? 0) + 1;

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
