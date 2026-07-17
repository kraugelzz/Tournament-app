import { useState } from "react";
import { useTranslation } from "react-i18next";

export function RefereeGate(props: {
  isReferee: boolean;
  onEnter: (pin: string) => Promise<boolean>;
  onExit: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  if (props.isReferee) {
    return (
      <div>
        <span>{t("referee.on")}</span>{" "}
        <button onClick={props.onExit}>{t("referee.exit")}</button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => {
          setError(false);
          setOpen(true);
        }}
      >
        {t("referee.enter")}
      </button>
    );
  }

  return (
    <div>
      <input
        type="password"
        placeholder={t("referee.prompt")}
        value={pin}
        onChange={(e) => {
          setPin(e.target.value);
          setError(false);
        }}
      />
      <button
        onClick={async () => {
          const ok = await props.onEnter(pin);
          if (!ok) setError(true);
          else setOpen(false);
        }}
      >
        {t("common.confirm")}
      </button>
      <button onClick={() => setOpen(false)}>{t("common.cancel")}</button>
      {error && <span>{t("referee.wrong")}</span>}
    </div>
  );
}
