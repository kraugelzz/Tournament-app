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

import { useEffect, useState } from "react";
export function ThemeToggle() {
  const [dark, setDark] = useState(
    () => (typeof localStorage !== "undefined" && localStorage.getItem("theme") === "dark")
  );
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);
  return (
    <button onClick={() => setDark((d) => !d)} aria-label="theme"
      style={{ borderRadius: "var(--radius-sm)", padding: "6px 10px", cursor: "pointer",
        border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)" }}>
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
