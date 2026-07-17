import { Link, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LangToggle } from "./components/LangToggle";

export default function App() {
  const { t } = useTranslation();
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link to="/" style={{ textDecoration: "none", fontWeight: 700, fontSize: 20 }}>
          {t("app.title")}
        </Link>
        <LangToggle />
      </header>
      <main style={{ marginTop: 16 }}>
        <Outlet />
      </main>
    </div>
  );
}
