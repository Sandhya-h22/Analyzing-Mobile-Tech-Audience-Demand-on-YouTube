import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Navbar from "../components/Navbar";

const INTENT_OPTIONS = [
  { value: "purchase_intent", label: "Purchase Intent", color: "#10b981" },
  { value: "content_request", label: "Content Request", color: "#00d4ff" },
  { value: "support_request", label: "Support Request", color: "#ef4444" },
  { value: "collaboration", label: "Collaboration", color: "#7c3aed" },
  { value: "praise", label: "Praise", color: "#f59e0b" },
  { value: "question", label: "Question", color: "#a78bfa" },
  { value: "general", label: "General", color: "#94a3b8", exclusive: true },
];

function flattenAnalysis(data) {
  if (!data) return [];
  if (data.mode === "compare") {
    return (data.videos || []).flatMap((video) =>
      (video.demandComments || []).map((comment) => ({
        ...comment,
        sourceVideoTitle: video.metadata?.title || "",
        sourceVideoChannel: video.metadata?.channel || "",
      }))
    );
  }
  if (data.mode === "channels") {
    return (data.allDemandComments || []).map((comment) => ({
      ...comment,
      sourceVideoTitle: comment.videoTitle || "",
      sourceVideoChannel: comment.videoChannel || "",
    }));
  }
  return (data.demandComments || []).map((comment) => ({
    ...comment,
    sourceVideoTitle: data.metadata?.title || "",
    sourceVideoChannel: data.metadata?.channel || "",
  }));
}

export default function AnnotatePage() {
  const [comments, setComments] = useState([]);
  const [savedMap, setSavedMap] = useState({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("yt_analysis");
      const parsed = stored ? JSON.parse(stored) : null;
      const items = flattenAnalysis(parsed).filter((comment) => comment.commentId && comment.text);
      setComments(items);
    } catch {
      setComments([]);
    }
  }, []);

  useEffect(() => {
    async function loadSaved() {
      try {
        const res = await fetch("/api/annotations");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load annotations");
        const map = Object.fromEntries((data.items || []).map((item) => [item.commentId, item]));
        setSavedMap(map);
      } catch (err) {
        setError(err.message);
      }
    }
    loadSaved();
  }, []);

  const activeComment = comments[activeIndex] || null;
  const activeSaved = activeComment ? savedMap[activeComment.commentId] : null;

  useEffect(() => {
    setNotes(activeSaved?.notes || "");
    setSelectedLabels(activeSaved?.labels || (activeSaved?.label ? [activeSaved.label] : []));
  }, [activeSaved?.commentId, activeSaved?.label, activeSaved?.labels, activeIndex]);

  const progress = useMemo(() => {
    const labeled = comments.filter((comment) => Boolean(savedMap[comment.commentId]?.label)).length;
    return { labeled, total: comments.length };
  }, [comments, savedMap]);

  function toggleLabel(label) {
    const option = INTENT_OPTIONS.find((item) => item.value === label);
    const current = new Set(selectedLabels);

    if (option?.exclusive) {
      return current.has(label) ? [] : [label];
    }

    current.delete("general");
    if (current.has(label)) current.delete(label);
    else current.add(label);
    return [...current];
  }

  async function saveLabels(labelsOverride) {
    if (!activeComment) return;
    const labels = labelsOverride?.length ? labelsOverride : selectedLabels;
    if (!labels.length) {
      setError("Select at least one label before saving.");
      setStatus("");
      return;
    }
    setError("");
    setStatus("Saving annotation...");

    try {
      const annotation = {
        commentId: activeComment.commentId,
        text: activeComment.text,
        author: activeComment.author,
        label: labels[0],
        labels,
        notes,
        sourceVideoTitle: activeComment.sourceVideoTitle || "",
        sourceVideoChannel: activeComment.sourceVideoChannel || "",
      };

      const res = await fetch("/api/annotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ annotation }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save annotation");

      setSavedMap((prev) => ({ ...prev, [annotation.commentId]: data.annotation }));
      setStatus(`Saved ${labels.join(", ")}`);
      if (activeIndex < comments.length - 1) setActiveIndex((i) => i + 1);
    } catch (err) {
      setError(err.message);
      setStatus("");
    }
  }

  return (
    <>
      <Head><title>Annotate Comments - YTAnalyser</title></Head>
      <Navbar />
      <main style={{ minHeight: "calc(100vh - 56px)", padding: "32px 0 80px" }}>
        <div className="container" style={{ maxWidth: 1100 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "var(--font-display)", fontWeight: 700, marginBottom: 8 }}>
                Annotation Workspace
              </div>
              <h1 style={{ margin: 0, fontSize: "clamp(1.8rem, 4vw, 2.8rem)", lineHeight: 1.1 }}>Label intent data for your model</h1>
              <p style={{ color: "var(--text-muted)", maxWidth: 620, lineHeight: 1.7 }}>
                This page loads demand comments from your latest analysis stored in the browser and lets you save one or more intent labels to the local annotation dataset for multi-label model training.
              </p>
            </div>
            <div className="card" style={{ minWidth: 220, padding: 18 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>Progress</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 30 }}>{progress.labeled} / {progress.total}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>comments labeled</div>
            </div>
          </div>

          {!comments.length ? (
            <div className="card" style={{ padding: 36, textAlign: "center", color: "var(--text-muted)" }}>
              Run an analysis first, then open this page to label the latest demand comments from `sessionStorage`.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 18 }}>
              <div className="card" style={{ padding: 14, maxHeight: 70 + "vh", overflowY: "auto" }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>Comment Queue</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {comments.map((comment, index) => {
                    const saved = savedMap[comment.commentId];
                    const active = index === activeIndex;
                    return (
                      <button
                        key={comment.commentId}
                        onClick={() => setActiveIndex(index)}
                        style={{
                          textAlign: "left",
                          background: active ? "#00d4ff11" : "var(--bg3)",
                          border: `1px solid ${active ? "#00d4ff55" : "var(--border)"}`,
                          borderRadius: 10,
                          padding: "10px 12px",
                          color: "var(--text)",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ fontSize: 11, color: saved ? "var(--green)" : "var(--text-dim)", marginBottom: 5 }}>
                          {saved ? `Labeled: ${saved.label}` : "Unlabeled"}
                        </div>
                        <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                          {comment.text.slice(0, 100)}{comment.text.length > 100 ? "..." : ""}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="card" style={{ padding: 20 }}>
                {activeComment && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                      <div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          @{activeComment.author} {activeComment.sourceVideoChannel ? `· ${activeComment.sourceVideoChannel}` : ""}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>
                          {activeComment.sourceVideoTitle || "Latest analysed video"}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {activeIndex + 1} / {comments.length}
                      </div>
                    </div>

                    <div style={{ fontSize: 18, lineHeight: 1.7, marginBottom: 18 }}>
                      {activeComment.text}
                    </div>

                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
                      Select all labels that apply. Use `General` only when none of the other intent labels fit.
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
                      {INTENT_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            const nextLabels = toggleLabel(option.value);
                            setSelectedLabels(nextLabels);
                            setError("");
                          }}
                          style={{
                            background: selectedLabels.includes(option.value) ? `${option.color}22` : "var(--bg3)",
                            color: selectedLabels.includes(option.value) ? option.color : "var(--text)",
                            border: `1px solid ${selectedLabels.includes(option.value) ? option.color : "var(--border)"}`,
                            borderRadius: 999,
                            padding: "10px 14px",
                            cursor: "pointer",
                            fontWeight: 700,
                            fontSize: 12,
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 18 }}>
                      <button
                        type="button"
                        onClick={() => saveLabels()}
                        style={{
                          background: "linear-gradient(135deg, #00d4ff, #10b981)",
                          color: "#04111d",
                          border: "none",
                          borderRadius: 999,
                          padding: "10px 16px",
                          cursor: "pointer",
                          fontWeight: 800,
                          fontSize: 12,
                        }}
                      >
                        Save Labels
                      </button>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        Selected: {selectedLabels.length ? selectedLabels.join(", ") : "none"}
                      </div>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Annotation Notes</div>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Optional note about ambiguity, sarcasm, mixed intent, etc."
                        style={{
                          width: "100%",
                          minHeight: 110,
                          background: "var(--bg3)",
                          color: "var(--text)",
                          border: "1px solid var(--border)",
                          borderRadius: 10,
                          padding: 12,
                          resize: "vertical",
                        }}
                      />
                    </div>

                    {status && <div style={{ fontSize: 12, color: "var(--green)", marginBottom: 8 }}>{status}</div>}
                    {error && <div style={{ fontSize: 12, color: "var(--red)" }}>{error}</div>}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
