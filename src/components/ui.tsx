import type { ReactNode, ButtonHTMLAttributes } from "react";

export function Card({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: "var(--radius)", boxShadow: "var(--shadow)", padding: 16, ...style,
    }}>{children}</div>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
};
export function Button({ variant = "ghost", style, ...rest }: BtnProps) {
  const base: React.CSSProperties = {
    borderRadius: "var(--radius-sm)", padding: "8px 14px", cursor: "pointer",
    border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)",
    transition: "filter .15s, background .15s", fontWeight: 600,
  };
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: "var(--primary)", color: "var(--primary-contrast)", border: "1px solid transparent" },
    ghost: {},
    danger: { background: "var(--danger)", color: "#fff", border: "1px solid transparent" },
  };
  return <button {...rest} style={{ ...base, ...variants[variant], ...style }} />;
}

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "success" | "muted" }) {
  const tones: Record<string, React.CSSProperties> = {
    default: { background: "var(--surface-2)", color: "var(--text)" },
    success: { background: "var(--success)", color: "#fff" },
    muted: { background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)" },
  };
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 999,
      fontSize: 12, fontWeight: 600, ...tones[tone],
    }}>{children}</span>
  );
}
