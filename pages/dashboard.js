import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import Navbar from "../components/Navbar";
import StatCard from "../components/StatCard";
import TopicCard from "../components/TopicCard";

const TABS = ["Topics", "Keywords", "Comments", "Raw"];

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("Topics");
  const [commentFilter, setCommentFilter] = useState("demand");
  const [searchQuery, setSearchQuery] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("yt_analysis");
    if (stored) {
      try { setData(JSON.parse(stored)); }
      catch { router.push("/"); }
    } else {
      router.push("/");
    }
  }, []);

  if (!data) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <div className="spin" style={{ fontSize: 32, display: "inline-block" }}>⟳</div>
          <div style={{ color: "var(--text-muted)", marginTop: 12 }}>Loading analysis…</div>
        </div>
      </div>
    );
  }

  const { metadata, stats, topics, topKeywords, demandComments, allComments } = data;

  // ── Export helper ────────────────────────────────────────────────────────────
  async function handleExport(type, payload) {
    setExporting(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: payload, type }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `yt-analyser-${type}-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) { alert(err.message); }
    finally { setExporting(false); }
  }

  // ── Filtered comments ────────────────────────────────────────────────────────
  const displayComments = (commentFilter === "demand" ? demandComments : allComments)
    .filter((c) =>
      !searchQuery ||
      c.text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.author?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  // ── Pie chart data ────────────────────────────────────────────────────────────
  const pieData = [
    { name: "Demand", value: stats.demand, color: "#10b981" },
    { name: "Tech (no demand)", value: stats.tech - stats.demand, color: "#00d4ff" },
    { name: "Non-tech", value: stats.nonTech, color: "#3d4f6b" },
  ].filter((d) => d.value > 0);

  // ── Radar data for top 5 topics ───────────────────────────────────────────────
  const radarData = ["frequencyScore", "engagementScore", "recencyScore", "diversityScore"].map((key) => ({
    metric: { frequencyScore: "Frequency", engagementScore: "Engagement", recencyScore: "Recency", diversityScore: "Diversity" }[key],
    ...Object.fromEntries((topics || []).slice(0, 4).map((t) => [t.label, Math.round((t[key] || 0) * 100)])),
  }));

  const radarColors = ["#00d4ff", "#f59e0b", "#10b981", "#ff4d6d"];

  return (
    <>
      <Head>
        <title>Dashboard – YTAnalyser</title>
      </Head>
      <Navbar />

      <main style={{ padding: "28px 0 60px" }}>
        <div className="container">

          {/* Video metadata banner */}
          <div className="card fade-in" style={{ marginBottom: 24, display: "flex", gap: 16, alignItems: "flex-start" }}>
            {metadata.thumbnail && (
              <img
                src={metadata.thumbnail}
                alt={metadata.title}
                style={{ width: 120, height: 68, objectFit: "cover", borderRadius: 6, flexShrink: 0 }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
                {metadata.channel}
              </div>
              <div style={{
                fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16,
                color: "var(--text)", lineHeight: 1.3, marginBottom: 8,
                overflow: "hidden", display: "-webkit-box",
                WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
              }}>
                {metadata.title}
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text-muted)", flexWrap: "wrap" }}>
                <span>👁 {(metadata.viewCount || 0).toLocaleString()} views</span>
                <span>👍 {(metadata.likeCount || 0).toLocaleString()} likes</span>
                <span>💬 {(metadata.commentCount || 0).toLocaleString()} comments</span>
                <span>📅 {metadata.publishedAt ? new Date(metadata.publishedAt).toLocaleDateString() : "—"}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button
                className="btn btn-secondary"
                onClick={() => router.push("/")}
                style={{ fontSize: 12 }}
              >
                ← New
              </button>
              <button
                className="btn btn-primary"
                disabled={exporting}
                onClick={() => handleExport("demand", demandComments)}
                style={{ fontSize: 12 }}
              >
                {exporting ? "…" : "⬇ CSV"}
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 16, marginBottom: 28,
          }}>
            <StatCard label="Total Fetched" value={stats.total.toLocaleString()} icon="💬" color="var(--text)" />
            <StatCard label="Tech Comments" value={stats.tech.toLocaleString()} sub={`${stats.techPercent}% of total`} icon="💻" color="var(--accent)" />
            <StatCard label="Demand Signals" value={stats.demand.toLocaleString()} sub={`${stats.demandPercent}% of total`} icon="🎯" color="var(--green)" />
            <StatCard label="Topics Found" value={(topics || []).length} icon="📋" color="var(--accent3)" />
            <StatCard label="Top Keywords" value={(topKeywords || []).length} icon="🔑" color="var(--accent4)" />
          </div>

          {/* Charts row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
            {/* Pie */}
            <div className="card">
              <div style={{
                fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.1em",
                textTransform: "uppercase", fontFamily: "var(--font-display)", fontWeight: 700, marginBottom: 16,
              }}>
                Comment Distribution
              </div>
              <PieChart width={280} height={200} style={{ margin: "0 auto" }}>
                <Pie data={pieData} cx={140} cy={90} innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }}
                  itemStyle={{ color: "var(--text)" }}
                />
                <Legend
                  formatter={(value) => <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{value}</span>}
                />
              </PieChart>
            </div>

            {/* Topic bar chart */}
            <div className="card">
              <div style={{
                fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.1em",
                textTransform: "uppercase", fontFamily: "var(--font-display)", fontWeight: 700, marginBottom: 16,
              }}>
                Demand by Topic
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={(topics || []).slice(0, 6).map((t) => ({
                  name: t.label.split(" ").slice(0, 2).join(" "),
                  count: t.commentCount,
                  score: Math.round((t.weightedScore || 0) * 100),
                  fill: t.color,
                }))}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b7a99" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#6b7a99" }} />
                  <Tooltip
                    contentStyle={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }}
                    itemStyle={{ color: "var(--text)" }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {(topics || []).slice(0, 6).map((t, i) => (
                      <Cell key={i} fill={t.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "10px 20px", border: "none", background: "transparent",
                  color: activeTab === tab ? "var(--accent)" : "var(--text-muted)",
                  fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13,
                  cursor: "pointer", borderBottom: activeTab === tab ? "2px solid var(--accent)" : "2px solid transparent",
                  marginBottom: -1, letterSpacing: "0.05em", transition: "color 0.2s",
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* ── Tab: Topics ─────────────────────────────────────────────────── */}
          {activeTab === "Topics" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  {(topics || []).length} topics ranked by weighted demand score
                </div>
                <button
                  className="btn btn-secondary"
                  disabled={exporting}
                  onClick={() => handleExport("topics", topics)}
                  style={{ fontSize: 12 }}
                >
                  ⬇ Export Topics CSV
                </button>
              </div>
              {(!topics || topics.length === 0) ? (
                <div className="card" style={{ textAlign: "center", color: "var(--text-muted)", padding: 40 }}>
                  No demand topics found. Try a video with more viewer requests.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {topics.map((topic, i) => (
                    <TopicCard key={topic.topicKey} topic={topic} rank={i + 1} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Keywords ───────────────────────────────────────────────── */}
          {activeTab === "Keywords" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  Top {(topKeywords || []).length} keywords by TF-IDF score
                </div>
                <button
                  className="btn btn-secondary"
                  disabled={exporting}
                  onClick={() => handleExport("keywords", topKeywords)}
                  style={{ fontSize: 12 }}
                >
                  ⬇ Export Keywords CSV
                </button>
              </div>

              {/* Word cloud style display */}
              <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  {(topKeywords || []).map((kw, i) => {
                    const maxScore = topKeywords[0]?.score || 1;
                    const relSize = 11 + Math.round((kw.score / maxScore) * 14);
                    const opacity = 0.4 + (kw.score / maxScore) * 0.6;
                    return (
                      <span key={kw.word} style={{
                        fontSize: relSize, color: "var(--accent)", opacity,
                        fontFamily: "var(--font-display)", fontWeight: 700,
                        padding: "2px 6px", borderRadius: 4,
                        background: `#00d4ff${Math.round(opacity * 20).toString(16).padStart(2, "0")}`,
                        cursor: "default", transition: "opacity 0.2s",
                      }}>
                        {kw.word}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Keyword bar chart */}
              <div className="card">
                <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-display)", fontWeight: 700, marginBottom: 16 }}>
                  TF-IDF Scores – Top 20
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={(topKeywords || []).slice(0, 20).map((kw) => ({ word: kw.word, score: kw.score }))}
                    layout="vertical"
                  >
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#6b7a99" }} />
                    <YAxis dataKey="word" type="category" width={90} tick={{ fontSize: 11, fill: "#6b7a99" }} />
                    <Tooltip
                      contentStyle={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }}
                    />
                    <Bar dataKey="score" fill="var(--accent)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Tab: Comments ───────────────────────────────────────────────── */}
          {activeTab === "Comments" && (
            <div>
              {/* Filters */}
              <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 4 }}>
                  {["demand", "all"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setCommentFilter(f)}
                      className="btn"
                      style={{
                        fontSize: 12,
                        background: commentFilter === f ? "var(--accent)" : "var(--bg3)",
                        color: commentFilter === f ? "var(--bg)" : "var(--text-muted)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {f === "demand" ? `🎯 Demand (${stats.demand})` : `💬 All (${allComments?.length || 0})`}
                    </button>
                  ))}
                </div>
                <input
                  className="input"
                  placeholder="Search comments…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ flex: 1, minWidth: 200 }}
                />
                <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                  {displayComments.length} shown
                </span>
                <button
                  className="btn btn-secondary"
                  disabled={exporting}
                  onClick={() => handleExport("demand", displayComments)}
                  style={{ fontSize: 12 }}
                >
                  ⬇ Export
                </button>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Author</th>
                      <th>Comment</th>
                      <th>Subtopic</th>
                      <th>Demand Phrases</th>
                      <th>Likes</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayComments.slice(0, 100).map((c) => (
                      <tr key={c.commentId}>
                        <td style={{ color: "var(--text-muted)", whiteSpace: "nowrap", fontSize: 12 }}>
                          @{c.author}
                        </td>
                        <td style={{ maxWidth: 400, fontSize: 13, lineHeight: 1.5 }}>
                          <div style={{
                            display: "-webkit-box", WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical", overflow: "hidden",
                          }}>
                            {c.text}
                          </div>
                        </td>
                        <td>
                          {c.subtopic ? (
                            <span className="badge badge-tech" style={{ fontSize: 10 }}>
                              {c.subtopic.replace(/_/g, " ")}
                            </span>
                          ) : "—"}
                        </td>
                        <td>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                            {(c.demandMatches || []).slice(0, 2).map((m) => (
                              <span key={m} className="badge badge-demand" style={{ fontSize: 10 }}>
                                {m}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ color: "var(--accent4)", fontWeight: 700 }}>
                          👍 {c.likeCount}
                        </td>
                        <td style={{ color: "var(--text-dim)", fontSize: 11, whiteSpace: "nowrap" }}>
                          {c.publishedAt ? new Date(c.publishedAt).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {displayComments.length > 100 && (
                <div style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: "var(--text-muted)" }}>
                  Showing 100 of {displayComments.length}. Export CSV to get all.
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Raw JSON ───────────────────────────────────────────────── */}
          {activeTab === "Raw" && (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 16px", borderBottom: "1px solid var(--border)",
              }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Raw API Response (JSON)</span>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: 12 }}
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url; a.download = "yt-analysis.json"; a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  ⬇ Download JSON
                </button>
              </div>
              <pre style={{
                padding: 16, fontSize: 11, color: "var(--green)", overflowX: "auto",
                maxHeight: 600, background: "var(--bg)", lineHeight: 1.6,
              }}>
                {JSON.stringify({ metadata, stats, topics: topics?.slice(0, 3), topKeywords: topKeywords?.slice(0, 10) }, null, 2)}
              </pre>
            </div>
          )}

        </div>
      </main>
    </>
  );
}