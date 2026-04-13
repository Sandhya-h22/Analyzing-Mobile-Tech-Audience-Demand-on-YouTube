import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Navbar from "../components/Navbar";

const PIPELINE_STAGES = [
  { id: 1, label: "Data Collection", desc: "YouTube API v3", icon: "📡", color: "#00d4ff" },
  { id: 2, label: "NLP Preprocessing", desc: "Clean → Tokenize → Lemmatize", icon: "🧹", color: "#f59e0b" },
  { id: 3, label: "Tech Classification", desc: "ML keyword scoring", icon: "🔬", color: "#7c3aed" },
  { id: 4, label: "TF-IDF Vectorise", desc: "Word importance scoring", icon: "📊", color: "#10b981" },
  { id: 5, label: "Demand Detection", desc: "Request signal extraction", icon: "🎯", color: "#ff4d6d" },
  { id: 6, label: "LDA + K-Means", desc: "Topic modelling & clustering", icon: "🤖", color: "#f59e0b" },
  { id: 7, label: "Weighted Ranking", desc: "40% Freq · 30% Eng · 20% Rec · 10% Div", icon: "🏆", color: "#00d4ff" },
];

const EXAMPLE_URLS = [
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "https://youtu.be/dQw4w9WgXcQ",
];

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [maxComments, setMaxComments] = useState(300);
  const [loading, setLoading] = useState(false);
  const [activeStage, setActiveStage] = useState(-1);
  const [error, setError] = useState("");
  const [stageLog, setStageLog] = useState([]);

  // Animate pipeline stages while loading
  useEffect(() => {
    if (!loading) { setActiveStage(-1); setStageLog([]); return; }
    let i = 0;
    const tick = () => {
      if (i < PIPELINE_STAGES.length) {
        const stage = PIPELINE_STAGES[i];
        if (!stage) return;
        setActiveStage(i);
        setStageLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${stage.label}...`]);
        i++;
        setTimeout(tick, 900);
      }
    };
    tick();
  }, [loading]);

  async function handleAnalyse() {
    if (!url.trim()) { setError("Please enter a YouTube URL"); return; }
    setError("");
    setLoading(true);
    setStageLog([]);

    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), maxComments }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Analysis failed");

      // Store in sessionStorage and navigate
      sessionStorage.setItem("yt_analysis", JSON.stringify(data));
      router.push("/dashboard");
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>YTAnalyser – YouTube Comment Intelligence</title>
        <meta name="description" content="Extract demand signals from YouTube comments using NLP" />
      </Head>
      <Navbar />

      <main style={{ minHeight: "calc(100vh - 56px)", padding: "60px 0" }}>
        <div className="container" style={{ maxWidth: 860 }}>

          {/* Hero */}
          <div className="fade-in" style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "#00d4ff11", border: "1px solid #00d4ff33",
              borderRadius: 20, padding: "4px 14px", marginBottom: 20,
              fontSize: 12, color: "var(--accent)", letterSpacing: "0.1em",
              fontWeight: 700,
            }}>
              ⚡ NLP-POWERED DEMAND INTELLIGENCE
            </div>
            <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", marginBottom: 16, letterSpacing: "-0.03em" }}>
              What do your viewers{" "}
              <span style={{
                color: "var(--accent)",
                textDecoration: "underline",
                textDecorationStyle: "wavy",
                textDecorationColor: "#00d4ff44",
              }}>actually</span> want?
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: 16, maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>
              Paste any YouTube video URL. We extract comments, run 7 NLP stages,
              and surface ranked audience demand topics in seconds.
            </p>
          </div>

          {/* Input card */}
          <div className="card card-glow fade-in" style={{
            animationDelay: "0.1s", padding: 28, marginBottom: 24,
          }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: "block", fontSize: 11, color: "var(--text-muted)",
                letterSpacing: "0.1em", textTransform: "uppercase",
                fontFamily: "var(--font-display)", fontWeight: 700, marginBottom: 8,
              }}>
                YouTube Video URL
              </label>
              <div style={{ display: "flex", gap: 12 }}>
                <input
                  className="input"
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !loading && handleAnalyse()}
                  disabled={loading}
                  style={{ flex: 1 }}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleAnalyse}
                  disabled={loading || !url.trim()}
                  style={{ whiteSpace: "nowrap", minWidth: 130 }}
                >
                  {loading ? (
                    <>
                      <span className="spin" style={{ display: "inline-block" }}>⟳</span>
                      Analysing…
                    </>
                  ) : "▶ Analyse"}
                </button>
              </div>
            </div>

            {/* Max comments slider */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                Max comments:
              </label>
              <input
                type="range" min={50} max={500} step={50}
                value={maxComments}
                onChange={(e) => setMaxComments(Number(e.target.value))}
                disabled={loading}
                style={{ flex: 1, accentColor: "var(--accent)" }}
              />
              <span style={{
                minWidth: 36, fontSize: 13, fontWeight: 700,
                color: "var(--accent)", fontFamily: "var(--font-display)",
              }}>
                {maxComments}
              </span>
            </div>

            {error && (
              <div style={{
                marginTop: 12, padding: "10px 14px", borderRadius: "var(--radius)",
                background: "#ef444411", border: "1px solid #ef444433",
                color: "var(--red)", fontSize: 13,
              }}>
                ⚠ {error}
              </div>
            )}
          </div>

          {/* Pipeline visualisation */}
          <div className="card fade-in" style={{ animationDelay: "0.2s", padding: 24 }}>
            <div style={{
              fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.12em",
              textTransform: "uppercase", fontFamily: "var(--font-display)", fontWeight: 700,
              marginBottom: 20,
            }}>
              7-Stage Analysis Pipeline
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {PIPELINE_STAGES.map((stage, i) => {
                const isActive = activeStage === i;
                const isDone = activeStage > i;
                return (
                  <div
                    key={stage.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "10px 14px", borderRadius: "var(--radius)",
                      background: isActive ? `${stage.color}11` : isDone ? `${stage.color}08` : "var(--bg3)",
                      border: `1px solid ${isActive ? stage.color : isDone ? `${stage.color}44` : "var(--border)"}`,
                      transition: "all 0.3s",
                      boxShadow: isActive ? `0 0 16px ${stage.color}33` : "none",
                    }}
                  >
                    {/* Step number / checkmark */}
                    <div style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: isActive ? stage.color : isDone ? `${stage.color}22` : "var(--bg4)",
                      border: `1px solid ${isActive ? stage.color : isDone ? `${stage.color}66` : "var(--border)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: isActive ? 11 : 12,
                      color: isActive ? "var(--bg)" : isDone ? stage.color : "var(--text-dim)",
                      fontWeight: 700, fontFamily: "var(--font-display)",
                      transition: "all 0.3s",
                    }}>
                      {isDone ? "✓" : isActive ? <span className="pulse">{stage.id}</span> : stage.id}
                    </div>

                    {/* Icon */}
                    <span style={{ fontSize: 18, opacity: isActive || isDone ? 1 : 0.3 }}>
                      {stage.icon}
                    </span>

                    {/* Label */}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 700, fontFamily: "var(--font-display)",
                        color: isActive ? stage.color : isDone ? "var(--text)" : "var(--text-dim)",
                      }}>
                        {stage.label}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                        {stage.desc}
                      </div>
                    </div>

                    {/* Status */}
                    {isActive && (
                      <div style={{ fontSize: 11, color: stage.color, display: "flex", alignItems: "center", gap: 4 }}>
                        <span className="pulse">●</span> RUNNING
                      </div>
                    )}
                    {isDone && (
                      <div style={{ fontSize: 11, color: "var(--green)" }}>DONE</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Log output */}
            {stageLog.length > 0 && (
              <div style={{
                marginTop: 16, background: "var(--bg)", border: "1px solid var(--border)",
                borderRadius: "var(--radius)", padding: 12, fontFamily: "var(--font-mono)",
                fontSize: 11, color: "var(--green)", maxHeight: 120, overflowY: "auto",
              }}>
                {stageLog.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
                {loading && (
                  <div style={{ color: "var(--accent)" }}>
                    <span className="blink" style={{ animation: "blink 1s infinite" }}>█</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Feature grid */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16, marginTop: 24,
          }}>
            {[
              { icon: "🎯", label: "Demand Detection", desc: "Spots request phrases + questions in comments" },
              { icon: "📊", label: "TF-IDF Ranking", desc: "Weighs keyword importance across all comments" },
              { icon: "🤖", label: "LDA Topics", desc: "Groups demands into coherent topic clusters" },
              { icon: "📥", label: "CSV Export", desc: "Download topics, keywords, and comment data" },
            ].map(({ icon, label, desc }) => (
              <div key={label} className="card fade-in" style={{ animationDelay: "0.3s" }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
                <div style={{
                  fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13,
                  marginBottom: 4, color: "var(--text)",
                }}>{label}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>

        </div>
      </main>
    </>
  );
}