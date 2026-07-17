import { useMemo, useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { isGameId } from "../lib/games";
import { parsePlayers } from "../lib/parsePlayers";
import { createTournament } from "../data/tournaments";
import { DEFAULT_SCORING } from "../types";
import type { GameId, Format } from "../types";
import { Card, Button } from "../components/ui";

export function NewTournament() {
  const { t } = useTranslation();
  const { game } = useParams();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [format, setFormat] = useState<Format>("free");
  const [win, setWin] = useState(DEFAULT_SCORING.win);
  const [draw, setDraw] = useState(DEFAULT_SCORING.draw);
  const [loss, setLoss] = useState(DEFAULT_SCORING.loss);
  const [pin, setPin] = useState("");
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dupConfirmed, setDupConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);

  const parsed = useMemo(() => parsePlayers(raw), [raw]);

  if (!game || !isGameId(game)) return <Navigate to="/" replace />;

  const submit = async () => {
    setError(null);
    if (!name.trim()) return setError(t("new.error.name"));
    if (!pin.trim()) return setError(t("new.error.pin"));
    if (parsed.names.length < 1 || parsed.names.length > 50)
      return setError(t("new.error.range"));
    if (parsed.duplicates.length > 0 && !dupConfirmed) {
      setDupConfirmed(true);
      return setError(t("new.error.duplicate", { names: parsed.duplicates.join(", ") }));
    }
    setBusy(true);
    try {
      const id = await createTournament({
        name: name.trim(), game: game as GameId, format,
        scoring: { win, draw, loss }, pin, playerNames: parsed.names,
      });
      navigate(`/${game}/${id}`);
    } finally {
      setBusy(false);
    }
  };

  const num = (v: number, set: (n: number) => void) => (
    <input type="number" step="0.5" value={v} className="input"
      style={{ width: 70, display: "inline-block" }}
      onChange={(e) => set(parseFloat(e.target.value) || 0)} />
  );

  return (
    <Card>
      <h2 style={{ marginTop: 0 }}>{t("new.title")} — {t(`game.${game}`)}</h2>

      <label style={{ display: "block", marginTop: 12 }}>{t("new.name")}
        <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
      </label>

      <label style={{ display: "block", marginTop: 12 }}>{t("new.format")}
        <select value={format} onChange={(e) => setFormat(e.target.value as Format)} className="input">
          <option value="free">{t("new.format.free")}</option>
          <option value="round-robin">{t("new.format.round-robin")}</option>
          <option value="swiss" disabled>{t("new.format.swiss")}</option>
          <option value="knockout" disabled>{t("new.format.knockout")}</option>
        </select>
      </label>

      <div style={{ marginTop: 12 }}>{t("new.scoring")}:{" "}
        {num(win, setWin)} / {num(draw, setDraw)} / {num(loss, setLoss)}
      </div>

      <label style={{ display: "block", marginTop: 12 }}>{t("new.pin")}
        <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} className="input" />
      </label>

      <label style={{ display: "block", marginTop: 12 }}>{t("new.players")}
        <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={8} className="input" />
      </label>
      <div style={{ color: "var(--text-muted)" }}>{t("new.playerCount", { count: parsed.names.length })}</div>

      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}

      <Button variant="primary" disabled={busy} onClick={submit} style={{ marginTop: 12 }}>
        {t("new.submit")}
      </Button>
    </Card>
  );
}
