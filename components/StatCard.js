// components/StatCard.js
export default function StatCard({ label, value, sub, color = "var(--accent)", icon, trend }) {
  const valueText = String(value ?? "");
  const valueFontSize = valueText.length > 13 ? 18 : valueText.length > 11 ? 21 : valueText.length > 8 ? 24 : valueText.length > 5 ? 28 : 32;

  return (
    <div className="card" style={{ position: "relative", overflow: "hidden", minWidth: 0, minHeight: 126 }}>
      {/* Accent line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: color,
      }} />

      <div style={{ minWidth: 0, paddingRight: icon ? 40 : 0 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.12em",
            textTransform: "uppercase", fontWeight: 700, marginBottom: 8,
            fontFamily: "var(--font-display)", lineHeight: 1.35,
          }}>
            {label}
          </div>
          <div style={{
            fontSize: valueFontSize, fontWeight: 800, color, fontFamily: "var(--font-display)",
            lineHeight: 1.05, letterSpacing: 0, maxWidth: "100%", overflowWrap: "anywhere",
            wordBreak: "break-word", fontVariantNumeric: "tabular-nums",
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
            position: "absolute", right: 12, top: 24,
            fontSize: 24, opacity: 0.55,
            background: `${color}18`,
            width: 40, height: 40, borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none",
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
