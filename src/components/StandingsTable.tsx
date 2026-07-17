import { useTranslation } from "react-i18next";
import { computeStandings } from "../lib/standings";
import type { Player, Match, Scoring } from "../types";

export function StandingsTable(props: { players: Player[]; matches: Match[]; scoring: Scoring }) {
  const { t } = useTranslation();
  const rows = computeStandings(props.players, props.matches, props.scoring);
  const anyRaw = rows.some((r) => r.rawFor !== 0);

  if (rows.length === 0) return <p style={{ color: "var(--text-muted)" }}>{t("standings.empty")}</p>;

  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
      <table className="zebra sticky-header tabular-nums" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ padding: "8px 10px" }}>{t("standings.rank")}</th>
            <th style={{ textAlign: "left", padding: "8px 10px" }}>{t("standings.name")}</th>
            <th style={{ padding: "8px 10px" }}>{t("standings.played")}</th>
            <th style={{ padding: "8px 10px" }}>{t("standings.win")}</th>
            <th style={{ padding: "8px 10px" }}>{t("standings.draw")}</th>
            <th style={{ padding: "8px 10px" }}>{t("standings.loss")}</th>
            <th style={{ padding: "8px 10px" }}>{t("standings.points")}</th>
            {anyRaw && <th style={{ padding: "8px 10px" }}>{t("standings.raw")}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.playerId} style={{ borderTop: "1px solid var(--border)" }}>
              <td style={{ textAlign: "center", padding: "8px 10px", fontWeight: r.rank === 1 ? 700 : 400 }}>
                {r.rank === 1 ? "🥇 " : ""}{r.rank}
              </td>
              <td style={{ padding: "8px 10px", fontWeight: r.rank === 1 ? 700 : 400 }}>{r.name}</td>
              <td style={{ textAlign: "center", padding: "8px 10px" }}>{r.played}</td>
              <td style={{ textAlign: "center", padding: "8px 10px" }}>{r.wins}</td>
              <td style={{ textAlign: "center", padding: "8px 10px" }}>{r.draws}</td>
              <td style={{ textAlign: "center", padding: "8px 10px" }}>{r.losses}</td>
              <td style={{ textAlign: "center", padding: "8px 10px", fontWeight: 700 }}>{r.points}</td>
              {anyRaw && <td style={{ textAlign: "center", padding: "8px 10px" }}>{r.rawFor}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
