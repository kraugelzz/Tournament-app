import { useEffect, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { isGameId } from "../lib/games";
import { watchTournamentsByGame, deleteTournament } from "../data/tournaments";
import { verifyPin, hashPin } from "../lib/pin";
import type { GameId, Tournament } from "../types";
import { Card, Button, Badge } from "../components/ui";

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

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>{t(`game.${game}`)}</h2>
        <Link to={`/${game}/new`}>
          <Button variant="primary">{t("list.new")}</Button>
        </Link>
      </div>
      <Section title={t("list.active")} items={active} game={game} />
      <Section title={t("list.finished")} items={finished} game={game} />
    </div>
  );
}

// Defined at module scope (not inside GameList) so the list isn't remounted on
// every poll, which would reset an open delete/PIN prompt.
function Section({ title, items, game }: { title: string; items: Tournament[]; game: string }) {
  const { t } = useTranslation();
  return (
    <Card style={{ marginTop: 16 }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {items.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>{t("list.empty")}</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {items.map((x) => (
            <li key={x.id} style={{
              padding: "10px 0", borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between",
            }}>
              <Link to={`/${game}/${x.id}`} style={{ color: "var(--text)", fontWeight: 600 }}>{x.name}</Link>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Badge>{t(`new.format.${x.format}`)}</Badge>
                <DeleteRowButton tournament={x} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// Per-row delete: reveals a PIN field; on a correct PIN the tournament (and its
// players/matches) are deleted. The list refreshes on the next poll.
function DeleteRowButton({ tournament }: { tournament: Tournament }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} style={{ padding: "4px 10px", fontSize: 13 }}>
        {t("players.remove")}
      </Button>
    );
  }

  const confirm = async () => {
    setError(null);
    if (!tournament.pinHash) return;
    setBusy(true);
    try {
      if (!(await verifyPin(pin, tournament.pinHash))) {
        setError(t("referee.wrong"));
        return;
      }
      await deleteTournament(tournament.id, await hashPin(pin));
      // On success the row disappears when the list re-polls.
    } catch {
      setError(t("new.error.save"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <input
        type="text" inputMode="numeric" autoComplete="off" className="input"
        placeholder={t("referee.prompt")} value={pin}
        onChange={(e) => setPin(e.target.value)}
        style={{ width: 90, WebkitTextSecurity: "disc" } as React.CSSProperties}
      />
      <Button variant="danger" disabled={busy} onClick={confirm} style={{ padding: "4px 10px", fontSize: 13 }}>
        {t("common.confirm")}
      </Button>
      <Button onClick={() => { setOpen(false); setPin(""); setError(null); }}
        style={{ padding: "4px 10px", fontSize: 13 }}>
        {t("common.cancel")}
      </Button>
      {error && <span style={{ color: "var(--danger)", fontSize: 12 }}>{error}</span>}
    </span>
  );
}
