import { useTranslation } from "react-i18next";
import { setMatchResult } from "../data/tournaments";
import type { Player, Match, MatchResult } from "../types";

function nameOf(players: Player[], id: string | null, byeLabel: string): string {
  if (id === null) return byeLabel;
  return players.find((p) => p.id === id)?.name ?? "?";
}

export function MatchList(props: {
  tid: string;
  players: Player[];
  matches: Match[];
  isReferee: boolean;
  pinHash?: string;
}) {
  const { t } = useTranslation();
  const rounds = [...new Set(props.matches.map((m) => m.round))].sort((a, b) => a - b);

  const update = async (m: Match, result: MatchResult) => {
    if (!props.isReferee || !props.pinHash) return;
    await setMatchResult(props.tid, props.pinHash, {
      id: m.id, round: m.round, player1Id: m.player1Id, player2Id: m.player2Id, result,
    });
  };

  const updateRaw = async (m: Match, which: 1 | 2, value: number) => {
    if (!props.isReferee || !props.pinHash) return;
    await setMatchResult(props.tid, props.pinHash, {
      id: m.id, round: m.round, player1Id: m.player1Id, player2Id: m.player2Id,
      result: m.result,
      rawScore1: which === 1 ? value : m.rawScore1,
      rawScore2: which === 2 ? value : m.rawScore2,
    });
  };

  if (props.matches.length === 0) return <p style={{ color: "#666" }}>{t("matches.empty")}</p>;

  return (
    <div>
      {rounds.map((r) => (
        <section key={r} style={{ marginTop: 12 }}>
          <h4>{t("matches.round", { round: r })}</h4>
          {props.matches.filter((m) => m.round === r).map((m) => (
            <div key={m.id} style={{ padding: 8, borderBottom: "1px solid #eee" }}>
              <div>
                {nameOf(props.players, m.player1Id, t("matches.bye"))} {t("matches.vs")}{" "}
                {nameOf(props.players, m.player2Id, t("matches.bye"))}
              </div>
              {m.player2Id !== null && (
                <div style={{ marginTop: 4 }}>
                  {props.isReferee ? (
                    <span>
                      <button onClick={() => update(m, "p1win")}
                        style={{ fontWeight: m.result === "p1win" ? 700 : 400 }}>◀ {t("matches.p1win")}</button>{" "}
                      <button onClick={() => update(m, "draw")}
                        style={{ fontWeight: m.result === "draw" ? 700 : 400 }}>{t("matches.draw")}</button>{" "}
                      <button onClick={() => update(m, "p2win")}
                        style={{ fontWeight: m.result === "p2win" ? 700 : 400 }}>{t("matches.p2win")} ▶</button>
                      {" | "}{t("matches.rawScore")}:{" "}
                      <input type="number" style={{ width: 60 }} defaultValue={m.rawScore1 ?? ""}
                        onBlur={(e) => updateRaw(m, 1, parseFloat(e.target.value) || 0)} />
                      {" - "}
                      <input type="number" style={{ width: 60 }} defaultValue={m.rawScore2 ?? ""}
                        onBlur={(e) => updateRaw(m, 2, parseFloat(e.target.value) || 0)} />
                    </span>
                  ) : (
                    <span style={{ color: "#555" }}>
                      {m.result === "pending" ? t("matches.pending")
                        : m.result === "draw" ? t("matches.draw")
                        : m.result === "p1win" ? `◀ ${nameOf(props.players, m.player1Id, "")}`
                        : `${nameOf(props.players, m.player2Id, "")} ▶`}
                      {typeof m.rawScore1 === "number" && ` (${m.rawScore1} - ${m.rawScore2 ?? 0})`}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
