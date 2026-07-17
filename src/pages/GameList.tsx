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
