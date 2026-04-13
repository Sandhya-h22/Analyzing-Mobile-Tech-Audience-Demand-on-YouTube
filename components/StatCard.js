// components/StatCard.js
export default function StatCard({ label, value, sub, color = "var(--accent)", icon, trend }) {
  return (
    <div className="card" style={{ position: "relative", overflow: "hidden" }}>
      {/* Accent line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: color,
      }} />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{
            fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.12em",
            textTransform: "uppercase", fontWeight: 700, marginBottom: 8,
            fontFamily: "var(--font-display)",
          }}>
            {label}
          </div>
          <div style={{
            fontSize: 32, fontWeight: 800, color, fontFamily: "var(--font-display)",
            lineHeight: 1, letterSpacing: "-0.03em",
          }}>
            {value}
          </div>
          {sub && (
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
              {sub}
            </div>
          )}
        </div>
        {icon && (
          <div style={{
            fontSize: 28, opacity: 0.6,
            background: `${color}18`,
            width: 48, height: 48, borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {icon}
          </div>
        )}
      </div>

      {trend !== undefined && (
        <div style={{
          marginTop: 12, fontSize: 12,
          color: trend >= 0 ? "var(--green)" : "var(--red)",
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <span>{trend >= 0 ? "▲" : "▼"}</span>
          <span>{Math.abs(trend)}%</span>
        </div>
      )}
    </div>
  );
}