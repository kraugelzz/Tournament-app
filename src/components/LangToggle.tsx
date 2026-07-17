import { useTranslation } from "react-i18next";
import { setLanguage } from "../i18n";

export function LangToggle() {
  const { i18n } = useTranslation();
  const next = i18n.language === "th" ? "en" : "th";
  return (
    <button onClick={() => setLanguage(next)} aria-label="language">
      {next === "en" ? "EN" : "ไทย"}
    </button>
  );
}
