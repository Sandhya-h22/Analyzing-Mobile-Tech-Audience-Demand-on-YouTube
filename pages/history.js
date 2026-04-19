import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Navbar from "../components/Navbar";

const TOP_CHANNELS = [
  { id: "UCVpankR4HtoAVtYnFDUieYA", name: "MKBHD",           sub: "18M+ subs · Phones, Reviews",      avatar: "📱", color: "#ff4d6d" },
  { id: "UCBcRF18a7Qf58cCRy5xuWwQ", name: "MrMobile",        sub: "3M+ subs · Premium Mobile Reviews", avatar: "📲", color: "#7c3aed" },
  { id: "UC7bhW6eDOEY-E_4MQ4NXKHA", name: "Dave2D",          sub: "4M+ subs · Laptops & Phones",       avatar: "💻", color: "#00d4ff" },
  { id: "UCddiUEpeqJcYeBxX1IVBKvQ", name: "The Verge",       sub: "3M+ subs · Tech News & Reviews",    avatar: "🔬", color: "#10b981" },
  { id: "UCwPRdjbrlqTjWOl7ig9dMrg", name: "Linus Tech Tips", sub: "15M+ subs · Deep Tech Dives",       avatar: "🛠", color: "#f59e0b" },
];

export default function Channels() {
  const router = useRouter();
  const [selectedChannels, setSelectedChannels] = useState(TOP_CHANNELS.map(c => c.id));
  const [customInputs, setCustomInputs] = useState([""]);
  const [daysBack, setDaysBack] = useState(7);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);

  const STEPS = [
    "🔍 Resolving channel IDs...",
    "📡 Fetching recent videos...",
    "💬 Collecting all comments...",
    "🧹 Running NLP pipeline...",
    "😊 Analysing sentiment...",
    "🎯 Detecting intents...",
    "📊 Aggregating insights...",
  ];

  function toggleChannel(id) {
    setSelectedChannels(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  }

  function addCustom() { setCustomInputs(prev => [...prev, ""]); }
  function updateCustom(i, val) { setCustomInputs(prev => prev.map((v, idx) => idx === i ? val : v)); }
  function removeCustom(i) { setCustomInputs(prev => prev.filter((_, idx) => idx !== i)); }

  async function handleAnalyse() {
    const customChannels = customInputs.filter(c => c.trim());
    const presetChannels = TOP_CHANNELS.filter(c => selectedChannels.includes(c.id));

    if (!presetChannels.length && !customChannels.length) {
      setError("Select at least one channel"); return;
    }

    setError(""); setLoading(true); setProgress(0);

    // Animate progress steps
    let step = 0;
    const tick = () => {
      if (step < STEPS.length) {
        setLoadingMsg(STEPS[step]);
        setProgress(Math.round((step / STEPS.length) * 100));
        step++;
        setTimeout(tick, 1800);
      }
    };
    tick();

    try {
      const channels = [
        ...presetChannels.map(c => ({ id: c.id, name: c.name })),
        ...customChannels.map(c => ({ input: c })),
      ];

      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "channels", channels, daysBack }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Analysis failed");

      // Save to history
      const history = JSON.parse(localStorage.getItem("yt_history") || "[]");
      const entry = {
        id: Date.now(),
        type: "channels",
        label: `${channels.length} channels · last ${daysBack} days`,
        channels: channels.map(c => c.name || c.input),
        totalVideos: data.aggregate?.totalVideos || 0,
        totalComments: data.aggregate?.totalComments || 0,
        createdAt: new Date().toISOString(),
        data,
      };
      history.unshift(entry);
      localStorage.setItem("yt_history", JSON.stringify(history.slice(0, 20)));

      sessionStorage.setItem("yt_analysis", JSON.stringify(data));
      router.push("/dashboard");
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <>
      <Head><title>Channel Analysis – YTAnalyser</title></Head>
      <Navbar />
      <main style={{ minHeight: "calc(100vh - 56px)", padding: "40px 0 80px" }}>
        <div className="container" style={{ maxWidth: 860 }}>

          {/* Hero */}
          <div className="fade-in" style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#f59e0b11", border: "1px solid #f59e0b33", borderRadius: 20, padding: "4px 14px", marginBottom: 14, fontSize: 12, color: "#f59e0b", letterSpacing: "0.1em", fontWeight: 700 }}>
              📡 CHANNEL INTELLIGENCE MODE
            </div>
            <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2.6rem)", marginBottom: 10, letterSpacing: "-0.03em" }}>
              Analyse <span style={{ color: "var(--accent)" }}>Top Mobile Channels</span>
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: 14, maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>
              Auto-fetch last {daysBack} days of videos from top mobile tech channels, collect all comments, and surface aggregated demand insights.
            </p>
          </div>

          {/* Days back selector */}
          <div className="card fade-in" style={{ marginBottom: 16, padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-display)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Analyse last:
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                {[1, 3, 7, 14].map(d => (
                  <button key={d} onClick={() => setDaysBack(d)} className="btn" style={{ fontSize: 12, padding: "6px 14px", background: daysBack === d ? "var(--accent)" : "var(--bg3)", color: daysBack === d ? "var(--bg)" : "var(--text-muted)", border: `1px solid ${daysBack === d ? "var(--accent)" : "var(--border)"}` }}>
                    {d} day{d > 1 ? "s" : ""}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Top 5 preset channels */}
          <div className="card fade-in" style={{ marginBottom: 16, padding: 20 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-display)", fontWeight: 700, marginBottom: 14 }}>
              Top 5 Mobile Tech Channels
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {TOP_CHANNELS.map(ch => {
                const selected = selectedChannels.includes(ch.id);
                return (
                  <div key={ch.id} onClick={() => toggleChannel(ch.id)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", borderRadius: "var(--radius)", background: selected ? `${ch.color}11` : "var(--bg3)", border: `1px solid ${selected ? ch.color : "var(--border)"}`, cursor: "pointer", transition: "all 0.2s" }}>
                    {/* Checkbox */}
                    <div style={{ width: 20, height: 20, borderRadius: 4, background: selected ? ch.color : "var(--bg4)", border: `2px solid ${selected ? ch.color : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                      {selected && <span style={{ color: "white", fontSize: 12, fontWeight: 700 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 22 }}>{ch.avatar}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: selected ? ch.color : "var(--text)" }}>{ch.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{ch.sub}</div>
                    </div>
                    <div style={{ fontSize: 11, color: selected ? ch.color : "var(--text-dim)", fontWeight: 700 }}>
                      {selected ? "✓ Selected" : "Click to add"}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <button className="btn btn-secondary" style={{ fontSize: 11 }} onClick={() => setSelectedChannels(TOP_CHANNELS.map(c => c.id))}>Select All</button>
              <button className="btn btn-secondary" style={{ fontSize: 11 }} onClick={() => setSelectedChannels([])}>Clear All</button>
            </div>
          </div>

          {/* Custom channel inputs */}
          <div className="card fade-in" style={{ marginBottom: 20, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-display)", fontWeight: 700 }}>
                ➕ Add Your Own Channels
              </div>
              <button className="btn btn-secondary" onClick={addCustom} style={{ fontSize: 11, padding: "5px 12px" }}>+ Add</button>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 10 }}>
              Paste a YouTube channel URL, @handle, or Channel ID
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {customInputs.map((val, i) => (
                <div key={i} style={{ display: "flex", gap: 8 }}>
                  <input className="input" placeholder="https://youtube.com/@channelname  or  @handle  or  UCxxxxxxx" value={val} onChange={e => updateCustom(i, e.target.value)} style={{ flex: 1, fontSize: 12 }} />
                  {customInputs.length > 1 && <button onClick={() => removeCustom(i)} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>✕</button>}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: "var(--radius)", background: "#ef444411", border: "1px solid #ef444433", color: "var(--red)", fontSize: 13 }}>
              ⚠ {error}
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="card" style={{ marginBottom: 16, padding: 20 }}>
              <div style={{ fontSize: 13, color: "var(--accent)", fontWeight: 700, marginBottom: 10 }}>{loadingMsg}</div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%`, transition: "width 0.5s ease" }} />
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
                Fetching videos from {selectedChannels.length + customInputs.filter(c=>c.trim()).length} channels for last {daysBack} day(s)... This may take 30–60 seconds.
              </div>
            </div>
          )}

          {/* Analyse button */}
          <button
            className="btn btn-primary"
            onClick={handleAnalyse}
            disabled={loading}
            style={{ width: "100%", fontSize: 15, padding: "14px", justifyContent: "center" }}
          >
            {loading
              ? <><span className="spin" style={{ display: "inline-block" }}>⟳</span> Analysing channels…</>
              : `📡 Analyse ${selectedChannels.length + customInputs.filter(c=>c.trim()).length} Channel(s) — Last ${daysBack} Day(s)`}
          </button>

          {/* Info note */}
          <div style={{ marginTop: 14, fontSize: 11, color: "var(--text-dim)", textAlign: "center", lineHeight: 1.7 }}>
            ⚡ Fetches all available comments per video · Results saved to history automatically
          </div>

        </div>
      </main>
    </>
  );
}