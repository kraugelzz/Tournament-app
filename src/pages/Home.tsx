import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GAMES } from "../lib/games";
import { getActiveCountsByGame } from "../data/tournaments";
import { Card, Badge } from "../components/ui";

export function Home() {
  const { t } = useTranslation();
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let alive = true;
    getActiveCountsByGame()
      .then((c) => { if (alive) setCounts(c); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <div>
      <p style={{ color: "var(--text-muted)" }}>{t("home.subtitle")}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
        {GAMES.map((g) => {
          const count = counts[g.id] ?? 0;
          return (
            <Link key={g.id} to={`/${g.id}`} className="lift" style={{ textDecoration: "none", color: "inherit" }}>
              <Card style={{ textAlign: "center", cursor: "pointer" }}>
                <div style={{ fontSize: 40 }}>{g.icon}</div>
                <div style={{ fontWeight: 600, marginTop: 8 }}>{t(g.labelKey)}</div>
                <div style={{ marginTop: 8 }}>
                  <Badge tone={count > 0 ? "success" : "muted"}>
                    {t("home.activeCount", { count })}
                  </Badge>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
