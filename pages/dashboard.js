import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import Navbar from "../components/Navbar";
import StatCard from "../components/StatCard";
import TopicCard from "../components/TopicCard";

const SENT_COLORS = { positive: "#10b981", negative: "#ef4444", neutral: "#6b7a99" };

function SentBadge({ s }) {
  const map = { positive: ["#10b98122","#10b981","😊"], negative: ["#ef444422","#ef4444","😤"], neutral: ["#6b7a9922","#94a3b8","😐"] };
  const [bg, col, em] = map[s] || map.neutral;
  return <span style={{ background: bg, color: col, border: `1px solid ${col}44`, borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{em} {s}</span>;
}

function ViralityMeter({ score, label, reasoning }) {
  const color = score >= 75 ? "#ff4d6d" : score >= 55 ? "#f59e0b" : score >= 35 ? "#00d4ff" : "#6b7a99";
  return (
    <div className="card" style={{ borderLeft: `3px solid ${color}`, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ textAlign: "center", minWidth: 60 }}>
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "var(--font-display)", color, lineHeight: 1 }}>{score}</div>
          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>/100</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 14, color }}>{label}</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Virality Score</span>
          </div>
          <div className="progress-bar" style={{ marginBottom: 6 }}>
            <div className="progress-fill" style={{ width: `${score}%`, background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{reasoning}</div>
        </div>
      </div>
    </div>
  );
}

function ActionStep({ step }) {
  const pc = { high: "#ef4444", medium: "#f59e0b", low: "#10b981" }[step.priority] || "#6b7a99";
  return (
    <div className="card" style={{ padding: "12px 14px", display: "flex", gap: 10 }}>
      <div style={{ fontSize: 20 }}>{step.icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13 }}>{step.title}</span>
          <span style={{ fontSize: 10, background: `${pc}22`, color: pc, border: `1px solid ${pc}44`, borderRadius: 10, padding: "1px 8px", fontWeight: 700, textTransform: "uppercase" }}>{step.priority}</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{step.detail}</div>
      </div>
    </div>
  );
}

// ── Channels Aggregate Dashboard ─────────────────────────────────────────────
function ChannelsDashboard({ data }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Overview");
  const [selectedVideo, setSelectedVideo] = useState(null);
  const { channels, videos, aggregate } = data;
  const TABS = ["Overview", "Videos", "Channels"];
  const CHART_COLORS = ["#00d4ff","#f59e0b","#10b981","#ff4d6d","#7c3aed","#a78bfa","#ec4899","#06b6d4","#84cc16","#f97316"];

  const sentStats = aggregate?.sentimentStats || {};
  const posRate = Math.round(((sentStats.positive||0) / Math.max(1, sentStats.total)) * 100);
  const negRate = Math.round(((sentStats.negative||0) / Math.max(1, sentStats.total)) * 100);

  const sentPie = [
    { name: "Positive", value: sentStats.positive||0, color: "#10b981" },
    { name: "Negative", value: sentStats.negative||0, color: "#ef4444" },
    { name: "Neutral",  value: sentStats.neutral||0,  color: "#6b7a99" },
  ].filter(d => d.value > 0);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginBottom: 4 }}>
            📡 Channel Analysis — Last {aggregate?.daysBack || 7} Days
          </h2>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {channels?.length} channels · {aggregate?.totalVideos} videos · {(aggregate?.totalComments||0).toLocaleString()} comments
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => router.push("/channels")} style={{ fontSize: 11 }}>← Channels</button>
          <button className="btn btn-secondary" onClick={() => router.push("/history")} style={{ fontSize: 11 }}>🕐 History</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--border)" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{ padding: "10px 18px", border: "none", background: "transparent", color: activeTab === t ? "var(--accent)" : "var(--text-muted)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, cursor: "pointer", borderBottom: activeTab === t ? "2px solid var(--accent)" : "2px solid transparent", marginBottom: -1 }}>{t}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
        <StatCard label="Videos" value={aggregate?.totalVideos||0} icon="🎬" color="var(--accent)" />
        <StatCard label="Comments" value={(aggregate?.totalComments||0).toLocaleString()} icon="💬" color="var(--text)" />
        <StatCard label="Demand" value={aggregate?.totalDemand||0} icon="🎯" color="var(--green)" />
        <StatCard label="😊 Positive" value={`${posRate}%`} icon="😊" color="#10b981" />
        <StatCard label="😤 Negative" value={`${negRate}%`} icon="😤" color="#ef4444" />
        <StatCard label="Channels" value={channels?.length||0} icon="📡" color="#f59e0b" />
      </div>

      {activeTab === "Overview" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            <div className="card">
              <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-display)", fontWeight: 700, marginBottom: 10 }}>Overall Sentiment</div>
              <PieChart width={240} height={180} style={{ margin: "0 auto" }}>
                <Pie data={sentPie} cx={120} cy={80} innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value">
                  {sentPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
                <Legend formatter={v => <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{v}</span>} />
              </PieChart>
            </div>
            <div className="card">
              <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-display)", fontWeight: 700, marginBottom: 10 }}>Top by Virality</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={(aggregate?.topVideosByVirality||[]).map((v) => ({ name: v.title?.slice(0,16)+"…", score: v.viralityScore?.score||0 }))}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#6b7a99" }} />
                  <YAxis tick={{ fontSize: 9, fill: "#6b7a99" }} domain={[0,100]} />
                  <Tooltip contentStyle={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
                  <Bar dataKey="score" radius={[4,4,0,0]}>
                    {(aggregate?.topVideosByVirality||[]).map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-display)", fontWeight: 700, marginBottom: 12 }}>Demand by Channel</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={(channels||[]).map((ch, i) => {
                const chVideos = (videos||[]).filter(v => !v.error && v.channelName === ch.name);
                return { name: ch.name?.split(" ")[0], demand: chVideos.reduce((s,v) => s+(v.stats?.demand||0),0) };
              })}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7a99" }} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7a99" }} />
                <Tooltip contentStyle={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} />
                <Bar dataKey="demand" radius={[4,4,0,0]}>
                  {(channels||[]).map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-display)", fontWeight: 700, marginBottom: 10 }}>🔥 Most Demanded Videos</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(aggregate?.topVideosByDemand||[]).map((v, i) => (
              <div key={i} className="card" style={{ padding: "10px 14px", display: "flex", gap: 12, alignItems: "center" }}>
                {v.thumbnail && <img src={v.thumbnail} alt="" style={{ width: 64, height: 36, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 700, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{v.title}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{v.channel} · 🎯 {v.stats?.demand} demand · 💬 {v.stats?.total} comments</div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "var(--font-display)", color: "var(--accent)" }}>#{i+1}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "Videos" && (
        <div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14 }}>
            {(videos||[]).filter(v=>!v.error).length} videos analysed
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(videos||[]).map((v, i) => {
              if (v.error) return (
                <div key={i} className="card" style={{ padding: "10px 14px", borderLeft: "3px solid var(--red)", opacity: 0.6 }}>
                  <div style={{ fontSize: 12, color: "var(--red)" }}>⚠ {v.error} — {v.title}</div>
                </div>
              );
              const posR = Math.round(((v.sentimentStats?.positive||0)/Math.max(1,v.sentimentStats?.total))*100);
              const isExp = selectedVideo === i;
              return (
                <div key={i} className="card" style={{ padding: 0, overflow: "hidden", cursor: "pointer" }} onClick={() => setSelectedVideo(isExp ? null : i)}>
                  <div style={{ padding: "12px 14px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                    {(v.metadata?.thumbnail||v.thumbnail) && <img src={v.metadata?.thumbnail||v.thumbnail} alt="" style={{ width: 80, height: 45, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, marginBottom: 4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{v.metadata?.title||v.title}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>{v.channelName}</div>
                      <div style={{ display: "flex", gap: 10, fontSize: 11 }}>
                        <span style={{ color: "var(--accent)" }}>💬 {v.stats?.total}</span>
                        <span style={{ color: "var(--green)" }}>🎯 {v.stats?.demand}</span>
                        <span style={{ color: "#10b981" }}>😊 {posR}%</span>
                        <span style={{ color: "#f59e0b" }}>🔥 {v.viralityScore?.score||0}</span>
                      </div>
                    </div>
                    <div style={{ color: "var(--text-dim)", fontSize: 12, transform: isExp ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</div>
                  </div>
                  {isExp && (
                    <div style={{ borderTop: "1px solid var(--border)", padding: "12px 14px", background: "var(--bg3)" }} onClick={e => e.stopPropagation()}>
                      {(v.topics||[]).length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "var(--font-display)", fontWeight: 700, marginBottom: 6 }}>Topics</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {(v.topics||[]).slice(0,4).map(t => (
                              <span key={t.topicKey} style={{ background: `${t.color}22`, color: t.color, border: `1px solid ${t.color}44`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                                {t.emoji} {t.label} ({t.commentCount})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {(v.topKeywords||[]).length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "var(--font-display)", fontWeight: 700, marginBottom: 6 }}>Keywords</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {(v.topKeywords||[]).slice(0,10).map(k => <span key={k.word} className="tag tag-accent">{k.word}</span>)}
                          </div>
                        </div>
                      )}
                      {(v.demandComments||[]).slice(0,2).map(c => (
                        <div key={c.commentId} style={{ background: "var(--bg2)", borderRadius: 6, padding: "8px 10px", marginBottom: 6, fontSize: 12, lineHeight: 1.5 }}>
                          <span style={{ color: "var(--text-muted)", fontSize: 10 }}>@{c.author} · 👍{c.likeCount} · </span>
                          <SentBadge s={c.sentiment} />
                          <div style={{ marginTop: 4 }}>{c.text?.slice(0,120)}…</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "Channels" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px,1fr))", gap: 14 }}>
          {(channels||[]).map((ch, i) => {
            const chVideos = (videos||[]).filter(v => !v.error && v.channelName === ch.name);
            const totalDemand = chVideos.reduce((s,v) => s+(v.stats?.demand||0),0);
            const totalComments = chVideos.reduce((s,v) => s+(v.stats?.total||0),0);
            const avgVirality = chVideos.length ? Math.round(chVideos.reduce((s,v) => s+(v.viralityScore?.score||0),0)/chVideos.length) : 0;
            const color = CHART_COLORS[i];
            return (
              <div key={ch.id} className="card" style={{ borderTop: `3px solid ${color}` }}>
                <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                  {ch.thumbnail && <img src={ch.thumbnail} alt="" style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0 }} />}
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color }}>{ch.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{(ch.subscriberCount||0).toLocaleString()} subscribers</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[["Videos",chVideos.length,color],["Comments",totalComments,"#00d4ff"],["Demand",totalDemand,"#10b981"],["Avg Viral",avgVirality,"#f59e0b"]].map(([label,val,c]) => (
                    <div key={label} style={{ background: "var(--bg3)", borderRadius: 6, padding: "8px 10px", textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "var(--font-display)", color: c }}>{val}</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Single Video Dashboard ────────────────────────────────────────────────────
function SingleVideoDetails({ data, onExport, exporting }) {
  const router = useRouter();
  const [tab, setTab] = useState("Overview");
  const [commentFilter, setCommentFilter] = useState("all");
  const [sentFilter, setSentFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("") ;
  const TABS = ["Overview","Topics","Sentiment","Intents","Suggestions","Comments","Raw"];

  const { metadata, stats, topics, topKeywords, demandComments, allComments, sentimentStats, intentSummary, suggestions, viralityScore, actionableSteps } = data;

  const pieData = [
    { name: "Demand", value: stats?.demand||0, color: "#10b981" },
    { name: "Tech", value: (stats?.tech||0)-(stats?.demand||0), color: "#00d4ff" },
    { name: "Non-tech", value: stats?.nonTech||0, color: "#3d4f6b" },
  ].filter(d => d.value > 0);

  const sentPieData = [
    { name: "Positive", value: sentimentStats?.positive||0, color: "#10b981" },
    { name: "Negative", value: sentimentStats?.negative||0, color: "#ef4444" },
    { name: "Neutral",  value: sentimentStats?.neutral||0,  color: "#6b7a99" },
  ].filter(d => d.value > 0);

  const displayComments = (commentFilter === "demand" ? demandComments : allComments||[])
    .filter(c => (sentFilter === "all" || c.sentiment === sentFilter) &&
      (!searchQuery || c.text?.toLowerCase().includes(searchQuery.toLowerCase()) || c.author?.toLowerCase().includes(searchQuery.toLowerCase())));

  return (
    <div>
      <div style={{ display: "flex", gap: 2, marginBottom: 20, borderBottom: "1px solid var(--border)", overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "10px 14px", border: "none", background: "transparent", color: tab===t?"var(--accent)":"var(--text-muted)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12, cursor: "pointer", borderBottom: tab===t?"2px solid var(--accent)":"2px solid transparent", marginBottom: -1, whiteSpace: "nowrap" }}>{t}</button>
        ))}
        <button className="btn btn-secondary" onClick={() => router.push("/")} style={{ fontSize: 11, padding: "6px 12px", marginLeft: "auto", marginBottom: 4 }}>← New</button>
      </div>

      <div className="card fade-in" style={{ marginBottom: 20, display: "flex", gap: 12, alignItems: "flex-start" }}>
        {metadata?.thumbnail && <img src={metadata.thumbnail} alt="" style={{ width: 100, height: 56, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>{metadata?.channel}</div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "var(--text)", lineHeight: 1.3, marginBottom: 6, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{metadata?.title}</div>
          <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--text-muted)" }}>
            <span>👁 {(metadata?.viewCount||0).toLocaleString()}</span>
            <span>👍 {(metadata?.likeCount||0).toLocaleString()}</span>
            <span>💬 {(metadata?.commentCount||0).toLocaleString()}</span>
          </div>
        </div>
        <button className="btn btn-primary" disabled={exporting} onClick={() => onExport("demand", demandComments)} style={{ fontSize: 11, flexShrink: 0 }}>⬇ CSV</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 20 }}>
        <StatCard label="Total" value={(stats?.total||0).toLocaleString()} icon="💬" color="var(--text)" />
        <StatCard label="Demand" value={stats?.demand||0} sub={`${stats?.demandPercent||0}%`} icon="🎯" color="var(--green)" />
        <StatCard label="😊 Positive" value={`${Math.round(((sentimentStats?.positive||0)/Math.max(1,sentimentStats?.total))*100)}%`} icon="😊" color="#10b981" />
        <StatCard label="😤 Negative" value={`${Math.round(((sentimentStats?.negative||0)/Math.max(1,sentimentStats?.total))*100)}%`} icon="😤" color="#ef4444" />
        <StatCard label="🔥 Virality" value={viralityScore?.score||0} sub={viralityScore?.label} icon="🔥" color="#f59e0b" />
        <StatCard label="Topics" value={(topics||[]).length} icon="📋" color="var(--accent3)" />
      </div>

      {tab === "Overview" && (
        <div>
          <div style={{ marginBottom: 14 }}><ViralityMeter score={viralityScore?.score||0} label={viralityScore?.label||""} reasoning={viralityScore?.reasoning||""} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div className="card">
              <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-display)", fontWeight: 700, marginBottom: 8 }}>Distribution</div>
              <PieChart width={180} height={150} style={{ margin: "0 auto" }}>
                <Pie data={pieData} cx={90} cy={65} innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">{pieData.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie>
                <Tooltip contentStyle={{ background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:6,fontSize:11 }}/>
                <Legend formatter={v=><span style={{color:"var(--text-muted)",fontSize:10}}>{v}</span>}/>
              </PieChart>
            </div>
            <div className="card">
              <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-display)", fontWeight: 700, marginBottom: 8 }}>Sentiment</div>
              <PieChart width={180} height={150} style={{ margin: "0 auto" }}>
                <Pie data={sentPieData} cx={90} cy={65} innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">{sentPieData.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie>
                <Tooltip contentStyle={{ background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:6,fontSize:11 }}/>
                <Legend formatter={v=><span style={{color:"var(--text-muted)",fontSize:10}}>{v}</span>}/>
              </PieChart>
            </div>
            <div className="card">
              <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-display)", fontWeight: 700, marginBottom: 8 }}>By Topic</div>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={(topics||[]).slice(0,5).map(t=>({name:t.emoji||"",count:t.commentCount}))}>
                  <XAxis dataKey="name" tick={{fontSize:14}}/>
                  <YAxis tick={{fontSize:9,fill:"#6b7a99"}}/>
                  <Tooltip contentStyle={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:6,fontSize:11}}/>
                  <Bar dataKey="count" radius={[4,4,0,0]}>{(topics||[]).slice(0,5).map((t,i)=><Cell key={i} fill={t.color}/>)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          {(actionableSteps||[]).length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-display)", fontWeight: 700, marginBottom: 10 }}>📋 Actionable Steps</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(actionableSteps||[]).map((s,i)=><ActionStep key={i} step={s}/>)}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "Topics" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {!(topics||[]).length
            ? <div className="card" style={{textAlign:"center",color:"var(--text-muted)",padding:40}}>No demand topics found.</div>
            : (topics||[]).map((t,i) => <TopicCard key={t.topicKey} topic={t} rank={i+1}/>)}
        </div>
      )}

      {tab === "Sentiment" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div className="card">
              <PieChart width={260} height={200} style={{ margin: "0 auto" }}>
                <Pie data={sentPieData} cx={130} cy={90} innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">{sentPieData.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie>
                <Tooltip contentStyle={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:6,fontSize:12}}/>
                <Legend formatter={v=><span style={{color:"var(--text-muted)",fontSize:12}}>{v}</span>}/>
              </PieChart>
            </div>
            <div className="card">
              {[["😊 Positive",sentimentStats?.positive||0,"#10b981"],["😤 Negative",sentimentStats?.negative||0,"#ef4444"],["😐 Neutral",sentimentStats?.neutral||0,"#6b7a99"]].map(([label,val,color])=>(
                <div key={label} style={{ marginBottom: 14 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
                    <span style={{fontSize:13}}>{label}</span>
                    <span style={{fontSize:13,fontWeight:700,color}}>{val} ({Math.round((val/Math.max(1,sentimentStats?.total))*100)}%)</span>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{width:`${Math.round((val/Math.max(1,sentimentStats?.total))*100)}%`,background:color}}/></div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display:"flex",gap:6,marginBottom:10 }}>
            {["all","positive","negative","neutral"].map(f=>(
              <button key={f} onClick={()=>setSentFilter(f)} className="btn" style={{fontSize:11,background:sentFilter===f?"var(--accent)":"var(--bg3)",color:sentFilter===f?"var(--bg)":"var(--text-muted)",border:"1px solid var(--border)"}}>{f}</button>
            ))}
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Sentiment</th><th>Author</th><th>Comment</th><th>Score</th><th>Likes</th></tr></thead>
              <tbody>
                {(allComments||[]).filter(c=>sentFilter==="all"||c.sentiment===sentFilter).slice(0,80).map(c=>(
                  <tr key={c.commentId}>
                    <td><SentBadge s={c.sentiment}/></td>
                    <td style={{fontSize:11,color:"var(--text-muted)",whiteSpace:"nowrap"}}>@{c.author}</td>
                    <td style={{maxWidth:360,fontSize:12}}>{c.text?.slice(0,150)}{c.text?.length>150?"…":""}</td>
                    <td style={{fontWeight:700,color:c.sentimentScore>0?"#10b981":c.sentimentScore<0?"#ef4444":"#6b7a99"}}>{c.sentimentScore}</td>
                    <td style={{color:"var(--accent4)"}}>👍{c.likeCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "Intents" && (
        <div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:10,marginBottom:20 }}>
            {(intentSummary||[]).map(intent=>(
              <div key={intent.intent} className="card" style={{borderLeft:`3px solid ${intent.color}`,padding:"12px 14px"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <span style={{fontSize:18}}>{intent.emoji}</span>
                  <span style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:13,color:intent.color}}>{intent.label}</span>
                  <span style={{marginLeft:"auto",background:`${intent.color}22`,color:intent.color,border:`1px solid ${intent.color}44`,borderRadius:20,padding:"2px 10px",fontSize:12,fontWeight:700}}>{intent.count}</span>
                </div>
                <div className="progress-bar"><div className="progress-fill" style={{width:`${Math.min(100,intent.count*10)}%`,background:intent.color}}/></div>
              </div>
            ))}
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Intent</th><th>Author</th><th>Comment</th><th>Sentiment</th></tr></thead>
              <tbody>
                {(allComments||[]).filter(c=>c.primaryIntent&&c.primaryIntent!=="general").slice(0,60).map(c=>(
                  <tr key={c.commentId}>
                    <td style={{fontSize:12}}>{(c.intents||[])[0]?.emoji} {(c.intents||[])[0]?.label||c.primaryIntent}</td>
                    <td style={{fontSize:11,color:"var(--text-muted)",whiteSpace:"nowrap"}}>@{c.author}</td>
                    <td style={{fontSize:12,maxWidth:380}}>{c.text?.slice(0,140)}…</td>
                    <td><SentBadge s={c.sentiment}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "Suggestions" && (
        <div>
          {!(suggestions||[]).length
            ? <div className="card" style={{textAlign:"center",color:"var(--text-muted)",padding:40}}>No explicit content suggestions found.</div>
            : <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {(suggestions||[]).map((s,i)=>(
                  <div key={i} className="card" style={{padding:"12px 14px",borderLeft:"3px solid var(--accent)"}}>
                    <div style={{display:"flex",gap:10}}>
                      <div style={{minWidth:26,height:26,background:"var(--accent)",borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-display)",fontWeight:800,fontSize:12,color:"var(--bg)",flexShrink:0}}>#{i+1}</div>
                      <div>
                        <div style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:13,marginBottom:4}}>💡 {s.suggestion}</div>
                        <div style={{fontSize:11,color:"var(--text-muted)"}}>Trigger: "{s.trigger}" · @{s.author} · 👍{s.likes}</div>
                        <div style={{fontSize:11,color:"var(--text-dim)",marginTop:4,fontStyle:"italic"}}>"{s.originalComment?.slice(0,80)}…"</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>}
        </div>
      )}

      {tab === "Comments" && (
        <div>
          <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
            {["demand","all"].map(f=>(
              <button key={f} onClick={()=>setCommentFilter(f)} className="btn" style={{fontSize:12,background:commentFilter===f?"var(--accent)":"var(--bg3)",color:commentFilter===f?"var(--bg)":"var(--text-muted)",border:"1px solid var(--border)"}}>
                {f==="demand"?`🎯 Demand (${stats?.demand||0})`:`💬 All (${allComments?.length||0})`}
              </button>
            ))}
            {["all","positive","negative","neutral"].map(f=>(
              <button key={f} onClick={()=>setSentFilter(f)} className="btn" style={{fontSize:11,padding:"4px 10px",background:sentFilter===f?SENT_COLORS[f]||"var(--bg3)":"var(--bg3)",color:sentFilter===f?"white":"var(--text-muted)",border:"1px solid var(--border)"}}>
                {f==="all"?"All":f==="positive"?"😊":f==="negative"?"😤":"😐"} {f!=="all"?f:""}
              </button>
            ))}
            <input className="input" placeholder="Search…" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} style={{flex:1,minWidth:120}}/>
            <button className="btn btn-secondary" disabled={exporting} onClick={()=>onExport("demand",displayComments)} style={{fontSize:11}}>⬇ CSV</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Sentiment</th><th>Author</th><th>Comment</th><th>Intent</th><th>Likes</th><th>Date</th></tr></thead>
              <tbody>
                {displayComments.slice(0,100).map(c=>(
                  <tr key={c.commentId}>
                    <td><SentBadge s={c.sentiment}/></td>
                    <td style={{fontSize:11,color:"var(--text-muted)",whiteSpace:"nowrap"}}>@{c.author}</td>
                    <td style={{maxWidth:340,fontSize:12,lineHeight:1.5}}>{c.text?.slice(0,130)}{c.text?.length>130?"…":""}</td>
                    <td style={{fontSize:11}}>{(c.intents||[])[0]?.emoji||"—"}</td>
                    <td style={{color:"var(--accent4)",fontWeight:700}}>👍{c.likeCount}</td>
                    <td style={{fontSize:10,color:"var(--text-dim)",whiteSpace:"nowrap"}}>{c.publishedAt?new Date(c.publishedAt).toLocaleDateString():"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "Raw" && (
        <div className="card" style={{padding:0,overflow:"hidden"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderBottom:"1px solid var(--border)"}}>
            <span style={{fontSize:12,color:"var(--text-muted)"}}>Raw JSON</span>
            <button className="btn btn-secondary" style={{fontSize:11}} onClick={()=>{const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="yt-analysis.json";a.click();URL.revokeObjectURL(url);}}>⬇ JSON</button>
          </div>
          <pre style={{padding:14,fontSize:11,color:"var(--green)",overflowX:"auto",maxHeight:500,background:"var(--bg)",lineHeight:1.6}}>
            {JSON.stringify({metadata,stats,sentimentStats,viralityScore,topics:topics?.slice(0,2),topKeywords:topKeywords?.slice(0,5)},null,2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard — ALL hooks at top, no conditional hooks ──────────────────
export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [exporting, setExporting] = useState(false);

  // ── Hook 1: Load data from sessionStorage ─────────────────────────────────
  useEffect(() => {
    const stored = sessionStorage.getItem("yt_analysis");
    if (stored) {
      try { setData(JSON.parse(stored)); }
      catch { router.push("/"); }
    } else {
      router.push("/");
    }
  }, []);

  // ── Hook 2: Save single/compare to history (runs after data loads) ────────
  useEffect(() => {
    if (!data || data.mode === "channels") return;
    try {
      const history = JSON.parse(localStorage.getItem("yt_history") || "[]");
      if (history[0]?.data?.metadata?.videoId === data.metadata?.videoId) return;
      const entry = {
        id: Date.now(),
        type: data.mode || "single",
        label: data.metadata?.title || "Video Analysis",
        channels: [data.metadata?.channel || "Unknown"],
        totalVideos: 1,
        totalComments: data.stats?.total || 0,
        createdAt: new Date().toISOString(),
        data,
      };
      history.unshift(entry);
      localStorage.setItem("yt_history", JSON.stringify(history.slice(0, 20)));
    } catch {}
  }, [data]);

  // ── Loading state — shown AFTER all hooks ─────────────────────────────────
  if (!data) return (
    <>
      <Navbar />
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"calc(100vh - 56px)"}}>
        <div style={{textAlign:"center"}}>
          <div className="spin" style={{fontSize:32,display:"inline-block"}}>⟳</div>
          <div style={{color:"var(--text-muted)",marginTop:12}}>Loading analysis…</div>
        </div>
      </div>
    </>
  );

  async function handleExport(type, payload) {
    setExporting(true);
    try {
      const res = await fetch("/api/export", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({data:payload,type}) });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href=url; a.download=`yt-analyser-${type}-${Date.now()}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { alert(err.message); }
    finally { setExporting(false); }
  }

  return (
    <>
      <Head><title>Dashboard – YTAnalyser</title></Head>
      <Navbar />
      <main style={{ padding: "24px 0 60px" }}>
        <div className="container">
          {data.mode === "channels"
            ? <ChannelsDashboard data={data} />
            : <SingleVideoDetails data={data} onExport={handleExport} exporting={exporting} />}
        </div>
      </main>
    </>
  );
}