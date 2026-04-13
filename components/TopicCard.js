// components/TopicCard.js
import { useState } from "react";

export default function TopicCard({ topic, rank }) {
  const [expanded, setExpanded] = useState(false);

  const pct = Math.round((topic.weightedScore || 0) * 100);
  const confPct = Math.round((topic.confidence || 0) * 100);

  return (
    <div className="card" style={{
      borderLeft: `3px solid ${topic.color || "var(--accent)"}`,
      cursor: "pointer",
      transition: "all 0.2s",
    }}
      onClick={() => setExpanded((e) => !e)}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        {/* Rank */}
        <div style={{
          minWidth: 32, height: 32, borderRadius: 6,
          background: rank <= 3 ? `${topic.color}22` : "var(--bg3)",
          border: `1px solid ${rank <= 3 ? topic.color : "var(--border)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 14,
          color: rank <= 3 ? topic.color : "var(--text-muted)",
        }}>
          #{rank}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 18 }}>{topic.emoji}</span>
            <span style={{
              fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15,
              color: "var(--text)",
            }}>
              {topic.label}
            </span>
            <span className="badge badge-demand">{topic.commentCount} demands</span>
          </div>

          {/* Score bar */}
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Weighted Score</span>
              <span style={{ fontSize: 11, color: topic.color, fontWeight: 700 }}>{pct}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${topic.color}, ${topic.color}88)`,
                }}
              />
            </div>
          </div>

          {/* Score breakdown */}
          <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
            {[
              { label: "Freq", val: topic.frequencyScore, color: "#00d4ff" },
              { label: "Eng", val: topic.engagementScore, color: "#f59e0b" },
              { label: "Rec", val: topic.recencyScore, color: "#10b981" },
              { label: "Div", val: topic.diversityScore, color: "#7c3aed" },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ fontSize: 11, color: "var(--text-muted)" }}>
                <span style={{ color }}>{label}: </span>
                {Math.round((val || 0) * 100)}%
              </div>
            ))}
          </div>
        </div>

        {/* Expand chevron */}
        <div style={{
          color: "var(--text-dim)", fontSize: 12, marginTop: 4,
          transform: expanded ? "rotate(180deg)" : "none",
          transition: "transform 0.2s",
        }}>▼</div>
      </div>

      {/* Top words */}
      <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 4 }}>
        {(topic.topWords || []).slice(0, 8).map(({ word, count }) => (
          <span key={word} className="tag tag-accent" style={{ borderColor: `${topic.color}66`, color: topic.color }}>
            {word} <span style={{ opacity: 0.6 }}>×{count}</span>
          </span>
        ))}
      </div>

      {/* Expanded: sample comments */}
      {expanded && topic.sampleComments?.length > 0 && (
        <div style={{ marginTop: 16 }} onClick={(e) => e.stopPropagation()}>
          <div style={{
            fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.1em",
            textTransform: "uppercase", marginBottom: 8, fontFamily: "var(--font-display)",
          }}>
            Sample Demand Comments
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {topic.sampleComments.slice(0, 3).map((c) => (
              <div key={c.commentId} style={{
                background: "var(--bg3)", borderRadius: 6, padding: "10px 12px",
                border: "1px solid var(--border)", fontSize: 13,
              }}>
                <div style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 4 }}>
                  @{c.author} · 👍 {c.likeCount}
                </div>
                <div style={{ color: "var(--text)", lineHeight: 1.5 }}>
                  {c.text?.slice(0, 200)}{c.text?.length > 200 ? "…" : ""}
                </div>
                {c.demandMatches?.length > 0 && (
                  <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {c.demandMatches.slice(0, 3).map((m) => (
                      <span key={m} style={{
                        fontSize: 10, background: "#10b98122", color: "var(--green)",
                        border: "1px solid #10b98144", borderRadius: 4, padding: "1px 6px",
                      }}>
                        "{m}"
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}