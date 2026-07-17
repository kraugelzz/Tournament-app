import { Link, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LangToggle, ThemeToggle } from "./components/LangToggle";

export default function App() {
  const { t } = useTranslation();
  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 16, background: "var(--bg)", color: "var(--text)", minHeight: "100vh" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link to="/" style={{ textDecoration: "none", fontWeight: 700, fontSize: 20, color: "var(--text)" }}>
          {t("app.title")}
        </Link>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ThemeToggle />
          <LangToggle />
        </div>
      </header>
      <main style={{ marginTop: 16 }}>
        <Outlet />
      </main>
    </div>
  );
}
