import { useTranslation } from "react-i18next";
import { Card, Badge } from "./ui";
import type { Player, Match } from "../types";

function nameOf(players: Player[], id: string | null): string {
  if (id === null) return "—";
  return players.find((p) => p.id === id)?.name ?? "?";
}

export function Bracket(props: { players: Player[]; matches: Match[] }) {
  const { t } = useTranslation();
  const main = props.matches.filter((m) => (m.bracket ?? "main") === "main");
  const third = props.matches.filter((m) => m.bracket === "third");
  const rounds = [...new Set(main.map((m) => m.round))].sort((a, b) => a - b);

  const cell = (m: Match) => {
    const w = m.result === "p1win" ? m.player1Id : m.result === "p2win" ? m.player2Id : null;
    const line = (id: string | null) => (
      <div style={{ fontWeight: w && id === w ? 700 : 400, color: w && id === w ? "var(--primary)" : "var(--text)" }}>
        {nameOf(props.players, id)}
      </div>
    );
    return (
      <Card key={`${m.round}-${m.slot}`} style={{ padding: 10, minWidth: 150 }}>
        {line(m.player1Id)}
        <div style={{ height: 1, background: "var(--border)", margin: "6px 0" }} />
        {m.player2Id === null ? <Badge tone="muted">{t("matches.bye")}</Badge> : line(m.player2Id)}
      </Card>
    );
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 24, overflowX: "auto", paddingBottom: 8 }}>
        {rounds.map((r) => (
          <div key={r} style={{ display: "flex", flexDirection: "column", gap: 16, justifyContent: "space-around" }}>
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>{t("bracket.round", { n: r })}</div>
            {main.filter((m) => m.round === r).sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0)).map(cell)}
          </div>
        ))}
      </div>
      {third.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 8 }}>{t("bracket.third")}</div>
          {third.map(cell)}
        </div>
      )}
    </div>
  );
}
