// components/Navbar.js
import Link from "next/link";
import { useRouter } from "next/router";

export default function Navbar() {
  const router = useRouter();

  return (
    <nav style={{
      background: "var(--bg2)",
      borderBottom: "1px solid var(--border)",
      position: "sticky", top: 0, zIndex: 100,
      backdropFilter: "blur(12px)",
    }}>
      <div className="container" style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 56,
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{
            width: 28, height: 28, background: "var(--accent2)",
            borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14,
          }}>▶</div>
          <span style={{
            fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16,
            color: "var(--text)", letterSpacing: "-0.02em",
          }}>
            YT<span style={{ color: "var(--accent)" }}>Analyser</span>
          </span>
        </Link>

        {/* Nav Links */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {[
            { href: "/", label: "Analyse" },
            { href: "/dashboard", label: "Dashboard" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius)",
                fontSize: 13,
                fontWeight: 700,
                color: router.pathname === href ? "var(--accent)" : "var(--text-muted)",
                background: router.pathname === href ? "#00d4ff11" : "transparent",
                textDecoration: "none",
                transition: "all 0.2s",
                letterSpacing: "0.03em",
              }}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Status dot */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)" }}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%",
            background: "var(--green)", display: "inline-block",
            boxShadow: "0 0 8px var(--green)",
          }} />
          API READY
        </div>
      </div>
    </nav>
  );
}