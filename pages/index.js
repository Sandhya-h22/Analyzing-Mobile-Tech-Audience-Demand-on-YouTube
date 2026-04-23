import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Navbar from "../components/Navbar";

const PIPELINE_STAGES = [
  { id: 1, label: "Data Collection",     desc: "YouTube API v3",                          icon: "📡", color: "#00d4ff" },
  { id: 2, label: "NLP Preprocessing",   desc: "Clean → Tokenize → Lemmatize",            icon: "🧹", color: "#f59e0b" },
  { id: 3, label: "Tech Classification", desc: "ML keyword scoring",                       icon: "🔬", color: "#7c3aed" },
  { id: 4, label: "Sentiment Analysis",  desc: "Positive / Negative / Neutral",            icon: "😊", color: "#10b981" },
  { id: 5, label: "Intent Detection",    desc: "Purchase · Collab · Support · Request",   icon: "🎯", color: "#ff4d6d" },
  { id: 6, label: "LDA + K-Means",       desc: "Topic modelling & clustering",             icon: "🤖", color: "#a78bfa" },
  { id: 7, label: "Weighted Ranking",    desc: "Virality + Demand score",                  icon: "🏆", color: "#00d4ff" },
];

const TOP_CHANNELS = [
  { id: "UCBJycsmduvYEL83R_U4JriQ", name: "MKBHD",           avatar: "📱", color: "#ff4d6d" },
  { id: "UCSOpcUkE-is7u7c4AkLgqTw", name: "MrMobile",        avatar: "📲", color: "#7c3aed" },
  { id: "UCVYamHliCI9rw1tHR1xbkfw", name: "Dave2D",          avatar: "💻", color: "#00d4ff" },
  { id: "UCddiUEpeqJcYeBxX1IVBKvQ", name: "The Verge",       avatar: "🔬", color: "#10b981" },
  { id: "UCXuqSBlHAE6Xw-yeJA0Tunw", name: "Linus Tech Tips", avatar: "🛠",  color: "#f59e0b" },
];

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Home() {
  const router = useRouter();

  // Mode: "trending" | "compare" | "history"
  const [mode, setMode]               = useState("trending");
  const [singleUrl, setSingleUrl]     = useState("");
  const [compareUrls, setCompareUrls] = useState(["", "", "", "", ""]);
  const [daysBack, setDaysBack]       = useState(7);
  const [loading, setLoading]         = useState(false);
  const [activeStage, setActiveStage] = useState(-1);
  const [stageLog, setStageLog]       = useState([]);
  const [error, setError]             = useState("");
  const [history, setHistory]         = useState([]);
  const [histSearch, setHistSearch]   = useState("");
  const [expandedEntry, setExpandedEntry] = useState(null);

  useEffect(() => {
    try { setHistory(JSON.parse(localStorage.getItem("yt_history") || "[]")); } catch {}
  }, [mode]);

  // Animate pipeline stages while loading
  useEffect(() => {
    if (!loading) { setActiveStage(-1); setStageLog([]); return; }
    let i = 0;
    const tick = () => {
      const stage = PIPELINE_STAGES[i];
      if (!stage) return;
      setActiveStage(i);
      setStageLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${stage.label}...`]);
      i++;
      setTimeout(tick, 900);
    };
    tick();
  }, [loading]);

  // ── Trending: auto-fetch top 5 channels last N days ───────────────────────
  async function handleTrending() {
    setError(""); setLoading(true); setStageLog([]);
    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "channels",
          channels: TOP_CHANNELS.map(c => ({ id: c.id, name: c.name })),
          daysBack,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Analysis failed");

      // Save to history
      saveHistory({
        type: "channels",
        label: `Top 5 Mobile Channels — Last ${daysBack} day(s)`,
        channels: TOP_CHANNELS.map(c => c.name),
        totalVideos: data.aggregate?.totalVideos || 0,
        totalComments: data.aggregate?.totalComments || 0,
        data,
      });

      sessionStorage.setItem("yt_analysis", JSON.stringify(data));
      router.push("/dashboard");
    } catch (err) { setError(err.message); setLoading(false); }
  }

  // ── Compare: up to 5 custom video URLs ───────────────────────────────────
  async function handleCompare() {
    const urls = compareUrls.filter(u => u.trim());
    if (urls.length < 1) { setError("Add at least 1 YouTube URL to analyse"); return; }
    setError(""); setLoading(true); setStageLog([]);
    try {
      const isSingleVideo = urls.length === 1;
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isSingleVideo
            ? { mode: "single", url: urls[0] }
            : { mode: "compare", urls }
        ),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Analysis failed");

      if (isSingleVideo) {
        saveHistory({
          type: "single",
          label: data.metadata?.title || "Single Video Analysis",
          channels: [data.metadata?.channel || urls[0]],
          totalVideos: 1,
          totalComments: data.stats?.total || 0,
          data,
        });
      } else {
        saveHistory({
          type: "compare",
          label: `Compared ${urls.length} videos`,
          channels: urls.map(u => u.slice(0, 50)),
          totalVideos: urls.length,
          totalComments: (data.videos || []).reduce((s, v) => s + (v.stats?.total || 0), 0),
          topVideos: (data.videos || []).filter(v => !v.error).map(v => ({
            title: v.metadata?.title || v.url,
            channel: v.metadata?.channel || "",
            thumbnail: v.metadata?.thumbnail || "",
            stats: v.stats,
            sentimentStats: v.sentimentStats,
            viralityScore: v.viralityScore,
            demandComments: (v.demandComments || []).slice(0, 5),
          })),
          data,
        });
      }

      sessionStorage.setItem("yt_analysis", JSON.stringify(data));
      router.push("/dashboard");
    } catch (err) { setError(err.message); setLoading(false); }
  }

  function saveHistory(entry) {
    try {
      const h = JSON.parse(localStorage.getItem("yt_history") || "[]");
      h.unshift({ id: Date.now(), createdAt: new Date().toISOString(), ...entry });
      localStorage.setItem("yt_history", JSON.stringify(h.slice(0, 20)));
    } catch {}
  }

  function loadEntry(entry) {
    sessionStorage.setItem("yt_analysis", JSON.stringify(entry.data));
    router.push("/dashboard");
  }

  function deleteEntry(id) {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    localStorage.setItem("yt_history", JSON.stringify(updated));
    if (expandedEntry === id) setExpandedEntry(null);
  }

  const filteredHistory = history.filter(h =>
    !histSearch ||
    h.label?.toLowerCase().includes(histSearch.toLowerCase()) ||
    h.channels?.some(c => c.toLowerCase().includes(histSearch.toLowerCase()))
  );

  const typeColors = { channels: "#f59e0b", compare: "#7c3aed", single: "#00d4ff" };

  return (
    <>
      <Head><title>YTAnalyser – Mobile Tech Intelligence</title></Head>
      <Navbar hideHistoryAndChannels />
      <main style={{ minHeight: "calc(100vh - 56px)", padding: "56px 0 80px" }}>
        <div className="container" style={{ maxWidth: 860 }}>

          {/* Hero */}
          <div className="fade-in" style={{ textAlign: "center", marginBottom: 44 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#00d4ff11", border: "1px solid #00d4ff33", borderRadius: 20, padding: "4px 16px", marginBottom: 20, fontSize: 11, color: "var(--accent)", letterSpacing: "0.12em", fontWeight: 700 }}>
              ⚡ MOBILE TECH · NLP DEMAND INTELLIGENCE
            </div>
            <h1 style={{ fontSize: "clamp(2rem, 6vw, 3.6rem)", marginBottom: 16, letterSpacing: "-0.04em", lineHeight: 1.1 }}>
              What does the smartphone audience{" "}
              <span style={{ color: "var(--accent)", textDecoration: "underline", textDecorationStyle: "wavy", textDecorationColor: "#00d4ff44" }}>really</span> want?
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: 15, maxWidth: 560, margin: "0 auto", lineHeight: 1.7, fontFamily: "var(--font-mono)" }}>
              Explore trending mobile videos, compare channels, and surface audience demand — all powered by 7-stage NLP.
            </p>
          </div>

          {/* ── Mode Buttons ─────────────────────────────────────────────────── */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 32, flexWrap: "wrap" }}>
            {[
              { key: "trending", label: "🔥 Trending Videos",       desc: "Top 5 mobile channels · auto-fetch" },
              { key: "compare",  label: "⚖️ Compare Top 5 Videos",  desc: "Paste up to 5 video URLs"           },
              { key: "history",  label: `🕐 Search History ${history.length > 0 ? `(${history.length})` : ""}`, desc: "Your past analyses" },
            ].map(({ key, label, desc }) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                style={{
                  padding: "14px 22px", borderRadius: "var(--radius)", cursor: "pointer",
                  border: `2px solid ${mode === key ? "var(--accent)" : "var(--border)"}`,
                  background: mode === key ? "#00d4ff11" : "var(--bg2)",
                  color: mode === key ? "var(--accent)" : "var(--text-muted)",
                  fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 13,
                  transition: "all 0.2s", minWidth: 190,
                  boxShadow: mode === key ? "0 0 20px #00d4ff22" : "none",
                }}
              >
                <div>{label}</div>
                <div style={{ fontSize: 10, fontWeight: 400, fontFamily: "var(--font-mono)", marginTop: 4, opacity: 0.7 }}>{desc}</div>
              </button>
            ))}
          </div>

          {/* ── TRENDING MODE ────────────────────────────────────────────────── */}
          {mode === "trending" && (
            <div className="fade-in">
              <div className="card" style={{ padding: 24, marginBottom: 16 }}>
                {/* Days selector */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-display)", fontWeight: 700 }}>Analyse last:</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[1, 3, 7, 14].map(d => (
                      <button key={d} onClick={() => setDaysBack(d)} className="btn" style={{ fontSize: 12, padding: "6px 14px", background: daysBack === d ? "var(--accent)" : "var(--bg3)", color: daysBack === d ? "var(--bg)" : "var(--text-muted)", border: `1px solid ${daysBack === d ? "var(--accent)" : "var(--border)"}` }}>
                        {d} day{d > 1 ? "s" : ""}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Channel list */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                  {TOP_CHANNELS.map(ch => (
                    <div key={ch.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--bg3)", border: `1px solid ${ch.color}33`, borderRadius: "var(--radius)", borderLeft: `3px solid ${ch.color}` }}>
                      <span style={{ fontSize: 20 }}>{ch.avatar}</span>
                      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: ch.color }}>{ch.name}</span>
                      <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-dim)" }}>Auto-included ✓</span>
                    </div>
                  ))}
                </div>

                <button className="btn btn-primary" onClick={handleTrending} disabled={loading} style={{ width: "100%", fontSize: 14, padding: "14px", justifyContent: "center" }}>
                  {loading ? <><span className="spin" style={{ display: "inline-block" }}>⟳</span> Analysing channels…</> : `🔥 Fetch & Analyse Last ${daysBack} Day(s)`}
                </button>
              </div>
            </div>
          )}

          {/* ── COMPARE MODE ──────────────────────────────────────────────────── */}
          {mode === "compare" && (
            <div className="fade-in">
              <div className="card" style={{ padding: 24, marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-display)", fontWeight: 700, marginBottom: 14 }}>
                  Paste up to 5 YouTube video URLs
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                  {compareUrls.map((url, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div style={{ minWidth: 24, textAlign: "center", fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-display)", fontWeight: 700 }}>{i + 1}</div>
                      <input
                        className="input"
                        type="url"
                        placeholder={`https://www.youtube.com/watch?v=... (Video ${i + 1}${i >= 2 ? " – optional" : ""})`}
                        value={url}
                        onChange={e => setCompareUrls(prev => prev.map((v, idx) => idx === i ? e.target.value : v))}
                        disabled={loading}
                        style={{ flex: 1, fontSize: 12 }}
                      />
                      {url && (
                        <button onClick={() => setCompareUrls(prev => prev.map((v, idx) => idx === i ? "" : v))} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: 14 }}>✕</button>
                      )}
                    </div>
                  ))}
                </div>
                <button className="btn btn-primary" onClick={handleCompare} disabled={loading || compareUrls.filter(u => u.trim()).length < 1} style={{ width: "100%", fontSize: 14, padding: "14px", justifyContent: "center" }}>
                  {loading
                    ? <><span className="spin" style={{ display: "inline-block" }}>⟳</span> Analysing videos…</>
                    : compareUrls.filter(u => u.trim()).length <= 1
                      ? "🎬 Analyse 1 Video"
                      : `⚖️ Compare ${compareUrls.filter(u => u.trim()).length} Videos`}
                </button>
                <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-dim)", textAlign: "center" }}>
                  Minimum 1 URL required · Maximum 5 videos
                </div>
              </div>
            </div>
          )}

          {/* ── HISTORY MODE ──────────────────────────────────────────────────── */}
          {mode === "history" && (
            <div className="fade-in">
              {history.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: 60 }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 18, marginBottom: 8 }}>No history yet</div>
                  <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 24 }}>Run Trending or Compare analysis to see results here</div>
                  <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                    <button className="btn btn-primary" onClick={() => setMode("trending")} style={{ fontSize: 13 }}>🔥 Trending Videos</button>
                    <button className="btn btn-secondary" onClick={() => setMode("compare")} style={{ fontSize: 13 }}>⚖️ Compare Videos</button>
                  </div>
                </div>
              ) : (
                <div>
                  {/* Search */}
                  <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
                    <input className="input" placeholder="Search history…" value={histSearch} onChange={e => setHistSearch(e.target.value)} style={{ flex: 1 }} />
                    <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{filteredHistory.length} result{filteredHistory.length !== 1 ? "s" : ""}</span>
                    <button className="btn btn-secondary" onClick={() => { setHistory([]); localStorage.removeItem("yt_history"); }} style={{ fontSize: 11, color: "var(--red)", borderColor: "var(--red)" }}>🗑 Clear</button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {filteredHistory.map(entry => {
                      const color = typeColors[entry.type] || "#6b7a99";
                      const isExpanded = expandedEntry === entry.id;

                      return (
                        <div key={entry.id} className="card" style={{ borderLeft: `3px solid ${color}`, padding: 0, overflow: "hidden" }}>
                          {/* Header row */}
                          <div style={{ padding: "14px 16px", cursor: "pointer" }} onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                              <div style={{ fontSize: 22 }}>{ entry.type === "channels" ? "📡" : entry.type === "compare" ? "⚖️" : "🎬" }</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14 }}>{entry.label}</span>
                                  <span style={{ background: `${color}22`, color, border: `1px solid ${color}44`, borderRadius: 20, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>{entry.type}</span>
                                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{timeAgo(entry.createdAt)}</span>
                                </div>

                                {/* Stats */}
                                <div style={{ display: "flex", gap: 14, fontSize: 12, color: "var(--text-muted)", flexWrap: "wrap", marginBottom: 6 }}>
                                  {entry.totalVideos > 0 && <span>🎬 {entry.totalVideos} video{entry.totalVideos !== 1 ? "s" : ""}</span>}
                                  {entry.totalComments > 0 && <span>💬 {entry.totalComments.toLocaleString()} comments</span>}
                                  <span>📅 {new Date(entry.createdAt).toLocaleDateString()}</span>
                                </div>

                                {/* Channel tags */}
                                {entry.channels?.length > 0 && (
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                    {entry.channels.slice(0,5).map((c, i) => (
                                      <span key={i} className="tag" style={{ fontSize: 10, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c}</span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Actions */}
                              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                                <button className="btn btn-primary" onClick={e => { e.stopPropagation(); loadEntry(entry); }} style={{ fontSize: 11, padding: "6px 12px" }}>View →</button>
                                <button className="btn btn-secondary" onClick={e => { e.stopPropagation(); deleteEntry(entry.id); }} style={{ fontSize: 11, padding: "6px 10px", color: "var(--red)", borderColor: "var(--red)" }}>🗑</button>
                              </div>

                              <div style={{ color: "var(--text-dim)", fontSize: 12, transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>▼</div>
                            </div>
                          </div>

                          {/* ── Expanded: per-video details ──────────────────── */}
                          {isExpanded && (
                            <div style={{ borderTop: "1px solid var(--border)", background: "var(--bg3)", padding: "14px 16px" }}>

                              {/* Channels type: aggregate stats */}
                              {entry.type === "channels" && entry.data?.aggregate && (
                                <div>
                                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Aggregate Results</div>
                                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(100px,1fr))", gap: 8, marginBottom: 14 }}>
                                    {[
                                      ["Videos", entry.data.aggregate.totalVideos, color],
                                      ["Comments", (entry.data.aggregate.totalComments||0).toLocaleString(), "#00d4ff"],
                                      ["Demand", entry.data.aggregate.totalDemand||0, "#10b981"],
                                      ["😊 Pos", `${Math.round(((entry.data.aggregate.sentimentStats?.positive||0)/Math.max(1,entry.data.aggregate.sentimentStats?.total))*100)}%`, "#10b981"],
                                      ["😤 Neg", `${Math.round(((entry.data.aggregate.sentimentStats?.negative||0)/Math.max(1,entry.data.aggregate.sentimentStats?.total))*100)}%`, "#ef4444"],
                                    ].map(([label, val, c]) => (
                                      <div key={label} style={{ background:"var(--bg2)", borderRadius:6, padding:"8px 10px", textAlign:"center" }}>
                                        <div style={{ fontSize:16, fontWeight:800, fontFamily:"var(--font-display)", color:c }}>{val}</div>
                                        <div style={{ fontSize:9, color:"var(--text-muted)", textTransform:"uppercase" }}>{label}</div>
                                      </div>
                                    ))}
                                  </div>
                                  {/* Top demanded videos */}
                                  {(entry.data.aggregate.topVideosByDemand||[]).length > 0 && (
                                    <div>
                                      <div style={{ fontSize:10, color:"var(--text-muted)", fontFamily:"var(--font-display)", fontWeight:700, textTransform:"uppercase", marginBottom:8 }}>🔥 Most Demanded Videos</div>
                                      {(entry.data.aggregate.topVideosByDemand||[]).slice(0,3).map((v,i) => (
                                        <div key={i} style={{ display:"flex", gap:10, alignItems:"center", background:"var(--bg2)", borderRadius:6, padding:"8px 10px", marginBottom:6 }}>
                                          {v.thumbnail && <img src={v.thumbnail} alt="" style={{ width:56,height:32,objectFit:"cover",borderRadius:4,flexShrink:0 }} />}
                                          <div style={{ flex:1, minWidth:0 }}>
                                            <div style={{ fontSize:12, fontWeight:700, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>{v.title}</div>
                                            <div style={{ fontSize:10, color:"var(--text-muted)" }}>{v.channel} · 🎯 {v.stats?.demand} demand</div>
                                          </div>
                                          <div style={{ fontSize:16, fontWeight:800, color:"var(--accent)", fontFamily:"var(--font-display)" }}>#{i+1}</div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Compare type: per-video breakdown */}
                              {entry.type === "compare" && (entry.topVideos||[]).length > 0 && (
                                <div>
                                  <div style={{ fontSize:11, color:"var(--text-muted)", fontFamily:"var(--font-display)", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Videos Compared</div>
                                  {(entry.topVideos||[]).map((v, i) => (
                                    <div key={i} style={{ background:"var(--bg2)", borderRadius:8, padding:"10px 12px", marginBottom:10, border:"1px solid var(--border)" }}>
                                      <div style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:8 }}>
                                        {v.thumbnail && <img src={v.thumbnail} alt="" style={{ width:72,height:40,objectFit:"cover",borderRadius:4,flexShrink:0 }} />}
                                        <div style={{ flex:1, minWidth:0 }}>
                                          <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:13, marginBottom:2, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{v.title}</div>
                                          <div style={{ fontSize:11, color:"var(--text-muted)" }}>{v.channel}</div>
                                        </div>
                                      </div>
                                      {/* Stats row */}
                                      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6, marginBottom:8 }}>
                                        {[
                                          ["Comments", v.stats?.total||0, "#00d4ff"],
                                          ["Demand", v.stats?.demand||0, "#10b981"],
                                          ["😊 Pos", `${Math.round(((v.sentimentStats?.positive||0)/Math.max(1,v.sentimentStats?.total))*100)}%`, "#10b981"],
                                          ["🔥 Viral", v.viralityScore?.score||0, "#f59e0b"],
                                        ].map(([label, val, c]) => (
                                          <div key={label} style={{ textAlign:"center", background:"var(--bg3)", borderRadius:5, padding:"5px 4px" }}>
                                            <div style={{ fontSize:14, fontWeight:800, fontFamily:"var(--font-display)", color:c }}>{val}</div>
                                            <div style={{ fontSize:9, color:"var(--text-muted)" }}>{label}</div>
                                          </div>
                                        ))}
                                      </div>
                                      {/* Demand comments */}
                                      {(v.demandComments||[]).length > 0 && (
                                        <div>
                                          <div style={{ fontSize:10, color:"var(--text-muted)", fontFamily:"var(--font-display)", fontWeight:700, textTransform:"uppercase", marginBottom:6 }}>🎯 Top Demand Comments</div>
                                          {(v.demandComments||[]).slice(0,3).map((c, ci) => (
                                            <div key={ci} style={{ background:"var(--bg3)", borderRadius:5, padding:"6px 8px", marginBottom:4, fontSize:11 }}>
                                              <span style={{ color:"var(--text-muted)" }}>@{c.author} · 👍{c.likeCount}</span>
                                              {c.demandMatches?.length > 0 && (
                                                <span style={{ marginLeft:6, background:"#10b98122", color:"var(--green)", border:"1px solid #10b98144", borderRadius:10, padding:"1px 6px", fontSize:10 }}>
                                                  "{c.demandMatches[0]}"
                                                </span>
                                              )}
                                              <div style={{ marginTop:3, color:"var(--text)", lineHeight:1.4 }}>{c.text?.slice(0,100)}…</div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Error ───────────────────────────────────────────────────────── */}
          {error && (
            <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: "var(--radius)", background: "#ef444411", border: "1px solid #ef444433", color: "var(--red)", fontSize: 13 }}>
              ⚠ {error}
            </div>
          )}

          {/* ── Pipeline visualizer (shows while loading) ────────────────────── */}
          {(loading || mode === "trending" || mode === "compare") && (
            <div className="card" style={{ marginTop: 20, padding: 20 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "var(--font-display)", fontWeight: 700, marginBottom: 14 }}>7-Stage Analysis Pipeline</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {PIPELINE_STAGES.map((stage, i) => {
                  const isActive = activeStage === i, isDone = activeStage > i;
                  return (
                    <div key={stage.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 10px", borderRadius:"var(--radius)", background: isActive?`${stage.color}11`:isDone?`${stage.color}08`:"var(--bg3)", border:`1px solid ${isActive?stage.color:isDone?`${stage.color}44`:"var(--border)"}`, transition:"all 0.3s" }}>
                      <div style={{ width:22, height:22, borderRadius:5, background:isActive?stage.color:isDone?`${stage.color}22`:"var(--bg4)", border:`1px solid ${isActive?stage.color:isDone?`${stage.color}66`:"var(--border)"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:isActive?"var(--bg)":isDone?stage.color:"var(--text-dim)", fontWeight:700 }}>
                        {isDone?"✓":stage.id}
                      </div>
                      <span style={{ fontSize:14, opacity:isActive||isDone?1:0.3 }}>{stage.icon}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:11, fontWeight:700, fontFamily:"var(--font-display)", color:isActive?stage.color:isDone?"var(--text)":"var(--text-dim)" }}>{stage.label}</div>
                        <div style={{ fontSize:10, color:"var(--text-dim)" }}>{stage.desc}</div>
                      </div>
                      {isActive && <span style={{ fontSize:10, color:stage.color }}><span className="pulse">●</span> RUNNING</span>}
                      {isDone && <span style={{ fontSize:10, color:"var(--green)" }}>DONE</span>}
                    </div>
                  );
                })}
              </div>
              {stageLog.length > 0 && (
                <div style={{ marginTop:10, background:"var(--bg)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:10, fontFamily:"var(--font-mono)", fontSize:11, color:"var(--green)", maxHeight:80, overflowY:"auto" }}>
                  {stageLog.map((line,i) => <div key={i}>{line}</div>)}
                  {loading && <div style={{ color:"var(--accent)" }}>█</div>}
                </div>
              )}
            </div>
          )}

          {/* ── Stats counter ─────────────────────────────────────────────────── */}
          <div style={{ marginTop: 24, fontSize: 12, color: "var(--text-dim)", textAlign: "center" }}>
            {history.length} video{history.length !== 1 ? "s" : ""} analysed
          </div>

        </div>
      </main>
    </>
  );
}
