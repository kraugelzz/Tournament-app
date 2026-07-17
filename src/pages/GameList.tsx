import { useEffect, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { isGameId } from "../lib/games";
import { watchTournamentsByGame } from "../data/tournaments";
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

  const Section = ({ title, items }: { title: string; items: Tournament[] }) => (
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
              <Badge>{t(`new.format.${x.format}`)}</Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>{t(`game.${game}`)}</h2>
        <Link to={`/${game}/new`}>
          <Button variant="primary">{t("list.new")}</Button>
        </Link>
      </div>
      <Section title={t("list.active")} items={active} />
      <Section title={t("list.finished")} items={finished} />
    </div>
  );
}
