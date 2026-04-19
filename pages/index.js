// pages/index.js
// Three modes on the home page:
//   1. TRENDING  — top 5 mobile videos auto-loaded, click one to analyse instantly
//   2. COMPARE   — user picks a channel → see its top 5 videos → select 2-5 → compare (last 7 days)
//   3. HISTORY   — localStorage list of all previously analysed videos with full details

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Navbar from "../components/Navbar";

// ── helpers ───────────────────────────────────────────────────────────────────
const HISTORY_KEY = "yt_history";

function loadHistory() {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
  catch { return []; }
}

function saveToHistory(entry) {
  if (typeof window === "undefined") return;
  const existing = loadHistory();
  const filtered = existing.filter(e => e.videoId !== entry.videoId);
  const updated  = [entry, ...filtered].slice(0, 20);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

function clearHistory() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(HISTORY_KEY);
}

// ── small UI atoms ────────────────────────────────────────────────────────────
function TabBtn({ label, active, onClick, count }) {
  return (
    <button onClick={onClick} style={{
      padding: "9px 20px", borderRadius: "var(--radius)",
      background: active ? "var(--accent)" : "var(--bg3)",
      color: active ? "var(--bg)" : "var(--text-muted)",
      border: active ? "none" : "1px solid var(--border)",
      fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 13,
      cursor: "pointer", display: "flex", alignItems: "center", gap: 7,
      transition: "all 0.15s",
    }}>
      {label}
      {count !== undefined && (
        <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 20,
          background: active ? "#ffffff33" : "var(--bg4)", color: active ? "#fff" : "var(--text-dim)" }}>
          {count}
        </span>
      )}
    </button>
  );
}

function VideoCard({ video, selectable, selected, onSelect, onAnalyse, winner, loading }) {
  const isWinner = winner;
  return (
    <div
      onClick={() => selectable ? onSelect(video.videoId) : onAnalyse(video)}
      style={{
        cursor: "pointer", borderRadius: "var(--radius)",
        border: `1.5px solid ${selected ? "var(--accent)" : isWinner ? "#f59e0b" : "var(--border)"}`,
        background: selected ? "#00d4ff08" : "var(--bg2)",
        overflow: "hidden", transition: "all 0.15s",
        opacity: loading ? 0.5 : 1,
        position: "relative",
      }}
    >
      {isWinner && (
        <div style={{ position:"absolute", top:8, right:8, fontSize:10, fontWeight:700, color:"#f59e0b",
          background:"#f59e0b22", border:"1px solid #f59e0b44", borderRadius:20, padding:"2px 8px", zIndex:2 }}>
          🏆 TOP
        </div>
      )}
      {selected && (
        <div style={{ position:"absolute", top:8, left:8, width:20, height:20, borderRadius:"50%",
          background:"var(--accent)", display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:11, color:"var(--bg)", fontWeight:700, zIndex:2 }}>✓</div>
      )}
      {video.thumbnail && (
        <img src={video.thumbnail} alt={video.title}
          style={{ width:"100%", height:130, objectFit:"cover", display:"block" }} />
      )}
      <div style={{ padding:"12px 14px" }}>
        <div style={{ fontSize:13, fontWeight:700, lineHeight:1.3, marginBottom:6, color:"var(--text)" }}>
          {video.title?.slice(0, 72)}{video.title?.length > 72 ? "…" : ""}
        </div>
        <div style={{ fontSize:11, color:"var(--text-muted)", marginBottom:8 }}>{video.channel}</div>
        <div style={{ display:"flex", gap:12, fontSize:11, color:"var(--text-dim)" }}>
          {video.viewCount    != null && <span>👁 {(video.viewCount    || 0).toLocaleString()}</span>}
          {video.likeCount    != null && <span>👍 {(video.likeCount    || 0).toLocaleString()}</span>}
          {video.commentCount != null && <span>💬 {(video.commentCount || 0).toLocaleString()}</span>}
        </div>
      </div>
    </div>
  );
}

// ── pipeline stages ───────────────────────────────────────────────────────────
const STAGES = [
  { label:"Fetching comments", desc:"YouTube API v3 — last 7 days" },
  { label:"Preprocessing",     desc:"Clean · Tokenize · Lemmatize" },
  { label:"Classifying",       desc:"Tech vs non-tech" },
  { label:"TF-IDF",            desc:"Feature extraction" },
  { label:"Demand detection",  desc:"Pattern scoring" },
  { label:"LDA + K-Means",     desc:"Topic clustering" },
  { label:"Ranking",           desc:"Weighted score" },
];

// ═════════════════════════════════════════════════════════════════════════════
export default function Home() {
  const router = useRouter();

  // ── mode ──────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState("trending");   // "trending" | "compare" | "history"

  // ── trending ──────────────────────────────────────────────────────────────
  const [trending,     setTrending]     = useState([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const [trendError,   setTrendError]   = useState("");

  // ── compare ───────────────────────────────────────────────────────────────
  const [channelInput,  setChannelInput]  = useState("");
  const [channelVideos, setChannelVideos] = useState([]);
  const [channelName,   setChannelName]   = useState("");
  const [channelLoading,setChannelLoading]= useState(false);
  const [channelError,  setChannelError]  = useState("");
  const [selected,      setSelected]      = useState([]);   // selected videoIds
  const [compareResult, setCompareResult] = useState(null);
  const [comparing,     setComparing]     = useState(false);
  const [compareStage,  setCompareStage]  = useState(-1);
  const [compareError,  setCompareError]  = useState("");

  // ── single analyse (trending click) ───────────────────────────────────────
  const [analysingId,   setAnalysingId]   = useState(null);
  const [analyseError,  setAnalyseError]  = useState("");
  const [stage,         setStage]         = useState(-1);

  // ── history ───────────────────────────────────────────────────────────────
  const [history, setHistory] = useState([]);

  // Load trending on mount
  useEffect(() => {
    setHistory(loadHistory());
    fetch("/api/trending")
      .then(r => r.json())
      .then(d => { if (d.success) setTrending(d.videos); else setTrendError(d.error || "Failed"); })
      .catch(e => setTrendError(e.message))
      .finally(() => setTrendLoading(false));
  }, []);

  // ── Analyse single video (from trending) ─────────────────────────────────
  async function handleAnalyse(video) {
    setAnalysingId(video.videoId);
    setAnalyseError("");
    setStage(0);
    const stageTimer = setInterval(() => setStage(s => s < STAGES.length - 1 ? s + 1 : s), 900);

    try {
      const res  = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: `https://youtube.com/watch?v=${video.videoId}`, maxComments: 200 }),
      });
      const data = await res.json();
      clearInterval(stageTimer);
      if (!data.success) throw new Error(data.error || "Analysis failed");

      // Save to history
      saveToHistory({
        videoId:     video.videoId,
        title:       data.metadata?.title || video.title,
        channel:     data.metadata?.channel || video.channel,
        thumbnail:   data.metadata?.thumbnail || video.thumbnail,
        viewCount:   data.metadata?.viewCount,
        analysedAt:  new Date().toISOString(),
        stats:       data.stats,
        topSentiment: data.sentiment?.summary?.overallLabel,
        topTopic:    data.topics?.[0]?.label,
      });

      sessionStorage.setItem("yt_analysis", JSON.stringify(data));
      router.push("/dashboard");
    } catch (err) {
      clearInterval(stageTimer);
      setAnalyseError(err.message);
      setAnalysingId(null);
      setStage(-1);
    }
  }

  // ── Load channel videos ───────────────────────────────────────────────────
  async function handleLoadChannel() {
    if (!channelInput.trim()) { setChannelError("Enter a channel @handle or URL"); return; }
    setChannelLoading(true); setChannelError(""); setChannelVideos([]); setSelected([]); setCompareResult(null);
    try {
      const res  = await fetch("/api/channel", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelInput: channelInput.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setChannelVideos(data.videos || []);
      setChannelName(data.channelName || "");
    } catch (err) { setChannelError(err.message); }
    setChannelLoading(false);
  }

  // ── Toggle selection ──────────────────────────────────────────────────────
  function toggleSelect(videoId) {
    setSelected(s => s.includes(videoId) ? s.filter(x => x !== videoId) : s.length < 5 ? [...s, videoId] : s);
  }

  // ── Run compare ───────────────────────────────────────────────────────────
  async function handleCompare() {
    if (selected.length < 2) { setCompareError("Select at least 2 videos"); return; }
    setComparing(true); setCompareError(""); setCompareResult(null); setCompareStage(0);
    const timer = setInterval(() => setCompareStage(s => s < STAGES.length - 1 ? s + 1 : s), 1000);
    try {
      const res  = await fetch("/api/compare", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoIds: selected, maxComments: 100 }),
      });
      const data = await res.json();
      clearInterval(timer);
      if (!data.success) throw new Error(data.error);

      // Save each compared video to history
      data.results?.forEach(r => {
        if (!r.error) saveToHistory({
          videoId:     r.metadata?.videoId,
          title:       r.metadata?.title,
          channel:     r.metadata?.channel,
          thumbnail:   r.metadata?.thumbnail,
          viewCount:   r.metadata?.viewCount,
          analysedAt:  new Date().toISOString(),
          stats:       r.stats,
          topSentiment: r.sentiment?.summary?.overallLabel,
          topTopic:    r.topics?.[0]?.label,
          comparedWith: selected.filter(x => x !== r.metadata?.videoId),
        });
      });
      setHistory(loadHistory());
      setCompareResult(data);
    } catch (err) {
      clearInterval(timer);
      setCompareError(err.message);
    }
    setComparing(false); setCompareStage(-1);
  }

  // ═════════════════════════════════════════════════════════════════════════
  return (
    <>
      <Head><title>YTAnalyser – Mobile Tech Comment Intelligence</title></Head>
      <Navbar />

      <main style={{ minHeight: "calc(100vh - 56px)", padding: "40px 0 80px" }}>
        <div className="container" style={{ maxWidth: 1060 }}>

          {/* Hero */}
          <div style={{ textAlign:"center", marginBottom:40 }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:8,
              background:"#00d4ff11", border:"1px solid #00d4ff33", borderRadius:20,
              padding:"4px 14px", marginBottom:16, fontSize:11, color:"var(--accent)",
              letterSpacing:"0.1em", fontWeight:700 }}>
              ⚡ MOBILE TECH · NLP DEMAND INTELLIGENCE
            </div>
            <h1 style={{ fontSize:"clamp(1.8rem,4vw,3rem)", marginBottom:12, letterSpacing:"-0.03em" }}>
              What does the smartphone audience{" "}
              <span style={{ color:"var(--accent)", textDecorationLine:"underline", textDecorationStyle:"wavy", textDecorationColor:"#00d4ff44" }}>really</span> want?
            </h1>
            <p style={{ color:"var(--text-muted)", fontSize:15, maxWidth:560, margin:"0 auto", lineHeight:1.7 }}>
              Explore trending mobile videos, compare channels, and surface audience demand — all powered by 7-stage NLP.
            </p>
          </div>

          {/* Mode tabs */}
          <div style={{ display:"flex", gap:10, marginBottom:32, justifyContent:"center", flexWrap:"wrap" }}>
            <TabBtn label="🔥 Trending Videos"    active={mode==="trending"} onClick={()=>setMode("trending")} />
            <TabBtn label="⚖️ Compare Channel"    active={mode==="compare"}  onClick={()=>setMode("compare")}  />
            <TabBtn label="🕓 Search History"     active={mode==="history"}  onClick={()=>{ setMode("history"); setHistory(loadHistory()); }} count={history.length} />
          </div>

          {/* ═══ TRENDING MODE ═══════════════════════════════════════════════ */}
          {mode === "trending" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                <div style={{ fontSize:12, color:"var(--text-muted)" }}>
                  Top 5 mobile tech videos right now — click any to run full analysis
                </div>
                <button onClick={()=>{ setTrendLoading(true); setTrending([]); fetch("/api/trending").then(r=>r.json()).then(d=>{ if(d.success) setTrending(d.videos); }).finally(()=>setTrendLoading(false)); }}
                  style={{ fontSize:12, padding:"5px 12px", background:"var(--bg3)", border:"1px solid var(--border)", color:"var(--text-muted)", borderRadius:"var(--radius)", cursor:"pointer" }}>
                  ↻ Refresh
                </button>
              </div>

              {trendLoading && (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))", gap:16 }}>
                  {[1,2,3,4,5].map(i => (
                    <div key={i} style={{ borderRadius:"var(--radius)", background:"var(--bg2)", border:"1px solid var(--border)", overflow:"hidden" }}>
                      <div style={{ height:130, background:"var(--bg3)", animation:"pulse 1.5s infinite" }}/>
                      <div style={{ padding:"12px 14px" }}>
                        <div style={{ height:12, width:"80%", background:"var(--bg3)", borderRadius:4, marginBottom:8, animation:"pulse 1.5s infinite" }}/>
                        <div style={{ height:10, width:"50%", background:"var(--bg3)", borderRadius:4, animation:"pulse 1.5s infinite" }}/>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {trendError && <p style={{ color:"var(--red)", fontSize:13 }}>⚠ {trendError}</p>}

              {!trendLoading && (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))", gap:16 }}>
                  {trending.map(v => (
                    <VideoCard
                      key={v.videoId} video={v}
                      selectable={false}
                      loading={analysingId === v.videoId}
                      onAnalyse={handleAnalyse}
                    />
                  ))}
                </div>
              )}

              {/* Loading overlay */}
              {analysingId && (
                <div style={{ marginTop:32, padding:"20px 24px", background:"var(--bg2)", borderRadius:"var(--radius)", border:"1px solid var(--border)" }}>
                  <div style={{ fontSize:12, color:"var(--text-muted)", marginBottom:12, fontFamily:"var(--font-display)", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>
                    Running 7-stage NLP pipeline…
                  </div>
                  {STAGES.map((s, i) => {
                    const done   = stage > i;
                    const active = stage === i;
                    return (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0", borderBottom:"1px solid var(--bg3)" }}>
                        <div style={{ width:20, height:20, borderRadius:4, flexShrink:0,
                          background: done ? "#10b981" : active ? "var(--accent)" : "var(--bg4)",
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:10, color: done||active ? "var(--bg)" : "var(--text-dim)", fontWeight:700 }}>
                          {done ? "✓" : i+1}
                        </div>
                        <div>
                          <div style={{ fontSize:12, fontWeight:700, color: active?"var(--accent)":done?"var(--text)":"var(--text-dim)" }}>{s.label}</div>
                          <div style={{ fontSize:10, color:"var(--text-dim)" }}>{s.desc}</div>
                        </div>
                        {active && <span style={{ marginLeft:"auto", fontSize:11, color:"var(--accent)" }}>● running</span>}
                        {done  && <span style={{ marginLeft:"auto", fontSize:11, color:"var(--green)" }}>done</span>}
                      </div>
                    );
                  })}
                </div>
              )}
              {analyseError && <p style={{ color:"var(--red)", fontSize:13, marginTop:12 }}>⚠ {analyseError}</p>}
            </div>
          )}

          {/* ═══ COMPARE MODE ════════════════════════════════════════════════ */}
          {mode === "compare" && (
            <div>
              {/* Channel input */}
              <div style={{ padding:"20px 24px", background:"var(--bg2)", borderRadius:"var(--radius)", border:"1px solid var(--border)", marginBottom:24 }}>
                <div style={{ fontSize:11, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.08em", fontFamily:"var(--font-display)", fontWeight:700, marginBottom:12 }}>
                  Enter a YouTube channel
                </div>
                <div style={{ display:"flex", gap:12 }}>
                  <input
                    className="input" value={channelInput}
                    onChange={e => setChannelInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleLoadChannel()}
                    placeholder="@mkbhd  or  https://youtube.com/@mkbhd"
                    style={{ flex:1, padding:"10px 14px" }}
                  />
                  <button onClick={handleLoadChannel} disabled={channelLoading} className="btn btn-primary" style={{ whiteSpace:"nowrap", minWidth:120 }}>
                    {channelLoading ? "Loading…" : "Load Videos"}
                  </button>
                </div>
                {channelError && <p style={{ color:"var(--red)", fontSize:12, marginTop:8 }}>⚠ {channelError}</p>}
                <p style={{ fontSize:11, color:"var(--text-dim)", marginTop:8 }}>
                  Examples: @mkbhd · @technicalguruji · @gsmarena_official · @mrwhosetheboss
                </p>
              </div>

              {/* Channel videos grid */}
              {channelName && (
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"var(--accent)", marginBottom:4 }}>
                    {channelName} — recent videos
                  </div>
                  <div style={{ fontSize:11, color:"var(--text-dim)", marginBottom:16 }}>
                    Select 2–5 videos to compare · analysis covers last 7 days of comments
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))", gap:14 }}>
                    {channelVideos.map(v => (
                      <VideoCard
                        key={v.videoId} video={v}
                        selectable selected={selected.includes(v.videoId)}
                        onSelect={toggleSelect}
                      />
                    ))}
                  </div>

                  {selected.length > 0 && (
                    <div style={{ display:"flex", alignItems:"center", gap:14, marginTop:18, padding:"14px 18px", background:"var(--bg3)", borderRadius:"var(--radius)", border:"1px solid var(--border)" }}>
                      <span style={{ fontSize:13, color:"var(--text-muted)" }}>{selected.length} video{selected.length>1?"s":""} selected</span>
                      <button onClick={handleCompare} disabled={comparing||selected.length<2} className="btn btn-primary" style={{ marginLeft:"auto", minWidth:160 }}>
                        {comparing ? "Comparing…" : `⚖️ Compare ${selected.length} Videos`}
                      </button>
                    </div>
                  )}
                  {compareError && <p style={{ color:"var(--red)", fontSize:12, marginTop:8 }}>⚠ {compareError}</p>}
                </div>
              )}

              {/* Compare pipeline progress */}
              {comparing && (
                <div style={{ padding:"16px 20px", background:"var(--bg2)", borderRadius:"var(--radius)", border:"1px solid var(--border)", marginBottom:20 }}>
                  <div style={{ fontSize:12, color:"var(--text-muted)", marginBottom:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>
                    Comparing {selected.length} videos — last 7 days of comments…
                  </div>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    {STAGES.map((s,i) => (
                      <div key={i} style={{ fontSize:11, padding:"4px 10px", borderRadius:20,
                        background: compareStage>i?"#10b98122":compareStage===i?"#00d4ff22":"var(--bg3)",
                        color: compareStage>i?"#10b981":compareStage===i?"var(--accent)":"var(--text-dim)",
                        border:`1px solid ${compareStage>i?"#10b98144":compareStage===i?"#00d4ff44":"var(--border)"}` }}>
                        {compareStage>i?"✓ ":""}{s.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Compare results */}
              {compareResult && <CompareResults data={compareResult} />}
            </div>
          )}

          {/* ═══ HISTORY MODE ════════════════════════════════════════════════ */}
          {mode === "history" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                <div style={{ fontSize:12, color:"var(--text-muted)" }}>
                  {history.length} video{history.length!==1?"s":""} analysed
                </div>
                {history.length > 0 && (
                  <button onClick={()=>{ clearHistory(); setHistory([]); }}
                    style={{ fontSize:12, padding:"5px 12px", background:"#ef444411", border:"1px solid #ef444433", color:"var(--red)", borderRadius:"var(--radius)", cursor:"pointer" }}>
                    Clear all
                  </button>
                )}
              </div>

              {history.length === 0 && (
                <div style={{ textAlign:"center", padding:"60px 0", color:"var(--text-dim)" }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>🕓</div>
                  <div style={{ fontSize:14 }}>No videos analysed yet</div>
                  <div style={{ fontSize:12, marginTop:6 }}>Switch to Trending or Compare to get started</div>
                </div>
              )}

              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {history.map((item, i) => (
                  <div key={i} style={{ display:"flex", gap:16, alignItems:"flex-start",
                    padding:"14px 18px", background:"var(--bg2)", borderRadius:"var(--radius)",
                    border:"1px solid var(--border)", cursor:"pointer",
                    transition:"border-color 0.15s" }}
                    onClick={() => router.push(`/video/${item.videoId}`)}
                  >
                    {item.thumbnail && (
                      <img src={item.thumbnail} style={{ width:100, height:64, objectFit:"cover", borderRadius:6, flexShrink:0 }} />
                    )}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:700, marginBottom:4, color:"var(--text)", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize:12, color:"var(--text-muted)", marginBottom:8 }}>{item.channel}</div>
                      <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                        {item.stats?.total != null && (
                          <span style={{ fontSize:11, color:"var(--text-dim)" }}>💬 {item.stats.total} comments</span>
                        )}
                        {item.stats?.demand != null && (
                          <span style={{ fontSize:11, color:"#f59e0b" }}>🎯 {item.stats.demand} demands</span>
                        )}
                        {item.topSentiment && (
                          <span style={{ fontSize:11, padding:"1px 7px", borderRadius:20,
                            background: item.topSentiment==="Positive"?"#10b98122":item.topSentiment==="Negative"?"#ef444422":"var(--bg3)",
                            color: item.topSentiment==="Positive"?"#10b981":item.topSentiment==="Negative"?"#ef4444":"var(--text-dim)",
                            border: `1px solid ${item.topSentiment==="Positive"?"#10b98144":item.topSentiment==="Negative"?"#ef444444":"var(--border)"}` }}>
                            {item.topSentiment}
                          </span>
                        )}
                        {item.topTopic && (
                          <span style={{ fontSize:11, color:"#00d4ff", background:"#00d4ff11", border:"1px solid #00d4ff33", padding:"1px 7px", borderRadius:20 }}>
                            #{item.topTopic}
                          </span>
                        )}
                        {item.comparedWith?.length > 0 && (
                          <span style={{ fontSize:11, color:"#7c3aed", background:"#7c3aed11", border:"1px solid #7c3aed33", padding:"1px 7px", borderRadius:20 }}>
                            compared with {item.comparedWith.length} video{item.comparedWith.length>1?"s":""}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize:11, color:"var(--text-dim)", flexShrink:0, textAlign:"right" }}>
                      <div>{new Date(item.analysedAt).toLocaleDateString()}</div>
                      <div>{new Date(item.analysedAt).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}</div>
                      <div style={{ marginTop:6, padding:"3px 8px", borderRadius:"var(--radius)", background:"var(--bg3)", border:"1px solid var(--border)", fontSize:10, color:"var(--accent)" }}>
                        View →
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Compare Results component (rendered inline)
// ─────────────────────────────────────────────────────────────────────────────
function CompareResults({ data }) {
  const { results, winners, period } = data;
  const valid = results.filter(r => !r.error);

  const METRICS = [
    { key:"total",         label:"Comments (7d)",  field:r=>r.stats?.total,          winner: winners.comments,        color:"#00d4ff", fmt:v=>v?.toLocaleString() },
    { key:"demandPercent", label:"Demand rate",     field:r=>r.stats?.demandPercent,  winner: winners.demandRate,      color:"#f59e0b", fmt:v=>`${v}%` },
    { key:"sentiment",     label:"Avg sentiment",   field:r=>r.sentiment?.summary?.avgScore, winner: winners.sentiment, color:"#10b981", fmt:v=>v >= 0?`+${v}`:v },
    { key:"virality",      label:"Virality score",  field:r=>r.sentiment?.overallVirality, winner: winners.virality,  color:"#f953c6", fmt:v=>`${v}/100` },
    { key:"techPercent",   label:"Tech comment %",  field:r=>r.stats?.techPercent,    winner: winners.techEngagement, color:"#7c3aed", fmt:v=>`${v}%` },
  ];

  return (
    <div>
      <div style={{ fontSize:12, color:"var(--text-muted)", marginBottom:16 }}>
        Comparing {valid.length} videos · Period: {period}
      </div>

      {/* Video headers */}
      <div style={{ display:"grid", gridTemplateColumns:`120px repeat(${valid.length}, 1fr)`, gap:8, marginBottom:8 }}>
        <div />
        {valid.map(r => (
          <div key={r.metadata?.videoId} style={{ padding:"10px 12px", background:"var(--bg2)", borderRadius:"var(--radius)", border:"1px solid var(--border)" }}>
            {r.metadata?.thumbnail && <img src={r.metadata.thumbnail} style={{ width:"100%", height:70, objectFit:"cover", borderRadius:4, marginBottom:6 }} />}
            <div style={{ fontSize:11, fontWeight:700, lineHeight:1.3, color:"var(--text)" }}>{r.metadata?.title?.slice(0,50)}{r.metadata?.title?.length>50?"…":""}</div>
            <div style={{ fontSize:10, color:"var(--text-dim)", marginTop:3 }}>{r.metadata?.channel}</div>
          </div>
        ))}
      </div>

      {/* Metric rows */}
      {METRICS.map(metric => (
        <div key={metric.key} style={{ display:"grid", gridTemplateColumns:`120px repeat(${valid.length}, 1fr)`, gap:8, marginBottom:8 }}>
          <div style={{ display:"flex", alignItems:"center", fontSize:11, color:"var(--text-muted)", fontWeight:700, padding:"0 4px" }}>{metric.label}</div>
          {valid.map(r => {
            const isWinner = metric.winner === r.metadata?.videoId;
            const val = metric.field(r);
            return (
              <div key={r.metadata?.videoId} style={{ padding:"10px 14px", background: isWinner?`${metric.color}11`:"var(--bg2)", borderRadius:"var(--radius)", border:`1px solid ${isWinner?metric.color+"44":"var(--border)"}`, textAlign:"center" }}>
                <div style={{ fontSize:18, fontWeight:800, fontFamily:"var(--font-display)", color: isWinner?metric.color:"var(--text)" }}>
                  {val != null ? metric.fmt(val) : "—"}
                </div>
                {isWinner && <div style={{ fontSize:10, color:metric.color, marginTop:2 }}>🏆 Best</div>}
              </div>
            );
          })}
        </div>
      ))}

      {/* Top demand topics per video */}
      <div style={{ marginTop:24 }}>
        <div style={{ fontSize:12, color:"var(--text-muted)", marginBottom:12, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700, fontFamily:"var(--font-display)" }}>
          Top demand topics
        </div>
        <div style={{ display:"grid", gridTemplateColumns:`repeat(${valid.length},1fr)`, gap:12 }}>
          {valid.map(r => (
            <div key={r.metadata?.videoId} style={{ padding:"12px 14px", background:"var(--bg2)", borderRadius:"var(--radius)", border:"1px solid var(--border)" }}>
              <div style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", marginBottom:10 }}>{r.metadata?.title?.slice(0,36)}…</div>
              {(r.topics||[]).slice(0,3).map((t,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, padding:"5px 8px", background:`${t.color||"#00d4ff"}11`, borderRadius:6, borderLeft:`2px solid ${t.color||"#00d4ff"}` }}>
                  <span style={{ fontSize:14 }}>{t.emoji||"🔧"}</span>
                  <span style={{ fontSize:11, color:"var(--text)", flex:1 }}>{t.label}</span>
                  <span style={{ fontSize:10, color:t.color||"var(--accent)", fontWeight:700 }}>{t.commentCount}</span>
                </div>
              ))}
              {(r.topics||[]).length===0 && <div style={{ fontSize:11, color:"var(--text-dim)" }}>No demand topics found in last 7 days</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Next steps per video */}
      <div style={{ marginTop:24 }}>
        <div style={{ fontSize:12, color:"var(--text-muted)", marginBottom:12, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700, fontFamily:"var(--font-display)" }}>
          Actionable insights
        </div>
        <div style={{ display:"grid", gridTemplateColumns:`repeat(${valid.length},1fr)`, gap:12 }}>
          {valid.map(r => (
            <div key={r.metadata?.videoId} style={{ padding:"12px 14px", background:"var(--bg2)", borderRadius:"var(--radius)", border:"1px solid var(--border)" }}>
              <div style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", marginBottom:10 }}>{r.metadata?.title?.slice(0,36)}…</div>
              {(r.sentiment?.nextSteps||[]).slice(0,2).map((step,i)=>(
                <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:8, fontSize:11, color:"var(--text)", lineHeight:1.5 }}>
                  <span style={{ flexShrink:0 }}>{step.icon}</span>
                  <span>{step.text?.slice(0,120)}{step.text?.length>120?"…":""}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}