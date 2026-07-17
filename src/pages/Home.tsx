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
