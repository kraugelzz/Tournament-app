import { useTranslation } from "react-i18next";
import { computeStandings } from "../lib/standings";
import type { Player, Match, Scoring } from "../types";

export function StandingsTable(props: { players: Player[]; matches: Match[]; scoring: Scoring }) {
  const { t } = useTranslation();
  const rows = computeStandings(props.players, props.matches, props.scoring);
  const anyRaw = rows.some((r) => r.rawFor !== 0);

  if (rows.length === 0) return <p style={{ color: "#666" }}>{t("standings.empty")}</p>;

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th>{t("standings.rank")}</th>
          <th style={{ textAlign: "left" }}>{t("standings.name")}</th>
          <th>{t("standings.played")}</th>
          <th>{t("standings.win")}</th>
          <th>{t("standings.draw")}</th>
          <th>{t("standings.loss")}</th>
          <th>{t("standings.points")}</th>
          {anyRaw && <th>{t("standings.raw")}</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.playerId} style={{ borderTop: "1px solid #eee" }}>
            <td style={{ textAlign: "center" }}>{r.rank}</td>
            <td>{r.name}</td>
            <td style={{ textAlign: "center" }}>{r.played}</td>
            <td style={{ textAlign: "center" }}>{r.wins}</td>
            <td style={{ textAlign: "center" }}>{r.draws}</td>
            <td style={{ textAlign: "center" }}>{r.losses}</td>
            <td style={{ textAlign: "center", fontWeight: 700 }}>{r.points}</td>
            {anyRaw && <td style={{ textAlign: "center" }}>{r.rawFor}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
